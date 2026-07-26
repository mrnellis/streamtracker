# StreamTrack — PRD

## Original Problem Statement
Homelab-hostable app to track all streaming platforms. For each subscription: monthly price, platform tier/level, concurrent user count, geocode (region) tracking, next payment due date, and list of current users. Must run in Kubernetes.

## User Choices (from ask_human)
- Auth: Simple JWT-based login
- Geocode: Country/region code (US, UK, etc.)
- Current users: List of profile names per subscription
- Pre-seed common platforms: Yes
- Extras: Dashboard with total monthly spend + upcoming renewals

## Architecture
- Backend: FastAPI + Motor (MongoDB) + PyJWT + bcrypt
- Frontend: React 19 + React Router 7 + Tailwind + Shadcn UI + Recharts + sonner toasts
- Auth: JWT Bearer in Authorization header, stored in localStorage as `streamtrack_token`
- All API routes prefixed `/api`

## Personas
- Homelab owner / household admin: adds subscriptions, tracks who uses each plan, watches spend

## Core Requirements (Done)
- [x] JWT register/login/me endpoints, admin auto-seeded (admin@example.com / admin123)
- [x] Subscription CRUD with platform, tier, price, currency, concurrent_users, region, next_payment_date, profile_users, brand_color, notes
- [x] Platform templates (Netflix, Disney+, Hulu, Max, Prime Video, Spotify, Apple TV+, YouTube Premium, Peacock, Paramount+) — 15 presets
- [x] Dashboard summary: monthly spend, yearly projection, sub count, seat count, upcoming renewals (30d), spend breakdown, region counts
- [x] Renewals timeline grouped Overdue / This week / 30d / Later
- [x] Warm Terminal design system: Outfit + Manrope + JetBrains Mono, terracotta accents on olive-charcoal base
- [x] Testing: 100% backend + 100% frontend passing (iteration_1.json)

## Implemented (2026-02)
- Backend: /api/auth/{register,login,me}, /api/subscriptions CRUD, /api/dashboard/summary, /api/platform-templates, /api/health
- Frontend: /login, /register, / (Dashboard), /subscriptions, /renewals with sidebar layout + mobile nav

## Backlog (deferred)
- P1: Kubernetes manifests + Dockerfile for actual homelab deployment
- P1: Multi-currency conversion (currently stored per-sub as raw string)
- P2: Payment reminder emails / webhook to Home Assistant
- P2: CSV import/export of subscriptions
- P2: Household member accounts (multi-user shared view)
- P2: Historical spend chart over time
- P3: Platform icon SVG library
