# PocketBase backend (Sismo VE / ayuda)

Backend real de la plataforma de ayuda. El **schema vive en `pb_migrations/`** y se aplica
solo, igual en local y en producción. Migrar al servidor hosteado = cambiar una variable.

## Estructura

```
infra/pocketbase/
  Dockerfile            imagen de producción (copia migraciones + entrypoint)
  entrypoint.sh         crea/actualiza el superuser desde env y arranca
  docker-compose.yml    despliegue con volúmenes persistentes
  pb_migrations/        schema + seed (JS migrations, se aplican al arrancar)
  bin/                  binario local descargado (gitignored)
  pb_data/              datos locales (gitignored)
```

## Desarrollo local (sin Docker)

```sh
cp .env.example .env          # en la raíz del repo; ajusta credenciales si quieres
pnpm pb:dev                   # descarga PocketBase, aplica migraciones, siembra y sirve
```

- API/health: `http://127.0.0.1:8090`
- Panel admin: `http://127.0.0.1:8090/_/` (login con `POCKETBASE_ADMIN_EMAIL/PASSWORD`)

En otra terminal, la app de ayuda apuntando al backend local:

```sh
pnpm dev:ayuda                # lee apps/ayuda/.env (PUBLIC_POCKETBASE_URL=http://127.0.0.1:8090)
```

> Nota: Vite 8 escucha en IPv6 por defecto. Si tu `curl 127.0.0.1` falla, usa `localhost`
> o arranca con `--host 127.0.0.1`.

Para empezar de cero borra `infra/pocketbase/pb_data/` y vuelve a `pnpm pb:dev`.

## Colecciones y reglas

Definidas en `pb_migrations/1700000000_init_collections.js` según
`docs/crowdsourced-platform-pocketbase.md`:

| Colección | Lectura pública | Creación pública | Edición |
|---|---|---|---|
| `hospitals`, `collection_centers`, `allied_sites`, `useful_links` | `status = "approved"` | sí | admin/moderator |
| `patients_public` | `public_unverified` o `verified` | sí | admin/moderator |
| `updates_queue`, `removal_requests` | no | sí (envío) | admin/moderator |
| `patient_private_notes`, `source_sync_runs`, `moderation_logs` | no | — | admin/moderator |
| `seismic_events` | `status = "active"` | no | admin/moderator |
| `donations` | `status = "confirmed"` | no | — |
| `users` (auth, moderación) | admin/moderator | — | admin/moderator |

Decisiones de privacidad aplicadas en el schema (no solo en código):
- **No existe `cedula_full`**: imposible almacenar la cédula completa.
- `cedula_last3` exige exactamente 3 dígitos (`^[0-9]{3}$`).
- Las colecciones privadas devuelven `items: []` a usuarios anónimos.

## Producción / migración al hosting

Cuando tengas el servidor, el cambio es mínimo:

1. En el servidor, levanta PocketBase con esta imagen:
   ```sh
   PB_VERSION=0.39.4 POCKETBASE_ADMIN_EMAIL=... POCKETBASE_ADMIN_PASSWORD=... \
     docker compose -f infra/pocketbase/docker-compose.yml up -d --build
   ```
   El entrypoint crea el superuser y aplica las migraciones automáticamente.
2. Pon `api.sismo-ve.xyz` detrás de TLS (reverse proxy / `nginx.conf`).
3. En la app, define `PUBLIC_POCKETBASE_URL=https://api.sismo-ve.xyz` y redeploy.

Eso es todo: el schema y el seed viajan en las migraciones; no hay paso manual de creación
de colecciones.

## Crear más moderadores

Desde el panel admin → colección `users` → nuevo registro con `role = moderator` y
`active = true`. Las reglas `@request.auth.role` ya los habilitan.

## Despliegue en Coolify

La imagen ya es Coolify-ready: el `Dockerfile` hornea las migraciones y el `entrypoint.sh` crea el
superuser desde el entorno y sirve en `0.0.0.0:8090`.

Pasos:

1. **New Resource → Application → Dockerfile** (o Docker Compose), apuntando a este repo/branch.
2. **Base directory**: `infra/pocketbase`.
3. **Port**: `8090` (Coolify le pone el dominio + HTTPS, p. ej. `ayuda-pb.sismo-ve.xyz`).
4. **Persistent storage**: monta un volumen en `/pb/pb_data` (los datos de pacientes viven ahí; sin
   volumen se pierden al redeploy). Opcional: `/pb/pb_public`, `/pb/pb_hooks`.
5. **Environment variables** (en Coolify, NUNCA en el repo):
   - `POCKETBASE_ADMIN_EMAIL`
   - `POCKETBASE_ADMIN_PASSWORD`
   - `PB_VERSION` (opcional, default 0.39.4)
6. **Deploy**. Las migraciones de `pb_migrations/` se aplican solas al primer arranque (crea
   `patients_public`, `patient_private_notes` con `cedula_full`, etc.). Verifica el panel en
   `https://<dominio>/_/`.

Luego, en la app `ayuda` (o donde corran los imports), setea `PUBLIC_POCKETBASE_URL=https://<dominio>`
y las credenciales admin por env para `scripts/pb-import-patients.mjs`. Así la data extraída entra
directo a la instancia viva y **nunca toca git**.
