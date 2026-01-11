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

## Contributing

We welcome contributions! 

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