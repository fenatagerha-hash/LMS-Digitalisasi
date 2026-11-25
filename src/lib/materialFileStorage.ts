import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db } from './firebase';

const MAX_CLOUD_FILE_BYTES = 10 * 1024 * 1024; // 10 MB (max 27 chunks x 380KB raw)
const MAX_UPLOAD_BYTES = 18 * 1024 * 1024; // 18 MB
const RAW_CHUNK_BYTES = 380 * 1024; // ~507 KB base64 per Firestore chunk (< 600KB rule limit, << 1MB doc limit)

const ALLOWED_EXT_REGEX = /\.(pdf|txt|md|csv|png|jpg|jpeg|webp|ppt|pptx|doc|docx|mp4|webm)$/i;

const EXT_MIME_MAP: Record<string, string> = {
  pdf: 'application/pdf',
  txt: 'text/plain',
  md: 'text/markdown',
  csv: 'text/csv',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  mp4: 'video/mp4',
  webm: 'video/webm',
};

// Cache in-memory agar berkas yang baru diunggah atau sudah dibaca langsung tampil tanpa jeda
const memoryBlobUrlCache = new Map<string, { objectUrl: string; blob: Blob; mimeType: string }>();

function guessMimeType(fileName: string, fallback = 'application/octet-stream'): string {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  return EXT_MIME_MAP[ext] || fallback || 'application/octet-stream';
}

function uint8ToBase64(bytes: Uint8Array): string {
  let binary = '';
  const step = 0x8000;
  for (let i = 0; i < bytes.length; i += step) {
    binary += String.fromCharCode(...bytes.subarray(i, i + step));
  }
  return btoa(binary);
}

