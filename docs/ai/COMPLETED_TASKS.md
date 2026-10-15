# Completed Tasks (session 2026-10-09)

## 1. Codebase analysis
- Mapped the monorepo: `apps/*-api` (GraphQL modules, socket gateway) and `apps/*-batch` (3 cron jobs).
- Found every Property/Agent coupling outside the property module: `like.service.ts`, `view.service.ts`, `comment.service.ts`/`comment.module.ts`, `member.*`, `libs/config.ts`, group enums, `Notification.model.ts`, batch.
- Found pre-existing bugs (not fixed yet, see `NEXT_STEPS.md`).

## 2. Phase 2 domain design (agreed, not implemented)
- Property → Product with `productType` FLOWER / CHOCOLATE / CAKE, `productStatus` HOLD/ACTIVE/SOLD/DELETE, `productItemCount`, `memberAddress` (per `navanoo.pdf`, see DECISIONS D11).
- AGENT → STORE. (Later dropped: `AGENT` is kept, see DECISIONS D8.)
- Order/Cart deferred.
- Full mapping in `BACKEND_MIGRATION.md` §4.2 and §5 to §7.

## 3. Phase 1: safe rename layer (done, committed in `7856ad9 fix: Modify project name into Navano`)

| File | Change |
|---|---|
| `apps/nestar-api/**` → `apps/navano-api/**` | `git mv` (all files, 100% rename) |
| `apps/nestar-batch/**` → `apps/navano-batch/**` | `git mv` |
| `nest-cli.json` | `sourceRoot`, `root`, `tsConfigPath`, project keys `navano-api` / `navano-batch` |
| `package.json` | `name: navano`; scripts `start:dev:batch`, `start:prod`, `start:prod:batch`, `test:e2e` |
| `package-lock.json` | root `name` ×2 |
| `apps/navano-api/tsconfig.app.json` | `outDir: ../../dist/apps/navano-api` |
| `apps/navano-batch/tsconfig.app.json` | `outDir: ../../dist/apps/navano-batch` |
| `apps/navano-batch/src/batch.module.ts` | schema import paths |
| `apps/navano-batch/src/batch.service.ts` | DTO/enum import paths; welcome text |
| `apps/navano-batch/src/batch.controller.ts` | ready log label |
| `apps/navano-batch/test/app.e2e-spec.ts` | `describe` label |
| `apps/navano-api/src/app.service.ts` | welcome text |
| `README.md` | replaced the NestJS starter text with Navano docs |
| `dist/` | deleted and rebuilt (gitignored) |

Not changed on purpose: GraphQL API, enums, `BATCH_*` constant values, Mongo collections, `.env` DB name, `uploads/`.

## 4. Validation

| Check | Before | After |
|---|---|---|
| `npx tsc --noEmit -p apps/<api>/tsconfig.app.json` | 0 errors | 0 errors |
| `npx tsc --noEmit -p apps/<batch>/tsconfig.app.json` | 0 errors | 0 errors |
| `npx eslint "apps/**/*.ts"` (no `--fix`) | 397 (371 errors, 26 warnings) | 397 (identical) |
| `npx nest build navano-api` | — | success (`dist/apps/navano-api/main.js`) |
| `npx nest build navano-batch` | — | success (`dist/apps/navano-batch/main.js`) |
| `grep -rni nestar` (excluding node_modules, .git, .env) | 12 files | 0 |
| Runtime smoke test (`npm run start:dev`) | not run | not run |
| Unit / e2e tests | not run | not run |

## 5. Documentation
- Created `docs/` with: `BACKEND_MIGRATION.md`, `DECISIONS.md`, `FRONTEND_MIGRATION.md`, `COMPLETED_TASKS.md`, `NEXT_STEPS.md`, `PROMPTS.md`. No source code changed.

## 6. Phase 2: Property → Product (done in the working tree on branch `modification`)

Decision: `MemberType` stays `USER` / `AGENT` / `ADMIN` (DECISIONS D8). Schema follows `navanoo.pdf` (D11).

