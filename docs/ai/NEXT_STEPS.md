# Next Steps (priority order)

## Backend cleanup
| # | Task | Notes |
|---|---|---|
| 1 | Commit `docs/` on branch `modification` | Phase 1 rename is already committed (`7856ad9`) |
| 2 | Runtime smoke test | `npm run start:dev` → `GET /` returns "Welcome to Navano API Server!", the playground loads. `npm run start:dev:batch` logs "NAVANO BATCH SERVER READY!" |
| 3 | Fix the known bugs | `batch.service.ts`: `MemberType:` → `memberType:`, and `findOneAndUpdate(_id, …)` → `findByIdAndUpdate`. `property.input.ts`: `propertyAddress/Title` typed `string`. `board-article.resolver.ts:40` log text |
| 4 | Phase 2a: enums + schema + DTOs | `product.enum.ts`, `Product.model.ts`, `libs/dto/product/*`, `MemberType.STORE`, group enums `PRODUCT` |
| 5 | Phase 2b: product module | `components/product/*`, `components.module.ts`, `comment` / `like` / `view` couplings, `libs/config.ts` |
| 6 | Phase 2c: member | `getStores`, `StoresInquiry`, `memberProducts`, `@Roles` updates |
| 7 | Phase 2d: batch | `BATCH_TOP_PRODUCTS`, `BATCH_TOP_STORES`, `Product` model |
| 8 | Database | New dev DB name (e.g. `navano`) in `.env`, then seed STORE members and products |
| 9 | `grep -rni "propert\|agent"` clean-up | Includes comments (several Uzbek comments mention "property") |
| 10 | Separate lint-fix commit | 397 pre-existing problems. Review `eslint --fix` output on its own |

## Frontend migration (`navano-client`)
| # | Task |
|---|---|
| 1 | F1: rename package `nestar-next` → `navano-client`, branding text |
| 2 | Record build/lint baseline |
| 3 | F2: enums, types, config, Apollo ops (after backend Phase 2 GraphQL is stable) |
| 4 | F3: pages `property` → `product`, `agent` → `store`, components, filters |
| 5 | F4: i18n `en`/`kr`/`ru`, admin panel |

## Testing
| # | Task |
|---|---|
| 1 | Add e2e for `GET /` and the GraphQL health of both apps (`apps/*/test/app.e2e-spec.ts` currently uses the Nest starter) |
| 2 | E2e flow: signup STORE → createProduct → getProducts (collectionList) → USER likeTargetProduct → getFavorites → createComment (PRODUCT) → `productComments` increments |
| 3 | Batch: unit-test the rank formulas (`likes*2 + views`, store formula) |
| 4 | WebSocket chat connect with and without token |

## Documentation
| # | Task |
|---|---|
| 1 | Update `docs/BACKEND_MIGRATION.md` statuses after each phase |
| 2 | Fill in `SKILLS.md` (currently only a heading) and extend `AGENTS.md` with the domain glossary (Product, Store, Collection) |
| 3 | Document the GraphQL API (generated schema snapshot or an op list) for the frontend |

## Security
| # | Task |
|---|---|
| 1 | **Rotate the MongoDB Atlas password.** The `.env` value was exposed in a session transcript |
| 2 | Add `.env.example` with empty keys |
