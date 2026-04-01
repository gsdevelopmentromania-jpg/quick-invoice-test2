# Theme QA Report — Light/Dark Mode Implementation
**Branch:** `feature/light-dark-theme`  
**Reviewed by:** Aegis (QA Manager)  
**Date:** 2026-04-01

---

## Summary

The core dark mode infrastructure is solid and correctly wired up. The `ThemeProvider`, `tailwind.config.ts`, `globals.css`, and all shared UI primitives are correctly implemented. The main gaps are in **page-level components** — the dashboard page and auth layout/pages still contain hardcoded light-mode Tailwind colours with no `dark:` counterparts.

---

## ✅ Correctly Implemented

### Infrastructure
- **`package.json`** — `next-themes: ^0.3.0` is present in `dependencies`. ✅
- **`tailwind.config.ts`** — `darkMode: 'class'` is set at the top level. ✅
- **`src/app/globals.css`** — `.dark { }` block exists inside `@layer base` with all surface and typography token overrides. CSS variables use space-separated RGB values (e.g. `17 24 39`) — no `#` hex or `rgb()` wrappers. Dark skeleton shimmer override (`dark .skeleton-shimmer`) and dark scrollbar styles are also present. ✅
- **`src/app/layout.tsx`** — `suppressHydrationWarning` is on the `<html>` element. ✅
- **`src/components/providers.tsx`** — `ThemeProvider` wraps the tree with `attribute="class"`, `defaultTheme="system"`, `enableSystem`, and `disableTransitionOnChange`. ✅

### ThemeToggle
- **`src/components/ui/theme-toggle.tsx`** — `"use client"` is the first line. ✅
- **Mounted guard** — `useState(false)` + `useEffect(() => setMounted(true), [])` prevents hydration mismatch; a placeholder `<div>` is returned before mount. ✅
- **Sun/moon SVG icons** swap correctly based on `theme === "dark"`. ✅
- **ARIA labels** (`aria-label`, `title`) update based on current theme. ✅

### Layout Components
- **`src/components/layout/header.tsx`** — imports and renders `<ThemeToggle />`. All interactive elements have `dark:` variants (`dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-gray-800`, etc.). ✅
- **`src/components/layout/sidebar.tsx`** — sidebar container, nav items, theme toggle section, and upgrade card all have `dark:` variants. ✅
- **`src/components/layout/dashboard-shell.tsx`** — outer div has `dark:bg-gray-950`. ✅

### UI Primitive Components
- **`src/components/ui/button.tsx`** — `secondary`, `outline`, and `ghost` variants all have `dark:` counterparts. ✅
- **`src/components/ui/card.tsx`** — `Card`, `CardHeader`, `CardFooter` all have `dark:border-gray-700 dark:bg-gray-800`. ✅
- **`src/components/ui/input.tsx`** — label, input, error, and hint all have `dark:` variants. ✅
- **`src/components/ui/textarea.tsx`** — same pattern as input; full dark coverage. ✅
- **`src/components/ui/select.tsx`** — label, select, error, and hint all have `dark:` variants. ✅
- **`src/components/ui/badge.tsx`** — all 7 variants (`default`, `success`, `warning`, `danger`, `info`, `purple`, `gray`) have `dark:bg-*` and `dark:text-*` counterparts. ✅
- **`src/components/ui/skeleton.tsx`** — `Skeleton`, `SkeletonCard`, and `SkeletonStatCard` all have `dark:border-gray-700 dark:bg-gray-800`. The shimmer animation is handled via `.dark .skeleton-shimmer` in globals.css. ✅
- **`src/components/ui/empty-state.tsx`** — icon container and text have `dark:bg-gray-700`, `dark:text-gray-500`, `dark:text-gray-100`, `dark:text-gray-400`. ✅

---

## ⚠️ Items Needing Attention

### 1. `src/app/(dashboard)/dashboard/page.tsx` — Missing dark variants throughout

This page bypasses the `Card`/`CardBody` components in several places and applies inline Tailwind classes without `dark:` variants. Affected areas:

