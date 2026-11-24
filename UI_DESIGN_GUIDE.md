# MotoGo — UI/UX Design Guide (`UI_DESIGN_GUIDE.md`)

This guide documents the **original MotoGo visual identity**, color palette, typography, and component standards used across all Public, Passenger, Driver, and Administrator screens.

---

## 1. Brand Identity

- **Brand Name:** **MotoGo** (*Motorcycle Ride-Hailing & Driver Management Platform*)
- **Logo Mark (`MotoGoLogo.tsx`):** An original geometric rounded-square badge featuring a stylized open motion ring and forward route chevron—never reusing Grab, JoyRide, or any third-party logos or proprietary assets.
- **Brand Personality:** Trustworthy, fast, modern, and operationally transparent.

---

## 2. Color System

| Role | Name | Hex | Usage |
| :--- | :--- | :--- | :--- |
| **Primary Dark Surface** | Deep Navy (`navy-900`) | `#0B132B` | Sidebar, public hero, dark summary banners, primary headings |
| **Secondary Dark Surface** | Navy Slate (`navy-800`) | `#132042` | Elevated cards on dark backgrounds, dark hover states |
| **Primary Brand Accent** | MotoGo Orange (`orange-500`) | `#F97316` | Primary CTAs, active sidebar item, fare highlights, brand accent |
| **Accent Hover** | Deep Orange (`orange-600`) | `#EA580C` | Button hover states, emphasis text links |
| **Accent Tint** | Soft Orange (`orange-50`) | `#FFF7ED` | Design-mode notices, icon badges, subtle active highlights |
| **Canvas Background** | Crisp Slate (`slate-50`) | `#F8FAFC` | Main app workspace background |
| **Card Surface** | Pure White (`white`) | `#FFFFFF` | Dashboard cards, forms, data tables, top header |
| **Semantic Success** | Emerald (`emerald-600`) | `#059669` | Approved drivers, completed rides, net driver payout |
| **Semantic Warning** | Amber (`amber-600`) | `#D97706` | Pending approvals, awaiting review |
| **Semantic Danger** | Red (`red-600`) | `#DC2626` | Suspended accounts, cancellations, error states |

---

## 3. Typography

- **Font Family:** `Inter` (loaded via `next/font/google` with `display: "swap"`).
- **Hierarchy:**
  - Page Titles: `text-2xl font-bold tracking-tight text-[#0B132B]`
  - Section Headings: `text-base font-semibold text-[#0B132B]`
  - KPI Numbers: `text-2xl font-bold tracking-tight text-[#0B132B]`
  - Table Headers & Labels: `text-xs font-semibold uppercase tracking-wider text-slate-600`
  - Monospace Identifiers (Ride IDs, Plate Numbers): `font-mono`

---

## 4. Responsive Layout Rules

- **Desktop (`lg` ≥ 1024px):** Fixed `256px` (`w-64`) dark navy left sidebar + sticky `64px` white top header + `max-w-7xl` padded content area.
- **Mobile & Tablet (`< 1024px`):** Sidebar collapses cleanly into a slide-over drawer triggered by the top-left hamburger button in `Header.tsx`. Tables wrap in `overflow-x-auto` containers to prevent horizontal page overflow.

---

## 5. Reusable Component Inventory

| Component | File | Purpose |
| :--- | :--- | :--- |
| `MotoGoLogo` | `src/components/brand/MotoGoLogo.tsx` | Original SVG emblem + wordmark (`light` / `dark`) |
| `AppShell`, `Sidebar`, `Header` | `src/components/layout/` | Responsive role-based dashboard shell |
| `PublicNavbar`, `PublicFooter` | `src/components/layout/PublicChrome.tsx` | Public marketing & auth header/footer |
| `Button`, `LinkButton` | `src/components/ui/Button.tsx` | Consistent action buttons (`primary`, `navy`, `outline`, `ghost`, `danger`) |
| `StatCard`, `SectionCard` | `src/components/ui/Cards.tsx` | KPI cards and titled content containers |
| `StatusBadge` | `src/components/ui/StatusBadge.tsx` | Semantic status pills with optional live dot |
| `DesignModeBanner` | `src/components/ui/DesignModeBanner.tsx` | Honest indicator for Batch 3 design-only screens |
| `FormField`, `TextInput`, `SelectInput`, `TextareaInput`, `FileUploadBox` | `src/components/ui/FormComponents.tsx` | Accessible, consistent form inputs and upload dropzones |
| `DataTable` | `src/components/ui/DataTable.tsx` | Typed, responsive data table with empty state |
| `Spinner`, `SkeletonCard`, `PageLoader` | `src/components/ui/LoadingStates.tsx` | Loading indicators + global `loading.tsx` |
| `ErrorState`, `EmptyState` | `src/components/ui/ErrorStates.tsx` | Error & empty fallbacks + global `error.tsx` & `not-found.tsx` |
