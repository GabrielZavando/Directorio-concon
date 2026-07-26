# Spec: Mobile Menu (<md breakpoint)

## Scenario: Mobile menu is hidden by default

**Given** the viewport is <768px wide (below md breakpoint)
**When** the header renders
**Then** the nav links block is hidden (not rendered inline)
**And** a hamburger toggle button is visible
**And** the hamburger button has `aria-expanded="false"`
**And** the hamburger button has an accessible `aria-label` (e.g., "Toggle menu")

## Scenario: Hamburger button shows Menu icon when menu is closed

**Given** the viewport is <768px wide
**And** the mobile menu is closed
**When** the header renders the hamburger button
**Then** the lucide `Menu` icon is displayed
**And** the `X` icon is not visible

## Scenario: Toggle opens the mobile menu

**Given** the viewport is <768px wide
**And** the mobile menu is closed
**When** the user clicks the hamburger button
**Then** `aria-expanded` changes to `"true"`
**And** the menu panel becomes visible
**And** the panel slides in from the right side
**And** the panel has width 85% of the viewport
**And** the panel has height `calc(100vh - 4rem)` (below the header)
**And** the panel is positioned `fixed top:4rem right-0`
**And** the panel has `z-index` above the header

## Scenario: Panel slide-in animation

**Given** the mobile menu is closed
**When** the user clicks the hamburger button
**Then** the panel animates from `translateX(100%)` to `translateX(0)`
**And** the animation duration is 300ms
**And** the animation easing is `ease-out`

## Scenario: Hamburger icon crossfades to X

**Given** the mobile menu is closed
**When** the user clicks the hamburger button to open
**Then** the `Menu` icon fades out and the `X` icon fades in
**And** the crossfade duration is 300ms (same as panel animation)
**And** the transition is smooth and elegant

## Scenario: Toggle closes the mobile menu

**Given** the viewport is <768px wide
**And** the mobile menu is open
**When** the user clicks the hamburger button (now showing X icon)
**Then** `aria-expanded` changes to `"false"`
**And** the panel animates from `translateX(0)` to `translateX(100%)`
**And** the animation duration is 300ms
**And** the `X` icon crossfades back to the `Menu` icon

## Scenario: Close menu by clicking outside

> **DEPRECATED**: Overlay removed by user decision. Menu closes via Escape key, link clicks, or hamburger toggle only.

**Given** the mobile menu is open
**When** the user clicks on the dark overlay behind the panel
**Then** the menu closes (same animation as toggle close)

## Scenario: Close menu by pressing Escape

**Given** the mobile menu is open
**When** the user presses the Escape key
**Then** the menu closes (same animation as toggle close)

## Scenario: Close menu by clicking a link

**Given** the mobile menu is open
**When** the user clicks any navigation link inside the panel
**Then** the menu closes (same animation as toggle close)

## Scenario: Overlay is visible when menu is open

> **DEPRECATED**: Overlay removed by user decision. Menu does not use an overlay layer.

**Given** the mobile menu is open
**When** the user views the screen
**Then** a semi-transparent dark overlay covers the viewport behind the panel
**And** the overlay has `bg-black/50` or similar opacity
**And** the overlay has a fade-in/fade-out transition

## Scenario: Accessibility attributes are correct

**Given** the mobile menu is open
**When** the header renders
**Then** the panel has `role="dialog"` or equivalent
**And** the panel has `aria-modal="true"` or equivalent
**And** the hamburger button has `aria-controls` pointing to the panel ID
