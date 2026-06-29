import type { AlliedSite, UsefulLink } from '@sismo-ve/schemas';

// Último recurso embebido SOLO para datos de referencia estáticos y seguros (aliados, links).
// Los datos volátiles o sensibles (pacientes, hospitales, centros) NO se embeben: cuando
// PocketBase no responde se usa el snapshot SQLite (ver fallback-db.ts), y si tampoco existe,
// la lista queda vacía. No se sirven copias inventadas de datos de crisis.

export const fallbackAlliedSites: AlliedSite[] = [
  {
    id: 'terremoto-venezuela-app',
    status: 'approved',
    name: 'Terremoto Venezuela',
    category: 'Mapa y reporte ciudadano',
    website: 'https://terremotovenezuela.app',
    notes_public: 'Plataforma abierta para coordinar ayuda y reportes ciudadanos durante la emergencia.'
  },
  {
    id: 'venezuela-te-busca',
    status: 'approved',
    name: 'Venezuela Te Busca',
    category: 'Búsqueda y reunificación',
    website: 'https://venezuelatebusca.com',
    notes_public: 'Recurso aliado para búsqueda de personas e información de reunificación.'
  }
];

export const fallbackUsefulLinks: UsefulLink[] = [
  {
    id: 'bitchat-ios',
    status: 'approved',
    title: 'Bitchat para iPhone',
    category: 'Comunicación sin internet',
    url: 'https://apps.apple.com/us/app/bitchat-mesh/id6748219622',
    description: 'Mensajería por Bluetooth mesh para comunicarse con personas cercanas cuando no hay internet.'
  },
  {
    id: 'bitchat-android',
    status: 'approved',
    title: 'Bitchat para Android',
    category: 'Comunicación sin internet',
    url: 'https://play.google.com/store/apps/details?id=com.bitchat.droid',
    description: 'Versión Android de Bitchat para comunicación local por Bluetooth mesh.'
  },
  {
    id: 'bitchat-web',
    status: 'approved',
    title: 'Bitchat sitio oficial',
    category: 'Comunicación sin internet',
    url: 'https://bitchat.free',
    description: 'Página oficial con enlaces a tiendas, código fuente y APK releases.'
  },
  {
    id: 'esimflag-sos-venezuela',
    status: 'approved',
    title: 'eSIM Venezuela SOS',
    category: 'Conectividad',
    url: 'https://www.esimflag.com/es/configurador/venezuela/esim-venezuela/partners/sos?discount=SOSVEN&days=3',
    description: 'Opción de eSIM para recuperar conectividad móvil durante desplazamientos o fallas de servicio.'
  }
];
