# Next Steps (priority order)

Updated 2026-10-15. Phase 2 (Product), the client migration, CS, notifications, the admin dashboard, Navano AI and the responsive layout are done (see `COMPLETED_TASKS.md` §20–§26).

## Security (before any deploy)
| # | Task | Notes |
|---|---|---|
| 1 | **Rotate the MongoDB Atlas password** | The `.env` value was exposed in a session transcript |
| 2 | Valid `ANTHROPIC_API_KEY` | The current local value is not an Anthropic key (401), so Navano AI answers "unavailable" |

## Deploy preparation
| # | Task | Notes |
|---|---|---|
| 1 | `start:prod:batch` | Add `NODE_ENV=production` like `start:prod` |
| 2 | CORS whitelist | Allow only the client domain |
| 3 | GraphQL playground / introspection | Off in production |
| 4 | Guard `console.log`s | Remove the debug logs in the auth / roles / without guards |
| 5 | Builds | `nest build` for both apps; `yarn build` for the client (only while `yarn dev` is stopped) |
| 6 | Server | PM2 for api + batch, nginx reverse proxy (HTTP + WebSocket), env on the server, `uploads/` on persistent storage. Needs the server, domain and DB details from the user |
| 7 | Link previews | OG / Twitter tags with absolute image URLs once a public domain exists |

## Features
| # | Task | Notes |
|---|---|---|
| 1 | Orders and cart (Phase 3, D9) | Payment, stock, delivery scheduling |
| 2 | Square store avatars | `AGENT` avatars as a rounded square (logo style) in store cards, store page, navbar and comments; customers keep the round avatar |
| 3 | Avatar hint for stores | Next to the photo upload on My Page: "Upload your logo or a signature product photo" (i18n `en` / `kr` / `ru`) |
| 4 | Navano AI provider | Optional switch from Claude to Gemini was discussed, not decided (D12 stands until then) |
| 5 | Notifications over WebSocket | Optional, replaces the 30 s polling (D14) |

## Backend cleanup
| # | Task | Notes |
|---|---|---|
| 1 | Re-export `navanoo.pdf` | `D:\MiT\MOD2\navanoo.dmm` matches the Phase 2 code; the new `inquiries` collection and `NotificationType.FOLLOW` are not in it yet |
| 2 | Separate lint-fix commit | Review `eslint --fix` output on its own (D6) |
| 3 | Jest and `uuid` | `uuid` is ESM-only: specs that import `libs/config.ts` must `jest.mock('uuid')`, or add a Jest `transformIgnorePatterns` / `moduleNameMapper` fix |

## Testing
| # | Task |
|---|---|
| 1 | E2e for `GET /` and the GraphQL health of both apps (`apps/*/test/app.e2e-spec.ts` still uses the Nest starter) |
| 2 | E2e flow: signup AGENT → createProduct → USER like → owner gets a notification → createComment → inquiry → admin answer |
| 3 | Batch: unit-test the rank formulas |
| 4 | WebSocket chat connect with and without token |
| 5 | Real Navano AI replies once a valid key is set |

## Documentation
| # | Task |
|---|---|
| 1 | Update `BACKEND_MIGRATION.md` statuses |
| 2 | Extend `AGENTS.md` with the domain glossary (Product, Agent = Store in the UI, ProductType) |
| 3 | GraphQL API reference (schema snapshot or op list) for the frontend |