| Area | Change |
|---|---|
| Moves (`git mv`) | `property.enum.ts` → `product.enum.ts`, `Property.model.ts` → `Product.model.ts`, `libs/dto/property/*` → `libs/dto/product/*`, `components/property/*` → `components/product/*` |
| Enums | `ProductType` `FLOWER/CHOCOLATE/CAKE`, `ProductStatus` `HOLD/ACTIVE/SOLD/DELETE`, `ProductLocation`. `Like/View/Comment/NotificationGroup.PROPERTY` → `PRODUCT` |
| Schema | `Product` model, collection `products`, `productItemCount` added. Removed square/beds/rooms/barter/rent/`constructedAt`. Unique index on `productType/Location/Title/Price`. `Member`: `memberProducts`, `memberAddress` added to the schema. `Notification`: `productId` (ref `Product`) |
| DTOs | `Product`, `Products`, `ProductInput`, `ProductUpdate`, `ProductsInquiry`, `AgentProductsInquiry`, `AllProductsInquiry`. Removed `SquaresRange`, `roomsList`, `bedsList`, `options` |
| GraphQL | `createProduct`, `getProduct(productId)`, `updateProduct`, `getProducts`, `getAgentProducts`, `likeTargetProduct(productId)`, `getAllProductsByAdmin`, `updateProductByAdmin`, `removeProductByAdmin`. `getFavorites` / `getVisited` return `Products` |
| Couplings | `components.module.ts`, `comment.*` (`productStatsEditor`, `productComments`), `like.service.ts` (`getFavoriteProducts`), `view.service.ts` (`getVisitedProducts`), `libs/config.ts` (`availableProductSorts`, `favoriteProduct` / `visitedProduct` lookups; `availableOptions` removed) |
| Batch | `Product` model, `batchTopProducts`, `BATCH_TOP_PRODUCTS`; `batchTopAgents` uses `memberProducts` |
| Bug fixes | batch `MemberType:` → `memberType:`; `findOneAndUpdate(_id…)` → `findByIdAndUpdate`; `productAddress/Title` typed `string`; board-article log text; `soldAt` / `deletedAt` now saved on update; `memberAddress` now persisted |
| Tests | `components/product/product.service.spec.ts`: `shapeMatchQuery`, `getAgentProducts` DELETE guard, `updateProduct` SOLD flow |
| Docs | `AGENTS.md`, `skills/backend-migration/SKILL.md`, `DECISIONS.md` (D8 rewritten, duplicate D11 removed), `BACKEND_MIGRATION.md`, `NEXT_STEPS.md` |

### Validation

| Check | Result |
|---|---|
| `npx tsc --noEmit` api / batch | 0 errors / 0 errors |
| `npx nest build navano-api` / `navano-batch` | success / success |
| `npx eslint "apps/**/*.ts"` | 397 (371 errors, 26 warnings), same as the baseline |
| `npx jest apps/navano-api/src/components/product` | 3 passed |
| `grep -rniE "propert" apps --include=*.ts` | 0 |
| Runtime smoke test | not run |

## 7. Fix: member lookups pointed at a missing collection (2026-10-10)

- **Symptom:** `getProducts` returned `list: []` with `metaCounter.total: 2` in Postman.
- **Cause:** `cc3c6ba` renamed the Member collection `member` → `members`, but the five `$lookup` helpers in `libs/config.ts` still used `from: 'member'`. The join found nothing and `$unwind: '$memberData'` dropped every row. This also hit `getAgentProducts`, `getAllProductsByAdmin`, `getFavorites`, `getVisited`, board articles, comments and follows.
- **Fix:** `lookupMember`, `lookupFollowingData`, `lookupFollowerData`, `lookupFavorite`, `lookupVisit` now use `from: 'members'`.
- **Test:** `libs/config.spec.ts` checks that every member lookup uses `MemberSchema`'s collection name.
- **Validation:** tsc api/batch 0 errors, both builds pass, eslint 397 (baseline), jest 4 passed. A read-only DB check showed 2 ACTIVE products survive the join with `members` and 0 with `member`.

## 8. Frontend migration F1–F4 in `navano-client` (2026-10-10)

Done in the working tree on branch `modification` (not committed yet). Plan: `FRONTEND_MIGRATION.md`.

Decision: code, API calls, enums, types, routes and component names keep `AGENT` (D8). Only visible UI text says "Store" / "Stores".

| Phase | Change |
|---|---|
| F0 | Baseline: `yarn tsc --noEmit` 0 errors, `yarn build` success. Lint skipped (no ESLint config) |
| F1 | `package.json` name `navano-client`. "Nestar" text replaced in `_document.tsx` (SEO meta), `Layout{Home,Basic,Full}.tsx`, `Footer.tsx`, `join.tsx`, `community/index.tsx` and mobile placeholders |
| F2 | `product.enum.ts` (`FLOWER/CHOCOLATE/CAKE`, `HOLD/ACTIVE/SOLD/DELETE`); group enums `PRODUCT`; `libs/types/product/*` per `BACKEND_MIGRATION.md` §7; `memberProducts` in types, JWT payload, `userVar` and auth; `config.ts` drops options/years/square and adds `productTypes`; Apollo ops renamed (`removeProductByAdmin(input)`) |
| F3 | `git mv` of `pages/property` → `pages/product`, `_admin/properties` → `_admin/products`, product components and SCSS. Cards and detail page show type, location, item count and status. `AddNewProduct` uses Item Count, upload target `product`. `Filter.tsx` and `HeaderFilter.tsx` drop rooms/beds/square/year/options; HeaderFilter advanced modal keeps a price range; type tiles get a fallback colour until the type images exist |
| F4 | UI text: "Top Stores", "Store", "No Stores found!", join label "Store" (value `AGENT`), footer links. Locales `en/kr/ru`: `Products`, `Product type`, `Product Search`; `Agents` → Stores; `Agent Page` → Store Page; `Rooms` removed. Admin: `HOLD` tab ("On hold"), "Sold out", product list column "STORE", AGENT members shown as "STORE" |

