# Design: Header Menu Redesign

## Decisions

### 1. Animation Technique for Hamburger→X
- **Decision**: Use `lucide-angular` with `Menu` and `X` components, crossfade between them.
- **Rationale**: `@lucide/angular ^1.26.0` is already installed and used by `FooterComponent`. Consistent icon library across the project. Crossfade is simple to implement with `@if`/`@else` and CSS opacity transition.
- **Alternative considered**: CSS morph (rotate lines into X) — more elaborate, requires custom SVG manipulation, less consistent with existing icon usage.

### 2. Animation Duration
- **Decision**: 300ms ease-out for both panel slide and icon crossfade.
- **Rationale**: 300ms is the Tailwind default for `duration-300`, feels natural and snappy. Panel and icon animations are synchronized (same duration).

### 3. Panel Width and Position
- **Decision**: Panel slides from the right, width 85% viewport, height `calc(100vh - 4rem)`, `fixed top:4rem right-0`.
- **Rationale**: 85% leaves space for the user to see the edge of the page. Starting at `top: 4rem` keeps the panel below the header so the hamburger button is always accessible. No overlay layer needed.

### 4. Close Behavior
- **Decision**: Three ways to close: press Escape, click any link in the panel, or toggle hamburger button again.
- **Rationale**: Standard mobile menu UX patterns. Overlay was removed per user preference — Escape and toggle provide sufficient close mechanisms without obscuring page content.

### 5. State Management
- **Decision**: Use Angular `signal<boolean>` for `isMenuOpen` state.
- **Rationale**: Modern Angular signals are reactive, work well with OnPush, and avoid manual `ChangeDetectorRef` calls. State is local to the component (no need for a store).

### 6. CTA Label
- **Decision**: Keep "Registrate" (current Angular code).
- **Rationale**: Consistency with existing codebase. The reference design uses "Registrar Negocio" but the product owner confirmed "Registrate" is preferred.

## Alternatives Considered

| Alternative | Why Rejected |
|---|---|
| CSS morph (rotate lines into X) | More complex, requires custom SVG, less consistent with lucide usage |
| Store-based state (NgRx/SignalStore) | Overkill for local component state |
| 250ms duration | Too fast, feels snappy but not elegant |
| 400ms duration | Too slow, feels sluggish |
| Overlay backdrop for close | Removed per user decision — Escape + toggle are sufficient |
| Panel width 90% | Too wide, doesn't leave enough page visible at edge |
| Panel starts at top:0 | Covers hamburger button, requires z-index hacks to keep button accessible |
