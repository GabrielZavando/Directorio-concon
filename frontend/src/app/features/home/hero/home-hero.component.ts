import {
  Component,
  ChangeDetectionStrategy,
  Input,
  Output,
  EventEmitter,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, FormControl, ReactiveFormsModule } from '@angular/forms';
import { SearchCriteria, CategoryOption, BarrioOption } from './hero.types';

/**
 * Canonical primary color of the "Dunas y Océano" design system (Ocean Blue).
 * Sourced from `tailwind.config.js` `theme.extend.colors.primary` (`#004370`).
 * Declared once here so the inline gradient stop stays in sync with the token
 * without Tailwind being able to express gradient+image composition in
 * utilities.
 */
const HERO_OVERLAY_PRIMARY = '#004370';

/**
 * Inline `[style]` binding for the hero <section>. The linear-gradient applies
 * a 40%→60% overlay of the primary color on top of the panoramic image so the
 * white hero text passes AAA contrast even on bright sand patches. Declared as
 * a `const` (not a `class` field) because it has no per-instance state.
 */
const HERO_OVERLAY_STYLE: Readonly<Record<string, string>> = {
  'background-image': `linear-gradient(rgba(0, 67, 112, 0.6), rgba(0, 67, 112, 0.8)), url('/assets/panoramica-concon.jpg')`,
  'background-size': 'cover',
  'background-position': 'center',
};

/**
 * HomeHeroComponent — dumb presentational hero of the home page.
 *
 * SRP: only renders the hero markup and emits a typed `SearchCriteria` on
 * submit. No `Router`, no `HttpClient`, no Firestore — the smart container
 * (`HomePageComponent`) owns navigation and dummy data.
 */
@Component({
  selector: 'app-home-hero',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './home-hero.component.html',
  styleUrl: './home-hero.component.css',
})
export class HomeHeroComponent {
  @Input() categorias: readonly CategoryOption[] = [];
  @Input() barrios: readonly BarrioOption[] = [];
  @Output() searchSubmit = new EventEmitter<SearchCriteria>();

  /** Exposed to the template so unit tests can drive the form imperatively. */
  readonly heroOverlayStyle = HERO_OVERLAY_STYLE;
  readonly heroOverlayPrimary = HERO_OVERLAY_PRIMARY;

  readonly form = new FormGroup<{
    q: FormControl<string>;
    categoriaId: FormControl<string>;
    barrioId: FormControl<string>;
  }>({
    q: new FormControl<string>('', { nonNullable: true }),
    categoriaId: new FormControl<string>('', { nonNullable: true }),
    barrioId: new FormControl<string>('', { nonNullable: true }),
  });

  /**
   * Builds a `SearchCriteria` from the form: trims `q` and falls back to
   * empty strings if a control value is unset. Emits the payload via
   * `searchSubmit` for the smart container to navigate.
   */
  onSubmit(): void {
    const raw = this.form.getRawValue();
    const payload: SearchCriteria = {
      q: raw.q.trim(),
      categoriaId: raw.categoriaId ?? '',
      barrioId: raw.barrioId ?? '',
    };
    this.searchSubmit.emit(payload);
  }
}