### Validation

| Check | Result |
|---|---|
| `yarn tsc --noEmit` | 0 errors |
| `yarn build` | success (`/product`, `/product/detail`, `/_admin/products`, `/agent`) |
| Apollo ops vs live `navano-api` schema (`graphql.validate`) | 36 / 36 valid |
| `grep -rni propert apollo libs pages scss` | only static image paths and the FAQ category |
| `yarn dev` route smoke test (13 routes) | all 200 |
| Data flow (list, like, add product) | not testable yet: the UI does not call the API (no `useQuery` / `useMutation`) |

## 9. `navano-client`: API wiring ported from the reference project (2026-10-10)

Source: `D:/MiT/Nestar O'quv/nestar-next` (the finished Nestar client built from the same template). Method: a 3-way merge per file, with base = the original template (`navano-client` `bfbf507`) and reference = the finished file, both run through the same property → product rename. This adds the reference's API code without undoing the Navano migration.

| Area | Change |
|---|---|
| Pages wired (`useQuery` / `useMutation`) | home sections (Top/Popular/Trend Products, Top Stores, Community), `/product`, `/product/detail` (data, comments, like), `/agent`, `/agent/detail`, `/mypage` (My Products, Add/Edit Product, Favorites, Recently Visited, Articles, Write Article, Profile), `/member` (products, articles, followers/followings, follow), `/community` list and detail, admin products/users/community |
| Fixed stubs | `AddNewProduct` create/update, `MyProducts` status/delete, community comments, follow/unfollow, `Teditor` submit, missing `likeProductHandler` in product detail |
| WebSocket | Reference approach: `apollo/client.ts` keeps `WebSocketLink` with a custom `LoggingWebSocket` (`webSocketImpl`) that stores the socket in `socketVar`; `Chat.tsx` uses it for the chat gateway. This also stops the "Invalid message type!" error. The error link shows GraphQL errors with `sweetErrorAlert` |
| Styles | chat bubbles (`scss/pc/main.scss`), `RippleBadge`, agent detail spacing |
| Conflicts resolved by hand | `MyProfile.tsx` (kept the placeholder-image guard), `product/Filter.tsx` (removed real-estate filters stay removed), `_admin/products` (`HOLD` tab kept), `product/index.tsx` |
| Extra fix | "New" sort on `/product` uses `DESC` (the reference has `ASC`) |
| Not wired | CS (Notice/FAQ/Inquiry): the backend has no GraphQL API for them |

Validation: `yarn tsc --noEmit` 0 errors; no references to removed real-estate fields; 11 routes return 200 on the dev server. Browser checks of data flows are pending.

## 10. `productOccasion` field (2026-10-11)

Source: the updated diagram `D:/MiT/MOD2/navano.pdf` adds `productOccasion` (enum, NN) to products. Values confirmed by the user: `BIRTHDAY`, `WEDDING`, `ANNIVERSARY`, `HOLIDAY`. No default value and no data migration: the existing products will be deleted.

| Repo | Change |
|---|---|
| `navano` | `ProductOccasion` enum (`product.enum.ts`, registered for GraphQL); `Product.model.ts` `productOccasion` (required); `Product` DTO field; `ProductInput` required; `ProductUpdate` optional; `PISearch.occasionList` and `shapeMatchQuery` `productOccasion: { $in }`; `product.service.spec.ts` covers `occasionList` |
| `navano-client` | `ProductOccasion` enum; `Product`, `ProductInput`, `ProductUpdate`, `PISearch.occasionList` types; `productOccasion` in all product selection sets; `AddNewProduct` "Select Occasion" field (required); `product/Filter.tsx` Occasion checkboxes (same pattern as Product Type) |

### Validation

