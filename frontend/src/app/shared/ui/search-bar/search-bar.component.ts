import {
  Component,
  ChangeDetectionStrategy,
  Input,
  Output,
  EventEmitter,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, FormControl, ReactiveFormsModule } from '@angular/forms';
import { SearchCriteria } from './interfaces/search-criteria.interface';
import { CategoryOption } from './interfaces/category-option.interface';
import { BarrioOption } from './interfaces/barrio-option.interface';

/**
 * SearchBarComponent — dumb presentational search form.
 *
 * SRP: only renders the search form and emits a typed SearchCriteria on submit.
 * No Router, no HttpClient, no data services — the smart container owns data and navigation.
 */
@Component({
  selector: 'app-search-bar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './search-bar.component.html',
  styleUrl: './search-bar.component.css',
})
export class SearchBarComponent {
  @Input() categorias: readonly CategoryOption[] = [];
  @Input() barrios: readonly BarrioOption[] = [];
  @Output() searchSubmit = new EventEmitter<SearchCriteria>();

  // Reactive form for the search form
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
   * Emits a SearchCriteria with trimmed q and empty string defaults for
   * unselected categoriaId/barrioId.
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