# HD Ticket Desk - Backend API

Africa-first ticketing & paid appointments platform.

## Quick Start

```bash
# Install dependencies
npm install

# Setup environment
cp .env.example .env
# Edit .env with your credentials

# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev

# Seed database
npm run prisma:seed

# Start development server
npm run start:dev
```

## API Documentation
Visit `http://localhost:3001/docs` for Swagger documentation.

## Test Accounts (after seeding)
- Admin: admin@hdticketdesk.com / Password123!
- Organizer: organizer@hdticketdesk.com / Password123!
- Buyer: buyer@hdticketdesk.com / Password123!

## Features
- JWT Authentication with refresh tokens
- Email verification & OTP
- Paystack payments integration
- QR ticket generation
- Refund management
- Organizer withdrawals
- Cloudinary media uploads
- Admin dashboard
