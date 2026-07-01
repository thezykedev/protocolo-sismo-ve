#!/usr/bin/env python3
"""Ledger de ingesta de listas de pacientes (fotos, PDF, documentos).

Separado de drive_sync.py: drive_sync DESCARGA archivos del Drive; este script
registra QUE archivos ya fueron transcritos y verificados, en lotes de 5, con un
historial de 5 snapshots para saber donde se quedo el proceso.

El ledger es la fuente de verdad de "donde quedamos". Cada cambio de estado rota
un snapshot (maximo 5) para poder auditar o revertir.

Uso:
    python scripts/ingest_progress.py init        # construye/actualiza el ledger
    python scripts/ingest_progress.py next [N]     # muestra el proximo lote pendiente (def. 5)
    python scripts/ingest_progress.py status       # resumen y donde quedamos
    python scripts/ingest_progress.py mark 1,2,3 loaded   --note "..."
    python scripts/ingest_progress.py mark 1     verified --count 7
"""
import json
import os
import shutil
import sys
from datetime import datetime

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MANIFEST = os.path.join(ROOT, ".drive_snapshots", "snapshot_1.json")
DRIVE_DATA = os.path.join(ROOT, "data", "drive_data")
INGEST_DIR = os.path.join(ROOT, "data", "ingest")
LEDGER = os.path.join(INGEST_DIR, "ledger.json")
SNAP_DIR = os.path.join(INGEST_DIR, "snapshots")
EXTRACT_DIR = os.path.join(INGEST_DIR, "extracted")
# Flujo fisico de verificacion: por_verificar (revision humana 1x1) -> verificado (auditoria interna).
POR_VERIFICAR = os.path.join(INGEST_DIR, "por_verificar")
VERIFICADO = os.path.join(INGEST_DIR, "verificado")
MAX_SNAPSHOTS = 5
DEFAULT_BATCH = 5
STATUSES = ("pending", "loaded", "verified", "skipped")

IMAGE_EXT = {".jpg", ".jpeg", ".png", ".webp", ".heic"}
DOC_EXT = {".pdf", ".docx", ".doc", ".txt"}


def now():
    return datetime.now().isoformat(timespec="seconds")


def classify(disk_path):
    ext = os.path.splitext(disk_path or "")[1].lower()
    if ext in IMAGE_EXT:
        return "image"
    if ext in DOC_EXT:
        return ext.lstrip(".")
    return "other"


def resolve_disk_path(manifest_path):
    """Mapea la ruta del manifiesto a la ruta real en disco.

    El manifiesto no incluye el prefijo 'SISMO 2026 VZLA/' y los Google Docs
    perdieron su extension (en disco son .docx). Resolvemos por nombre base
    dentro de la carpeta correspondiente.
    """
    rel = manifest_path.replace("\\", "/")
    folder = os.path.dirname(rel)
    base = os.path.basename(rel)
    search_dirs = [
        os.path.join(DRIVE_DATA, "SISMO 2026 VZLA", folder),
        os.path.join(DRIVE_DATA, folder),
    ]
    for d in search_dirs:
        if not os.path.isdir(d):
            continue
        # match exacto
        exact = os.path.join(d, base)
        if os.path.isfile(exact):
            return os.path.relpath(exact, ROOT)
        # match por prefijo de nombre (Docs exportados a .docx, etc.)
        for fname in sorted(os.listdir(d)):
            stem = os.path.splitext(fname)[0]
            if fname == base or stem == base or stem == os.path.splitext(base)[0]:
                return os.path.relpath(os.path.join(d, fname), ROOT)
    return None


def staged_rel(disk_path):
    """Ruta relativa del archivo respecto a drive_data (sin el prefijo del cache)."""
    abs_disk = os.path.join(ROOT, disk_path)
    return os.path.relpath(abs_disk, DRIVE_DATA)


def stage_for_review(e):
    """Copia el original a por_verificar/ para la revision humana 1x1. No toca drive_data."""
    if not e.get("disk_path"):
        return None
    rel = staged_rel(e["disk_path"])
    dest = os.path.join(POR_VERIFICAR, rel)
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    if not os.path.exists(dest):
        shutil.copy2(os.path.join(ROOT, e["disk_path"]), dest)
    return os.path.relpath(dest, ROOT)


def move_to_verificado(e):
    """Mueve la copia aprobada de por_verificar/ a verificado/ (auditoria interna)."""
    if not e.get("disk_path"):
        return None
    rel = staged_rel(e["disk_path"])
    src = os.path.join(POR_VERIFICAR, rel)
    dest = os.path.join(VERIFICADO, rel)
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    if os.path.exists(src):
        if os.path.exists(dest):
            os.remove(dest)
        shutil.move(src, dest)
    elif not os.path.exists(dest):
        # nunca paso por por_verificar: copia directa desde el cache
        shutil.copy2(os.path.join(ROOT, e["disk_path"]), dest)
    return os.path.relpath(dest, ROOT)


