<p align="center">
  <img src="https://img.shields.io/badge/hdticketdesk-🎫-7c3aed?style=for-the-badge" alt="hdticketdesk" />
</p>

<h1 align="center">hdticketdesk</h1>

<p align="center">
  <strong>Africa-first ticketing & paid appointments platform</strong>
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#tech-stack">Tech Stack</a> •
  <a href="#getting-started">Getting Started</a> •
  <a href="#api-documentation">API Docs</a> •
  <a href="#deployment">Deployment</a> •
  <a href="#contributing">Contributing</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen?style=flat-square" alt="Node Version" />
  <img src="https://img.shields.io/badge/license-MIT-blue?style=flat-square" alt="License" />
  <img src="https://img.shields.io/badge/PRs-welcome-brightgreen?style=flat-square" alt="PRs Welcome" />
</p>

---

## Overview

**hdticketdesk** is a production-ready, mobile-first ticketing platform built for the African market. It enables organizers to create events, sell tickets, and manage attendance while providing buyers with a seamless purchase experience.

Built with performance and low-bandwidth environments in mind, hdticketdesk works reliably across Africa with Paystack payment integration.

---

## Features

### For Event Organizers
- 📅 Create and publish events with multiple ticket tiers
- 💰 Set custom pricing with VIP, General, and custom tiers
- 📊 Real-time analytics and sales dashboard
- 📱 QR code scanner for attendance tracking
- 💸 Secure withdrawals to local bank accounts
- 🔄 Refund management with approval workflow

### For Buyers
- 🎫 Browse and discover events
- 💳 Secure payments via Paystack
- 📧 Instant email tickets with QR codes
- 📱 Mobile-friendly ticket viewing
- 🔄 Request refunds (when enabled)

### Platform Features
- 🔐 Secure authentication with JWT & OTP verification
- 📧 Transactional emails via Mailgun
- 🖼️ Image uploads via Cloudinary
- 📒 Complete financial ledger for auditing
- 🛡️ Admin dashboard for platform management
- 🔍 SEO-optimized public event pages

---

## Tech Stack

