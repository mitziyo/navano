# Frontend Migration Plan: `navano-client`

Repository: `D:\MiT\MOD2\navano-client`. Stack: Next.js 14 (pages router), Apollo Client 3, MUI 5, next-i18next (`public/locales/{en,kr,ru}/common.json`). Package manager: Yarn. The package is named `navano-client`.

> Status as of 2026-10-10: **F1–F4 are done in the working tree on branch `modification` (not committed yet).** See `COMPLETED_TASKS.md` §8.
>
> **AGENT naming (DECISIONS D8):** code, API calls, enums, types, routes and component names keep `AGENT` (`MemberType.AGENT`, `getAgents`, `getAgentProducts`, `/agent`, `AgentCard`). Only user-visible UI text says "Store" / "Stores".
>
> The frontend migration follows the backend phases. Phase F1 is safe at any time. Phases F2 to F4 ship together with backend Phase 2, because the GraphQL schema changes.

## Step-by-step plan

| Step | Phase | Task | Files | Status |
|---|---|---|---|---|
| 1 | F1 | Rename package `nestar-next` → `navano-client`, and replace "Nestar" in titles, meta tags and footer | `package.json`, `pages/_document.tsx`, `libs/components/layout/*`, `Footer.tsx` | Done |
| 2 | F0 | Baseline: run `yarn tsc --noEmit` and `yarn build` and record the results (lint skipped: no ESLint config) | — | Done |
| 3 | F2 | Enums: `property.enum.ts` → `product.enum.ts`. `PROPERTY` → `PRODUCT` in like/view/comment/notification enums. `MemberType` unchanged | `libs/enums/*` | Done |
| 4 | F2 | Types: `libs/types/property/*` → `libs/types/product/*` (field mapping as in `BACKEND_MIGRATION.md` §7). Update `member.ts` (`memberProducts`) | `libs/types/*` | Done |
| 5 | F2 | Config: remove `availableOptions`, `propertyYears` and `propertySquare`. Add the product type list (`FLOWER`, `CHOCOLATE`, `CAKE`) | `libs/config.ts` | Done |
| 6 | F2 | Apollo operations: rename and update selection sets (table below) | `apollo/user/*.ts`, `apollo/admin/*.ts` | Done |
| 7 | F3 | Pages: rename `property` routes (table below) and update imports and router links. `pages/agent/*` stays | `pages/**` | Done |
| 8 | F3 | Components: rename and remodel product cards, filters and forms. Agent components keep their names | `libs/components/**` | Done |
| 9 | F3 | Filter UI: remove the rooms/beds/square/year filters and the Barter/Rent options. Keep the type (Flower/Chocolate/Cake), location, price and text filters | `libs/components/product/Filter.tsx`, `homepage/HeaderFilter.tsx` | Done |
| 10 | F4 | i18n: update keys and values in `en`, `kr`, `ru` | `public/locales/*/common.json` | Done |
| 11 | F4 | Admin panel: products list with `HOLD`, AGENT users shown as "Store" | `pages/_admin/**`, `libs/components/admin/**` | Done |
| 12 | F4 | Verify: `yarn build`, run a manual smoke test against the local `navano-api` | — | Build and route smoke test done; data flow pending (see below) |

## Page mapping

| Nestar page | Navano page | Notes |
|---|---|---|
| `pages/index.tsx` | `pages/index.tsx` | Sections: Top/Popular/Trend Products, Top Stores (UI label) |
| `pages/property/index.tsx` | `pages/product/index.tsx` | Product list with filter |
| `pages/property/detail.tsx` | `pages/product/detail.tsx` | Product detail, reviews (comments) |
| `pages/agent/index.tsx` | unchanged | Store list in the UI, data from `getAgents` |
| `pages/agent/detail.tsx` | unchanged | Store profile and products (`getAgentProducts`) |
| `pages/mypage/index.tsx` | same | My Products / Add Product for `AGENT` |
| `pages/member/index.tsx` | same | `MemberProducts` tab |
| `pages/_admin/properties/index.tsx` | `pages/_admin/products/index.tsx` | |
| `pages/_admin/users`, `community`, `cs` | unchanged | |
| `pages/community/*`, `cs`, `about`, `account/join` | unchanged | join: role option label "Store", value stays `AGENT` |

## Component mapping