| Check | Result |
|---|---|
| `npx tsc --noEmit` api / batch | 0 / 0 errors |
| `npx jest apps/navano-api/src/components/product` | 3 passed |
| `npx eslint "apps/**/*.ts"` | 397 (baseline) |
| `npx nest build` | not run: the API was running in watch mode on the same `dist`; the live schema shows `ProductOccasion` and `occasionList` |
| `navano-client` `yarn tsc --noEmit` | 0 errors; 36 / 36 operations valid against the live schema |
| `getProducts` with `occasionList` | works |
| `getProducts` without filter | fails with `Cannot return null for non-nullable field Product.productOccasion` until the old products (no `productOccasion`) are deleted |

## 11. `navano-client`: homepage premium redesign (2026-10-12)

UI layer only. No GraphQL documents, types, routes or data shapes changed; every `useQuery` / `useMutation`, `initialInput`, like/detail handler and Swiper `.swiper-*` hook is kept. Skills used: `redesign-existing-projects` (audit → fix order), `frontend-design`, `ui-ux-pro-max` (`--design-system`: Organic Biophilic). `shadcn-ui` not used (project is MUI + SCSS, no Tailwind/Radix).

| Area | Change |
|---|---|
| Tokens | `scss/variables.scss`: Fraunces `$font-heading`, palette (`$ink`, `$cream`, `$forest` for actions, `$terracotta` accent only, `$terracotta-ink` for accent text), radii, warm shadows, `btn-*` / `focus-ring` / `badge` mixins. Additive only |
| Hero | New `HeroSection.tsx` replaces `FiberContainer` (kept on disk) in `LayoutHome.tsx`: forest background, headline, CTAs `/product` + `/agent`, three fact chips, CSS-only flower art, existing `HeaderFilter` as the search bar. CSS entrance (visible before hydration, reduced-motion safe). Mobile: compact hero |
| Sections | New `SectionHeading.tsx`; titles "Trending now", "Most viewed", "Best sellers" (= `TopProducts`, sorted by `productRank`, rank flag "No. N"), "Top stores", "From our community". Swiper arrows are now `<button>`s with the same classes. "See all stores" now links to `/agent` |
| Cards | `PopularProductCard` / `TopProductCard` rebuilt (media tile, status badge for HOLD/SOLD, hover action pills, serif title, accent rule, occasion + location, tabular price). `TrendProductCard` uses shared `productLabels.ts` + hover lift / heart pop. `TopAgentCard`: squircle avatar, "Store" label, counts, links to `/agent/detail?agentId=`. `CommunityCard`: editorial story cards with author/date/likes |
| States | `SectionState.tsx`: skeleton cards while loading, composed empty states. `Reveal.tsx`: light scroll reveal on desktop sections |
| Styles | New `scss/homeShared.scss` (pc + mobile); `scss/pc/homepage/homepage.scss` rewritten for layout (Events/Advertisement blocks kept); mobile homepage blocks replaced |
| i18n | 44 new keys in `en` / `kr` / `ru` |

### Validation

| Check | Result |
|---|---|
| `yarn tsc --noEmit` | 0 errors |
| `yarn build` | success (`/` 12.9 kB) |
| SCSS compile (app / pc / mobile) | OK |
| Dev routes `/`, `/product`, `/agent`, `/community`, `/kr`, `/ru` | 200; hero renders in all three locales |
| Live data | `getProducts` and `getAgents` return data; sections render real products and stores (headless Chrome screenshots at 1440 and mobile UA) |
| `yarn lint` | not run: no ESLint config (`next lint` is interactive) |

Left as is: the Advertisement video (real-estate footage), the Events section (Korean tourism content), mobile Community/Events placeholders, and the legacy 1300px mobile footer that makes `#mobile-wrap` wider than the screen.

## 12. `navano-client`: My Page redesign (2026-10-12)

UI layer only. Layout follows the Stitch design (`code.html` / `DESIGN.md` / `screen.png` in the client root) but uses Navano's light palette (coral `$coral`, Playfair Display + Poppins) instead of the design's dark theme. Sections with no backend data (KYC, hardware keys, sessions, API key, connected accounts) are replaced with real member data. No GraphQL documents, types or routes changed.

| Area | Change |
|---|---|
| `MyMenu.tsx` | Sidebar rebuilt: profile block (avatar, nick, role label "Store"/"Customer"/"Admin"), grouped links with MUI icons and an active bar, Admin Panel link for ADMIN, Logout. Same `?category=` routes; leftover red `PortraitIcon` buttons removed. Exports `memberRoleLabel` |
| `MyProfile.tsx` | Page header (breadcrumb, "View public page" → `/member?memberId=`), hero card (cover, avatar with change-photo overlay, name + role badge, nick/phone/address), metrics strip from `GET_MEMBER` (member since, products or articles, followers, likes), "Profile details" form (adds Full name and About me — already in `MemberUpdate`), save bar with Discard/Update, right rail (account summary, quick links). Empty `memberFullName` / `memberDesc` are not sent (backend `@Length` validation) |
| `pages/mypage/index.tsx` | `is-profile` class on `main-config`, `aside` for the sidebar; logic unchanged |
| Styles | `scss/pc/mypage/mypage.scss` shell rewritten with `$mp-*` tokens (list/card rules for other tabs kept as is); `myProfile.scss` rewritten |
| i18n | 53 new keys in `en` / `kr` / `ru` |

