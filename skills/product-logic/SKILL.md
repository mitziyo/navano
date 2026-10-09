---
name: product-logic
description: Review Navano product GraphQL, DTO, schema, enum, filter and naming consistency. Use after product changes or before a commit, to find mismatches between layers. Read-only unless the user asks for fixes.
---

# Product Logic Review

## Scope

| Layer | Files (`apps/navano-api/src/`) |
|---|---|
| Enum | `libs/enums/product.enum.ts`, `member.enum.ts`, `like` / `view` / `comment` / `notification.enum.ts` |
| Schema | `schemas/Product.model.ts`, `Member.model.ts`, `Notification.model.ts` |
| DTO | `libs/dto/product/product.ts`, `product.input.ts`, `product.update.ts` |
| Config | `libs/config.ts` (`availableProductSorts`, lookups) |
| Module | `components/product/product.{module,resolver,service}.ts` |
| Couplings | `components/{comment,like,view,member}/*`, `apps/navano-batch/src/*` |

Expected model: `docs/ai/BACKEND_MIGRATION.md` §7 and `AGENTS.md` Domain Rules.

## Checklist

### 1. Enums
- [ ] `ProductType` = `FLOWER`, `CHOCOLATE`, `CAKE`
- [ ] `ProductStatus` = `HOLD`, `ACTIVE`, `SOLD`, `DELETE`
- [ ] `ProductLocation` values unchanged
- [ ] Every enum calls `registerEnumType` with the same name
- [ ] `MemberType` = `USER`, `STORE`, `ADMIN`. Group enums use `PRODUCT`

### 2. Schema ↔ DTO
- [ ] Every schema field exists in `Product` (output DTO) with a matching type: `double` → `Number`, `int` → `Int`, array → `[String]`
- [ ] Required schema fields are `@IsNotEmpty()` in `ProductInput`. Optional ones use `@IsOptional()` and `nullable: true`
- [ ] Field types are correct (no `productTitle!: ProductType`-style mistakes)
- [ ] `productItemCount` is `Int` with `@Min(0)`
- [ ] No real-estate fields remain: square, beds, rooms, barter, rent, constructedAt
- [ ] `ProductUpdate` covers the editable fields only and requires `_id`

### 3. Filters and inquiries
- [ ] Search inputs (`ProductsInquiry`, `StoreProductsInquiry`, `AllProductsInquiry`) only reference existing fields (`typeList`, `locationList`, `pricesRange`, `periodsRange`, `text`)
- [ ] `sort` uses `@IsIn(availableProductSorts)`, and every sort key exists in the schema
- [ ] The service's match builder handles every search field and nothing extra

### 4. GraphQL
- [ ] Operation names match `docs/ai/BACKEND_MIGRATION.md` §6
- [ ] Guards: STORE for create/update/getStoreProducts, ADMIN for `*ByAdmin`, `WithoutGuard` for public reads, `AuthGuard` for like/favorites/visited
- [ ] Return types use `Product` / `Products`, not `Property`

### 5. Cross-module consistency
- [ ] `productStatsEditor` keys (`productViews`, `productLikes`, `productComments`) exist in the schema
- [ ] `like` / `view` lookups use `from: 'products'`, and `config.ts` lookups use `favoriteProduct` / `visitedProduct`
- [ ] The member counter `memberProducts` is updated on create and delete
- [ ] Batch uses the `Product` model and the `productLikes` / `productViews` rank formula

### 6. Naming
- [ ] `grep -rni "propert\|agent" apps` returns no unintended hits, including comments and log messages

## Output

Report the findings as a table (`file:line`, layer, issue, suggested fix), most severe first. Do not edit files unless the user asks.
