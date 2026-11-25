# Security Specification — LMS Pelatihan Digital

## 1. Data Invariants
1. **Role Integrity & No Self-Escalation**: A user creating their own `/profiles/{uid}` document can ONLY assign `role: "peserta"`. Non-admin users can never mutate `role` or `isActive`.
2. **PII Isolation**: Private contact fields (`email`, `phone`) live exclusively in `/profiles/{uid}` and are readable only by the owner or bootstrapped admin (`fenatagerha@gmail.com` with `email_verified == true`).
3. **Answer Key Isolation**: Plaintext answer keys in `/answer_keys/{bankId}` are completely inaccessible (`read`, `write` denied) to participants and unauthenticated callers.
4. **Sequential Learning Guard**: Participants enrolling themselves start at `status: "menunggu"`, `startingLevel: 0`, `currentLevel: 0`, `assessmentScore: -1`. Participants cannot jump more than +1 level in a single update and cannot modify an enrollment once `status == "lulus"`.
5. **Immutable Scoring & Audit Trail**: Submitted `/attempts/{attemptId}` cannot be modified by participants; `/activity_logs/{logId}` is strictly append-only (no updates or deletes).
6. **Public Verification Minimization**: `/certificates/{certificateNumber}` allows single-document `get` by unique ID with zero PII and blocks unauthenticated `list` scraping.
7. **Temporal & Path Integrity**: All single-document operations enforce `isValidId()`, all string/list fields enforce `.size()` bounds, and timestamps enforce `request.time`.

## 2. The "Dirty Dozen" Adversarial Payloads
1. **Privilege Escalation on Registration**: Participant creates `/profiles/user1` with `{ role: "super_admin" }` -> `PERMISSION_DENIED`.
2. **Shadow Role Update**: Participant updates `/profiles/user1` with `{ fullName: "Budi", role: "admin_kegiatan" }` -> `PERMISSION_DENIED`.
3. **PII Cross-Read**: Participant `user2` reads `/profiles/user1` -> `PERMISSION_DENIED`.
4. **Answer Key Theft**: Participant `user1` reads `/answer_keys/bank_01` -> `PERMISSION_DENIED`.
5. **Self-Approved Enrollment**: Participant creates `/training_enrollments/enr_fake` with `{ status: "disetujui", startingLevel: 4 }` -> `PERMISSION_DENIED`.
6. **Orphaned Enrollment**: Participant creates enrollment for nonexistent `trainingId: "trn_does_not_exist"` -> `PERMISSION_DENIED`.
7. **Sequential Level Jump**: Participant at `currentLevel: 1` updates `/training_enrollments/enr_1` directly to `currentLevel: 4` -> `PERMISSION_DENIED`.
8. **Score Tampering on Attempt**: Participant updates `/attempts/att_1` to set `{ finalScore: 100, passed: true }` -> `PERMISSION_DENIED`.
9. **Terminal Graduation Tampering**: Participant modifies `/training_enrollments/enr_graduated` where `status == "lulus"` -> `PERMISSION_DENIED`.
10. **Audit Log Erasure**: Any user tries to delete or update `/activity_logs/log_1` -> `PERMISSION_DENIED`.
11. **Public Certificate Scraping**: Unauthenticated user calls `list` on `/certificates` -> `PERMISSION_DENIED`.
12. **Email Spoof / Unverified Token & Ghost Field Injection**: Caller with `email: "fenatagerha@gmail.com"`, `email_verified: false` OR payload with ghost key `{ isVerified: true }` -> `PERMISSION_DENIED`.