### Validation

| Check | Result |
|---|---|
| `yarn tsc --noEmit` | 0 errors |
| SCSS compile (`scss/pc/main.scss`) | OK |
| `/mypage`, `/kr/mypage`, `/ru/mypage`, `?category=myProducts` | 200 |
| Headless Chrome (1440, AGENT) | profile tab and My Products tab render in the new shell; `GET_MEMBER` metrics load |
| `yarn build` | not run (dev server running) |

Known, pre-existing: a hard reload of `/mypage` redirects to `/` because the page's `user._id` check runs before the layout restores `userVar` from the token; "Update profile" stays disabled while `memberImage` is empty. Mobile My Page is still a stub.

## 13. `navano-client`: My Page rose redesign (2026-10-13)

Restyle of §12 to the light rose Stitch design (`zip/code.html`, `zip/screen.png`). Same data, handlers and routes; sections with no backend data are still replaced with real member data. No GraphQL, type or route changes.

| Area | Change |
|---|---|
| Tokens / fonts | `$mp-*` rose palette (`#e11d48` primary, `#fbcfe8` borders, `#fff7f9` canvas with pink 32px grid), Space Grotesk / Manrope / Geist loaded in `scss/variables.scss`, used only on My Page |
| `MyMenu.tsx` | Gradient active item with 4px rose bar; footer with Help Center (`/cs`), Logout and member ID; exports `memberRef` (`#NVN-` + last 6 of `_id`, display only) |
| `MyProfile.tsx` | Header actions "View public page" + gradient "Add Product" (stores) / "Write Article" (customers); cover status pill; avatar frame with live dot and hover overlay; role badge + ID chip; form adds read-only Role field and per-field hints; new "Your activity" tiles (Favorites, Articles, Followings); right rail as icon-slot items (role/status, rank/points), "View public page" row, Quick links, Navano member card |
| i18n | 19 new keys in `en` / `kr` / `ru`; unused "Shown on your public page" removed |

Validation: `yarn tsc --noEmit` 0 errors; SCSS (`pc/main.scss`, `app.scss`) compiles; headless Chrome at 1440 (AGENT) matches the design. `yarn build` not run (dev server running).

## 14. Homepage rose redesign + API cleanup (2026-10-13)

Design: `navano-client/zip/{code.html,DESIGN.md,screen.png}` (rose Stitch homepage). Fintech copy from the design replaced with flower / cake / chocolate shop copy; sections without backend data use real data or stay static.

### Backend (`navano-api`)

| Change | Why |
|---|---|
| `escapeRegex` (`libs/config.ts`) used for search text in `getProducts`, `getAgents`, `getAllMembersByAdmin`, `getBoardArticles` | Raw text went into `new RegExp`, so input like `(` returned a 500 |
| `@Max(100)` on every paginated `limit` (product, member, board-article, comment, follow inquiries) | No upper bound on page size |
| `likeTargetProduct` returns `meLiked` | The client had to refetch whole lists after each like |
| `getProduct` loads `memberData` for logged-out visitors too | It was only set inside `if (memberId)` |
| Removed `console.log('match:', …)` from list services | Debug noise |

Validation: tsc api / batch 0 / 0; jest product 4 passed (new literal-search test); eslint 397 (baseline); live API: `text: "("` returns an empty list, `limit: 500` is rejected.

### Frontend (`navano-client`)

