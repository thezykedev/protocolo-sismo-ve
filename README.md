# Sismo VE

Monorepo de Sismo VE para el sitio esencial offline y la plataforma online de coordinación.

## Apps

- `apps/pwa`: app esencial offline para protocolos, contactos, mochila e instalación.
- `apps/ayuda`: plataforma online-first para pacientes, hospitales, centros, aliados, sismos, correcciones y moderación.
- `infra/pocketbase`: despliegue de la API y del panel de administración.
- `packages/ui`: tokens y estilos compartidos.
- `packages/schemas`: tipos y validaciones compartidas.

## Qué incluye el PWA

- `/` resumen rápido de acción.
- `/protocolos` guía por fases.
- `/contactos` directorio de emergencias.
- `/mochila` checklist persistente de 72 horas.
- `/instalar` guía de instalación.
- `/ayuda` puente a la plataforma online.

## Comandos

```bash
pnpm install
pnpm build
pnpm dev
pnpm --dir apps/ayuda dev
pnpm test:offline
```

## Stack

- Astro 7 para `apps/pwa`
- SvelteKit para `apps/ayuda`
- Preact donde hace falta interactividad en el PWA
- Leaflet para mapas en la plataforma online
- Tailwind CSS 4 y CSS global compartido
- `pnpm@11.1.1`, Node `>=22.12.0`

## Notas

- `docs/research/` es local-only y no se commitea.
- Los contactos y protocolos deben revisarse periódicamente contra fuentes oficiales y locales.
