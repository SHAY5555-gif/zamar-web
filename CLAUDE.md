# CLAUDE.md - Zamar Web Admin Panel

## Project Overview

Web admin panel for Zamar app - React/Next.js application for managing users, songs, setlists, and billing.

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Styling**: Tailwind CSS
- **Payments**: Stripe
- **Auth**: Custom auth with backend API
- **Language**: TypeScript

## Test Credentials

```
Email: yeshayaavitan@gmail.com
Password: 325416774
```

## Quick Start

```bash
npm install
npm run dev
```

Opens at http://localhost:3000

## Environment Variables

See `.env.local` for required variables.

## Admin Panel Features (`/admin`)

### Main Admin Page
- View all users with stats (total, active, free)
- Search users by email or username
- Navigate to individual user management

### User Management Page (`/admin/users/[userId]`)
Full user management capabilities:

| Feature | Description |
|---------|-------------|
| **View User Info** | Avatar, email, username, stats |
| **Edit Credits** | Add or set credit balance (in cents) |
| **Toggle Subscription** | Switch between premium/free status |
| **Manage Songs** | Add, edit, delete user's songs |
| **Manage Setlists** | Create, edit, delete setlists |
| **Edit Setlist Songs** | Add/remove/reorder songs in setlist |
| **Export Data** | Download all user data as JSON |
| **Delete User** | Permanently delete user and all data |
| **Impersonate** | View app as this user (native/dashboard) |

### API Routes
```
/api/admin/users                     - GET all users
/api/admin/users/[userId]            - GET/DELETE user
/api/admin/users/[userId]/credits    - PATCH credits
/api/admin/users/[userId]/subscription - PATCH subscription
/api/admin/users/[userId]/songs      - GET/POST songs
/api/admin/users/[userId]/songs/[id] - PUT/DELETE song
/api/admin/users/[userId]/setlists   - GET/POST setlists
/api/admin/users/[userId]/setlists/[id] - PUT/DELETE setlist
/api/admin/users/[userId]/impersonate - POST get token
```

## Project Structure

```
src/
├── app/
│   ├── page.tsx                    # Home page
│   ├── layout.tsx                  # Root layout
│   ├── auth/
│   │   ├── login/page.tsx          # Login
│   │   └── register/page.tsx       # Register
│   ├── dashboard/
│   │   ├── page.tsx                # Dashboard main
│   │   ├── songs/page.tsx          # Songs library
│   │   └── setlists/
│   │       ├── page.tsx            # Setlists
│   │       └── [id]/
│   │           ├── page.tsx        # Edit setlist
│   │           └── perform/page.tsx # Performance mode
│   ├── billing/page.tsx            # Billing
│   ├── credits/
│   │   ├── page.tsx                # Buy credits
│   │   └── success/page.tsx        # Purchase success
│   ├── admin/
│   │   ├── page.tsx                # Admin panel
│   │   └── users/[userId]/page.tsx # User details
│   └── api/
│       ├── admin/users/...         # Admin API routes
│       ├── stripe/...              # Stripe webhooks
│       └── langgraph/route.ts      # AI integration
└── lib/
    └── auth.ts                     # Auth utilities
```

## RTL Support

This is a Hebrew app - all UI text must be RTL (right-to-left).
- Use `text-right` or `dir="rtl"` for Hebrew content
- Use `flex-row-reverse` for horizontal layouts
