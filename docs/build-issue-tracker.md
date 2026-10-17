# Build issue tracker

Verified locally on October 17, 2026 with .NET SDK 10.0.400, Node.js 22.23.2, and npm 10.9.8.

| ID | Status | Failure and cause | Resolution |
| --- | --- | --- | --- |
| BE-01 | Resolved | Backend build failed with three `CS0182` errors in `OwnerController`. `IdentityConstants.ApplicationScheme` is `static readonly`, so it cannot be an attribute argument. | Registered a named legacy-upgrade authorization policy using the framework's scheme value. All three legacy actions now reference the policy through a compile-time constant. |
| FE-01 | Resolved | Frontend lint failed with `no-undef` for `URL` in `tests/invitations.test.mjs`. The ESLint configuration only declared browser globals for TypeScript files. | Declared Node globals specifically for the Node `.mjs` tests, preserving undefined-variable checks. |

The frontend production build, typecheck, and tests already passed before these fixes; its failing check was lint.

## Verification results

| Check | Result |
| --- | --- |
| `dotnet build DecoMyLantern.slnx --configuration Release` (initial reproduction) | Failed with BE-01; package restore succeeded. |
| `dotnet build DecoMyLantern.slnx --no-restore --configuration Release` (after fix) | Passed; zero warnings and errors. |
| `dotnet test DecoMyLantern.slnx --no-build --configuration Release` | Passed; 50 tests, zero failures or skips. |
| `npm run lint` in `src/frontend` | Passed. |
| `npm run typecheck` in `src/frontend` | Passed. |
| `npm run test` in `src/frontend` | Passed; 18 tests, zero failures or skips. |
| `npm run build` in `src/frontend` | Passed; TypeScript and Vite production bundle. |
| API and Vite startup | Passed on ports 5050 and 5173. The sandbox initially prevented local server access; rerunning with approved local-server permissions succeeded. |
| Direct and proxied `GET /api/health` | Both returned 200 with `{"status":"ok"}`. |
| Frontend `GET /` | Returned 200. |
| Proxied `GET /api/owner/me` without credentials | Returned 401. |
| Proxied legacy CSRF, legacy availability, and legacy upgrade endpoints without credentials | All returned 401, confirming the policy resolves and requires authentication. |
| Proxied `GET /api/owner/csrf` | Returned 200 with a token and cookie. |
| Proxied `GET /api/designs` | Returned 200 using the configured SQL database. |

Browser automation was unavailable, so visual rendering and full owner/guest write workflows were not verified. A successful upgrade with an existing legacy host cookie also remains a manual check. No database schema changes were made.

## Run for manual testing

From the repository root, start the API:

```bash
dotnet run --project src/backend/DecoMyLantern.Api
```

In a second terminal, start the frontend:

```bash
cd src/frontend
npm run dev
```

Open <http://localhost:5173>. Use the existing development SQL configuration and apply the committed migrations as described in [the setup guide](setup-guide.md).
