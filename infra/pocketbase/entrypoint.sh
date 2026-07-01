#!/bin/sh
# Entrypoint de PocketBase para producción: crea/actualiza el superuser desde el entorno
# (idempotente) y luego sirve. Las migraciones en /pb/pb_migrations se aplican solas.
set -e

if [ -n "$POCKETBASE_ADMIN_EMAIL" ] && [ -n "$POCKETBASE_ADMIN_PASSWORD" ]; then
  echo "Upsert superuser: $POCKETBASE_ADMIN_EMAIL"
  pocketbase superuser upsert "$POCKETBASE_ADMIN_EMAIL" "$POCKETBASE_ADMIN_PASSWORD" || \
    echo "Aviso: upsert del superuser falló (continuo)."
fi

exec pocketbase serve --http=0.0.0.0:8090 "$@"