| Element | Current classes | Missing dark override |
|---|---|---|
| Stats grid — normal card | `border-gray-200 bg-white` | `dark:border-gray-700 dark:bg-gray-800` |
| Stats grid — highlight card | `border-red-200 bg-red-50` | `dark:border-red-800 dark:bg-red-950` |
| Stats label | `text-gray-500` | `dark:text-gray-400` |
| Stats value (normal) | `text-gray-900` | `dark:text-gray-100` |
| Stats value (highlight) | `text-red-700` | `dark:text-red-400` |
| Stats note (normal) | `text-gray-400` | already ok |
| Stats note (highlight) | `text-red-500` | `dark:text-red-400` |
| Table header row border | `border-gray-100` | `dark:border-gray-700` |
| Table header cells | `text-gray-500` | `dark:text-gray-400` |
| Table body divider | `divide-gray-50` | `dark:divide-gray-700` |
| Table row hover | `hover:bg-gray-50` | `dark:hover:bg-gray-800` |
| Invoice link | `text-gray-900` | `dark:text-gray-100` |
| Invoice sub-text | `text-gray-400` | already ok |
| Client name cell | `text-gray-600` | `dark:text-gray-300` |
| Amount cell | `text-gray-900` | `dark:text-gray-100` |
| CardHeader h2 | `text-gray-900` | `dark:text-gray-100` |
| CardHeader "View all" link | `text-indigo-600 hover:text-indigo-700` | `dark:text-indigo-400 dark:hover:text-indigo-300` |
| "Getting Started" CardHeader h2/p | `text-gray-900`, `text-gray-500` | `dark:text-gray-100`, `dark:text-gray-400` |
| Onboarding step — unchecked circle | `border-gray-300 group-hover:border-indigo-400` | `dark:border-gray-600 dark:group-hover:border-indigo-500` |
| Onboarding step — done text | `text-gray-400` | already ok |
| Onboarding step — todo text | `text-gray-700` | `dark:text-gray-300` |
| Onboarding row hover | `hover:bg-gray-50` | `dark:hover:bg-gray-800` |
| "Quick Actions" CardHeader h2 | `text-gray-900` | `dark:text-gray-100` |
| Quick action tiles | `border-gray-200 bg-gray-50 text-gray-700` | `dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300` |
| New invoice hover | `hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700` | `dark:hover:border-indigo-800 dark:hover:bg-indigo-950 dark:hover:text-indigo-300` |
| Add client hover | same as above | same |
| Overdue hover | `hover:border-red-200 hover:bg-red-50 hover:text-red-700` | `dark:hover:border-red-800 dark:hover:bg-red-950 dark:hover:text-red-400` |
| Settings hover | `hover:border-gray-300 hover:bg-white` | `dark:hover:border-gray-600 dark:hover:bg-gray-700` |

### 2. `src/app/(auth)/layout.tsx` — Missing dark variants

The auth shell has hardcoded light colours with no dark overrides:

| Element | Current | Missing |
|---|---|---|
| Outer div | `bg-gray-50` | `dark:bg-gray-900` |
| Header | `border-gray-200 bg-white` | `dark:border-gray-700 dark:bg-gray-900` |
| Logo text | `text-gray-900` | `dark:text-white` |
| Footer | `border-gray-200 bg-white` | `dark:border-gray-700 dark:bg-gray-900` |
| Footer text | `text-gray-400` | `dark:text-gray-500` |

### 3. `src/app/(auth)/login/page.tsx` — Missing dark variants

The login page renders its own form inputs (not using the `Input` component) and OAuth buttons with hardcoded light colours:

| Element | Current | Missing |
|---|---|---|
| h1 | `text-gray-900` | `dark:text-white` |
| Subtitle p | `text-gray-500` | `dark:text-gray-400` |
| Success banners | `bg-green-50 text-green-700 border-green-200` | `dark:bg-green-950 dark:text-green-300 dark:border-green-800` |
| OAuth buttons | `border-gray-300 bg-white text-gray-700 hover:bg-gray-50` | `dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700` |
| Divider span | `bg-white text-gray-400` | `dark:bg-gray-900 dark:text-gray-500` |
| Divider line | `border-gray-200` | `dark:border-gray-700` |
| Error alert | `bg-red-50 text-red-700 border-red-200` | `dark:bg-red-950 dark:text-red-300 dark:border-red-800` |
| Email/password labels | `text-gray-700` | `dark:text-gray-300` |
| Email/password inputs | `border-gray-300 bg-white text-gray-900 placeholder-gray-400` | `dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500` |
| Forgot password link | `text-indigo-600 hover:text-indigo-700` | `dark:text-indigo-400 dark:hover:text-indigo-300` |
| Sign-up link text | `text-gray-500` | `dark:text-gray-400` |
| Sign-up link | `text-indigo-600 hover:text-indigo-700` | `dark:text-indigo-400 dark:hover:text-indigo-300` |

> **Note:** Other auth pages (`register`, `forgot-password`, `reset-password`, `verify-email`) likely have the same pattern — they should be reviewed and updated in the same pass.

### 4. `src/components/ui/theme-toggle.tsx` — System theme icon mismatch (minor UX)

When `defaultTheme="system"`, `next-themes` sets `theme` to `"system"` (not `"dark"` or `"light"`). The current logic `isDark = theme === "dark"` means that if the OS is in dark mode but the user hasn't explicitly chosen a theme, the toggle will show the **moon icon** (suggesting dark mode is off) rather than the sun icon — which is misleading.

**Fix:** Replace `isDark = theme === "dark"` with the resolved theme:

```ts
import { useTheme } from "next-themes";
const { theme, resolvedTheme, setTheme } = useTheme();
const isDark = resolvedTheme === "dark";
```

This uses `resolvedTheme` (which resolves `"system"` to the actual OS preference) for icon display, while keeping `theme` for the toggle logic so clicking switches between `"light"` and `"dark"` explicitly.

---

## ❌ Critical Issues

**None found.** The implementation will not crash or break the build. The gaps identified above are visual-only — in dark mode, some pages will render with white/light backgrounds and dark text, which is legible but incorrect.

---

## Recommended Fix Priority

| Priority | File | Issue |
|---|---|---|
| High | `src/app/(dashboard)/dashboard/page.tsx` | Most visible page; all stat cards, table, and action tiles lack dark variants |
| High | `src/app/(auth)/layout.tsx` | Auth shell background and header stay white in dark mode |
| High | `src/app/(auth)/login/page.tsx` | Login form inputs, OAuth buttons, and labels stay light-mode only |
| Medium | Other auth pages (`register`, `forgot-password`, `reset-password`, `verify-email`) | Likely same pattern as login — verify and update |
| Low | `src/components/ui/theme-toggle.tsx` | Use `resolvedTheme` for icon display to handle system theme correctly |

---

## Verification Checklist

| Check | Result |
|---|---|
| `next-themes` in `package.json` | ✅ |
| `darkMode: 'class'` in `tailwind.config.ts` | ✅ |
| `.dark {}` CSS vars in `globals.css` (space-separated RGB, no hex) | ✅ |
| `ThemeProvider attribute="class"` in `providers.tsx` | ✅ |
| `suppressHydrationWarning` on `<html>` in `layout.tsx` | ✅ |
| `"use client"` on `theme-toggle.tsx` | ✅ |
| `mounted` guard in `theme-toggle.tsx` | ✅ |
| Dark classes in `header.tsx` + `ThemeToggle` rendered | ✅ |
| Dark classes in `sidebar.tsx` + `ThemeToggle` rendered | ✅ |
| Dark classes in `dashboard-shell.tsx` | ✅ |
| All `src/components/ui/` primitives have dark variants | ✅ |
| `src/app/(dashboard)/dashboard/page.tsx` dark variants | ⚠️ Missing |
| `src/app/(auth)/layout.tsx` dark variants | ⚠️ Missing |
| `src/app/(auth)/login/page.tsx` dark variants | ⚠️ Missing |
| Other auth pages dark variants | ⚠️ Unverified — likely missing |
| `resolvedTheme` used in ThemeToggle icon logic | ⚠️ Minor gap |