| Area | Change |
|---|---|
| Tokens | Rose tokens moved from My Page to `scss/variables.scss` as `$nv-*` (shared by navbar, footer, home, My Page) |
| Navbar (`Top.tsx`, `scss/pc/layout/navbar.scss`), all pages | White glass bar, brand with tagline, pill links, notification / language / avatar menus. Fixed: scroll listener added on every render, Korean flag image `id="uz"`, menu component recreated each render |
| Footer (`Footer.tsx`, `scss/pc/layout/footer.scss`), all pages | Contact, social, newsletter card, link columns that now link to product search presets, community and CS |
| Hero (`HeroSection.tsx`) | Rotating cake / roses / chocolate image card with badge, headline, indicators; replaces `FiberContainer` (deleted with `ScrollControls`) |
| Search console (`HeaderFilter.tsx`) | Location / Occasion / Category fields with "All" options, Advanced, search. Fixed: city image path without leading slash (broken on `/kr`, `/ru`), price range reset to 0, state mutation in submit |
| Sections | Trend (4-card grid), Popular (3 cards with Type / Region / Pack strip), Top Stores (carousel, "Visit store" → `/agent/detail`), Events (static), Community (News / Free tabs, one query per tab) |
| Data logic | Lists read Apollo `data` directly (no `onCompleted` + `useState` copy); likes update through the cache (`LIKE_TARGET_PRODUCT` selects `meLiked`), no list refetch; unused vars / logs removed |
| Removed | Top Products, Advertisement (real-estate video), `Reveal.tsx`, `homeShared.scss` |
| i18n | 91 new keys in `en` / `kr` / `ru` |

Validation: `yarn tsc --noEmit` 0; SCSS (pc, app, mobile) compiles; `/`, `/kr`, `/ru`, `/product`, `/agent`, `/community`, `/cs`, `/mypage` 200; headless Chrome 1440 screenshots of `/`, `/product`, `/mypage`. Not tested: the like click flow with a real login. `yarn build` not run (dev server running).

## 15. `navano-client`: light/dark theme toggle (2026-10-13)

Design: `navano-client/zip/{code.html,DESIGN.md,screen.png}`, the homepage in the dark "Sovereign" palette (`#101415` canvas, `#191c1e` cards, `#e0e3e5` text, `#adc6ff` / `#4c8eff` accent, `#414754` hairlines). Decision: keep the rose theme and add this as a dark theme with a toggle (no layout change).

| Area | Change |
|---|---|
| `scss/theme.scss` (new, imported in `app.scss`) | `--nv-*` CSS variables: light (rose) on `:root`, dark on `[data-theme='dark']`; dark `body` background |
| `scss/variables.scss` | `$nv-*` Sass tokens now point at the CSS variables |
| Stylesheets | Color literals in `homepage.scss`, `trendCard.scss`, `layout/navbar.scss`, `layout/footer.scss`, `mypage.scss` (shell only), `myProfile.scss` and the Advanced filter modal replaced with variables by CSS property; text over photos stays white; text on primary buttons uses `--nv-on-primary` |
| Toggle | `libs/hooks/useThemeMode.ts`; sun/moon button in `Top.tsx`; saved in `localStorage.theme`; `pages/_document.tsx` inline script sets `data-theme` before first paint (saved choice, else system setting) |
| MUI | Navbar menus and the filter modal use the variables via `sx` |
| Dark details | Solid `#adc6ff` primary buttons with `#002e69` text, blue logo mark, blue active nav pill |
| i18n | `Switch to light mode` / `Switch to dark mode` in `en` / `kr` / `ru` |

Validation: `yarn tsc --noEmit` 0; SCSS (pc, app, mobile) compiles; 8 routes 200; headless Chrome 1440 screenshots of `/` (dark and light) and `/mypage` (dark). Not converted: product, store, community and CS page bodies and the other My Page tabs keep their light styles inside the dark navbar/footer; mobile unchanged.

## 16. `navano-client`: design images for hero and product cards (2026-10-13)

Images from `navano-client/zip/code.html` (Stitch, AI generated by Google).

| Area | Change |
|---|---|
| Hero | `public/img/banner/hero-atelier.jpg` (tiered cake hall): cropped to remove the AI UI text at the top and the camera caption at the bottom; first slide of the hero carousel with `object-position: center 8%`; alt text in `en` / `kr` / `ru` |
| Product images | The 3 seed products' files in `navano/uploads/product/` (`f2be173d…` cake, `6742c01b…` chocolate, `8190ccd5…` roses) replaced in place with the design's trend images, 1200px wide. No DB change; `uploads/` is gitignored, so this only affects the local dev data. Originals backed up outside the repo |
| Not used | The design's popular chocolate image (it is a screenshot of a UI, not a product photo) |

Validation: `yarn tsc --noEmit` 0; API serves the new files; headless Chrome screenshots of `/` in dark and light.

## 17. Product page redesign, facets API, design products (2026-10-13)

Design: `navano-client/zip/{code.html,screen.png}` (light rose product list). Decisions: new dev stores own the new products; the design's "Hamper" maps to existing types; the 3 existing products use the product-page photos; filter counts come from a new backend query.

### Backend (`navano-api`)

| Change | Notes |
|---|---|
| `getProductFacets` query (public) | One aggregation over ACTIVE products: `total` and `{ value, count }` lists for `locations`, `types`, `occasions`. DTOs `ProductFacets`, `FacetCount` |
| Tests | `product.service.spec.ts`: facet mapping + empty result |

