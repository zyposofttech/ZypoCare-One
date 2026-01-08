# ExcelCare HIMS — Production-Ready Hardened Scaffold (v1.1)

Included production hardening pieces:
- Auth: Keycloak (OIDC) realm import + JWT validation guards + RBAC guard + Public endpoints
- DB: shared `packages/db` with Prisma schema + migrations (single source of truth)
- Events: Outbox pattern + `event-worker` publisher (horizontal scale)
- Observability: OpenTelemetry in Core API + OTEL Collector + Prometheus + Grafana + Jaeger
- Billing pricing foundation: Charge Master + Tariff Plans + Tariff Rates APIs
- DPDP primitives: Consent records + RTBF request
- Statutory primitives: Nikshay / IDSP / IHIP case queue endpoints

## Quickstart
```bash
cp .env.example .env
docker compose -f infra/docker/compose.dev.yml up -d
pnpm install
pnpm -C packages/db prisma:generate
pnpm -C packages/db prisma:migrate
pnpm dev
pnpm turbo dev --filter @excelcare/web --filter @excelcare/core-api
```
