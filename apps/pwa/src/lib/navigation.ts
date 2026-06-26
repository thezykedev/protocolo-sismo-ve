export type NavigationId =
  | 'inicio'
  | 'protocolos'
  | 'emergencias'
  | 'mochila'
  | 'instalar'
  | 'ayuda'
  | 'acopio'
  | 'colaborar'
  | 'aliados'
  | 'hospitales'
  | 'links';

export interface NavigationItem {
  id: NavigationId;
  href: string;
  label: string;
  icon?: 'phone';
  description?: string;
}

export const primaryNavigationItems: NavigationItem[] = [
  { id: 'inicio', href: '/', label: 'INICIO' },
  { id: 'protocolos', href: '/protocolos', label: 'PROTOCOLOS' },
  { id: 'emergencias', href: '/contactos', label: 'EMERGENCIAS', icon: 'phone' },
  { id: 'mochila', href: '/mochila', label: 'KIT' }
];

export const secondaryNavigationItems: NavigationItem[] = [
  {
    id: 'instalar',
    href: '/instalar',
    label: 'INSTALAR',
    description: 'Dejar la app a mano'
  },
  {
    id: 'ayuda',
    href: '/ayuda',
    label: 'AYUDA',
    description: 'Puente a la plataforma online'
  },
  {
    id: 'acopio',
    href: '/centros-acopio',
    label: 'CENTROS',
    description: 'Abre el directorio online'
  },
  {
    id: 'colaborar',
    href: '/colaborar',
    label: 'COLABORAR',
    description: 'Enviar propuestas al flujo online'
  },
  {
    id: 'aliados',
    href: '/aliados',
    label: 'ALIADOS',
    description: 'Red de apoyo en la plataforma online'
  },
  {
    id: 'hospitales',
    href: '/hospitales',
    label: 'HOSPITALES',
    description: 'Coordinación hospitalaria online'
  },
  {
    id: 'links',
    href: '/links-utiles',
    label: 'LINKS ÚTILES',
    description: 'Recursos vivos en la plataforma online'
  }
];

export const desktopNavigationItems: NavigationItem[] = [
  ...primaryNavigationItems,
  ...secondaryNavigationItems
];