function base64ToUint8(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// =========================================================================
// IndexedDB local cache (backup permanen untuk Mode Demo & cache offline)
// =========================================================================
const IDB_NAME = 'pamandai_material_files_v1';
const IDB_STORE = 'files';

function openIdb(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null);
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open(IDB_NAME, 1);
      req.onupgradeneeded = () => {
        const database = req.result;
        if (!database.objectStoreNames.contains(IDB_STORE)) {
          database.createObjectStore(IDB_STORE);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function putIdbBlob(key: string, blob: Blob): Promise<void> {
  const database = await openIdb();
  if (!database) return;
  await new Promise<void>((resolve) => {
    try {
      const tx = database.transaction(IDB_STORE, 'readwrite');
      tx.objectStore(IDB_STORE).put(blob, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

async function getIdbBlob(key: string): Promise<Blob | null> {
  const database = await openIdb();
  if (!database) return null;
  return new Promise((resolve) => {
    try {
      const tx = database.transaction(IDB_STORE, 'readonly');
      const req = tx.objectStore(IDB_STORE).get(key);
      req.onsuccess = () => resolve(req.result instanceof Blob ? req.result : null);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

export function extractCloudFileId(fileUrl: string): string | null {
  const trimmed = (fileUrl || '').trim();
  if (trimmed.startsWith('cloudfile://')) {
    const id = trimmed.slice('cloudfile://'.length).split(/[?#]/)[0];
    return /^[a-zA-Z0-9_-]+$/.test(id) ? id : null;
  }
  const match = trimmed.match(/[?&]cloudId=([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
}

export function isInternalMaterialUrl(fileUrl: string): boolean {
  const trimmed = (fileUrl || '').trim();
  return (
    trimmed.startsWith('blob:') ||
    trimmed.startsWith('/api/materials/files/') ||
    trimmed.startsWith('cloudfile://') ||
    trimmed.startsWith('localfile://')
  );
}

export interface PersistentUploadResult {
  ok: boolean;
  fileUrl: string;
  fileName: string;
  mimeType: string;
  cloudFileId?: string;
  objectUrl?: string;
  storedInCloud: boolean;
  storedOnServer: boolean;
  error?: string;
}

export async function uploadMaterialFilePersistent(
  file: File,
  onProgress?: (pct: number, label: string) => void,
): Promise<PersistentUploadResult> {
  if (!ALLOWED_EXT_REGEX.test(file.name)) {
    return {
      ok: false,
      fileUrl: '',
      fileName: file.name,
      mimeType: file.type || 'application/octet-stream',
      storedInCloud: false,
      storedOnServer: false,
      error:
        'Format berkas tidak didukung. Gunakan PDF, PPT/PPTX, DOC/DOCX, TXT/MD/CSV, Gambar (PNG/JPG/WEBP), atau Video (MP4/WEBM).',
    };
  }

  if (file.size <= 0 || file.size > MAX_UPLOAD_BYTES) {
    return {
      ok: false,
      fileUrl: '',
      fileName: file.name,
      mimeType: file.type || 'application/octet-stream',
      storedInCloud: false,
      storedOnServer: false,
      error: 'Ukuran berkas melebihi 18 MB. Kompres berkas atau gunakan tautan Google Drive / YouTube.',
    };
  }

  const mimeType = file.type || guessMimeType(file.name);
  const arrayBuffer = await file.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  const fileBlob = new Blob([bytes], { type: mimeType });
  const instantObjectUrl = URL.createObjectURL(fileBlob);

  let serverFileUrl = '';
  let storedOnServer = false;
  let serverError = '';

  // 1. Unggah biner langsung ke server (tanpa overhead JSON base64)
  onProgress?.(15, `Mengunggah "${file.name}" ke server...`);
  try {
    const rawRes = await fetch('/api/materials/upload-raw', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/octet-stream',
        'X-File-Name': encodeURIComponent(file.name),
        'X-Mime-Type': mimeType,
      },
      body: arrayBuffer,
    });
    const text = await rawRes.text();
    let parsed: { ok?: boolean; fileUrl?: string; error?: string } = {};
    try {
      parsed = JSON.parse(text) as { ok?: boolean; fileUrl?: string; error?: string };
    } catch {
      parsed = { ok: false, error: `Server mengembalikan respons ${rawRes.status}.` };
    }
    if (rawRes.ok && parsed.ok && parsed.fileUrl) {
      serverFileUrl = parsed.fileUrl;
      storedOnServer = true;
    } else {
      serverError = parsed.error || `Gagal unggah server (${rawRes.status}).`;
    }
  } catch (err) {
    serverError = err instanceof Error ? err.message : 'Koneksi ke server unggah terputus.';
  }

  // 2. Simpan permanen ke Cloud Firestore (chunked <= 507KB) agar TIDAK PERNAH hilang walau server restart / pindah instance
  let cloudFileId = '';
  let storedInCloud = false;
  let cloudError = '';
  const firebaseUid = auth.currentUser?.uid || '';

  if (firebaseUid && file.size <= MAX_CLOUD_FILE_BYTES) {
    try {
      const totalChunks = Math.max(1, Math.ceil(bytes.length / RAW_CHUNK_BYTES));
      const newFileId = `mfile_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

      onProgress?.(35, `Menyimpan permanen ke Cloud Database (0/${totalChunks} bagian)...`);

      await setDoc(doc(db, 'material_files', newFileId), {
        id: newFileId,
        fileName: file.name.slice(0, 255),
        mimeType: mimeType.slice(0, 120),
        sizeBytes: bytes.length,
        chunkCount: totalChunks,
        uploadedBy: firebaseUid,
        isActive: true,
        createdAt: serverTimestamp(),
      });

      for (let idx = 0; idx < totalChunks; idx++) {
        const start = idx * RAW_CHUNK_BYTES;
        const end = Math.min(bytes.length, start + RAW_CHUNK_BYTES);
        const chunkBase64 = uint8ToBase64(bytes.subarray(start, end));
        const chunkId = `c_${idx}`;
        await setDoc(doc(db, 'material_files', newFileId, 'chunks', chunkId), {
          id: chunkId,
          fileId: newFileId,
          chunkIndex: idx,
          data: chunkBase64,
          createdAt: serverTimestamp(),
        });
        const pct = Math.round(35 + ((idx + 1) / totalChunks) * 58);
        onProgress?.(
          pct,
          `Menyimpan permanen ke Cloud Database (${idx + 1}/${totalChunks} bagian)...`,
        );
      }

      cloudFileId = newFileId;
      storedInCloud = true;
    } catch (err) {
      cloudError = err instanceof Error ? err.message : 'Gagal menyimpan salinan Cloud Firestore.';
    }
  }

  // 3. Tentukan URL final yang disimpan di dokumen learning_materials
  let finalFileUrl = '';
  if (storedOnServer && storedInCloud) {
    finalFileUrl = `${serverFileUrl}?cloudId=${cloudFileId}`;
  } else if (storedInCloud) {
    finalFileUrl = `cloudfile://${cloudFileId}`;
  } else if (storedOnServer) {
    finalFileUrl = serverFileUrl;
  } else if (!firebaseUid) {
    // Mode Demo lokal: simpan di IndexedDB agar tetap ada setelah reload halaman
    const localId = `loc_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
    await putIdbBlob(localId, fileBlob);
    finalFileUrl = `localfile://${localId}`;
  }

  if (!finalFileUrl) {
    URL.revokeObjectURL(instantObjectUrl);
    return {
      ok: false,
      fileUrl: '',
      fileName: file.name,
      mimeType,
      storedInCloud: false,
      storedOnServer: false,
      error:
        cloudError ||
        serverError ||
        'Gagal mengunggah berkas materi. Coba unggah berkas <= 10 MB atau tempelkan tautan Google Drive.',
    };
  }

  // Simpan cache in-memory & IndexedDB agar pembacaan berikutnya instan
  memoryBlobUrlCache.set(finalFileUrl, { objectUrl: instantObjectUrl, blob: fileBlob, mimeType });
  if (cloudFileId) {
    memoryBlobUrlCache.set(`cloudfile://${cloudFileId}`, {
      objectUrl: instantObjectUrl,
      blob: fileBlob,
      mimeType,
    });
  }
  await putIdbBlob(finalFileUrl, fileBlob);

  onProgress?.(100, 'Berkas berhasil tersimpan permanen!');
  return {
    ok: true,
    fileUrl: finalFileUrl,
    fileName: file.name,
    mimeType,
    cloudFileId: cloudFileId || undefined,
    objectUrl: instantObjectUrl,
    storedInCloud,
    storedOnServer,
  };
}

export interface ResolvedMaterialView {
  ok: boolean;
  reason?: 'expired' | 'error';
  objectUrl?: string;
  externalUrl?: string;
  downloadUrl?: string;
  textBody?: string;
  mimeType?: string;
  source?: 'memory' | 'server' | 'cloud' | 'local' | 'external';
}

function isTextFile(fileName: string, mimeType: string, contentType: string): boolean {
  const lower = fileName.toLowerCase();
  return (
    contentType === 'teks' ||
    mimeType.startsWith('text/') ||
    lower.endsWith('.txt') ||
    lower.endsWith('.md') ||
    lower.endsWith('.csv')
  );
}

async function fetchCloudFileBlob(fileId: string): Promise<{ blob: Blob; mimeType: string } | null> {
  try {
    const metaSnap = await getDoc(doc(db, 'material_files', fileId));
    if (!metaSnap.exists()) return null;
    const meta = metaSnap.data() as {
      chunkCount?: number;
      mimeType?: string;
      fileName?: string;
    };
    const chunkCount = Number(meta.chunkCount || 0);
    if (chunkCount <= 0 || chunkCount > 32) return null;

    const chunkSnaps = await Promise.all(
      Array.from({ length: chunkCount }, (_, idx) =>
        getDoc(doc(db, 'material_files', fileId, 'chunks', `c_${idx}`)),
      ),
    );

    const parts: Uint8Array[] = [];
    let totalLen = 0;
    for (const snap of chunkSnaps) {
      if (!snap.exists()) return null;
      const chunkData = String((snap.data() as { data?: string }).data || '');
      if (!chunkData) return null;
      const decoded = base64ToUint8(chunkData);
      parts.push(decoded);
      totalLen += decoded.length;
    }

    const merged = new Uint8Array(totalLen);
    let offset = 0;
    for (const part of parts) {
      merged.set(part, offset);
      offset += part.length;
    }

    const mimeType =
      meta.mimeType || guessMimeType(meta.fileName || '', 'application/octet-stream');
    return { blob: new Blob([merged], { type: mimeType }), mimeType };
  } catch {
    return null;
  }
}

export async function resolveMaterialFileForViewing(params: {
  fileUrl: string;
  fileName: string;
  contentType: string;
  toEmbeddableUrl: (url: string) => string;
}): Promise<ResolvedMaterialView> {
  const url = (params.fileUrl || '').trim();
  const name = params.fileName || url;

  if (!url) {
    return { ok: true, source: 'external' };
  }

  // 1. Cek cache in-memory terlebih dahulu (instan!)
  const cached = memoryBlobUrlCache.get(url);
  if (cached) {
    const textLike = isTextFile(name, cached.mimeType, params.contentType);
    return {
      ok: true,
      objectUrl: cached.objectUrl,
      downloadUrl: cached.objectUrl,
      mimeType: cached.mimeType,
      textBody: textLike ? await cached.blob.text() : undefined,
      source: 'memory',
    };
  }

  // 2. Cek URL eksternal (https://, http://)
  if (/^https?:\/\//i.test(url)) {
    return {
      ok: true,
      externalUrl: params.toEmbeddableUrl(url),
      downloadUrl: url,
      source: 'external',
    };
  }

  // 3. Cek blob: lama dari sesi sebelumnya
  if (url.startsWith('blob:')) {
    try {
      const res = await fetch(url);
      if (!res.ok) return { ok: false, reason: 'expired' };
      const blob = await res.blob();
      const mimeType = blob.type || guessMimeType(name);
      const textLike = isTextFile(name, mimeType, params.contentType);
      return {
        ok: true,
        objectUrl: url,
        downloadUrl: url,
        mimeType,
        textBody: textLike ? await blob.text() : undefined,
        source: 'local',
      };
    } catch {
      return { ok: false, reason: 'expired' };
    }
  }

  // 4. Cek localfile:// (IndexedDB Demo Mode)
  if (url.startsWith('localfile://')) {
    const localKey = url.slice('localfile://'.length);
    const idbBlob = (await getIdbBlob(localKey)) || (await getIdbBlob(url));
    if (!idbBlob) return { ok: false, reason: 'expired' };
    const mimeType = idbBlob.type || guessMimeType(name);
    const objectUrl = URL.createObjectURL(idbBlob);
    memoryBlobUrlCache.set(url, { objectUrl, blob: idbBlob, mimeType });
    const textLike = isTextFile(name, mimeType, params.contentType);
    return {
      ok: true,
      objectUrl,
      downloadUrl: objectUrl,
      mimeType,
      textBody: textLike ? await idbBlob.text() : undefined,
      source: 'local',
    };
  }

  // 5. Cek server (/api/materials/files/...) dengan fallback otomatis ke Cloud Firestore (?cloudId=...) & IndexedDB
  const cloudId = extractCloudFileId(url);

  if (url.startsWith('/api/materials/files/')) {
    try {
      const cleanServerUrl = url.split('?')[0];
      const res = await fetch(cleanServerUrl);
      if (res.ok) {
        const rawBlob = await res.blob();
        const mimeType =
          (res.headers.get('content-type') || '').split(';')[0].trim() ||
          rawBlob.type ||
          guessMimeType(name);
        const typedBlob = rawBlob.type === mimeType ? rawBlob : new Blob([rawBlob], { type: mimeType });
        const objectUrl = URL.createObjectURL(typedBlob);
        memoryBlobUrlCache.set(url, { objectUrl, blob: typedBlob, mimeType });
        const textLike = isTextFile(name, mimeType, params.contentType);
        return {
          ok: true,
          objectUrl,
          downloadUrl: objectUrl,
          mimeType,
          textBody: textLike ? await typedBlob.text() : undefined,
          source: 'server',
        };
      }
    } catch {
      // Lanjut ke fallback Cloud Firestore / IndexedDB
    }
  }

  // 6. Cek Cloud Firestore (cloudfile://... atau ?cloudId=...)
  if (cloudId) {
    const cloudRes = await fetchCloudFileBlob(cloudId);
    if (cloudRes) {
      const objectUrl = URL.createObjectURL(cloudRes.blob);
      memoryBlobUrlCache.set(url, {
        objectUrl,
        blob: cloudRes.blob,
        mimeType: cloudRes.mimeType,
      });
      const textLike = isTextFile(name, cloudRes.mimeType, params.contentType);
      return {
        ok: true,
        objectUrl,
        downloadUrl: objectUrl,
        mimeType: cloudRes.mimeType,
        textBody: textLike ? await cloudRes.blob.text() : undefined,
        source: 'cloud',
      };
    }
  }

  // 7. Fallback terakhir: IndexedDB lokal browser
  const fallbackIdb = await getIdbBlob(url);
  if (fallbackIdb) {
    const mimeType = fallbackIdb.type || guessMimeType(name);
    const objectUrl = URL.createObjectURL(fallbackIdb);
    memoryBlobUrlCache.set(url, { objectUrl, blob: fallbackIdb, mimeType });
    const textLike = isTextFile(name, mimeType, params.contentType);
    return {
      ok: true,
      objectUrl,
      downloadUrl: objectUrl,
      mimeType,
      textBody: textLike ? await fallbackIdb.text() : undefined,
      source: 'local',
    };
  }

  return { ok: false, reason: 'expired' };
}
