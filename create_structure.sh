#!/bin/bash

# === APPS WEB FRONTEND ===
mkdir -p "apps/web/app/(auth)/login" "apps/web/app/(auth)/signup" "apps/web/app/(auth)/verify-email"
mkdir -p "apps/web/app/(public)/events/[slug]" "apps/web/app/(public)/about" "apps/web/app/(public)/privacy"
mkdir -p "apps/web/app/(organizer)/dashboard" "apps/web/app/(organizer)/events/create" "apps/web/app/(organizer)/events/[id]/edit"
mkdir -p "apps/web/app/(organizer)/events/[id]/analytics" "apps/web/app/(organizer)/events/[id]/scan"
mkdir -p "apps/web/app/(organizer)/payouts" "apps/web/app/(organizer)/settings"
mkdir -p "apps/web/app/(buyer)/tickets" "apps/web/app/(buyer)/refunds"
mkdir -p "apps/web/app/admin/overview" "apps/web/app/admin/users" "apps/web/app/admin/events" "apps/web/app/admin/ledger"
mkdir -p "apps/web/app/api"
mkdir -p "apps/web/components/ui" "apps/web/components/layouts" "apps/web/components/forms"
mkdir -p "apps/web/components/ticket-card" "apps/web/components/qr-scanner" "apps/web/components/seo"
mkdir -p "apps/web/lib" "apps/web/hooks" "apps/web/styles" "apps/web/public"

# Empty frontend files
touch apps/web/lib/utils.ts apps/web/lib/api-client.ts apps/web/lib/constants.ts

# === APPS API BACKEND ===
mkdir -p apps/api/src/modules/auth/dto apps/api/src/modules/auth/strategies apps/api/src/modules/auth/guards apps/api/src/modules/auth/decorators
mkdir -p apps/api/src/modules/users/dto apps/api/src/modules/events/dto apps/api/src/modules/tickets/dto
mkdir -p apps/api/src/modules/payments apps/api/src/modules/refunds/dto apps/api/src/modules/withdrawals/dto
mkdir -p apps/api/src/modules/ledger apps/api/src/modules/qr apps/api/src/modules/media/controllers apps/api/src/modules/emails/templates
mkdir -p apps/api/src/modules/admin

mkdir -p apps/api/src/common/decorators apps/api/src/common/filters apps/api/src/common/interceptors
mkdir -p apps/api/src/common/pipes apps/api/src/common/guards
mkdir -p apps/api/src/database/migrations apps/api/src/database/seeds
mkdir -p apps/api/src/config
mkdir -p apps/api/prisma
mkdir -p apps/api/test

# Empty backend files
touch apps/api/src/modules/auth/auth.controller.ts apps/api/src/modules/auth/auth.service.ts apps/api/src/modules/auth/auth.module.ts
touch apps/api/src/modules/users/users.controller.ts apps/api/src/modules/users/users.service.ts apps/api/src/modules/users/users.module.ts
touch apps/api/src/modules/events/events.controller.ts apps/api/src/modules/events/events.service.ts apps/api/src/modules/events/events.module.ts
touch apps/api/src/modules/tickets/tickets.controller.ts apps/api/src/modules/tickets/tickets.service.ts apps/api/src/modules/tickets/tickets.module.ts
touch apps/api/src/modules/payments/payments.controller.ts apps/api/src/modules/payments/payments.service.ts apps/api/src/modules/payments/payments.module.ts
touch apps/api/src/modules/payments/paystack.service.ts apps/api/src/modules/payments/webhooks.controller.ts
touch apps/api/src/modules/refunds/refunds.controller.ts apps/api/src/modules/refunds/refunds.service.ts apps/api/src/modules/refunds/refunds.module.ts
touch apps/api/src/modules/withdrawals/withdrawals.controller.ts apps/api/src/modules/withdrawals/withdrawals.service.ts apps/api/src/modules/withdrawals/withdrawals.module.ts
touch apps/api/src/modules/ledger/ledger.service.ts apps/api/src/modules/ledger/ledger.module.ts
touch apps/api/src/modules/qr/qr.controller.ts apps/api/src/modules/qr/qr.service.ts apps/api/src/modules/qr/qr.module.ts
touch apps/api/src/modules/media/media.controller.ts apps/api/src/modules/media/media.service.ts apps/api/src/modules/media/media.module.ts
touch apps/api/src/modules/emails/email.service.ts apps/api/src/modules/emails/email.module.ts
touch apps/api/src/modules/admin/admin.controller.ts apps/api/src/modules/admin/admin.service.ts apps/api/src/modules/admin/admin.module.ts
touch apps/api/src/database/prisma.module.ts apps/api/src/database/prisma.service.ts
touch apps/api/src/app.module.ts apps/api/src/main.ts
touch apps/api/prisma/schema.prisma apps/api/prisma/seed.ts
touch apps/api/.env apps/api/.env.example
touch apps/api/package.json apps/api/tsconfig.json apps/api/nest-cli.json

# === PACKAGES ===
mkdir -p packages/types packages/ui packages/utils
touch packages/types/user.types.ts packages/types/event.types.ts packages/types/ticket.types.ts packages/types/ledger.types.ts

# === INFRASTRUCTURE ===
mkdir -p infrastructure/docker infrastructure/nginx infrastructure/k8s
touch infrastructure/docker/Dockerfile.web infrastructure/docker/Dockerfile.api

# === DOCS ===
mkdir -p docs/api docs/architecture
touch docs/deployment.md

# === GITHUB WORKFLOWS ===
mkdir -p .github/workflows
touch .github/workflows/ci.yml .github/workflows/deploy.yml

# === ROOT FILES ===
touch turbo.json package.json README.md

echo "Directory structure created successfully!"
