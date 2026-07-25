import { Component, ChangeDetectionStrategy } from '@angular/core';

interface NavLink {
  readonly label: string;
  readonly href: string;
}

@Component({
  selector: 'app-header',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './header.component.html',
  styleUrl: './header.component.css',
})
export class HeaderComponent {
  protected readonly navLinks: readonly NavLink[] = [
    { label: 'Inicio', href: '#' },
    { label: 'Directorio', href: '#' },
    { label: 'Eventos', href: '#' },
    { label: 'Contacto', href: '#' },
    { label: 'Registrate', href: '#' },
  ];
}
