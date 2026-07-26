import {
  Component,
  ChangeDetectionStrategy,
  Output,
  EventEmitter,
  inject,
} from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { Observable } from 'rxjs';
import { SearchBarComponent } from './search-bar.component';
import { SearchCriteria } from './interfaces/search-criteria.interface';
import {
  DIRECTORIO_OPCIONES_PORT,
  DirectorioOpcionesPort,
} from '../../data-access/directorio-opciones.port';
import { DirectorioOpciones } from '../../data-access/directorio-opciones.types';

/**
 * SearchBarContainerComponent — smart container.
 *
 * OWNS: data fetching (via DIRECTORIO_OPCIONES_PORT injection token) and
 * delegates searchSubmit to parents. Does NOT inject Router or HttpClient.
 *
 * DIP: depends on DirectorioOpcionesPort interface, not on
 * LocalDirectorioOpcionesService. DI swap is a one-line edit in
 * provideDirectorioOpciones().
 */
@Component({
  selector: 'app-search-bar-container',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SearchBarComponent, AsyncPipe],
  template: `
    @if (opciones$ | async; as opts) {
      <app-search-bar
        [categorias]="opts.categorias"
        [barrios]="opts.barrios"
        (searchSubmit)="searchSubmit.emit($event)"
      />
    }
  `,
})
export class SearchBarContainerComponent {
  private readonly port: DirectorioOpcionesPort = inject(DIRECTORIO_OPCIONES_PORT);

  readonly opciones$: Observable<DirectorioOpciones> = this.port.getOpciones();

  @Output() searchSubmit = new EventEmitter<SearchCriteria>();
}
