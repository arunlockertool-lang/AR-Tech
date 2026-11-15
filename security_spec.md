# AR Tech Security Specification

## 1. Data Invariants
1. **Zero Internal Cost Exposure**: Internal costs (`domainCost`, `hostingCost`, `otherCosts`, `profitMargin`) exist ONLY in `/website_costs/{websiteId}` and `/settings/private`. Customers can only read `sellingPrice` on `/websites/{websiteId}` when `published == true`.
2. **Identity Integrity**: Verified users creating `/orders`, `/customers`, `/messages`, or `/agent_logs` MUST set `userId == request.auth.uid`.
3. **Immutable Ownership & Timestamps**: `userId` and `createdAt` cannot be modified after creation. `createdAt == request.time` on create; `updatedAt == request.time` on create/update.
4. **Terminal State Locking**: Orders with `status == 'completed'` or `status == 'cancelled'` cannot be mutated by non-admin users.
5. **Strict Admin Gate**: Admin privileges are verified solely via `request.auth.token.email_verified == true` matching the bootstrapped admin email or existence in `/admins/{uid}`. Never trust client claims.
6. **PII Isolation**: `/customers`, `/orders`, `/messages`, and `/agent_logs` cannot be blanket-read by signed-in users; `list` and `get` enforce `resource.data.userId == request.auth.uid || isAdmin()`.

## 2. Dirty Dozen Attack Payloads (Verified Denied)
1. Unauthenticated read of `/website_costs/{id}` -> `PERMISSION_DENIED`
2. Authenticated non-admin read of `/website_costs/{id}` -> `PERMISSION_DENIED`
3. Authenticated non-admin read of `/settings/private` -> `PERMISSION_DENIED`
4. Authenticated non-admin write to `/websites/{id}` -> `PERMISSION_DENIED`
5. Shadow field injection on `/orders/{id}` (`{ ..., isPaid: true }`) -> `PERMISSION_DENIED`
6. Identity spoofing on `/orders/{id}` (`userId: "other-uid"`) -> `PERMISSION_DENIED`
7. Unverified email spoofing admin email (`email_verified: false`) -> `PERMISSION_DENIED`
8. Non-admin listing all `/customers` without `userId == auth.uid` -> `PERMISSION_DENIED`
9. Client-forged `createdAt` timestamp not equal to `request.time` -> `PERMISSION_DENIED`
10. Updating a `completed` order back to `pending` as non-admin -> `PERMISSION_DENIED`
11. Oversized string injection (>128 chars) in document ID -> `PERMISSION_DENIED`
12. Self-elevation write into `/admins/{uid}` by non-admin -> `PERMISSION_DENIED`
