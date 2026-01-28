# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

DPP Manager (Digital Product Passport) - A React application for managing digital product passports, compliance tracking, and QR code generation for product traceability.

## Commands

```bash
npm run dev      # Start development server (Vite HMR)
npm run build    # Build for production
npm run lint     # Run ESLint
npm run preview  # Preview production build
```

## Tech Stack

- **Frontend**: React 19 + TypeScript + Vite
- **Styling**: TailwindCSS 4 + shadcn/ui (New York style)
- **Routing**: React Router DOM 7
- **State**: TanStack React Query
- **Icons**: Lucide React
- **Backend**: NoCodeBackend.com REST API (primary) with localStorage fallback

## Architecture

### Layout System
- `AppLayout` - Admin pages with sidebar navigation
- `PublicLayout` - Public pages without sidebar (for QR code destinations)

### Key Directories
```
src/
├── pages/           # Route components
│   └── public/      # Public-facing pages (no auth)
├── components/
│   ├── app-sidebar.tsx  # Main navigation
│   └── ui/          # shadcn/ui components
├── services/
│   └── api.ts       # NoCodeBackend API integration
├── types/
│   ├── product.ts   # Product & DPP types
│   └── visibility.ts # Visibility settings
└── lib/utils.ts     # cn() classname utility
```

### API Integration (src/services/api.ts)
- Base URL: `https://api.nocodebackend.com`
- Headers: `Instance` + `Authorization: Bearer <token>`
- Endpoints: `/create/{table}`, `/read/{table}`, `/search/{table}`, `/update/{table}/{id}`, `/delete/{table}/{id}`
- Falls back to localStorage when API unavailable

### Public Routes (QR Code destinations)
- `/p/:gtin/:serial` - Consumer/customs product view
- `/01/:gtin/21/:serial` - GS1 Digital Link format
- `?view=zoll` parameter switches to customs view

### Visibility System (3 levels)
- `consumer` - Visible to everyone
- `customs` - Visible to customs + admin only
- `internal` - Admin only (not on public pages)

## Conventions

- **Language**: German UI (Deutsch)
- **Components**: Use shadcn/ui from `@/components/ui/`
- **Imports**: Use `@/` path alias for src directory
- **Mobile**: 768px breakpoint, use `useIsMobile()` hook
