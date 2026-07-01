#!/usr/bin/env bash
# Arranca un PocketBase local real, sin Docker: descarga el binario una vez,
# aplica las migraciones de infra/pocketbase/pb_migrations y crea el superuser.
#
# Uso:
#   ./scripts/pocketbase-dev.sh
#
# Variables (desde .env si existe, o del entorno):
#   PB_VERSION                 versión a descargar (default 0.39.4)
#   POCKETBASE_ADMIN_EMAIL     email del superuser (default admin@sismo-ve.local)
#   POCKETBASE_ADMIN_PASSWORD  password del superuser (default changeme-local-only)
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PB_DIR="$ROOT_DIR/infra/pocketbase"
BIN_DIR="$PB_DIR/bin"

# Cargar .env de la raíz si existe (sin sobrescribir variables ya exportadas).
if [[ -f "$ROOT_DIR/.env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "$ROOT_DIR/.env"
  set +a
fi

PB_VERSION="${PB_VERSION:-0.39.4}"
ADMIN_EMAIL="${POCKETBASE_ADMIN_EMAIL:-admin@sismo-ve.local}"
ADMIN_PASSWORD="${POCKETBASE_ADMIN_PASSWORD:-changeme-local-only}"
PB_BIN="$BIN_DIR/pocketbase"

detect_arch() {
  case "$(uname -m)" in
    x86_64|amd64) echo "amd64" ;;
    aarch64|arm64) echo "arm64" ;;
    armv7l) echo "armv7" ;;
    *) echo "amd64" ;;
  esac
}

detect_os() {
  case "$(uname -s)" in
    Linux) echo "linux" ;;
    Darwin) echo "darwin" ;;
    *) echo "linux" ;;
  esac
}

if [[ ! -x "$PB_BIN" ]]; then
  OS="$(detect_os)"
  ARCH="$(detect_arch)"
  URL="https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/pocketbase_${PB_VERSION}_${OS}_${ARCH}.zip"
  echo "Descargando PocketBase ${PB_VERSION} (${OS}/${ARCH})..."
  mkdir -p "$BIN_DIR"
  TMP="$(mktemp -d)"
  curl -fsSL "$URL" -o "$TMP/pocketbase.zip"
  unzip -o -q "$TMP/pocketbase.zip" -d "$BIN_DIR"
  chmod +x "$PB_BIN"
  rm -rf "$TMP"
fi

# Crear/actualizar el superuser (idempotente).
"$PB_BIN" superuser upsert "$ADMIN_EMAIL" "$ADMIN_PASSWORD" \
  --dir "$PB_DIR/pb_data" --migrationsDir "$PB_DIR/pb_migrations" >/dev/null 2>&1 || \
  echo "Aviso: no se pudo upsert el superuser automáticamente (continuo igual)."

echo "PocketBase en http://127.0.0.1:8090  ·  Panel: http://127.0.0.1:8090/_/"
echo "Superuser: $ADMIN_EMAIL"
exec "$PB_BIN" serve \
  --http=127.0.0.1:8090 \
  --dir "$PB_DIR/pb_data" \
  --migrationsDir "$PB_DIR/pb_migrations" \
  --hooksDir "$PB_DIR/pb_hooks"
