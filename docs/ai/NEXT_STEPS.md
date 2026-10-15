# Next Steps (priority order)

## Backend cleanup
| # | Task | Notes |
|---|---|---|
| 1 | Commit the Phase 2 Property → Product changes on branch `modification` | Done in the working tree, validated (tsc, build, lint 397, unit tests) |
| 2 | Runtime smoke test | `npm run start:dev` → `GET /` returns "Welcome to Navano API Server!", the playground loads. Run `createProduct` (AGENT), `getProducts(typeList: [FLOWER])`, `likeTargetProduct`, `getFavorites`, `createComment(PRODUCT)`. `npm run start:dev:batch` logs "NAVANO BATCH SERVER READY!" |
| 3 | Database | New dev DB name (e.g. `navano`) in `.env`, then seed AGENT members and products. Old `properties` documents do not match the new schema |
| 4 | Re-export `navanoo.pdf` | `D:\MiT\MOD2\navanoo.dmm` now matches the code (`products`, `productItemCount`, `notifications.productId`, `memberProducts`, no `constructedAt`). Open it in Datensen and export it over `navanoo.pdf` |
| 5 | Jest and `uuid` | `uuid` is ESM-only, so specs that import `libs/config.ts` must `jest.mock('uuid')` (see `product.service.spec.ts`), or add a Jest `transformIgnorePatterns` / `moduleNameMapper` fix |
| 6 | Separate lint-fix commit | 397 pre-existing problems. Review `eslint --fix` output on its own |

## Frontend migration (`navano-client`)
| # | Task |
|---|---|
| 1 | F1: rename package `nestar-next` → `navano-client`, branding text |
| 2 | Record build/lint baseline |
| 3 | F2: enums, types, config, Apollo ops (after backend Phase 2 GraphQL is stable) |
| 4 | F3: pages `property` → `product`, `agent` → `store`, components, filters |
| 5 | F4: i18n `en`/`kr`/`ru`, admin panel |

## Store identity (`navano-client`)
Stores are brands, not people: their avatar should be a logo or a signature product, not a portrait (demo stores already use product photos, set by `scripts/seed-demo.mjs` `avatarProduct`).

| # | Task | Notes |
|---|---|---|
| 1 | Square store avatars | Show `AGENT` avatars as a rounded square (logo style) in store cards, store page, navbar and comments; customers keep the round avatar |
| 2 | Avatar hint for stores | Next to the photo upload on My Page, stores see "Upload your logo or a signature product photo" (i18n `en` / `kr` / `ru`) |

## Testing
| # | Task |
|---|---|
| 1 | Add e2e for `GET /` and the GraphQL health of both apps (`apps/*/test/app.e2e-spec.ts` currently uses the Nest starter) |
| 2 | E2e flow: signup AGENT → createProduct → getProducts (typeList) → USER likeTargetProduct → getFavorites → createComment (PRODUCT) → `productComments` increments |
| 3 | Batch: unit-test the rank formulas (`likes*2 + views`, store formula) |
| 4 | WebSocket chat connect with and without token |

## Documentation
| # | Task |
|---|---|
| 1 | Update `docs/ai/BACKEND_MIGRATION.md` statuses after each phase |
| 2 | Extend `AGENTS.md` with the domain glossary (Product, Agent, ProductType) |
| 3 | Document the GraphQL API (generated schema snapshot or an op list) for the frontend |

## Security
| # | Task |
|---|---|
| 1 | **Rotate the MongoDB Atlas password.** The `.env` value was exposed in a session transcript |
| 2 | Add `.env.example` with empty keys |