Validation: tsc api / batch 0 / 0; jest product 6 passed; eslint 397 (baseline).

### Dev data (local DB and `uploads/`, not in git)

| Item | Detail |
|---|---|
| Stores (AGENT, password `navano1234`) | `rose_atelier` (Rose Atelier, Seoul), `lumiere_cake` (Lumiere Patisserie, Incheon), `maison_bleu` (Maison Bleue Chocolatier, Busan) |
| New products | Imperial Orchid & Macaron Vault (FLOWER), White Peony & Lily Centerpiece (FLOWER) → rose_atelier; 24K Gold Leaf Noir Opera Cake, Matcha & Yuzu Choux Crown (CAKE) → lumiere_cake; Single-Origin Bonbon Collection, Bespoke Anniversary Hamper (CHOCOLATE) → maison_bleu |
| Images | Design photos with the baked-in Stitch UI (top bars, captions, price boxes, search field) cropped out; the 3 existing product files replaced in place with the product-page photos |

### Frontend (`navano-client`)

| Area | Change |
|---|---|
| `pages/product/index.tsx` | URL (`?input=`) is the single source of truth; safe parse with defaults (a broken value no longer crashes the page); filter/sort changes reset to page 1; sorts: newest, price low/high, most liked, most viewed; header with real product / store counts; active-filter chips with remove and "Reset all"; styled pagination |
| `Filter.tsx` | Rewritten: draft state applied with "Apply filters"; checkbox groups with facet counts; text search (Enter applies); price range; custom-order card linking to CS. The 12 duplicated `router.push` blocks and state mutation are gone |
| `ProductCard.tsx` | New catalog card (price tag, like button, type · occasion, title, address, description, count, views, likes); also used by My Favorites / Recently Visited |
| Like flow | Cache update only. Before: refetch with the default `initialInput`, which reset the list to page 1 |
| Layout | `/product` skips the old photo banner (it showed the Nestar city image) |
| Styles | `scss/pc/product/product.scss` rewritten on the `--nv-*` theme variables, so dark mode works |
| API | `GET_PRODUCT_FACETS`; types `ProductFacets`, `FacetCount` |
| i18n | 36 keys in `en` / `kr` / `ru` |

Validation: `yarn tsc --noEmit` 0; SCSS compiles; headless Chrome: `/product` light, filtered + sorted `/product` dark; broken `?input=` returns 200; like / unlike with a real `rose_atelier` login sends one `LikeTargetProduct` request each and updates the card without a refetch. Not checked visually: My Favorites / Recently Visited with the new card.

## 18. Stores page redesign, store filters, store covers (2026-10-13)

Design: `navano-client/zip/{code.html,screen.png}` (light rose store directory). Decisions: new `memberCover` field; navano_store / Martin updated by a one-off DB script; 2 missing design stores created; likes + comment counts instead of a fake star rating.

### Backend (`navano-api`)

| Change | Notes |
|---|---|
| `memberCover` (optional string) | `Member.model.ts`, `Member` DTO, `MemberUpdate`; set through `updateMember` |
| `AgentsInquiry.search` | `text` now `@IsOptional` (was `@IsNotEmpty` on an optional field) and matches nick **or** full name; new `locationList` (matched against `memberAddress`, with alternate spellings for Daejeon / Jeonju) and `typeList` (stores with at least one ACTIVE product of those types, via `$lookup`) |
| `availableAgentSorts` | adds `memberProducts` |
| `likeTargetMember` | returns `meLiked`, so the client skips the list refetch |
| Tests | new `member.service.spec.ts` (search, city, type filters, like state) |

Validation: tsc api / batch 0 / 0; jest 11 passed; eslint 397 (baseline); live API filters checked.

### Dev data (local DB and `uploads/`, not in git)

| Item | Detail |
|---|---|
| New stores (password `navano1234`) | `kyoto_bonsai` (Kyoto Botanicals & Bonsai, Daegu), `jeju_citrus` (Jeju Citrus & Honey Atelier, Jeju), no products yet |
| Covers + portraits | Design photos with Stitch UI (top bars, captions, watermark, title) cropped out; portraits cropped square around the face. rose_atelier uses its own product photos |
| Profiles | Full name, address and description for all 7 stores. rose_atelier, lumiere_cake, maison_bleu, kyoto_bonsai, jeju_citrus via `updateMember`; navano_store ("Navano Flagship") and Martin ("Martin Florist Atelier") via a one-off script on the dev DB that only sets these 5 profile fields |

### Frontend (`navano-client`)

