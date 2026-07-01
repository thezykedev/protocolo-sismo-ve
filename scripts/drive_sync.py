#!/usr/bin/env python3
import subprocess
import json
import os
import sys

DRIVE_URL = "1o36ifaRz45kAs5rKzci49aD0mP5JB_YI"
SNAPSHOT_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), ".drive_snapshots")
MAX_SNAPSHOTS = 5

def get_current_drive_files():
    print("Conectando con Google Drive para obtener el listado de archivos (esto NO descarga los archivos pesados, solo la lista)...")
    try:
        result = subprocess.run(
            ["gdown", "--folder", "--json", DRIVE_URL],
            capture_output=True,
            text=True,
            check=True
        )
        return json.loads(result.stdout)
    except subprocess.CalledProcessError as e:
        print(f"Error ejecutando gdown: {e.stderr}")
        sys.exit(1)
    except json.JSONDecodeError:
        print("Error parseando la respuesta de gdown.")
        sys.exit(1)

def rotate_snapshots():
    """Rota los archivos de snapshot para mantener solo los últimos MAX_SNAPSHOTS."""
    if not os.path.exists(SNAPSHOT_DIR):
        os.makedirs(SNAPSHOT_DIR)

    # Borramos el más antiguo si existe
    oldest = os.path.join(SNAPSHOT_DIR, f"snapshot_{MAX_SNAPSHOTS}.json")
    if os.path.exists(oldest):
        os.remove(oldest)
        
    # Desplazamos los demás
    for i in range(MAX_SNAPSHOTS - 1, 0, -1):
        current_path = os.path.join(SNAPSHOT_DIR, f"snapshot_{i}.json")
        next_path = os.path.join(SNAPSHOT_DIR, f"snapshot_{i+1}.json")
        if os.path.exists(current_path):
            os.rename(current_path, next_path)

def main():
    if not os.path.exists(SNAPSHOT_DIR):
        os.makedirs(SNAPSHOT_DIR)
        
    latest_snapshot = os.path.join(SNAPSHOT_DIR, "snapshot_1.json")
    
    current_files = get_current_drive_files()
    current_map = {f['url']: f['path'] for f in current_files}
    
    if os.path.exists(latest_snapshot):
        with open(latest_snapshot, "r", encoding="utf-8") as f:
            old_files = json.load(f)
            
        old_map = {f['url']: f['path'] for f in old_files}
        new_urls = set(current_map.keys()) - set(old_map.keys())
        
        if not new_urls:
            print("\n✅ Ningún archivo nuevo. El Drive está exactamente igual al último snapshot.")
        else:
            print(f"\n⚠️ SE ENCONTRARON {len(new_urls)} ARCHIVOS NUEVOS DESDE EL ÚLTIMO SNAPSHOT:")
            for url in new_urls:
                print(f" -> {current_map[url]}")
                
            print("\nDescargando los archivos físicamente a data/drive_data/ ...")
            subprocess.run(["gdown", "--folder", DRIVE_URL, "-O", "data/drive_data/"])
                
            # Solo rotamos y guardamos si hubo cambios
            rotate_snapshots()
            with open(latest_snapshot, "w", encoding="utf-8") as f:
                json.dump(current_files, f, indent=2, ensure_ascii=False)
            print(f"\nSnapshot actualizado en '.drive_snapshots/snapshot_1.json'. Se preservan los últimos {MAX_SNAPSHOTS} en el historial.")
    else:
        print("\n📸 No existía un snapshot previo. Se ha creado el snapshot inicial.")
        print(f"Se registraron {len(current_files)} archivos en total.")
        print("\nDescargando los archivos físicamente a data/drive_data/ ...")
        subprocess.run(["gdown", "--folder", DRIVE_URL, "-O", "data/drive_data/"])
        
        with open(latest_snapshot, "w", encoding="utf-8") as f:
            json.dump(current_files, f, indent=2, ensure_ascii=False)

if __name__ == "__main__":
    main()
