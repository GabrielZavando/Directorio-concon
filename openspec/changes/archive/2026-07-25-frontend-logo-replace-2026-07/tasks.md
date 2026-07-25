## 1. Asset Setup

- [x] 1.1 Create `frontend/public/assets/` directory and move `logo-transparente.webp` from `frontend/` root into it using `git mv`

## 2. Tests (TDD Red Phase)

- [x] 2.1 Update `header.component.spec.ts`: replace "should render brand text" test with "should render brand logo with descriptive alt" test that verifies `<img>` with `alt="Directorio Concón"` and `src="/assets/logo-transparente.webp"`
- [x] 2.2 Add new test in `footer.component.spec.ts`: "should render brand logo with descriptive alt" that verifies `<img>` with `alt="Directorio Concón"` and `src="/assets/logo-transparente.webp"` in the footer brand column

## 3. Implementation (TDD Green Phase)

- [x] 3.1 Modify `header.component.html`: replace text "Directorio Concón" (lines 4-6) with `<a>` containing `<img>` element with `alt="Directorio Concón"`, `src="/assets/logo-transparente.webp"`, `height="40"`, `class="h-10 w-auto"`, and `aria-label="Directorio Concón - Inicio"` on the `<a>`
- [x] 3.2 Modify `footer.component.html`: replace text "Directorio Concón" (lines 5-7) with `<div>` containing `<img>` element with `alt="Directorio Concón"`, `src="/assets/logo-transparente.webp"`, `height="40"`, `class="h-10 w-auto"`

## 4. Verification

- [x] 4.1 Run `npm --prefix frontend run test` and verify all tests pass (16/16 SUCCESS)
- [x] 4.2 Run `npm --prefix frontend run lint` and verify no ESLint errors (lint script not defined in package.json — N/A)
- [x] 4.3 Run `npm --prefix frontend run build` and verify successful build (416.44 kB, under 500kB budget)