| Nestar component | Navano component |
|---|---|
| `homepage/TopProperties.tsx`, `TopPropertyCard.tsx` | `homepage/TopProducts.tsx`, `TopProductCard.tsx` |
| `homepage/PopularProperties.tsx`, `PopularPropertyCard.tsx` | `homepage/PopularProducts.tsx`, `PopularProductCard.tsx` |
| `homepage/TrendProperties.tsx`, `TrendPropertyCard.tsx` | `homepage/TrendProducts.tsx`, `TrendProductCard.tsx` |
| `homepage/TopAgents.tsx`, `TopAgentCard.tsx` | unchanged (UI text "Top Stores") |
| `common/PropertyBigCard.tsx` | `common/ProductBigCard.tsx` |
| `common/AgentCard.tsx` | unchanged (UI text "Store") |
| `property/PropertyCard.tsx`, `property/Filter.tsx`, `property/Review.tsx` | `product/ProductCard.tsx`, `product/Filter.tsx`, `product/Review.tsx` |
| `agent/ReviewCard.tsx` | unchanged |
| `mypage/AddNewProperty.tsx`, `MyProperties.tsx`, `PropertyCard.tsx` | `mypage/AddNewProduct.tsx`, `MyProducts.tsx`, `ProductCard.tsx` |
| `member/MemberProperties.tsx` | `member/MemberProducts.tsx` |
| `admin/properties/PropertyList.tsx` | `admin/products/ProductList.tsx` |

## GraphQL operation rename plan

| File | Old constant / operation | New constant / operation |
|---|---|---|
| `apollo/user/query.ts` | `GET_AGENTS` / `getAgents` | unchanged |
| | `GET_PROPERTY` / `getProperty(propertyId)` | `GET_PRODUCT` / `getProduct(productId)` |
| | `GET_PROPERTIES` / `getProperties` | `GET_PRODUCTS` / `getProducts` |
| | `GET_AGENT_PROPERTIES` / `getAgentProperties` | `GET_AGENT_PRODUCTS` / `getAgentProducts` |
| | `GET_FAVORITES`, `GET_VISITED` | same names, product selection set |
| `apollo/user/mutation.ts` | `CREATE_PROPERTY` / `createProperty` | `CREATE_PRODUCT` / `createProduct` |
| | `UPDATE_PROPERTY` / `updateProperty` | `UPDATE_PRODUCT` / `updateProduct` |
| | `LIKE_TARGET_PROPERTY` / `likeTargetProperty(propertyId)` | `LIKE_TARGET_PRODUCT` / `likeTargetProduct(productId)` |
| `apollo/admin/query.ts` | `GET_ALL_PROPERTIES_BY_ADMIN` | `GET_ALL_PRODUCTS_BY_ADMIN` |
| `apollo/admin/mutation.ts` | `UPDATE_PROPERTY_BY_ADMIN` | `UPDATE_PRODUCT_BY_ADMIN` |
| | `REMOVE_PROPERTY_BY_ADMIN` / `removePropertyByAdmin(propertyId)` | `REMOVE_PRODUCT_BY_ADMIN` / `removeProductByAdmin(input)` (the backend argument is `input`) |
| all | `memberProperties` field | `memberProducts` |
| unchanged | `SIGN_UP`, `LOGIN`, `UPDATE_MEMBER`, `LIKE_TARGET_MEMBER`, board-article, comment, follow ops | — |

Selection sets: remove `propertySquare/Beds/Rooms/Barter/Rent` and `constructedAt`, then add `productItemCount`. Rename the remaining `property*` fields to `product*` (`propertyType` → `productType`). Member selections use `memberProducts`. All 36 operations validate against the live `navano-api` schema.

## UI terminology changes

| Nestar term | Navano term |
|---|---|
| Property / Properties | Product / Products |
| Agent / Agents | Store / Stores (UI text only; code keeps `AGENT`) |
| Property type (Apartment, Villa, House) | Product type (Flower, Chocolate, Cake) |
| Location | Location (same cities) |
| Square, Beds, Rooms | Item count (`productItemCount`) |
| Barter, Rent | removed |
| Year built | removed |
| Hold (new status) | On hold |
| Sold | Sold out |
| Add New Property | Add New Product |
| My Properties | My Products |
| Top Agents | Top Stores |
| Recently Visited Properties | Recently Viewed Products |

## Remaining work

- **Wire the UI to the API.** The Apollo operations exist, but no page or component calls `useQuery` / `useMutation` yet. Lists use empty local state, and `AddNewProduct` insert/update handlers are empty stubs.
- **Type banner images:** add `public/img/banner/types/{flower,chocolate,cake}.webp`. Until then `HeaderFilter` shows a fallback background colour.
- **Real-estate leftovers in the UI:** `about` page copy, FAQ content, the "Floor Plans" block on product detail, static images `/img/property/*` and `apartmentMain.png`.
- **Lint:** the project has no ESLint config, so `next lint` cannot run without interactive setup.
