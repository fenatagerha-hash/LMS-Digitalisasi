import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from './components/AppLayout';
import { ErrorBoundary } from './components/ErrorBoundary';
import { LmsProvider, useLms } from './context/LmsContext';
import { AssessmentQuizManagePage } from './pages/AssessmentQuizManagePage';
import { CertificatesPage } from './pages/CertificatesPage';
import { DashboardPage } from './pages/DashboardPage';
import LandingPage from './pages/LandingPage';
import { LearningSpacePage } from './pages/LearningSpacePage';
import { LoginPage } from './pages/LoginPage';
import { MonitoringPage } from './pages/MonitoringPage';
import { ProfilePage } from './pages/ProfilePage';
import { PublicVerifyPage } from './pages/PublicVerifyPage';
import { QnaChatPage } from './pages/QnaChatPage';
import { TestingSchemaPage } from './pages/TestingSchemaPage';
import { TrainingsPage } from './pages/TrainingsPage';
import { UsersImportPage } from './pages/UsersImportPage';
import { UserRole } from './types/lms';

function RoleRoute({
  allowedRoles,
  children,
}: {
  allowedRoles: UserRole[];
  children: React.ReactNode;
}) {
  const { authReady, currentUser, effectiveRole } = useLms();

  if (!authReady) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center text-sm text-slate-500">
        Memuat sesi autentikasi LMS...
      </div>
    );
  }

  if (!currentUser || !effectiveRole) {
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(effectiveRole)) {
    return (
      <AppLayout>
        <div className="bg-white border border-red-200 rounded-xl p-8 max-w-lg mx-auto text-center space-y-2">
          <h1 className="text-lg font-bold text-slate-900">Akses Ditolak (403)</h1>
          <p className="text-sm text-slate-600">
            Peran Anda saat ini tidak memiliki kewenangan mengakses halaman ini.
          </p>
        </div>
      </AppLayout>
    );
  }

  return <AppLayout>{children}</AppLayout>;
}

function AppRoutes() {
  const { currentUser } = useLms();

  return (
    <Routes>
      {/* Halaman Publik */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/beranda" element={<LandingPage />} />
      <Route
        path="/login"
        element={currentUser ? <Navigate to="/dashboard" replace /> : <LoginPage />}
      />
      <Route
        path="/login/:roleSlug"
        element={currentUser ? <Navigate to="/dashboard" replace /> : <LoginPage initialTab="login" />}
      />
      <Route
        path="/daftar"
        element={
          currentUser ? <Navigate to="/dashboard" replace /> : <LoginPage initialTab="register" />
        }
      />
      <Route
        path="/daftar/:roleSlug"
        element={
          currentUser ? <Navigate to="/dashboard" replace /> : <LoginPage initialTab="register" />
        }
      />
      <Route path="/verifikasi" element={<PublicVerifyPage />} />
      <Route path="/verifikasi/:certificateNumber" element={<PublicVerifyPage />} />

      {/* Halaman Terproteksi Berbasis Role */}
      <Route
        path="/dashboard"
        element={
          <RoleRoute
            allowedRoles={['super_admin', 'admin_kegiatan', 'fasilitator', 'peserta', 'pemantau']}
          >
            <DashboardPage />
          </RoleRoute>
        }
      />
      <Route
        path="/asesmen-awal"
        element={<Navigate to="/kegiatan?aktivitas=pretest" replace />}
      />
      <Route
        path="/kegiatan"
        element={
          <RoleRoute
            allowedRoles={['super_admin', 'admin_kegiatan', 'fasilitator', 'peserta', 'pemantau']}
          >
            <TrainingsPage />
          </RoleRoute>
        }
      />
      <Route
        path="/pembelajaran"
        element={
          <RoleRoute allowedRoles={['super_admin', 'admin_kegiatan', 'fasilitator', 'peserta']}>
            <LearningSpacePage />
          </RoleRoute>
        }
      />
      <Route
        path="/asesmen-kuis"
        element={
          <RoleRoute allowedRoles={['super_admin', 'admin_kegiatan', 'fasilitator']}>
            <AssessmentQuizManagePage />
          </RoleRoute>
        }
      />
      <Route
        path="/pengguna"
        element={
          <RoleRoute allowedRoles={['super_admin', 'admin_kegiatan']}>
            <UsersImportPage />
          </RoleRoute>
        }
      />
      <Route
        path="/monitoring"
        element={
          <RoleRoute allowedRoles={['super_admin', 'admin_kegiatan', 'fasilitator', 'pemantau']}>
            <MonitoringPage />
          </RoleRoute>
        }
      />
      <Route
        path="/sertifikat"
        element={
          <RoleRoute allowedRoles={['super_admin', 'admin_kegiatan', 'peserta', 'pemantau']}>
            <CertificatesPage />
          </RoleRoute>
        }
      />
      <Route
        path="/pengujian"
        element={
          <RoleRoute allowedRoles={['super_admin', 'admin_kegiatan', 'fasilitator', 'pemantau']}>
            <TestingSchemaPage />
          </RoleRoute>
        }
      />
      <Route
        path="/qna"
        element={
          <RoleRoute
            allowedRoles={['super_admin', 'admin_kegiatan', 'fasilitator', 'peserta', 'pemantau']}
          >
            <QnaChatPage />
          </RoleRoute>
        }
      />
      <Route
        path="/profil"
        element={
          <RoleRoute
            allowedRoles={['super_admin', 'admin_kegiatan', 'fasilitator', 'peserta', 'pemantau']}
          >
            <ProfilePage />
          </RoleRoute>
        }
      />

      <Route path="*" element={<Navigate to={currentUser ? '/dashboard' : '/'} replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <LmsProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </LmsProvider>
    </ErrorBoundary>
  );
}
