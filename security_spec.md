# Security Specification for ViraLab Firestore Database

## 1. Data Invariants
1. **User Identity Boundary**: Every document under `/users/{userId}` belongs strictly to the authenticated user whose `request.auth.uid == userId`.
2. **Author Identity Integrity**: When creating or updating records in `/users/{userId}/saved_simulations/{simulationId}` or `/users/{userId}/simulation_logs/{logId}`, the `userId` field inside the document payload MUST equal `request.auth.uid`.
3. **No Cross-Tenant Read/Write**: Unauthenticated users and users with differing UIDs have 0 read or write access to another user's documents or subcollections.
4. **Document ID Format**: All document IDs must conform to alphanumeric and hyphen/underscore pattern `^[a-zA-Z0-9_\\-]+$`.

## 2. The Dirty Dozen Security Payloads & Rejection Expectations
1. **Unauthenticated Read on User Profile**: Reject with PERMISSION_DENIED.
2. **Cross-User Profile Read (`user_B` reads `users/user_A`)**: Reject with PERMISSION_DENIED.
3. **Cross-User Profile Write (`user_B` writes `users/user_A`)**: Reject with PERMISSION_DENIED.
4. **Forged Author UID (`user_A` writes `saved_simulations/sim1` with `userId: "user_B"`)**: Reject with PERMISSION_DENIED.
5. **Orphan Write without Auth**: Reject with PERMISSION_DENIED.
6. **Path Traversal / Malformed Document ID (`users/{userId}/saved_simulations/..%2F..`)**: Reject with PERMISSION_DENIED.
7. **Cross-User Simulation Log Read**: Reject with PERMISSION_DENIED.
8. **Cross-User Simulation Log Delete**: Reject with PERMISSION_DENIED.
9. **Payload with Missing Required Fields (e.g. missing `config` or `name`)**: Reject with validation error.
10. **Payload Exceeding Safe String Size**: Reject with size limit error.
11. **Malicious Script Injection in Simulation Label**: Guarded by length and schema restrictions.
12. **Unauthenticated List Query across Users Collection**: Reject with PERMISSION_DENIED.
