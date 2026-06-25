# Contributing

Gracias por querer mejorar `Sismo VE`.

## Antes de abrir un PR

1. Abre un `issue` si el cambio altera contenido, estructura, categorías, UX principal o la política de fuentes.
2. Mantén el alcance pequeño. Este proyecto prioriza cambios claros, auditables y fáciles de verificar offline.
3. Si agregas o corriges contactos, incluye la fuente y la fecha de verificación.

## Criterios de aceptación

- La app debe seguir funcionando como PWA instalable y usable offline.
- Los cambios no deben romper la lectura rápida en móvil.
- Las decisiones finales de inclusión, alcance y publicación las toma exclusivamente `@thezykedev`.

## Desarrollo local

```bash
pnpm install
pnpm astro dev --background
pnpm build
```

## Contenido y datos

- Edita `src/data/` para protocolos, contactos y checklist.
- No subas carpetas de captura o investigación local como `docs/` salvo que se solicite expresamente.

## Pull requests

- Describe el problema real y el cambio propuesto.
- Indica riesgos, fuentes y cómo probaste el resultado.
- Evita refactors no relacionados.
