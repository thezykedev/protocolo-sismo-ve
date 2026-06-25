# Sismo VE

PWA offline de protocolos sísmicos para Venezuela. Construida con Astro, Tailwind CSS, Preact y `vite-plugin-pwa`, con foco en carga rápida, instalación como app y consulta sin conexión.

## Qué incluye

- `/` acciones rápidas para antes, durante y después del sismo
- `/durante` respuesta inmediata durante la sacudida
- `/protocolos` guía completa por fases
- `/contactos` directorio buscable con emergencias, Cruz Roja integrada, hospitales y apoyo vial
- `/cruz-roja` atajo legible hacia la misma guía integrada de Cruz Roja dentro de `/contactos`
- `/mochila` checklist persistente de 72 horas
- `/instalar` guía para agregar la PWA a la pantalla de inicio

## Stack

- [Astro 7](https://astro.build/) con output estático
- [Preact](https://preactjs.com/) para los componentes interactivos (`ContactSearch`, `BranchSearch`)
- [Tailwind CSS 4](https://tailwindcss.com/) vía `@tailwindcss/vite`
- [`vite-plugin-pwa`](https://vite-plugin-pwa.netlify.app/) con `generateSW`, manifest, navegación offline y precache de assets críticos
- Datos estructurados en `src/data/*.json` para que todo el contenido sea auditable

## Desarrollo

```bash
pnpm install
pnpm astro dev --background
pnpm astro dev status
```

## Build

```bash
pnpm build
pnpm preview
```

## Datos editables

La información principal vive en `src/data/`:

- `emergency-contacts.json` — números de emergencia por estado, ciudad y servicio
- `earthquake-protocols.json` — fases antes, durante y después
- `seismic-kit.json` — checklist de mochila
- `red-cross-branches.json` — filiales de la Cruz Roja Venezolana con coordenadas
- `metadata.json` — versión, fecha de actualización y claves de almacenamiento local

## Despliegue

El proyecto está listo para [Cloudflare Pages](https://pages.cloudflare.com/).

1. Crea el proyecto en Cloudflare Pages apuntando a este repositorio.
2. Configura el build command: `pnpm install --frozen-lockfile && pnpm build`.
3. Output directory: `dist`.
4. Variables de entorno en GitHub: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`.
5. El workflow en `.github/workflows/deploy.yml` publica automáticamente en cada push a `main` cuando esos secretos están configurados.

Alternativa: `wrangler pages deploy dist --project-name protocolo-sismo-ve` desde local con `CLOUDFLARE_API_TOKEN`.

## Open source

Se aceptan `issues` y `pull requests`, pero la dirección del proyecto, la curaduría del contenido y las decisiones de inclusión final están bajo supervisión exclusiva de [thezykedev](https://github.com/thezykedev).

Lee [CONTRIBUTING.md](./CONTRIBUTING.md) antes de proponer cambios.

## Licencia

[MIT](./LICENSE) © thezykedev

## Notas

- `stitch/` conserva material de referencia de diseño.
- `docs/` es una carpeta local de investigación; está ignorada por git y nunca se publica.
- Los contactos y protocolos deben revisarse periódicamente contra fuentes oficiales y locales.
