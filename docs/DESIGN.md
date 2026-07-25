---
name: Dunas y Océano
colors:
  surface: '#f7f9fb'
  surface-dim: '#d8dadc'
  surface-bright: '#f7f9fb'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f4f6'
  surface-container: '#eceef0'
  surface-container-high: '#e6e8ea'
  surface-container-highest: '#e0e3e5'
  on-surface: '#191c1e'
  on-surface-variant: '#414750'
  inverse-surface: '#2d3133'
  inverse-on-surface: '#eff1f3'
  outline: '#717781'
  outline-variant: '#c1c7d1'
  surface-tint: '#12629d'
  primary: '#004370'
  on-primary: '#ffffff'
  primary-container: '#005b96'
  on-primary-container: '#abd2ff'
  inverse-primary: '#9ccaff'
  secondary: '#6f5b3f'
  on-secondary: '#ffffff'
  secondary-container: '#fadeba'
  on-secondary-container: '#756144'
  tertiary: '#1d4a19'
  on-tertiary: '#ffffff'
  tertiary-container: '#35622e'
  on-tertiary-container: '#a8dc9b'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d0e4ff'
  primary-fixed-dim: '#9ccaff'
  on-primary-fixed: '#001d35'
  on-primary-fixed-variant: '#00497a'
  secondary-fixed: '#fadeba'
  secondary-fixed-dim: '#dcc3a0'
  on-secondary-fixed: '#261904'
  on-secondary-fixed-variant: '#554429'
  tertiary-fixed: '#bcf0ae'
  tertiary-fixed-dim: '#a1d494'
  on-tertiary-fixed: '#002201'
  on-tertiary-fixed-variant: '#23501e'
  background: '#f7f9fb'
  on-background: '#191c1e'
  surface-variant: '#e0e3e5'
typography:
  headline-xl:
    fontFamily: Montserrat
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Montserrat
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Montserrat
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
  headline-md:
    fontFamily: Montserrat
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 8px
  container-max: 1280px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 40px
---

## Brand & Style
The brand personality is professional, reliable, and deeply connected to the coastal landscape of Concón. It balances the commercial utility of a business directory with the breezy, atmospheric quality of a seaside town. The target audience includes local residents, tourists looking for gastronomy and services, and business owners seeking a reputable platform.

The design style is **Corporate / Modern** with a **Tactile** coastal influence. It utilizes generous white space to evoke the openness of the Pacific horizon, while using soft, rounded elements to mimic the organic curves of the Concón dunes. The emotional response should be one of trust and "tranquilidad"—an organized, easy-to-navigate digital environment that feels as welcoming as a coastal breeze.

## Colors
The palette is derived directly from the Concón geography:
- **Primary (Deep Ocean Blue):** Used for core branding, primary buttons, and navigational headers. It represents the depth and reliability of the Pacific.
- **Secondary (Sand Beige):** Used for tonal backgrounds, card containers, and secondary accents. It draws inspiration from the *Dunas de Concón*.
- **Tertiary (Pine Green):** Reserved for "Open Now" status indicators, ecological categories, and forest-related services.
- **Accent (Sunset Orange):** Used sparingly for high-action items, featured listings, or "New" badges to simulate the warmth of a coastal sunset.
- **Background:** A crisp off-white (`#F8FAFC`) keeps the directory feeling clean and professional, preventing the beige tones from feeling heavy.

## Typography
The typographic system uses **Montserrat** for headlines to provide a bold, geometric, and modern presence that feels structural and confident. **Inter** is used for all body text and UI labels to ensure maximum legibility and a systematic, clean look for dense directory listings.

For mobile devices, `headline-xl` and `headline-lg` scale down to maintain readability and prevent excessive line-breaking in business titles. All labels should maintain high contrast against their backgrounds to ensure accessibility for users browsing outdoors in bright coastal sunlight.

## Layout & Spacing
The design system utilizes a **Fluid Grid** with a fixed maximum container width of 1280px. This ensures that on ultra-wide monitors, the directory remains centered and readable.

- **Desktop (1024px+):** 12-column grid with 24px gutters.
- **Tablet (768px - 1023px):** 8-column grid with 24px gutters.
- **Mobile (Up to 767px):** 4-column grid with 16px margins.

The spacing rhythm is based on a 8px scale. Use larger padding (40px+) for section transitions to maintain the "breezy" and uncrowded feel of the brand narrative.

## Elevation & Depth
To reflect the softness of sand and the fluidity of water, this design system uses **Ambient Shadows** and **Tonal Layers**. 

Avoid harsh black shadows. Instead, use soft, diffused shadows with a slight tint of the Primary color (`rgba(0, 91, 150, 0.08)`) to give the appearance of elements floating slightly above the surface. 

- **Level 0 (Flat):** Used for background and decorative sections.
- **Level 1 (Low):** Used for static cards and input fields.
- **Level 2 (Medium):** Used for hover states on listings and dropdown menus.
- **Level 3 (High):** Reserved for modals, sticky navigation bars, and "Quick View" business overlays.

## Shapes
The shape language is consistently **Rounded**, reflecting the organic erosion of the coastline. 

Standard components (buttons, cards, inputs) utilize a `0.5rem` (8px) radius. Larger containers, such as business profile headers or search bars, should use `rounded-xl` (1.5rem / 24px) to emphasize the soft, approachable nature of the directory. Icons should be encased in circular or highly rounded frames to maintain consistency with the organic theme.

## Components
- **Buttons:** Primary buttons are Solid Deep Ocean Blue with white text. Secondary buttons use a Sand Beige background with Deep Ocean Blue text. Use `fontWeight: 600` for all button labels.
- **Cards:** Business listing cards feature a white background, Level 1 elevation, and a subtle 1px border in Sand Beige (`#E3C9A6`). On hover, elevate to Level 2.
- **Chips:** Used for business categories (e.g., "Gastronomía," "Surf Shop"). These should have a light beige background with Deep Ocean Blue text and a pill-shaped (`rounded-full`) border.
- **Input Fields:** Search bars should be prominent, using a 24px radius and a subtle internal shadow to suggest depth. Use Inter for placeholder text.
- **Lists:** Use horizontal separators in a very light grey or sand tint. Business hours and contact info should use `label-sm` for clarity.
- **Badges:** Use Sunset Orange for "Featured" or "Popular" tags to make them pop against the cooler blue and beige tones.
- **Additional Components:** Include a "Map Toggle" button that remains floating on mobile, styled in Deep Ocean Blue to ensure visibility.