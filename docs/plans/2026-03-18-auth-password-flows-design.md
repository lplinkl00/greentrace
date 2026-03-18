# Auth Password Flows Design

**Date:** 2026-03-18
**Status:** Approved

## Overview

Two auth flows need to be built: forgot-password (reset) and accept-invite (set password). They share a token-exchange route handler and a set-password page, but the entry points and copy differ.

## Flows

### Flow 1 — Forgot Password

```
/login → "Forgot password?" → /reset-password
  → email sent (success state shown in-page)
  → user clicks email link → /auth/confirm?token_hash=xxx&type=recovery
  → /set-password?type=recovery
  → / (middleware routes to dashboard by role)
```

### Flow 2 — Accept Invite

```
Admin sends invite → user receives email
  → /auth/confirm?token_hash=xxx&type=invite
  → /set-password?type=invite
  → / (middleware routes to dashboard by role)
```

## Files

### New: `src/app/auth/confirm/route.ts`
Server route handler (GET). Reads `token_hash`, `type`, and optional `next` from query params. Calls `supabase.auth.verifyOtp({ token_hash, type })` to exchange the token for a session. On success, redirects to `/set-password?type=<type>`. On failure, redirects to `/login?error=invalid_token`.

### Replace: `src/app/(auth)/reset-password/page.tsx`
Full-page form matching the existing dark two-panel layout (same as login/signup). Single email input. On submit, calls `supabase.auth.resetPasswordForEmail(email, { redirectTo: '<origin>/auth/confirm?next=/set-password' })`. Transitions to an inline success state ("Check your inbox — we've sent a password reset link") without navigating away. No need for a separate confirmation page.

### New: `src/app/(auth)/set-password/page.tsx`
Full-page form, same dark two-panel layout. Password + confirm password fields. Reads `?type` from search params to show contextual heading copy:
- `invite` → "Welcome to GreenTrace" / "Set your password to get started."
- `recovery` → "Choose a new password" / "Enter a new password for your account."

On submit, calls `supabase.auth.updateUser({ password })`. On success, redirects to `/`. Client component wrapped in `<Suspense>` (same pattern as login page).

### Update: `src/middleware.ts`
Add `/auth/confirm` and `/set-password` to the `isAuthRoute` check so unauthenticated requests are not redirected to `/login` before the session is established.

## Design Constraints

- All pages use the existing dark two-panel layout: `bg-[#141414]`, sunset gradient right panel, Logo component top-left, footer bottom-left.
- Input/button styles match login page: `bg-white/5 border border-white/10`, `bg-sunset-gradient` CTA button.
- Password fields use show/hide toggle (Eye/EyeOff icons from lucide-react).
- Minimum password length: 8 characters (matches signup page).
- Error display: `bg-red-500/10 border border-red-500/30 text-red-400` banner (matches login page).
