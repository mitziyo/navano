# Prompts

## A. Prompts used in this session

### A1. Analysis
```
Analyze the current Nestar monorepo structure to transform the existing NestJS monorepo Nestar platform into the Navano flower, chocolate and cake shop platform. Make a plan first.
```

### A2. Safe rename layer
```
Safe Rename Layer (No Business logic change)
Rename all visible project/app identifiers from Nestar to Navano. Do not change domain logic.
Keep APIs and database collections unchanged. Update package names, environment labels, constants.
Run lint and typecheck after refactoring. Please make a plan first!
```

### A3. Documentation
```
Create docs/ with BACKEND_MIGRATION.md, DECISIONS.md, FRONTEND_MIGRATION.md, COMPLETED_TASKS.md,
NEXT_STEPS.md, PROMPTS.md summarizing the current Nestar → Navano migration state.
Do not change application source code. Be precise and technical. Use markdown tables.
```

## B. Reusable prompts for the next session

### B1. Context bootstrap (use first)
```
Read AGENTS.md and all files in docs/. Summarize the current migration phase, what is done,
what is pending, and the top 3 items in docs/NEXT_STEPS.md. Do not change any files.
```

### B2. Fix known bugs
```
Fix only the known bugs listed in docs/BACKEND_MIGRATION.md §8 (batch MemberType key, findOneAndUpdate(_id),
property.input.ts string types, board-article resolver log). No other changes.
Run: npx tsc --noEmit -p apps/navano-api/tsconfig.app.json, same for navano-batch, and
npx eslint "apps/**/*.ts" (no --fix). Compare with baseline 397. Update docs/COMPLETED_TASKS.md.
```

### B3. Backend Phase 2: Property → Product, AGENT → STORE
```
Implement backend Phase 2 exactly as specified in docs/BACKEND_MIGRATION.md §4.2–§7 and docs/DECISIONS.md D7/D8.
Make a plan first. Steps: enums → schema → DTOs → product module → member (getStores) →
comment/like/view couplings → libs/config.ts → batch. Use git mv for renamed files.
Do not implement Order/Cart. Do not change the .env DB name.
Validate: tsc for both apps, eslint (no --fix, no increase over 397), nest build for both apps,
grep -rni "propert\|agent" apps → only intentional hits. Then update docs/*.md statuses.
```

### B4. Batch migration only
```
Migrate apps/navano-batch to the Product/Store domain: BATCH_TOP_PRODUCTS, BATCH_TOP_STORES,
the Product model, batchTopProducts and batchTopStores using memberProducts. Keep the cron schedules unchanged.
Run tsc and nest build navano-batch.
```

### B5. Frontend safe rename (F1)
```
In D:\MiT\MOD2\navano-client: rename package nestar-next → navano-client and replace visible
"Nestar" branding (titles, meta, header/footer, locales) with "Navano". Do not change GraphQL
operations, routes or types. Record npm run build / lint before and after. Make a plan first.
```

### B6. Frontend domain migration (F2–F4)
```
Migrate navano-client to the Navano GraphQL schema following docs/FRONTEND_MIGRATION.md
(enums, types, apollo ops, pages property→product and agent→store, components, filters, i18n en/kr/ru, admin).
The backend Phase 2 must already be running locally. Make a plan first. Validate with npm run build
and a manual smoke test of: product list, product detail, like, add product (STORE), admin products.
```

### B7. Validation only
```
Run without modifying files: tsc --noEmit for navano-api and navano-batch, npx eslint "apps/**/*.ts"
(no --fix), nest build for both apps, and grep -rni nestar. Report the results as a table
compared with docs/COMPLETED_TASKS.md.
```

### B8. Docs update
```
Update docs/COMPLETED_TASKS.md and docs/NEXT_STEPS.md with the work done in this session
(files changed, validation results). Do not change source code.
```