def load_ledger():
    if not os.path.exists(LEDGER):
        return None
    with open(LEDGER, "r", encoding="utf-8") as f:
        return json.load(f)


def rotate_snapshot():
    """Guarda el ledger actual como snapshot_1 y desplaza el resto (max 5)."""
    if not os.path.exists(LEDGER):
        return
    os.makedirs(SNAP_DIR, exist_ok=True)
    oldest = os.path.join(SNAP_DIR, f"ledger_{MAX_SNAPSHOTS}.json")
    if os.path.exists(oldest):
        os.remove(oldest)
    for i in range(MAX_SNAPSHOTS - 1, 0, -1):
        cur = os.path.join(SNAP_DIR, f"ledger_{i}.json")
        nxt = os.path.join(SNAP_DIR, f"ledger_{i+1}.json")
        if os.path.exists(cur):
            os.rename(cur, nxt)
    shutil.copy2(LEDGER, os.path.join(SNAP_DIR, "ledger_1.json"))


def save_ledger(ledger, snapshot=True):
    os.makedirs(INGEST_DIR, exist_ok=True)
    if snapshot:
        rotate_snapshot()  # snapshot del estado ANTERIOR antes de sobrescribir
    ledger["updated_at"] = now()
    with open(LEDGER, "w", encoding="utf-8") as f:
        json.dump(ledger, f, indent=2, ensure_ascii=False)


def cmd_init():
    if not os.path.exists(MANIFEST):
        sys.exit(f"No existe el manifiesto {MANIFEST}. Corre drive_sync.py primero.")
    with open(MANIFEST, "r", encoding="utf-8") as f:
        manifest = json.load(f)

    existing = load_ledger()
    prev_by_path = {}
    if existing:
        prev_by_path = {e["manifest_path"]: e for e in existing["files"]}

    files = []
    missing = []
    for i, entry in enumerate(manifest, start=1):
        mpath = entry["path"]
        disk = resolve_disk_path(mpath)
        if disk is None:
            missing.append(mpath)
        prev = prev_by_path.get(mpath)
        files.append({
            "order": i,
            "manifest_path": mpath,
            "drive_url": entry.get("url"),
            "disk_path": disk,
            "type": classify(disk or mpath),
            "status": prev["status"] if prev else "pending",
            "loaded_at": prev.get("loaded_at") if prev else None,
            "verified_at": prev.get("verified_at") if prev else None,
            "extracted_file": prev.get("extracted_file") if prev else None,
            "patients_count": prev.get("patients_count") if prev else None,
            "notes": prev.get("notes", "") if prev else "",
        })

    ledger = {
        "created_at": existing["created_at"] if existing else now(),
        "updated_at": now(),
        "batch_size": existing.get("batch_size", DEFAULT_BATCH) if existing else DEFAULT_BATCH,
        "files": files,
    }
    save_ledger(ledger, snapshot=bool(existing))
    print(f"Ledger {'actualizado' if existing else 'creado'}: {len(files)} archivos.")
    if missing:
        print(f"\nAVISO: {len(missing)} archivos del manifiesto no se encontraron en disco:")
        for m in missing:
            print(f"  - {m}")


def fmt_row(e):
    flag = {"pending": "[ ]", "loaded": "[~]", "verified": "[x]", "skipped": "[-]"}[e["status"]]
    cnt = f" ({e['patients_count']}p)" if e.get("patients_count") is not None else ""
    disk = e["disk_path"] or "  <NO ENCONTRADO EN DISCO>"
    return f"  {flag} #{e['order']:>2} [{e['type']:>5}]{cnt} {e['manifest_path']}\n        -> {disk}"


def cmd_next(args):
    ledger = load_ledger() or sys.exit("No hay ledger. Corre: ingest_progress.py init")
    n = int(args[0]) if args else ledger.get("batch_size", DEFAULT_BATCH)
    pending = [e for e in ledger["files"] if e["status"] == "pending"]
    if not pending:
        print("No quedan archivos pendientes. Todo cargado.")
        return
    batch = pending[:n]
    print(f"Proximo lote ({len(batch)} de {len(pending)} pendientes):\n")
    for e in batch:
        print(fmt_row(e))
    print(f"\nOrders de este lote: {','.join(str(e['order']) for e in batch)}")


