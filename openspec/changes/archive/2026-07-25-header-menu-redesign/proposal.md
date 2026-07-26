# Proposal: Header Menu Redesign

## Problem

The current header component (`app-header`) has several issues:
1. **No mobile menu**: On screens <md (768px), only the logo is shown. There is no hamburger button, no slide-out panel, no mobile navigation.
2. **CTA button not styled**: The "Registrate" link is rendered as plain text identical to other nav links. It does not match the reference design in `docs/home/code.html` (which shows a filled primary button with hover state).
3. **Alignment**: Desktop nav links should be right-aligned (they already are via `justify-between`, but the CTA button needs to be visually distinct).

## Proposed Solution

Redesign the `HeaderComponent` to:
- **Desktop (≥md)**: Show nav links + "Registrate" CTA button right-aligned. CTA styled with `bg-primary text-white px-6 py-2.5 rounded-custom font-semibold hover:bg-primary-container transition-colors`.
- **Mobile (<md)**: Show hamburger button (lucide `Menu` icon). On toggle, slide-in a full-height panel (90% width) from the right with 300ms ease-out animation. Hamburger icon crossfades to `X` icon with same 300ms duration.
- **Close behavior**: Click outside panel, press Escape, or click any link in the panel closes the menu.
- **Accessibility**: `aria-label`, `aria-expanded`, `aria-controls`, `role="dialog"` on panel.

## Scope

- Files affected: `frontend/src/app/layout/header/header.component.{ts,html,css,spec.ts}`
- No changes to routing, AppComponent, or other components.
- No new dependencies (lucide-angular already installed).
- No API or data model changes.

## Out of Scope

- Actual route wiring for nav links (links remain `#`).
- Installing `ngx-skeleton-loader` or `@angular/google-maps`.
- Focus trap implementation (post-MVP).
