#!/usr/bin/env bash
# Crea un colaborador (registro en la colección `users`) usando el superuser de PocketBase.
# Sirve para bootstrap del primer admin; luego la pantalla /admin/usuarios hará lo mismo.
#
# Uso:
#   ./scripts/pb-create-collaborator.sh <email> <password> <role> ["Nombre visible"]
#   role: admin | moderator | hospital_staff | volunteer  (editor = moderator)
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
[[ -f "$ROOT_DIR/.env" ]] && { set -a; source "$ROOT_DIR/.env"; set +a; }

PB_URL="${PUBLIC_POCKETBASE_URL:-http://127.0.0.1:8090}"
ADMIN_EMAIL="${POCKETBASE_ADMIN_EMAIL:-admin@sismo-ve.local}"
ADMIN_PASSWORD="${POCKETBASE_ADMIN_PASSWORD:-changeme-local-only}"

EMAIL="${1:?email requerido}"
PASSWORD="${2:?password requerido}"
ROLE="${3:?role requerido (admin|moderator|hospital_staff|volunteer)}"
DISPLAY="${4:-$EMAIL}"

echo "Autenticando superuser en $PB_URL ..."
TOKEN="$(curl -s -X POST "$PB_URL/api/collections/_superusers/auth-with-password" \
  -H 'Content-Type: application/json' \
  -d "{\"identity\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}" \
  | sed -n 's/.*"token":"\([^"]*\)".*/\1/p')"

if [[ -z "$TOKEN" ]]; then
  echo "ERROR: no se pudo autenticar el superuser. ¿Está PocketBase arriba y las credenciales en .env?" >&2
  exit 1
fi

echo "Creando colaborador $EMAIL (rol: $ROLE) ..."
RESP="$(curl -s -X POST "$PB_URL/api/collections/users/records" \
  -H "Authorization: $TOKEN" -H 'Content-Type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\",\"passwordConfirm\":\"$PASSWORD\",\"role\":\"$ROLE\",\"display_name\":\"$DISPLAY\",\"active\":true,\"verified\":true,\"emailVisibility\":false}")"

if echo "$RESP" | grep -q '"id":'; then
  echo "OK: colaborador creado."
  echo "  email: $EMAIL"
  echo "  rol:   $ROLE"
else
  echo "Respuesta de PocketBase:" >&2
  echo "$RESP" >&2
  exit 1
fi
