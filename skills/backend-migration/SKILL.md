---
name: backend-migration
description: Continue the Nestar to Navano backend modification (Property → Product, AGENT → STORE) while preserving the current NestJS architecture. Use when implementing the next migration step from docs/ai/NEXT_STEPS.md.
---

# Backend Migration (Nestar → Navano)

## Before starting

1. Read `AGENTS.md` and every file in `docs/ai/`.
2. Pick the highest-priority open backend task from `docs/ai/NEXT_STEPS.md`.
3. Record the validation baseline (see Validation below).
4. Make a short plan and get it approved before editing.

## Migration target

The data model `D:\MiT\MOD2\navanoo.pdf` is the source of truth (`docs/ai/DECISIONS.md` D11).

| Nestar | Navano |
|---|---|
| `Property` entity, `properties` collection | `Product` entity, `products` collection |
| `PropertyType` (`APARTMENT`, `VILLA`, `HOUSE`) | `ProductType` (`FLOWER`, `CHOCOLATE`, `CAKE`) |
| `PropertyStatus` (`ACTIVE`, `SOLD`, `DELETE`) | `ProductStatus` (`HOLD`, `ACTIVE`, `SOLD`, `DELETE`) |
| `PropertyLocation` | `ProductLocation` (same values) |
| `propertySquare`, `propertyBeds`, `propertyRooms`, `propertyBarter`, `propertyRent`, `constructedAt` | removed |
| (new) | `productItemCount` (int, required) |
| `MemberType.AGENT` | `MemberType.STORE` |
| `memberProperties` | `memberProducts` |
| (new) | `memberAddress` (string, optional) |
| group enums `PROPERTY` | `PRODUCT` |
| `getAgents`, `getAgentProperties` | `getStores`, `getStoreProducts` |

Full mapping: `docs/ai/BACKEND_MIGRATION.md` §4.2–§7.

## Step order

Work in this order. Each step must leave the code compiling.

1. **Enums:** `libs/enums/property.enum.ts` → `product.enum.ts`, `member.enum.ts` (`STORE`), `like` / `view` / `comment` / `notification` enums (`PRODUCT`).
2. **Schemas:** `schemas/Property.model.ts` → `Product.model.ts` (collection `products`), `Member.model.ts`, `Notification.model.ts` (`productId`).
3. **DTOs:** `libs/dto/property/*` → `libs/dto/product/*`, plus `libs/dto/member/*`.
4. **Config:** `libs/config.ts` (sorts, remove `availableOptions`, `lookupFavorite` / `lookupVisit`).
5. **Product module:** `components/property/*` → `components/product/*`, registered in `components.module.ts`.
6. **Couplings:** `comment` (`productStatsEditor`), `like` and `view` (`from: 'products'`), and `member` (`getStores`).
7. **Batch:** `apps/navano-batch` (`BATCH_TOP_PRODUCTS`, `BATCH_TOP_STORES`).

## Rules

- Rename files with `git mv` so their history is kept.
- Keep the resolver/service/module pattern, guards (`AuthGuard`, `RolesGuard`, `WithoutGuard`) and decorators (`@AuthMember`, `@Roles`).
- Do not change auth, follow, board-article, socket or database logic.
- Do not implement Order/Cart (Phase 3).
- Do not change the DB name in `.env`.
- Fix the known bugs from `docs/ai/BACKEND_MIGRATION.md` §8 only in the file you are already touching, or as a separate task.

## Validation

```bash
npx tsc -p apps/navano-api/tsconfig.app.json --noEmit
npx tsc -p apps/navano-batch/tsconfig.app.json --noEmit
npx nest build navano-api
npx nest build navano-batch
npx eslint "apps/**/*.ts"          # no --fix; must not exceed the baseline (397)
grep -rni "propert\|agent" apps    # only intentional leftovers
```

## Finish

- Update `docs/ai/COMPLETED_TASKS.md` with the changed files and the validation table.
- Update the statuses in `docs/ai/NEXT_STEPS.md` and `docs/ai/BACKEND_MIGRATION.md`.
- Commit only when the user asks.
