# Continuity Ledger (Pengawas Workspace)

- Goal (incl. success criteria): Maintain and develop the Pengawas Dashboard, a full-stack Bun/React app acting as a BFF and frontend for the `apiamis` Laravel backend. Success is when all backlog items (P0-P7) are implemented and the app is production-ready.
- Constraints/Assumptions: Do not alter the `apiamis` backend unless requested. Use `rtk` prefix for commands. Store token securely in httpOnly cookie. Design aesthetic is Neobrutalism.
- Key decisions: Use TanStack React Query for data fetching, React Router (pages) instead of TanStack Router. P4 and P5 have been implemented successfully beyond what was initially logged.
- State:
  - Done: P0-P3, P4 & P5 partial. Configured app for subpath deployment `/pengawasan/` and implemented dual login (SSO) from Arumanis.
  - Now: Waiting for user to test the dual login integration.
  - Next: Focus on remainder of P4, P5, or move to P6 (Backend Aggregation Gap) or P7 (Quality/Testing) based on user instructions.
- Open questions (UNCONFIRMED if needed): Is the subpath routing working smoothly in Coolify? Are we proceeding to implement P6 or P7 next?
- Working set (files/ids/commands): `vite.config.ts`, `server/index.ts`, `arumanis/src/features/auth/...`