### Backend
| Technology | Purpose |
|------------|---------|
| [NestJS](https://nestjs.com/) | Node.js framework |
| [PostgreSQL](https://www.postgresql.org/) | Database |
| [Prisma](https://www.prisma.io/) | ORM |
| [Paystack](https://paystack.com/) | Payment processing |
| [Mailgun](https://www.mailgun.com/) | Transactional emails |
| [Cloudinary](https://cloudinary.com/) | Image storage & CDN |

### Frontend
| Technology | Purpose |
|------------|---------|
| [Next.js 14](https://nextjs.org/) | React framework (App Router) |
| [Tailwind CSS](https://tailwindcss.com/) | Styling |
| [shadcn/ui](https://ui.shadcn.com/) | UI components |
| [Zustand](https://zustand-demo.pmnd.rs/) | State management |
| [React Query](https://tanstack.com/query) | Data fetching |

### DevOps
| Technology | Purpose |
|------------|---------|
| [Turborepo](https://turbo.build/) | Monorepo management |
| [Docker](https://www.docker.com/) | Containerization |
| [GitHub Actions](https://github.com/features/actions) | CI/CD |

---

## Getting Started

### Prerequisites

- **Node.js** >= 18.0.0
- **PostgreSQL** >= 15
- **npm** >= 9.0.0

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/hdticketdesk.git
   cd hdticketdesk
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` with your credentials (see [Environment Variables](#environment-variables))

4. **Set up the database**
   ```bash
   cd apps/api
   npx prisma migrate dev --name init
   npm run prisma:seed
   ```

5. **Start development servers**
   ```bash
   # Terminal 1 - Backend (http://localhost:3001)
   npm run dev:api
   
   # Terminal 2 - Frontend (http://localhost:3000)
   npm run dev:web
   ```

---

## Environment Variables

Create a `.env` file in the root directory:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/hdticketdesk"

# JWT Authentication
JWT_SECRET="your-64-char-secret-key"
JWT_REFRESH_SECRET="your-64-char-refresh-secret"
JWT_EXPIRY="15m"
JWT_REFRESH_EXPIRY="7d"

# Paystack
PAYSTACK_SECRET_KEY="sk_test_xxxxx"
PAYSTACK_PUBLIC_KEY="pk_test_xxxxx"

# Mailgun
MAILGUN_API_KEY="your-mailgun-api-key"
MAILGUN_DOMAIN="mg.yourdomain.com"
EMAIL_FROM="noreply@hdticketdesk.com"
EMAIL_FROM_NAME="hdticketdesk"

# Cloudinary
CLOUDINARY_CLOUD_NAME="your-cloud-name"
CLOUDINARY_API_KEY="your-api-key"
CLOUDINARY_API_SECRET="your-api-secret"

# Application
NODE_ENV="development"
PORT="3001"
FRONTEND_URL="http://localhost:3000"

# Frontend
NEXT_PUBLIC_API_URL="http://localhost:3001/api/v1"
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY="pk_test_xxxxx"
```

### Generating JWT Secrets

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Run twice to generate both `JWT_SECRET` and `JWT_REFRESH_SECRET`.

---

## Project Structure

```
hdticketdesk/
├── apps/
│   ├── api/                      # NestJS Backend
│   │   ├── src/
│   │   │   ├── modules/
│   │   │   │   ├── auth/         # Authentication
│   │   │   │   ├── users/        # User management
│   │   │   │   ├── events/       # Event CRUD
│   │   │   │   ├── tickets/      # Ticket management
│   │   │   │   ├── payments/     # Paystack integration
│   │   │   │   ├── refunds/      # Refund processing
│   │   │   │   ├── withdrawals/  # Payout handling
│   │   │   │   ├── ledger/       # Financial audit
│   │   │   │   ├── emails/       # Mailgun integration
│   │   │   │   ├── media/        # Cloudinary uploads
│   │   │   │   └── admin/        # Admin dashboard
│   │   │   ├── common/           # Shared utilities
│   │   │   └── database/         # Prisma service
│   │   └── prisma/
│   │       ├── schema.prisma     # Database schema
│   │       └── seed.ts           # Test data
│   │
│   └── web/                      # Next.js Frontend
│       ├── app/
│       │   ├── (auth)/           # Login, Register
│       │   ├── (public)/         # Public event pages
│       │   ├── (organizer)/      # Organizer dashboard
│       │   ├── (buyer)/          # Buyer pages
│       │   └── admin/            # Admin panel
│       ├── components/
│       │   ├── ui/               # shadcn/ui components
│       │   ├── layouts/          # Header, Footer, Sidebar
│       │   └── forms/            # Form components
│       └── lib/                  # Utilities
│
├── .env.example                  # Environment template
├── package.json                  # Root package.json
├── turbo.json                    # Turborepo config
└── README.md
```

---

## API Documentation

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/auth/register` | Register new user |
| `POST` | `/api/v1/auth/login` | Login user |
| `POST` | `/api/v1/auth/verify-email` | Verify email address |
| `POST` | `/api/v1/auth/verify-otp` | Verify OTP code |
| `POST` | `/api/v1/auth/refresh` | Refresh access token |

### Events

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/events` | List all published events |
| `GET` | `/api/v1/events/:slug` | Get event by slug |
| `POST` | `/api/v1/events` | Create event (organizer) |
| `PATCH` | `/api/v1/events/:id` | Update event |
| `POST` | `/api/v1/events/:id/publish` | Publish event |

### Payments & Tickets

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/payments/initialize` | Initialize payment |
| `POST` | `/api/v1/payments/webhook` | Paystack webhook |
| `GET` | `/api/v1/tickets/my` | Get user's tickets |
| `POST` | `/api/v1/tickets/:id/checkin` | Check in ticket |

### Withdrawals

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/withdrawals/balance` | Get withdrawable balance |
| `POST` | `/api/v1/withdrawals/request` | Request withdrawal |
| `POST` | `/api/v1/withdrawals/verify-otp` | Verify withdrawal OTP |

---

## Available Scripts

### Root Directory

```bash
npm run dev:api       # Start backend in development
npm run dev:web       # Start frontend in development
npm run build:api     # Build backend for production
npm run build:web     # Build frontend for production
npm run db:migrate    # Run database migrations
npm run db:seed       # Seed database with test data
npm run db:studio     # Open Prisma Studio
```

### Backend (`apps/api`)

```bash
npm run start:dev     # Development with hot reload
npm run start:prod    # Production mode
npm run test          # Run tests
npm run lint          # Lint code
```

### Frontend (`apps/web`)

```bash
npm run dev           # Development server
npm run build         # Production build
npm run start         # Start production server
npm run lint          # Lint code
```

---

## Test Accounts

After running `npm run db:seed`, use these accounts:

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@hdticketdesk.com` | `Password123!` |
| Organizer | `organizer@hdticketdesk.com` | `Password123!` |
| Buyer | `buyer@hdticketdesk.com` | `Password123!` |

---

## Deployment

### Backend (Railway / Render)

1. Connect your GitHub repository
2. Set root directory to `apps/api`
3. Configure environment variables
4. Build command:
   ```bash
   npm install && npx prisma generate && npm run build
   ```
5. Start command:
   ```bash
   npm run start:prod
   ```

### Frontend (Vercel)

1. Import your GitHub repository
2. Set root directory to `apps/web`
3. Configure environment variables:
   - `NEXT_PUBLIC_API_URL` = Your deployed API URL
   - `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY` = Your Paystack public key
4. Deploy

### Database (Supabase / Neon / Railway)

1. Create a PostgreSQL database
2. Copy the connection string to `DATABASE_URL`
3. Run migrations:
   ```bash
   npx prisma migrate deploy
   ```

---

## Contributing

We welcome contributions! Please follow these steps:

1. **Fork** the repository
2. **Create** a feature branch
   ```bash
   git checkout -b feature/amazing-feature
   ```
3. **Commit** your changes
   ```bash
   git commit -m "Add amazing feature"
   ```
4. **Push** to your branch
   ```bash
   git push origin feature/amazing-feature
   ```
5. **Open** a Pull Request

### Code Style

- Follow the existing code style
- Use Prettier for formatting
- Write meaningful commit messages
- Add tests for new features

---

## Security

If you discover a security vulnerability, please send an email to security@hdticketdesk.com instead of using the issue tracker.

---

## License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

---

## Acknowledgments

- [Paystack](https://paystack.com/) for payment processing
- [Mailgun](https://www.mailgun.com/) for email delivery
- [Cloudinary](https://cloudinary.com/) for image management
- [Vercel](https://vercel.com/) for frontend hosting
- [Railway](https://railway.app/) for backend hosting

---

<p align="center">
  Built with ❤️ for Africa
</p>

<p align="center">
  <a href="https://hdticketdesk.com">Website</a> •
  <a href="https://twitter.com/hdticketdesk">Twitter</a> •
  <a href="mailto:support@hdticketdesk.com">Support</a>
</p>