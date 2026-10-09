# Frontend Migration Plan: `navano-client`

Repository: `D:\MiT\MOD2\navano-client`. Stack: Next.js 14 (pages router), Apollo Client 3, MUI 5, next-i18next (`public/locales/{en,kr,ru}/common.json`). The package is still named `nestar-next`.

> The frontend migration must follow the backend phases. Phase F1 is safe at any time. Phases F2 to F4 must ship together with backend Phase 2, because the GraphQL schema changes.

## Step-by-step plan

| Step | Phase | Task | Files |
|---|---|---|---|
| 1 | F1 | Rename package `nestar-next` → `navano-client`, and replace "Nestar" in titles, meta tags, logos and footer | `package.json`, `pages/_document.tsx`, `libs/components/{Top,Footer}.tsx` |
| 2 | F1 | Baseline: run `npm run build` and `npm run lint` and record the results | — |
| 3 | F2 | Enums: `property.enum.ts` → `product.enum.ts`. `MemberType.AGENT` → `STORE`. `PROPERTY` → `PRODUCT` in like/view/comment/notification enums | `libs/enums/*` |
| 4 | F2 | Types: `libs/types/property/*` → `libs/types/product/*` (field mapping as in `BACKEND_MIGRATION.md` §7). Update `member.ts` (`memberProducts`) | `libs/types/*` |
| 5 | F2 | Config: remove `availableOptions`, `propertyYears` and `propertySquare`. Add the product type list (`FLOWER`, `CHOCOLATE`, `CAKE`) | `libs/config.ts` |
| 6 | F2 | Apollo operations: rename and update selection sets (table below) | `apollo/user/*.ts`, `apollo/admin/*.ts` |
| 7 | F3 | Pages: rename routes (table below) and update imports and router links | `pages/**` |
| 8 | F3 | Components: rename and remodel cards, filters and forms | `libs/components/**` |
| 9 | F3 | Filter UI: remove the rooms/beds/square/year filters and the Barter/Rent options. Keep the type (Flower/Chocolate/Cake), location and price filters | `libs/components/property/Filter.tsx`, `homepage/HeaderFilter.tsx` |
| 10 | F4 | i18n: update keys and values in `en`, `kr`, `ru` | `public/locales/*/common.json` |
| 11 | F4 | Admin panel: products list and store users | `pages/_admin/**`, `libs/components/admin/**` |
| 12 | F4 | Verify: `npm run build`, run a manual smoke test against the local `navano-api` | — |

## Page mapping

| Nestar page | Navano page | Notes |
|---|---|---|
| `pages/index.tsx` | `pages/index.tsx` | Sections: Top/Popular/Trend Products, Top Stores |
| `pages/property/index.tsx` | `pages/product/index.tsx` | Product list with filter |
| `pages/property/detail.tsx` | `pages/product/detail.tsx` | Product detail, reviews (comments) |
| `pages/agent/index.tsx` | `pages/store/index.tsx` | Store list (`getStores`) |
| `pages/agent/detail.tsx` | `pages/store/detail.tsx` | Store profile and products |
| `pages/mypage/index.tsx` | same | My Products / Add Product for STORE |
| `pages/member/index.tsx` | same | `MemberProducts` tab |
| `pages/_admin/properties/index.tsx` | `pages/_admin/products/index.tsx` | |
| `pages/_admin/users`, `community`, `cs` | unchanged | |
| `pages/community/*`, `cs`, `about`, `account/join` | unchanged | join: role option `AGENT` → `STORE` |

## Component mapping

| Nestar component | Navano component |
|---|---|
| `homepage/TopProperties.tsx`, `TopPropertyCard.tsx` | `homepage/TopProducts.tsx`, `TopProductCard.tsx` |
| `homepage/PopularProperties.tsx`, `PopularPropertyCard.tsx` | `homepage/PopularProducts.tsx`, `PopularProductCard.tsx` |
| `homepage/TrendProperties.tsx`, `TrendPropertyCard.tsx` | `homepage/TrendProducts.tsx`, `TrendProductCard.tsx` |
| `homepage/TopAgents.tsx`, `TopAgentCard.tsx` | `homepage/TopStores.tsx`, `TopStoreCard.tsx` |
| `common/PropertyBigCard.tsx` | `common/ProductBigCard.tsx` |
| `common/AgentCard.tsx` | `common/StoreCard.tsx` |
| `property/PropertyCard.tsx`, `property/Filter.tsx`, `property/Review.tsx` | `product/ProductCard.tsx`, `product/Filter.tsx`, `product/Review.tsx` |
| `agent/ReviewCard.tsx` | `store/ReviewCard.tsx` |
| `mypage/AddNewProperty.tsx`, `MyProperties.tsx`, `PropertyCard.tsx` | `mypage/AddNewProduct.tsx`, `MyProducts.tsx`, `ProductCard.tsx` |
| `member/MemberProperties.tsx` | `member/MemberProducts.tsx` |
| `admin/properties/PropertyList.tsx` | `admin/products/ProductList.tsx` |

## GraphQL operation rename plan

| File | Old constant / operation | New constant / operation |
|---|---|---|
| `apollo/user/query.ts` | `GET_AGENTS` / `getAgents` | `GET_STORES` / `getStores` |
| | `GET_PROPERTY` / `getProperty` | `GET_PRODUCT` / `getProduct` |
| | `GET_PROPERTIES` / `getProperties` | `GET_PRODUCTS` / `getProducts` |
| | `GET_AGENT_PROPERTIES` / `getAgentProperties` | `GET_STORE_PRODUCTS` / `getStoreProducts` |
| | `GET_FAVORITES`, `GET_VISITED` | same names, product selection set |
| `apollo/user/mutation.ts` | `CREATE_PROPERTY` / `createProperty` | `CREATE_PRODUCT` / `createProduct` |
| | `UPDATE_PROPERTY` / `updateProperty` | `UPDATE_PRODUCT` / `updateProduct` |
| | `LIKE_TARGET_PROPERTY` / `likeTargetProperty` | `LIKE_TARGET_PRODUCT` / `likeTargetProduct` |
| `apollo/admin/query.ts` | `GET_ALL_PROPERTIES_BY_ADMIN` | `GET_ALL_PRODUCTS_BY_ADMIN` |
| `apollo/admin/mutation.ts` | `UPDATE_PROPERTY_BY_ADMIN`, `REMOVE_PROPERTY_BY_ADMIN` | `UPDATE_PRODUCT_BY_ADMIN`, `REMOVE_PRODUCT_BY_ADMIN` |
| all | `memberProperties` field | `memberProducts` |
| unchanged | `SIGN_UP`, `LOGIN`, `UPDATE_MEMBER`, `LIKE_TARGET_MEMBER`, board-article, comment, follow ops | — |

Selection sets: remove `propertySquare/Beds/Rooms/Barter/Rent` and `constructedAt`, then add `productItemCount`. Rename the remaining `property*` fields to `product*` (`propertyType` → `productType`). Member selections get `memberAddress` and `memberProducts`.

## UI terminology changes

| Nestar term | Navano term |
|---|---|
| Property / Properties | Product / Products |
| Agent / Agents | Store / Stores |
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

Current i18n hits in `public/locales/*/common.json`: "Property" ×8, "Properties" ×4, "Agent" ×4, "Agents" ×4.
