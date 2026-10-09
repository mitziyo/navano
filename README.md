# Navano

Backend for **Navano**, a flower, chocolate and cake shop platform. It is a NestJS monorepo with a GraphQL API and MongoDB.

## Apps

| App | Path | Description |
| --- | --- | --- |
| `navano-api` | `apps/navano-api` | GraphQL API (Apollo), file uploads and the WebSocket chat |
| `navano-batch` | `apps/navano-batch` | Scheduled (cron) jobs that recalculate rankings |

## Environment

Create a `.env` file in the project root:

```
PORT_API=
PORT_BATCH=
MONGO_DEV=
MONGO_PROD=
SECRET_TOKEN=
```

## Project setup

```bash
$ npm install
```

## Run

```bash
# API (watch mode)
$ npm run start:dev

# Batch (watch mode)
$ npm run start:dev:batch

# Production
$ npx nest build navano-api && npm run start:prod
$ npx nest build navano-batch && npm run start:prod:batch
```

## Tests

```bash
$ npm run test
$ npm run test:e2e
```
