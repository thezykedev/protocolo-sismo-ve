# Sismo VE

PWA offline de protocolos sísmicos para Venezuela. Está construida con Astro, Tailwind CSS, Preact y `vite-plugin-pwa`, con foco en carga rápida, instalación como app y consulta sin conexión.

## Qué incluye

- `/` acciones rápidas para antes, durante y después del sismo
- `/durante` respuesta inmediata durante la sacudida
- `/protocolos` guía completa por fases
- `/contactos` directorio buscable con emergencias, Cruz Roja, hospitales y apoyo vial
- `/mochila` checklist persistente de 72 horas
- `/instalar` guía para agregar la PWA a la pantalla de inicio

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

- `emergency-contacts.json`
- `earthquake-protocols.json`
- `seismic-kit.json`
- `metadata.json`

## Open source

Se aceptan `issues` y `pull requests`, pero la dirección del proyecto, la curaduría del contenido y las decisiones de inclusión final están bajo supervisión exclusiva de [thezykedev](https://github.com/thezykedev).

Lee [CONTRIBUTING.md](./CONTRIBUTING.md) antes de proponer cambios.

## Notas

- `stitch/` conserva material de referencia de diseño.
- Los contactos y protocolos deben revisarse periódicamente contra fuentes oficiales y locales.