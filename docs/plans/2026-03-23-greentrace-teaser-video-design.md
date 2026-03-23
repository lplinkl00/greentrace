# GreenTrace Teaser Video — Design Doc

**Date:** 2026-03-23
**Format:** Remotion (standalone project at `remotion/`)
**Output:** MP4, 1080×1080, 30fps, ~40 seconds
**Purpose:** Product Hunt / social media launch teaser

---

## Brand

| Token | Value |
|-------|-------|
| Background | `#0a0a08` |
| Text | `#f4f4f5` |
| Accent gradient start | `#f97316` |
| Accent gradient mid | `#ef4444` |
| Accent gradient end | `#e11d48` |
| Font | Inter (matches the app) |

---

## Narrative Arc — "Carbon Made Simple"

**Hook → Pain → Turn → Solution → CTA**

The video opens in darkness with a universal problem statement, escalates through friction points, pivots hard on the GreenTrace brand reveal, delivers three benefit beats, then closes on a clean CTA.

---

## Scene Breakdown

### Scene 1 — The Problem (frames 0–90, 0–10s)

Dark screen with subtle grain texture overlay. White text fades in **word by word**:

> *"Companies worldwide generate millions of tonnes of carbon emissions."*

A second, dimmer line fades in below:

> *"Most don't know exactly how much."*

No logo. No brand. Pure tension.

**Animation:** `interpolate` opacity, staggered per word using `useCurrentFrame`.

---

### Scene 2 — The Friction (frames 90–144, 10–18s)

Three pain-point rows slide in **from the left**, one by one, stacking vertically. Each row has:
- A red `✗` icon (colored `#ef4444`)
- Bold label text in `#f4f4f5`

**Items:**
1. ✗ Spreadsheets scattered across teams
2. ✗ Manual calculations, human error
3. ✗ No audit trail, no compliance proof

After all three are visible, they simultaneously blur and fade out.

**Animation:** `spring` translateX per item with staggered delay; `interpolate` blur + opacity on exit.

---

### Scene 3 — The Turn (frames 144–204, 18–22s → 18–24s)

A bold **"GreenTrace"** wordmark slams in from center, rendered in the sunset gradient (`#f97316 → #e11d48`). The logo icon spins in to the left of the wordmark simultaneously.

Short hold (~1s) to let it land.

**Animation:** `spring` scale from 0.6→1, `interpolate` opacity; icon rotates 360° via `spring`.

---

### Scene 4 — The Solution (frames 204–324, 24–34s)

Three benefit cards sweep in **from the right**, staggered with spring physics. Each card has:
- A gradient left-border accent (`#f97316 → #e11d48`)
- Icon + bold headline
- Dimmer one-line sub-copy

**Cards:**
1. 🌿 **Automatic GHG Calculation** — *From your data. Instantly.*
2. 📊 **Compliance-Ready Reports** — *Audit-proof. One click.*
3. 🔗 **Full Emissions Visibility** — *Every source. Every step.*

**Animation:** `spring` translateX per card with ~12-frame stagger between each.

---

### Scene 5 — CTA (frames 324–390, 34–40s → actually frames 324–420 for a clean 14s end)

All cards fade out. Logo + wordmark re-enter, centered. Below it:

> *"Carbon emissions, finally simple."*

Tagline fades in with a gentle upward drift. Then the domain pulses in:

> **greentrace.io**

A gradient glow bloom (`radial-gradient`, low opacity) expands behind the logo and holds to end.

**Animation:** `interpolate` opacity + translateY for tagline; `spring` scale pulse for URL; CSS radial gradient animated via `interpolate`.

---

## Technical Architecture

```
remotion/
├── package.json          # remotion, @remotion/cli, react, typescript
├── tsconfig.json
├── remotion.config.ts    # composition config
└── src/
    ├── index.ts          # registerRoot
    ├── Root.tsx          # Composition registration (1080×1080, 30fps, 420 frames)
    ├── Teaser.tsx        # Top-level composition, routes frames to scenes
    ├── scenes/
    │   ├── Scene1Problem.tsx
    │   ├── Scene2Friction.tsx
    │   ├── Scene3Turn.tsx
    │   ├── Scene4Solution.tsx
    │   └── Scene5CTA.tsx
    ├── components/
    │   ├── GradientText.tsx   # Reusable sunset-gradient text
    │   ├── BenefitCard.tsx    # Solution card with gradient border
    │   ├── LogoMark.tsx       # SVG logo (ported from src/components/Logo.tsx)
    │   └── GrainOverlay.tsx   # Subtle noise texture
    └── lib/
        └── tokens.ts          # Brand colours, timing constants
```

### Key Remotion APIs used
- `useCurrentFrame()` — frame counter
- `useVideoConfig()` — fps, width, height
- `interpolate(frame, [in, out], [from, to], { extrapolateRight: 'clamp' })` — linear animations
- `spring({ frame, fps, config })` — physics-based easing
- `AbsoluteFill` — full-canvas positioning
- `Sequence` — scene time-slicing

### Frame budget

| Scene | Start frame | End frame | Duration |
|-------|------------|-----------|----------|
| 1 — Problem | 0 | 90 | 3s |
| 2 — Friction | 90 | 180 | 3s |
| 3 — Turn | 180 | 240 | 2s |
| 4 — Solution | 240 | 330 | 3s |
| 5 — CTA | 330 | 420 | 3s |
| **Total** | | **420** | **14s** |

> Note: actual scene durations above total ~14s. Adjust interpolation hold times to stretch to 40s, or let each scene breathe with longer holds. The frame budget is a starting skeleton.

---

## Render Command

```bash
cd remotion
npx remotion render src/index.ts Teaser out/greentrace-teaser.mp4
```

---

## Out of Scope

- No audio/music track (add separately in post with any video editor)
- No voiceover
- No actual UI screenshots or screen recordings
- Not embedded in the Next.js app
