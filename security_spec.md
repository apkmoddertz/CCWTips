# Security Specification & Adversarial Red Team Spec

## 1. Data Invariants
- **User Role Segregation**: Standard profiles registering under `/users/{userId}` can only take the `'user'` role, unless their authentic email is `ngimbabetwin@gmail.com`.
- **Match Tip Integrity**: No standard user can create, update, or delete any match inside the `/matches` collection.
- **Strict Fields**: Matching schema keys must be fully checked to prevent "shadow fields" or ghost edits.

## 2. The "Dirty Dozen" Payloads (Identity & Integrity Breaking Attempts)

1. **Self-Promotion Hack**
   `POST /users/attacker-uid { uid: "attacker-uid", email: "malicious@gmail.com", isVip: true, role: "admin" }`
   - *Result*: `PERMISSION_DENIED` (only `ngimbabetwin@gmail.com` can start as admin).

2. **Email Mutation Hack**
   `PATCH /users/my-uid { email: "ngimbabetwin@gmail.com", role: "admin" }`
   - *Result*: `PERMISSION_DENIED` (email field is immutable, cannot modify roles directly).

3. **Anonymous User Write to Matches**
   `POST /matches/attacker-match { homeTeam: "Team A", awayTeam: "Team B", odds: 2.10, status: "pending", type: "free", dateId: "2026-06-01" }`
   - *Result*: `PERMISSION_DENIED` (requires `isAdmin()`).

4. **Malicious ID Poisoning**
   `POST /matches/!@#$___junk_id_long_string_128_chars... { ... }`
   - *Result*: `PERMISSION_DENIED` (invalid document ID or path variable hardening).

5. **State Shortcut / Backdating Match**
   `POST /matches/fresh-id { createdAt: timestamp_from_five_days_ago }`
   - *Result*: `PERMISSION_DENIED` (must equal `request.time`).

6. **Out-of-Bounds Team Names**
   `POST /matches/fresh-id { homeTeam: "Super long team name spanning more than 100 characters to bloat database records and exploit resources..." }`
   - *Result*: `PERMISSION_DENIED` (exceeds size limits).

7. **Vandalizing Match Tip Outcomes**
   `PATCH /matches/existing-id { status: "win" }` from a non-admin.
   - *Result*: `PERMISSION_DENIED`.

8. **Ghost Field Poisoning**
   `POST /users/my-uid { uid: "my-uid", email: "user@user.com", isVip: false, role: "user", super_unlocked_flag_ghost: true }`
   - *Result*: `PERMISSION_DENIED` (keys size must be exactly 4).

9. **Double-Click Lock Injection**
   `PATCH /users/my-uid { isVip: true, role: "admin" }` from standard user.
   - *Result*: `PERMISSION_DENIED` (role cannot be changed).

10. **Listing Others' Profiles**
    `GET /users` (collection query) from standard user.
    - *Result*: `PERMISSION_DENIED` (only admins can list profiles).

11. **Altering Creation Timestamps**
    `PATCH /matches/existing-id { createdAt: request.time }` (attempting to alter immutable metadata).
    - *Result*: `PERMISSION_DENIED`.

12. **Orphaned Writes**
    Writing with illegal, non-matching ids/keys.
    - *Result*: `PERMISSION_DENIED`.
