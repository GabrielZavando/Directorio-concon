import { Component, ChangeDetectionStrategy } from '@angular/core';
import { LucideShare2, LucideGlobe } from '@lucide/angular';

interface FooterLink {
  readonly label: string;
  readonly href: string;
}

interface FooterColumn {
  readonly title: string;
  readonly links: readonly FooterLink[];
}

@Component({
  selector: 'app-footer',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LucideShare2, LucideGlobe],
  templateUrl: './footer.component.html',
  styleUrl: './footer.component.css',
})
export class FooterComponent {
  protected readonly year = new Date().getFullYear();

  protected readonly footerColumns: readonly FooterColumn[] = [
    {
      title: 'Nosotros',
      links: [
        { label: 'Sobre Nosotros', href: '#' },
        { label: 'Contacto', href: '#' },
        { label: 'Equipo', href: '#' },
        { label: 'Valores', href: '#' },
      ],
    },
    {
      title: 'Directorio',
      links: [
        { label: 'Explorar', href: '#' },
        { label: 'Categorías', href: '#' },
        { label: 'Destacados', href: '#' },
        { label: 'Listados', href: '#' },
      ],
    },
    {
      title: 'Soporte',
      links: [
        { label: 'Contacto', href: '#' },
        { label: 'FAQ', href: '#' },
        { label: 'Privacidad', href: '#' },
        { label: 'Términos', href: '#' },
      ],
    },
  ];
}
