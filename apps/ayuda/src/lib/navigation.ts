export type HelpRouteId =
  | 'inicio'
  | 'pacientes'
  | 'registrar'
  | 'hospitales'
  | 'centros'
  | 'sismos'
  | 'aliados'
  | 'colaborar'
  | 'apoyar'
  | 'correcciones'
  | 'admin'
  | 'pwa';

export interface HelpNavItem {
  id: HelpRouteId;
  href: string;
  label: string;
  description: string;
}

export const helpNavItems: HelpNavItem[] = [
  { id: 'inicio', href: '/', label: 'Inicio', description: 'Resumen de la plataforma' },
  { id: 'pacientes', href: '/pacientes', label: 'Pacientes', description: 'Registros públicos' },
  {
    id: 'hospitales',
    href: '/hospitales',
    label: 'Hospitales',
    description: 'Coordinación y actualización'
  },
  {
    id: 'centros',
    href: '/centros',
    label: 'Centros',
    description: 'Puntos de ayuda y logística'
  },
  { id: 'sismos', href: '/sismos', label: 'Sismos', description: 'Eventos recientes' },
  { id: 'aliados', href: '/aliados', label: 'Aliados', description: 'Red de apoyo' },
  { id: 'colaborar', href: '/colaborar', label: 'Colaborar', description: 'Enviar propuestas' },
  { id: 'apoyar', href: '/apoyar', label: 'Apoyar', description: 'Donaciones y transparencia' },
  {
    id: 'correcciones',
    href: '/correcciones',
    label: 'Correcciones',
    description: 'Retiro o revisión de datos'
  },
  { id: 'admin', href: '/admin', label: 'Admin', description: 'Moderación y acceso PB' },
  { id: 'pwa', href: 'https://sismo-ve.xyz', label: 'PWA', description: 'Versión esencial offline' }
];
