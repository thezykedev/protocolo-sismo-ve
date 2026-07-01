# Handoff — Ingesta OCR de pacientes por hospital

- App activa: **ayuda** (SvelteKit). Branch: **feature/hospital-ocr-ingest**.
- Objetivo: extraer listas de pacientes (fotos del Drive) por hospital, revisarlas lado a lado en
  el admin, verificarlas contra la API de Venezuela Reporta y cargarlas a PocketBase (Coolify).
- Decisiones vigentes:
  - **CNE automático descartado** (no hay API estable). Se conservan solo los **links manuales** de
    CNE en la UI. No se cruza cédula con CNE.
  - **cedula_last3** es lo único público. La **cédula completa** se guarda solo en el lado privado
    (`patients.private.json` / `patient_private_notes.cedula_full`), nunca se expone.
  - Verificación = **nombre + edad** contra `GET /api/v1/ingresos` de Venezuela Reporta.

## Flujo (todo determinista salvo el paso de visión)

1. `python scripts/drive_sync.py` — descarga imágenes del Drive a `data/drive_data/` (usa
   `.drive_snapshots/snapshot_1.json`). Requiere acceso al Drive.
2. `python scripts/ingest_progress.py init|status|next 5|mark ...` — **ledger de control**
   (`data/ingest/ledger.json` + 5 snapshots). Fuente de verdad de "dónde vamos".
3. **Visión (único paso con tokens)**: por CADA imagen pendiente, un agente lee la imagen y escribe
   `data/ingest/extracted/<slug>/by-image/<imagen>.json` con el contrato de filas (ver abajo).
   NO leer imágenes en el hilo principal — una por sub-contexto, devolver solo un resumen.
4. `node scripts/assemble-hospital.mjs --slug <slug>` — determinista: junta los by-image, redacta,
   **deduplica** (nombre+edad) y escribe `patients.review.json` (privado), `patients.import.json`
   (público), `patients.private.json` (cedula_full) y `manifest.json`.
5. `node scripts/verify-venezuelareporta.mjs --in data/ingest/extracted/<slug>/patients.review.json --hospital "<display>"`
   — cruza contra `/ingresos` (cache en `data/ingest/venezuelareporta/`), escribe `vr-crosscheck.json`
   (matched / only_ours = tenemos de más / vr_only = nos falta / duplicados). **Pasar `--hospital "<display>"`**
   para acotar el pool al hospital; si no, compara contra todo VR.
6. Revisión humana: `/admin/pacientes/hospitales` (índice) y `/admin/pacientes/<slug>` (side-by-side
   imagen vs fila vs cruce VR). Marcar en el ledger: `ingest_progress.py mark <orders> verified`.
7. Import a PocketBase: `node scripts/pb-import-patients.mjs` (apuntando a la URL de Coolify por env).

### Contrato by-image (lo que escribe cada agente de visión)
`{ hospital, source_image, list_title?, fecha?, rows:[ { item?, nombre, apellido?, cedula_last3?,
cedula_full?, edad?, sexo?("m"|"f"), alergia?, diagnostico?, egreso?, ubicacion?,
confianza("alta"|"media"|"baja"), raw(verbatim), notas? } ] }`. Transcribir EXACTO; ilegible → null +
confianza "baja". `raw` = la línea tal cual (evidencia para el cotejo).

## Estado actual (al hacer el handoff)

- Extraídos + ensamblados: **Pérez Carreño** 824 (208 dups marcados por VR), **El Ávila** 70,
  **Ciudad Caribia** 16, **Catia** 122 (23 dups descartados).
- Parcial: **Luciani** 2/19 by-image.
- Pendientes de visión: **Luciani** (17), **Vargas** (5), **Los Cocos** (19), **Lista digitalizada** (1).
- Aparte (no imagen): **Carlos Arveledo** (.docx → extraer texto), **Universitario/HUC** (.pdf → Read
  admite PDF por páginas).
- VR `/ingresos` tiene ~20.648 registros (cache local). Registry de hospitales: `scripts/hospitals.mjs`.

## Cómo continuar la extracción en el VPS (sin ultracode)

Trabajar por lotes con el ledger. Para cada hospital pendiente, por cada imagen en
`data/drive_data/SISMO 2026 VZLA/<carpeta>/`, generar su `by-image/<imagen>.json` (contrato arriba),
luego correr `assemble-hospital.mjs` + `verify-venezuelareporta.mjs` con `--hospital "<display>"`, y
marcar el ledger. Slugs/carpetas/display están en `scripts/hospitals.mjs`.

## Carpetas a copiar al VPS (NO están en git — datos sensibles)

Transferir por rsync/scp (no por git):
- `data/drive_data/` — imágenes fuente (o re-correr `drive_sync.py` en el VPS).
- `.drive_snapshots/` — manifiesto del Drive.
- `data/ingest/` — ledger, snapshots, `extracted/` (incluye cedula_full), staging.

## PocketBase en Coolify

Ver `infra/pocketbase/README.md` (sección Coolify). El schema viaja en `pb_migrations/` y se aplica
al arrancar (incluye `patient_private_notes.cedula_full`). Env requerido: `POCKETBASE_ADMIN_EMAIL`,
`POCKETBASE_ADMIN_PASSWORD`, volumen persistente en `/pb/pb_data`. La app lee `PUBLIC_POCKETBASE_URL`.

## Validación

- `pnpm --dir apps/ayuda check` → 0 errores.
- Guardas de privacidad en cada assemble: `public_has_full_cedula:false`, `public_has_raw_line:false`.
