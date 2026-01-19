# hdticketdesk Frontend v2

Africa's premier event ticketing platform - SEO-optimized with stunning homepage.

## ✨ What's New in v2

### 🎠 Hero Banner Carousel
- **6 floating event cards** that auto-scroll horizontally
- Shows events **closest to starting** (soonest first)
- **Smart fallback logic**:
  - 6+ upcoming → Show 6 nearest upcoming
  - Less than 6 → Show whatever is available (1, 2, 3...)
  - 0 upcoming → Show recently ended events
  - 0 events at all → Elegant empty state

### 📊 Homepage Sections
- 🔴 **Live Now** - Events happening right now
- 🔥 **Trending** - Most tickets sold in last 7 days
- 📅 **Upcoming** - Events starting soon
- ⭐ **Featured** - Organizer-promoted events

### 🔍 SEO Enhancements
- Dynamic meta tags per page
- Open Graph for social sharing
- JSON-LD structured data for events
- sitemap.xml + robots.txt
- Server-side rendering for event pages

## 🎨 Design System

- **Typography**: Outfit (body) + Clash Display (headings)
- **Colors**: Purple primary with vibrant gradients
- **Animations**: Smooth slide, fade, pulse effects
- **Glass morphism**: Frosted glass card effects

## 🚀 Getting Started

```bash
# Install dependencies
npm install

# Set up environment
cp .env.example .env.local

# Start development
npm run dev
```

## 📁 Project Structure

```
app/
├── page.tsx              # Homepage with all sections
├── layout.tsx            # SEO-optimized root layout
├── robots.ts             # Search engine rules
├── sitemap.ts            # Dynamic sitemap
├── (auth)/               # Login, signup, verify
├── (public)/events/[slug]/ # SEO event pages
├── (organizer)/          # Organizer dashboard
├── (buyer)/              # Buyer pages
└── admin/                # Admin panel

components/
├── home/                 # Homepage sections
│   ├── hero-banner.tsx
│   ├── event-carousel.tsx
│   ├── live-now-section.tsx
│   ├── trending-section.tsx
│   ├── upcoming-section.tsx
│   ├── featured-section.tsx
│   └── cta-section.tsx
├── ui/                   # Base components
└── layouts/              # Header, footer, sidebar
```

## 🔌 API Endpoints Required

Your backend needs these new endpoints:

```
GET /events/carousel  - Up to 6 nearest upcoming events
GET /events/live      - Currently happening events
GET /events/trending  - Most sales in 7 days
GET /events/upcoming  - Future events sorted by date
GET /events/featured  - Promoted/featured events
```

## 📱 Features

- ✅ Mobile-first responsive design
- ✅ Dark mode support
- ✅ QR code scanner
- ✅ Monnify integration
- ✅ Real-time analytics
- ✅ OTP verification
- ✅ Email notifications
