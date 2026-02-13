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
