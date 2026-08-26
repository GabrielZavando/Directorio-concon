import { Component, ChangeDetectionStrategy, signal, HostListener, effect } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { LucideMenu, LucideX } from '@lucide/angular';

interface NavLink {
  readonly label: string;
  readonly href: string;
}

@Component({
  selector: 'app-header',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LucideMenu, LucideX, RouterLink, RouterLinkActive],
  templateUrl: './header.component.html',
  styleUrl: './header.component.css',
})
export class HeaderComponent {
  // SPA routes — wired to `routerLink` in the template.
  // The "Inicio" entry uses `routerLinkActiveOptions: { exact: true }` in the
  // template so it only highlights on the exact root path (not on subpaths).
  protected readonly navLinks: readonly NavLink[] = [
    { label: 'Inicio', href: '/' },
    { label: 'Directorio', href: '/directorio' },
    { label: 'Eventos', href: '/eventos' },
    { label: 'Contacto', href: '/contacto' },
  ];

  protected readonly ctaLink: NavLink = { label: 'Registrate', href: '/registrate' };

  readonly isMenuOpen = signal(false);

  protected readonly panelId = 'mobile-menu-panel';

  constructor() {
    // Lock body scroll when mobile menu is open to prevent background scrolling
    effect(() => {
      const isOpen = this.isMenuOpen();
      document.body.style.overflow = isOpen ? 'hidden' : '';
    });
  }

  protected toggleMenu(): void {
    this.isMenuOpen.update((open) => !open);
  }

  closeMenu(): void {
    this.isMenuOpen.set(false);
  }

  @HostListener('document:keydown.escape')
  protected onEscapeKey(): void {
    this.closeMenu();
  }
}
