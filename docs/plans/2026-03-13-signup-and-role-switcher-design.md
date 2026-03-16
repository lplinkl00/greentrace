# Design: Sign-up Page & Super Admin Role Switcher

**Date:** 2026-03-13
**Ticket:** Create Sign up page (ID: 2, Priority: High)
**Status:** Approved

---

## Overview

Two related features:
1. A self-service sign-up page for new Super Admin accounts, gated by a single-use invite token.
2. A role switcher UI that lets Super Admins navigate into Mill or Auditor views without separate accounts.

---

## Section 1: Database & Token Generation

### New Prisma model: `InviteToken`

```prisma
model InviteToken {
  id        String    @id @default(cuid())
  tokenHash String    @unique   // SHA-256 of the raw token
  createdAt DateTime  @default(now())
  expiresAt DateTime             // 30 days from creation
  usedAt    DateTime?            // null = unused; set atomically on sign-up
}
```

No relation to `Organisation` — the org is created at sign-up time using this token.

### Token generation script: `scripts/generate-invite.ts`

- Generates a cryptographically random 32-byte hex token
- Stores `SHA-256(token)` in `InviteToken` with `expiresAt = now + 30 days`
- Prints the raw token to stdout for distribution
- Run via: `bun run scripts/generate-invite.ts`
- Tokens are single-use: marked `usedAt` on successful sign-up

---

## Section 2: Sign-up Page & API

### Page: `/signup`

Mirrors the login page's split-panel dark design. Fields:
- Full name
- Email
- Password
- Organisation / Company name
- Invite code

On submit: `POST /api/auth/signup`

Login page: Replace the "Contact Sales" `<span>` with `<Link href="/signup">Sign up</Link>`.

### API route: `POST /api/auth/signup` (public)

Steps:
1. Hash the submitted invite code: `SHA-256(code)`
2. Look up `InviteToken` by hash — reject (400) if not found, already used (`usedAt != null`), or expired (`expiresAt < now`)
3. Create Supabase user via admin API with `user_metadata: { role: 'SUPER_ADMIN', name }`
4. Create `Organisation` record with the submitted company name
5. Create `User` record: `role: SUPER_ADMIN`, linked to new org, `supabaseUserId` from step 3
6. Mark token `usedAt = now()` atomically
7. Return `{ success: true }` → frontend redirects to `/login?registered=true`

Error handling: if Supabase user creation succeeds but subsequent steps fail, clean up the Supabase user to avoid orphaned auth accounts.

---

## Section 3: Role Switcher (SUPER_ADMIN)

### Cookie state

| Cookie | Values |
|--------|--------|
| `activeView` | `"aggregator"` \| `"mill"` \| `"auditor"` |
| `activeMillId` | mill UUID (only set when `activeView = "mill"`) |

### Middleware update

SUPER_ADMIN bypasses all route-group guards — allowed through `/aggregator/*`, `/mill/*`, and `/auditor/*` without redirect. Middleware continues to redirect other roles to their designated group.

### Shared component: `<RoleSwitcher>`

Rendered at the top of all three layout sidebars (aggregator, mill, auditor). Only visible to SUPER_ADMIN.

Behaviour:
- **Switch to Aggregator:** set `activeView=aggregator`, navigate to `/aggregator/dashboard`
- **Switch to Auditor:** set `activeView=auditor`, navigate to `/auditor/dashboard`
- **Switch to Mill:** open a modal with a searchable dropdown of all mills (fetched from `/api/mills`), then set `activeView=mill` + `activeMillId=<selected>`, navigate to `/mill/dashboard`

### Mill-scoped API routes

SUPER_ADMIN has `millId: null` in their session. When in mill view, pages append `?millId=<activeMillId>` to API calls. API routes that use `user.millId` already accept a `millId` query param and use it as a fallback when the session user has no mill.

---

## Out of Scope

- Revoking or listing invite tokens via UI (tokens expire automatically in 30 days)
- SUPER_ADMIN creating other SUPER_ADMIN accounts (existing `/api/auth/invite` handles inviting lower-role users)
- Email delivery of the invite token (distributed out-of-band)