def cmd_status():
    ledger = load_ledger() or sys.exit("No hay ledger. Corre: ingest_progress.py init")
    files = ledger["files"]
    counts = {s: sum(1 for e in files if e["status"] == s) for s in STATUSES}
    total = len(files)
    done = counts["verified"]
    print(f"Ledger: {total} archivos | actualizado {ledger['updated_at']}")
    print(f"  verificados: {counts['verified']}  cargados(sin verificar): {counts['loaded']}"
          f"  pendientes: {counts['pending']}  saltados: {counts['skipped']}")
    print(f"  progreso verificado: {done}/{total} ({100*done//total if total else 0}%)")
    loaded = [e for e in files if e["status"] == "loaded"]
    if loaded:
        print("\nEsperando tu verificacion:")
        for e in loaded:
            print(fmt_row(e))
    nxt = next((e for e in files if e["status"] == "pending"), None)
    if nxt:
        print(f"\nSe quedo en: proximo pendiente #{nxt['order']} ({nxt['manifest_path']})")
    snaps = sorted(os.listdir(SNAP_DIR)) if os.path.isdir(SNAP_DIR) else []
    print(f"\nHistorial de snapshots ({len(snaps)}/{MAX_SNAPSHOTS}): {', '.join(snaps) or 'ninguno'}")


def cmd_mark(args):
    if len(args) < 2:
        sys.exit("Uso: mark <orders csv> <status> [--count N] [--extracted PATH] [--note TXT]")
    orders = {int(x) for x in args[0].split(",") if x.strip()}
    status = args[1]
    if status not in STATUSES:
        sys.exit(f"Estado invalido '{status}'. Use: {', '.join(STATUSES)}")
    count = note = extracted = None
    it = iter(args[2:])
    for a in it:
        if a == "--count":
            count = int(next(it))
        elif a == "--note":
            note = next(it)
        elif a == "--extracted":
            extracted = next(it)
    ledger = load_ledger() or sys.exit("No hay ledger. Corre: ingest_progress.py init")
    touched = []
    for e in ledger["files"]:
        if e["order"] in orders:
            e["status"] = status
            if status == "loaded":
                e["loaded_at"] = now()
                e["staged_path"] = stage_for_review(e)
            if status == "verified":
                e["verified_at"] = now()
                if not e["loaded_at"]:
                    e["loaded_at"] = now()
                e["verificado_path"] = move_to_verificado(e)
                e["staged_path"] = None
            if count is not None:
                e["patients_count"] = count
            if extracted is not None:
                e["extracted_file"] = extracted
            if note is not None:
                e["notes"] = note
            touched.append(e)
    if not touched:
        sys.exit(f"Ningun archivo coincide con orders {sorted(orders)}.")
    save_ledger(ledger)
    print(f"Marcados {len(touched)} archivo(s) como '{status}':")
    for e in touched:
        print(fmt_row(e))


def cmd_add(args):
    """Anexa al ledger los archivos de una subcarpeta descubierta (no estaba en el manifiesto)."""
    if not args:
        sys.exit("Uso: add <ruta-carpeta-bajo-data/drive_data> [--source TXT]")
    folder = args[0]
    source = ""
    if "--source" in args:
        source = args[args.index("--source") + 1]
    abs_folder = folder if os.path.isabs(folder) else os.path.join(ROOT, folder)
    if not os.path.isdir(abs_folder):
        sys.exit(f"No es carpeta: {abs_folder}")
    ledger = load_ledger() or sys.exit("No hay ledger. Corre: ingest_progress.py init")
    known = {e["disk_path"] for e in ledger["files"]}
    next_order = max((e["order"] for e in ledger["files"]), default=0) + 1
    added = []
    for dirpath, _, names in os.walk(abs_folder):
        for fname in sorted(names):
            disk_rel = os.path.relpath(os.path.join(dirpath, fname), ROOT)
            if disk_rel in known:
                continue
            mpath = os.path.relpath(os.path.join(dirpath, fname), DRIVE_DATA)
            ledger["files"].append({
                "order": next_order, "manifest_path": mpath, "drive_url": None,
                "disk_path": disk_rel, "type": classify(disk_rel), "status": "pending",
                "loaded_at": None, "verified_at": None, "extracted_file": None,
                "patients_count": None, "notes": f"anadido via add. fuente: {source}".strip(),
            })
            added.append(mpath)
            next_order += 1
    if not added:
        print("Nada nuevo que anexar.")
        return
    save_ledger(ledger)
    print(f"Anexados {len(added)} archivo(s):")
    for m in added:
        print(f"  + {m}")


def main():
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    cmd, rest = sys.argv[1], sys.argv[2:]
    if cmd == "init":
        cmd_init()
    elif cmd == "next":
        cmd_next(rest)
    elif cmd == "status":
        cmd_status()
    elif cmd == "mark":
        cmd_mark(rest)
    elif cmd == "add":
        cmd_add(rest)
    else:
        sys.exit(f"Comando desconocido '{cmd}'.\n{__doc__}")


if __name__ == "__main__":
    main()
