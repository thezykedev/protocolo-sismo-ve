#!/usr/bin/env python3
"""Construye el staging SQLite de pacientes desde las extracciones revisables.

Lee todas las extracciones en data/ingest/extracted/*.json (formato de transcripcion
por lote) y las mapea al esquema PatientPublicRecord. La salida es un SQLite gitignored
(data/ingest/staging.db, tabla patients_public(id, json)) que se importa a PocketBase con
`pnpm pb:import`. NO se escribe en el bundle de la app: los datos sensibles no van al repo.

Privacidad (CLAUDE.md): solo cedula_last3, nunca cedula completa. Un resumen de diagnostico
en public_notes esta permitido; telefonos, direcciones y evidencias quedan fuera.

Uso:
    python scripts/build_fallback_patients.py
"""
import json
import os
import glob
import sqlite3

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
EXTRACT_DIR = os.path.join(ROOT, "data", "ingest", "extracted")
CORRECTIONS = os.path.join(ROOT, "data", "ingest", "corrections.json")
OUT = os.path.join(ROOT, "data", "ingest", "staging.db")

# Campos que el usuario puede corregir desde la UI (capa de override sobre la transcripcion).
EDITABLE = ("patient_name", "cedula_last3", "age", "condition_public", "public_notes")


def slug(name):
    base = os.path.splitext(os.path.basename(name))[0]
    return "".join(c if c.isalnum() else "-" for c in base.lower()).strip("-")


def condition_from_egreso(egreso):
    e = (egreso or "").upper()
    if "ALTA" in e or "EGRESO" in e:
        return "discharged"
    return "hospitalized"


def to_record(prefix, hospital, fecha, row):
    nombre = " ".join(p for p in [row.get("nombre"), row.get("apellido")] if p and "ilegible" not in p.lower())
    if not nombre:
        nombre = "(nombre por confirmar)"
    notas = " · ".join(p for p in [row.get("diagnostico"), row.get("alergia")] if p)
    if row.get("confianza") == "baja":
        notas = ("[Lectura por verificar] " + notas).strip(" ·")
    return {
        "id": f"{prefix}-{row['item']:03d}",
        "status": "pending",
        "patient_name": nombre,
        "age": row.get("edad") if isinstance(row.get("edad"), int) else None,
        "cedula_last3": row.get("cedula_last3") or "",
        "hospital": hospital,
        "condition_public": condition_from_egreso(row.get("egreso")),
        "last_seen_at": fecha,
        "source_type": "hospital_staff",
        "verification_status": "unverified",
        "source_name": f"Lista {hospital} ({fecha})" if fecha else f"Lista {hospital}",
        "public_notes": notas,
    }


def main():
    files = sorted(glob.glob(os.path.join(EXTRACT_DIR, "*.json")))
    records = []
    summary = []
    for fpath in files:
        with open(fpath, "r", encoding="utf-8") as f:
            data = json.load(f)
        rows = data.get("rows", [])
        if not rows:
            continue
        prefix = slug(fpath)
        hospital = data.get("hospital", "Hospital no especificado")
        fecha = data.get("fecha", "")
        for row in rows:
            records.append(to_record(prefix, hospital, fecha, row))
        summary.append((os.path.basename(fpath), len(rows)))

    # aplicar capa de correcciones humanas (override sobre la transcripcion cruda)
    corrections = {}
    if os.path.exists(CORRECTIONS):
        with open(CORRECTIONS, "r", encoding="utf-8") as f:
            corrections = json.load(f)
    n_corr = 0
    for r in records:
        fix = corrections.get(r["id"])
        if not fix:
            continue
        for k in EDITABLE:
            if k in fix:
                r[k] = fix[k]
        r["verification_status"] = "moderator_confirmed"
        n_corr += 1

    # quitar campos None para mantener el registro limpio
    cleaned = [{k: v for k, v in r.items() if v is not None} for r in records]

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    conn = sqlite3.connect(OUT)
    try:
        conn.execute("DROP TABLE IF EXISTS patients_public")
        conn.execute("CREATE TABLE patients_public(id TEXT PRIMARY KEY, json TEXT NOT NULL)")
        conn.executemany(
            "INSERT OR REPLACE INTO patients_public(id, json) VALUES (?, ?)",
            [(r["id"], json.dumps(r, ensure_ascii=False)) for r in cleaned],
        )
        conn.commit()
    finally:
        conn.close()
    print(f"Escrito {OUT}")
    print(f"Total pacientes: {len(cleaned)}  (correcciones aplicadas: {n_corr})")
    for name, n in summary:
        print(f"  - {name}: {n}")


if __name__ == "__main__":
    main()
