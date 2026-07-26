# Tasks: Header Menu Redesign

## Status: COMPLETED

## Context

The `HeaderComponent` needs to be redesigned to:
1. Style the "Registrate" CTA as a primary button (matching `docs/home/code.html`)
2. Add a mobile hamburger menu that slides in from the right (85% width, below header)
3. Animate the hamburger icon (lucide `Menu` ↔ `X` crossfade) synchronized with the panel (300ms)
4. Support closing via: Escape key, link click, or hamburger toggle

## TDD Workflow

### Task 1: Write failing tests for desktop CTA styling ✅

**Action**: Update `header.component.spec.ts` with tests that verify:
- CTA "Registrate" has `bg-primary`, `text-white`, `px-6`, `py-2.5`, `rounded-custom`, `font-semibold`, `transition-colors`
- CTA has `hover:bg-primary-container` class
- CTA is visually distinct from plain nav links (has background color)

**Result**: Tests FAIL (CTA currently rendered as plain text link) ✓

### Task 2: Implement desktop CTA styling ✅

**Action**: Update `header.component.html` to:
- Separate "Registrate" from the `navLinks` array (it's a CTA, not a regular link)
- Render CTA as a distinct `<a>` element with primary button classes
- Keep other nav links as plain text

**Result**: Desktop CTA tests PASS ✓

### Task 3: Write failing tests for mobile hamburger button ✅

**Action**: Update `header.component.spec.ts` with tests that verify:
- Hamburger button is visible on mobile (`md:hidden` class)
- Hamburger button has `aria-expanded="false"` by default
- Hamburger button has `aria-label` for accessibility
- Hamburger button has `aria-controls` pointing to panel ID
- Lucide `Menu` icon is rendered inside the button

**Result**: Tests FAIL (no hamburger button exists yet) ✓

### Task 4: Implement mobile hamburger button ✅

**Action**: Update `header.component.ts` and `header.component.html` to:
- Import `LucideMenu` and `LucideX` from `@lucide/angular`
- Add `isMenuOpen` signal (initial `false`)
- Add `toggleMenu()` and `closeMenu()` methods
- Render hamburger button with `md:hidden`, `aria-expanded`, `aria-label`, `aria-controls`
- Show `Menu` icon when closed, `X` icon when open

**Result**: Hamburger button tests PASS ✓

### Task 5: Write failing tests for mobile panel ✅

**Action**: Update `header.component.spec.ts` with tests that verify:
- Panel is hidden by default (not visible when menu closed)
- Panel becomes visible when menu is open
- Panel has `role="dialog"` and `aria-modal="true"`
- Panel has width 85% and height `calc(100vh - 4rem)`
- Panel is positioned `fixed top:4rem right-0`
- Panel has `z-index` above header

**Result**: Tests FAIL (no panel exists yet) ✓

### Task 6: Implement mobile panel ✅

**Action**: Update `header.component.html` and `header.component.css` to:
- Add panel element with `@if (isMenuOpen())` conditional rendering
- Panel CSS class `.mobile-menu-panel` with fixed positioning, 85% width, `calc(100vh - 4rem)` height, `top: 4rem`
- Panel has `role="dialog"`, `aria-modal="true"`, unique ID matching `aria-controls`
- Panel contains nav links and CTA button

**Result**: Mobile panel tests PASS ✓

### Task 7: Write failing tests for panel animation ✅

**Action**: Update `header.component.spec.ts` with tests that verify:
- Panel has `transition: transform 300ms ease-out` (or equivalent CSS classes)
- Panel starts at `translateX(100%)` when menu is closed
- Panel transitions to `translateX(0)` when menu is open

**Result**: Tests FAIL (no animation classes yet) ✓

### Task 8: Implement panel animation ✅

**Action**: Update `header.component.css` to:
- Add `.mobile-menu-panel` with `transform: translateX(100%); transition: transform 300ms ease-out;`
- Add `.mobile-menu-panel--open` with `transform: translateX(0);`
- Ensure panel and icon animations are synchronized (same 300ms duration)

**Result**: Panel animation tests PASS ✓

### Task 9: Write failing tests for icon crossfade ✅

**Action**: Update `header.component.spec.ts` with tests that verify:
- When menu is closed: `Menu` icon is visible
- When menu is open: `X` icon is visible
- Icon transition has same 300ms duration as panel

**Result**: Tests FAIL (no crossfade logic yet) ✓

### Task 10: Implement icon crossfade ✅

**Action**: Update `header.component.html` to:
- Use `@if (isMenuOpen())` / `@else` for `X` / `Menu` icons
- Add `.icon-crossfade` class with `transition: opacity 300ms ease-out;`
- Ensure icon swap is synchronized with panel animation

**Result**: Icon crossfade tests PASS ✓

### Task 11: Write failing tests for close behavior ✅

**Action**: Update `header.component.spec.ts` with tests that verify:
- Pressing Escape closes the menu
- Clicking a link in the panel closes the menu
- After closing, `aria-expanded` is `"false"` and panel is hidden

**Result**: Tests FAIL (no close handlers yet) ✓

### Task 12: Implement close behavior ✅

**Action**: Update `header.component.ts` and `header.component.html` to:
- Add `@HostListener('document:keydown.escape')` to call `closeMenu()`
- Add click handler on panel links to call `closeMenu()`
- Ensure `closeMenu()` sets `isMenuOpen.set(false)`

**Result**: Close behavior tests PASS ✓

### Task 13: Run full test suite and verify ✅

**Action**: Run `ng test --watch=false` to verify all tests pass

**Result**: All 75 tests PASS, no regressions ✓

### Task 14: Refactor if needed ✅

**Action**: Review code for:
- File length ≤ 400 lines (frontend CI threshold): ✓
  - `header.component.ts`: 43 lines
  - `header.component.html`: 63 lines
  - `header.component.css`: 24 lines
  - `header.component.spec.ts`: 369 lines
- Cyclomatic complexity ≤ 10: ✓ (all methods are simple)
- No `any` types: ✓
- OnPush change detection preserved: ✓
- All tokens from Tailwind config (no hardcoded hex): ✓

**Result**: Code meets all quality thresholds ✓

## Files Modified

- `frontend/src/app/layout/header/header.component.ts` — state, signals, methods, imports
- `frontend/src/app/layout/header/header.component.html` — template structure, mobile panel, animations
- `frontend/src/app/layout/header/header.component.css` — animation classes
- `frontend/src/app/layout/header/header.component.spec.ts` — all new tests (73 total)

## Dependencies

- `@lucide/angular ^1.26.0` — already installed ✓
- Tailwind tokens — already configured ✓ (`bg-primary`, `rounded-custom`, etc.)

## Acceptance Criteria

- [x] Desktop: nav links + CTA right-aligned, CTA styled as primary button
- [x] Mobile: hamburger button visible, menu hidden by default
- [x] Mobile: panel slides in from right (85% width, below header, 300ms ease-out)
- [x] Mobile: hamburger icon crossfades Menu↔X (300ms, synchronized with panel)
- [x] Mobile: close via Escape key, link click, or hamburger toggle
- [x] Accessibility: aria-label, aria-expanded, aria-controls, role="dialog", aria-modal
- [x] All tests pass, no regressions (75/75)
- [x] Code quality: ≤400 lines, complexity ≤10, no `any`, OnPush preserved
