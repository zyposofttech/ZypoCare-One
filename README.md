# ZypoCare One HIMS (Internal)

**⚠️ PRIVATE REPOSITORY — DO NOT DISTRIBUTE**

Welcome to the **ZypoCare One Hospital Information Management System (HIMS)** engineering repository. This document is the primary source of truth for the development team.

## 📖 Project Overview

ZypoCare One HIMS is a production-hardened platform designed for multi-branch hospital operations. It features strict **Branch Isolation**, a **Policy Governance** engine, and an **AI Copilot** for clinical and operational assistance.

The system is a **monorepo** built with **TurboRepo** and **pnpm workspaces**, ensuring unified tooling across frontend applications, backend services, and shared packages.

## 🏗 Architecture & Modules

### 1. Core API (`services/core-api`)
A NestJS monolithic API acting as the central nervous system. It is modularized into several key domains:

* **Infrastructure (Setup Studio)**
    * **Physical Hierarchy**: Manages `LocationNode` (Campus/Building) → `Unit` → `Room` → `Bed`.
    * **Asset Management**: Tracks `EquipmentAsset` lifecycles including compliance (AERB/PCPNDT) and maintenance (`DowntimeTicket`).
    * **Resource Scheduling**: Manages schedulable resources like OT Tables and Dialysis Stations.

* **Governance Engine**
    * **Policy Management**: A strict Maker-Checker system for hospital policies (`PolicyDefinition`).
    * **Versioning**: Policies are versioned (`PolicyVersion`) and support strictly scoped overrides (`BranchOverride`).
    * **Workflows**: Includes Draft → Submit → Approve/Reject lifecycles.

* **Billing & Service Catalog**
    * **Charge Master**: Centralized repository of billable items (`ChargeMasterItem`).
    * **Tariff Engine**: Supports multiple payer plans (`TariffPlan`) with date-effective rates (`TariffRate`).
    * **Service Mapping**: Links clinical `ServiceItem`s to billing codes via `ServiceChargeMapping`.

* **Statutory & Compliance**
    * **DPDP Privacy**: Native primitives for Patient Consent (`VIEW`, `STORE`, `SHARE`) and "Right to be Forgotten" (`RtbfRequest`).
    * **Public Health**: Automated case queues for government reporting (Nikshay, IDSP, IHIP).

* **Identity & Access (IAM)**
    * **RBAC**: Granular permissions via `RoleTemplate` and `Permission` entities.
    * **Isolation**: All data access is strictly scoped to the user's active `BranchId`.

* **Events Architecture**
    * **Outbox Pattern**: Uses `OutboxEvent` to write events within the same transaction as business data, guaranteeing delivery to NATS.

### 2. AI Copilot (`services/ai-copilot`)
A Python/FastAPI microservice providing role-aware intelligence:

* **Clinical**:
    * `/v1/clinical/interaction-check`: Real-time drug-drug interaction (DDI) and allergy checks.
    * `/v1/clinical/summarize`: Generates patient summaries with source citations.
* **Nursing**:
    * `/v1/nursing/handoff`: Automates shift handoff report generation.
* **Billing**:
    * `/v1/billing/claim-score`: Predicts insurance claim rejection probability.
* **Operations**:
    * `/v1/ops/recommendations`: Predictive maintenance for equipment and rostering optimization.

### 3. Frontend (`apps/web`)
A modern Next.js 15 application utilizing React 19, Tailwind CSS, and Radix UI. It connects to the Core API via REST and manages state with Zustand.

## 🛠 Tech Stack

| Domain | Technologies |
| :--- | :--- |
| **Monorepo** | TurboRepo, pnpm |
| **Frontend** | Next.js 15, React 19, Tailwind CSS, Radix UI |
| **Backend** | NestJS, Express, Prisma ORM (PostgreSQL 16) |
| **AI / ML** | Python 3.10+, FastAPI, Pydantic |
| **Messaging** | NATS (JetStream) |
| **Auth** | Keycloak (OIDC) |
| **Observability** | OpenTelemetry, Prometheus, Grafana, Jaeger |
| **Infra** | Docker Compose, Redis |

## 🚀 Getting Started

### 1. Prerequisites
Ensure you have the following installed:
* **Node.js** (v20+ recommended)
* **pnpm** (v9+)
* **Docker Desktop**
* **Python** (3.10+)

### 2. Environment Setup
Copy the example environment file:
```bash
cp .env.example .env
pnpm turbo dev --filter @excelcare/web --filter @excelcare/core-api