| Area | Change |
|---|---|
| `pages/agent/index.tsx` | Hero with real counts (stores, products, cities, categories) and a store-network card from product facets; toolbar with name search, city, category and sort (most liked / products / viewed / newest); active-filter chips; 3-column grid; join banner to `/account/join`; pagination. Same fixes as the product page: URL as the single source of truth, safe `?input=` parse, page 1 on filter/sort change, no `router.replace` loop, skeletons for matching hydration |
| `AgentCard.tsx` | Store directory card: cover, product pill, `#NVN-` ref, portrait, like button with count, reviews (`memberComments`), name, handle, address, description, stats, Contact / Visit store |
| Like flow | Cache update via `LIKE_TARGET_MEMBER` (`meLiked`); before: full list refetch + alert |
| `GET_AGENTS` | Adds `memberCover`, `memberComments`; drops `accessToken`, `memberWarnings`, `memberBlocks` from the public list. `GET_MEMBER` adds `memberCover` |
| Layout | `/agent` skips the old photo banner |
| Styles | `scss/pc/agent/agent.scss` rewritten on `--nv-*` variables (light + dark) |
| i18n | 29 keys in `en` / `kr` / `ru` |

Validation: `yarn tsc --noEmit` 0; SCSS compiles; screenshots: `/agent` light, filtered (Cake, most products) dark; like / unlike with a real `rose_atelier` login sends one `LikeTargetMember` each and updates the card; hard loads of `/agent`, page 2, a broken `?input=`, `/` and `/product` show no console or hydration errors.

## 19. Navano AI shopping assistant (2026-10-14)

Reference: Hostinger's "Agent" button and chat panel. Decisions: label "Navano AI" (not "Agent", which means store here, D8); finds real products and stores; logged-in members only; one GraphQL mutation without streaming; model `claude-opus-5-5` (D12).

### Backend (`navano-api`)

| Area | Change |
|---|---|
| Dependency | `@anthropic-ai/sdk` ^0.133.0; env key `ANTHROPIC_API_KEY`; new `.env.example` with empty keys |
| `components/assistant/*` | `AssistantModule`, `AssistantResolver` (`askAssistant`, `AuthGuard`), `AssistantService`: tool loop (max 4 rounds), tools `search_products` → `getProducts`, `search_stores` → `getAgents`, `get_catalog_overview` → `getProductFacets`; model input is checked against the enums; system prompt and tools cached; server-side fallback on refusals; up to 4 product cards from the last search |
| `libs/dto/assistant/assistant.ts` | `AssistantInput` (1–12 turns, 1–1000 chars each), `AssistantReply { text, products }` |
| Limits | 20 requests per member per hour; `Message.ASSISTANT_LIMIT`, `Message.ASSISTANT_UNAVAILABLE` (also returned when the key is missing) |
| Tests | `assistant.service.spec.ts`: tool call with filtered enums, refusal, hourly limit, history must end with a user turn, missing key |

Validation: tsc api / batch 0 / 0; jest 16 passed (5 new); eslint 397 (baseline); live schema has `askAssistant`; no token → auth error; with a token and no key → `ASSISTANT_UNAVAILABLE`.

### Frontend (`navano-client`)

| Area | Change |
|---|---|
| Navbar | `AssistantButton` (gradient-border pill, last item in `.nav-actions`, right of the avatar); `AssistantPanel` rendered after the header (the header's `backdrop-filter` would trap a fixed child) |
| Panel | Header (new chat, close), welcome + 4 suggestion chips, user / AI bubbles, product cards linking to `/product/detail?id=`, typing dots, input (Enter sends, Shift+Enter new line), note; Esc closes; logged-out state links to `/account/join`; chat kept in `sessionStorage` per member |
| API | `ASK_ASSISTANT`, `libs/types/assistant/assistant.ts`, `assistantOpenVar`; the global error alert skips `AskAssistant` (errors show in the panel) |
| Styles | `scss/pc/layout/assistant.scss` on `--nv-*`; new `--nv-ai-gradient` (light rose → violet, dark blue → violet) |
| i18n | 17 keys in `en` / `kr` / `ru` |

Validation: `yarn tsc --noEmit` 0; SCSS (pc, app) compiles; headless Chrome 1440: logged out (light), logged in (light, dark), error reply shown once in the panel; `/`, `/kr`, `/ru`, `/product`, `/agent` 200; no console errors. Not tested: real replies (no `ANTHROPIC_API_KEY` yet). Mobile not covered.

Found, not fixed: `auth.module.ts` registers `JwtModule` with `${process.env.SECRET_TOKEN}` at import time, before `ConfigModule` loads `.env`, so the running API signs and verifies tokens with the string `"undefined"`. Anyone can forge a token for any member, including ADMIN.

