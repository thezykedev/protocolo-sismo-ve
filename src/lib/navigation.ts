interface NavigationItem {
  id: 'inicio' | 'protocolos' | 'emergencias' | 'mochila' | 'instalar';
  href: string;
  label: string;
  icon?: 'phone';
}

export const navigationItems: NavigationItem[] = [
  { id: 'inicio', href: '/', label: 'INICIO' },
  { id: 'protocolos', href: '/protocolos', label: 'PROTOCOLOS' },
  { id: 'emergencias', href: '/contactos', label: 'EMERGENCIAS', icon: 'phone' },
  { id: 'mochila', href: '/mochila', label: 'KIT' },
  { id: 'instalar', href: '/instalar', label: 'INSTALAR' }
];
