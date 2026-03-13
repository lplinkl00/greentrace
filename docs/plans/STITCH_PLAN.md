# GreenTrace - Stitch Design Themes Plan

The goal is to establish a cohesive, premium design language for GreenTrace, a compliance operations platform for a portfolio of palm oil mills. We will use Stitch to ideate and finalize design themes for the web application's core views.

## User Review Required

> [!IMPORTANT]
> To proceed, we need your input on the clarifying questions sent to you. The answers will direct how we craft the Stitch prompts to generate the most accurate screens.

1. **Brand Aesthetic:** Are there specific brand colors, typography, or vibes you want? (e.g., earthy greens, minimalist light mode, or a sleek dark mode?)
2. **Layout Density:** Should the design be data-dense (like a traditional ERP system) or highly spacious, modern, and user-friendly (like a modern SaaS product)?
3. **Key Screens:** I'm proposing we first design the **Aggregator Dashboard**, then **Mill Checklist Data Entry**, and finally **Auditor Findings**. Does this cover the core views you want themed?
4. **Target Device:** Is the app mostly used on desktop computers (for office workers), or does it need to be heavily optimized for tablets/mobile (for mill staff on-site)?

## Proposed Changes

We will approach the theme creation systematically:

### 1. Initial Project Creation & Theming Options
- We will create a fresh Stitch project named "GreenTrace Concept".
- We will start by generating the most complex/representative screen: the **Super Admin / Aggregator Dashboard**. This view needs to show portfolio progress, mill statuses, and compliance insights.
- We will generate 2-3 **variants** of this dashboard using different aesthetic prompts (e.g., "Modern, clean, spacious with earthy greens" vs. "High-density enterprise ERP, structured, professional").

### 2. User Selection
- We will present the generated screens to you.
- You will choose the variant that best matches your vision for the product.

### 3. Expansion to Key Views
Once the theme is selected, we will ask Stitch to generate subsequent key workflows using the same visual language:
- **Mill Manager Checklist / Data Entry**: The core functional view for entering data (quantities, ratios), uploading evidence documents, and managing compliance requirements. 
- **Auditor Status Review**: A distinct view representing the compliance and auditing cycle logic.

## Verification Plan

### Manual Verification
- You will review the generated screens via the Stitch UI (or provided links/images) and we will iteratively refine them based on your feedback.
- We will derive CSS variables and theme tokens (colors, typographies, spacing) from the final screens for your Vite/Next.js application.
