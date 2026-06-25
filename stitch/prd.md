# Protocolo Sismo VE

PWA Offline de Protocolos Sísmicos para Venezuela.

## Propósito
Protocolo Sismo VE es una herramienta pública, ultraligera y funcional offline diseñada para ofrecer instrucciones claras y contactos de emergencia durante eventos sísmicos en Venezuela.

## Principios
- **Offline-first**: Funciona sin conexión tras la primera carga.
- **Enfoque Sísmico**: Especializado exclusivamente en terremotos.
- **Lectura bajo estrés**: Estética brutalista de alto contraste y tipografía legible.
- **Fácil de editar**: Los datos están en archivos JSON independientes para facilitar contribuciones.

## Stack
- **Astro**: Generación de sitio estático (SSG).
- **Tailwind CSS**: Estilos utilitarios.
- **Preact**: Islas interactivas (buscador, checklist).
- **Vite PWA**: Service Worker y Manifest.

## Estructura de Datos
La información crítica vive en `src/data/`:
- `emergency-contacts.json`: Directorio telefónico.
- `earthquake-protocols.json`: Instrucciones antes, durante y después.
- `seismic-kit.json`: Lista de suministros.
- `metadata.json`: Versión y configuración global.
