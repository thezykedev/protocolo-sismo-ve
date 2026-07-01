#!/usr/bin/env bash
# Empuja las variables de un archivo .env.ci a GitHub usando el CLI `gh`.
#
# Convención:
#   - Claves con prefijo PUBLIC_  -> GitHub *variables* (gh variable set), no secretas.
#   - El resto                    -> GitHub *secrets*  (gh secret set).
#   - Líneas vacías, comentarios (#) y valores vacíos se omiten.
#
# Uso:
#   ./scripts/push-secrets.sh .env.ci            # repo actual (detectado por gh)
#   ./scripts/push-secrets.sh .env.ci owner/repo # repo explícito
#   ENVIRONMENT=production ./scripts/push-secrets.sh .env.ci  # a un environment
set -euo pipefail

ENV_FILE="${1:-.env.ci}"
REPO="${2:-}"

if ! command -v gh >/dev/null 2>&1; then
  echo "Error: el CLI 'gh' no está instalado." >&2
  exit 1
fi

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Error: no existe el archivo '$ENV_FILE'." >&2
  echo "Crea uno a partir de .env.ci.example y vuelve a intentar." >&2
  exit 1
fi

REPO_ARGS=()
[[ -n "$REPO" ]] && REPO_ARGS=(--repo "$REPO")

ENV_ARGS=()
[[ -n "${ENVIRONMENT:-}" ]] && ENV_ARGS=(--env "$ENVIRONMENT")

pushed_secrets=0
pushed_vars=0

while IFS= read -r line || [[ -n "$line" ]]; do
  # Saltar comentarios y líneas en blanco.
  [[ "$line" =~ ^[[:space:]]*# ]] && continue
  [[ -z "${line// }" ]] && continue

  key="${line%%=*}"
  value="${line#*=}"
  key="$(echo "$key" | xargs)" # trim

  [[ -z "$key" || "$key" == "$line" ]] && continue
  # Quitar comillas envolventes del valor si las hay.
  value="${value%\"}"; value="${value#\"}"
  value="${value%\'}"; value="${value#\'}"

  if [[ -z "$value" ]]; then
    echo "· omitido (vacío): $key"
    continue
  fi

  if [[ "$key" == PUBLIC_* ]]; then
    gh variable set "$key" --body "$value" "${REPO_ARGS[@]}" "${ENV_ARGS[@]}"
    echo "✓ variable: $key"
    pushed_vars=$((pushed_vars + 1))
  else
    gh secret set "$key" --body "$value" "${REPO_ARGS[@]}" "${ENV_ARGS[@]}"
    echo "✓ secret:   $key"
    pushed_secrets=$((pushed_secrets + 1))
  fi
done < "$ENV_FILE"

echo ""
echo "Listo: $pushed_secrets secrets y $pushed_vars variables empujados a GitHub."
