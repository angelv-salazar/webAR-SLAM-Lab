#!/usr/bin/env python3
"""Publica los recorridos SLAM de un ZIP exportado por Estudio SLAM.

Ejemplo:
  python scripts/importar_recorrido.py importar/publicar-slam-id-xxxx.zip

Solo escribe en recorridos/<id>/. No ejecuta código del ZIP ni publica
archivos fuera de las rutas verificadas.
"""
from __future__ import annotations

import json
import re
import sys
import os
from pathlib import Path, PurePosixPath
from zipfile import ZipFile

ID = re.compile(r"id-[a-z0-9-]{8,60}\Z", re.I)
TARGET = re.compile(r"slam-\d{2}-id-[a-z0-9-]{8,60}\Z", re.I)
MAX_TOTAL = 100 * 1024 * 1024
MAX_FILE = 30 * 1024 * 1024
MAX_MARKERS = 20
ALLOWED_PREFIXES = ("targets/", "modelos/", "imprimir/", "patrones/")


def abort(message: str) -> None:
    raise ValueError(message)


def import_zip(archive: Path, *, allow_update: bool = False) -> tuple[str, int, int]:
    if not archive.is_file() or archive.suffix.lower() != ".zip":
        abort(f"No existe un archivo ZIP válido: {archive}")
    if archive.stat().st_size > MAX_TOTAL:
        abort("El archivo ZIP supera los 100 MB de esta versión.")

    with ZipFile(archive) as z:
        info = [member for member in z.infolist() if not member.is_dir()]
        if not info or len(info) > MAX_MARKERS * 7 + 3:
            abort("El ZIP está vacío o tiene demasiados archivos.")
        if sum(member.file_size for member in info) > MAX_TOTAL:
            abort("El contenido descomprimido supera 100 MB.")

        candidates = [member.filename for member in info
                      if member.filename.startswith("recorridos/")
                      and member.filename.endswith("/manifest.json")]
        if len(candidates) != 1:
            abort("Debe existir exactamente un manifiesto de recorrido SLAM.")
        manifest_path = PurePosixPath(candidates[0])
        if len(manifest_path.parts) != 3:
            abort("La ruta del manifiesto no es válida.")
        route_id = manifest_path.parts[1]
        if not ID.fullmatch(route_id):
            abort("Identificador de recorrido inválido.")
        prefix = f"recorridos/{route_id}/"

        names = set()
        for entry in info:
            path = PurePosixPath(entry.filename)
            if path.is_absolute() or ".." in path.parts or "\\" in entry.filename:
                abort("Ruta insegura en el ZIP.")
            if entry.filename in names:
                abort("Hay archivos duplicados.")
            names.add(entry.filename)
            if entry.file_size > MAX_FILE:
                abort(f"Archivo demasiado grande: {entry.filename}")
            if entry.filename == "INSTRUCCIONES-PUBLICAR.txt":
                continue
            if not entry.filename.startswith(prefix):
                abort(f"Ruta fuera del recorrido: {entry.filename}")
            rel = entry.filename[len(prefix):]
            if rel != "manifest.json" and not rel.startswith(ALLOWED_PREFIXES):
                abort(f"Archivo no admitido: {entry.filename}")
            # Rechazar enlaces simbólicos y otros tipos especiales de Unix.
            mode = (entry.external_attr >> 16) & 0o170000
            if mode not in (0, 0o100000):
                abort("Se detectó un archivo especial o enlace simbólico.")

        manifest = json.loads(z.read(str(manifest_path)))
        if manifest.get("format") != "estudio-slam-public-v1":
            abort("El manifiesto no pertenece a Estudio SLAM.")
        if manifest.get("id") != route_id:
            abort("El identificador del manifiesto y la carpeta no coinciden.")
        items = manifest.get("items")
        if not isinstance(items, list) or not 1 <= len(items) <= MAX_MARKERS:
            abort("El recorrido debe contener entre 1 y 20 marcadores.")

        target_names = set()
        required = {"manifest.json"}
        for item in items:
            title = str(item.get("title") or "sin nombre")
            target = item.get("target")
            if not isinstance(target, dict):
                abort(f"Faltan los metadatos de Image Target: {title}")
            name = item.get("imageTargetName")
            if not isinstance(name, str) or not TARGET.fullmatch(name):
                abort(f"Nombre de marcador inválido: {title}")
            if name in target_names:
                abort("Los nombres de reconocimiento no son únicos.")
            target_names.add(name)

            for key, folder, suffix in (
                ("model", "modelos", ".glb"),
                ("print", "imprimir", ".png"),
            ):
                path = item.get(key)
                if not isinstance(path, str) or not path.startswith(folder + "/") or not path.endswith(suffix):
                    abort(f"Falta {key} para {title}")
                required.add(path)
            for key, suffix in (("image", ".jpg"), ("json", ".json")):
                path = target.get(key)
                if not isinstance(path, str) or not path.startswith("targets/") or not path.endswith(suffix):
                    abort(f"Falta target.{key} para {title}")
                required.add(path)
            legacy = item.get("legacyPatt")
            if legacy:
                if not legacy.startswith("patrones/") or not legacy.endswith(".patt"):
                    abort("Patrón heredado inválido.")
                required.add(legacy)

            if z.read(prefix + item["model"])[:4] != b"glTF":
                abort(f"No es un GLB válido: {title}")
            if z.read(prefix + item["print"])[:8] != b"\x89PNG\r\n\x1a\n":
                abort(f"No es un PNG válido: {title}")
            if z.read(prefix + target["image"])[:2] != b"\xff\xd8":
                abort(f"No es un JPEG válido: {title}")
            meta = json.loads(z.read(prefix + target["json"]))
            if meta.get("name") != name or meta.get("type") != "PLANAR":
                abort(f"Image Target incompatible: {title}")
            if meta.get("imagePath") != target["image"]:
                abort(f"El Image Target no apunta al JPEG correcto: {title}")
            if meta.get("properties") != target.get("properties"):
                abort(f"Propiedades de Image Target inconsistentes: {title}")

        missing = {prefix + rel for rel in required} - names
        if missing:
            abort("Faltan archivos: " + ", ".join(sorted(missing)))

        dest = Path("recorridos") / route_id
        # Se admite actualizar una ruta publicada SOLO si se pidió
        # explícitamente --update y el ZIP ya fue validado por completo.
        if dest.exists() and any(dest.iterdir()):
            if not allow_update:
                abort("Este recorrido ya existe. Para actualizarlo usa --update.")
            existing_manifest = dest / "manifest.json"
            if not existing_manifest.is_file():
                abort("La carpeta ya existe pero no tiene manifiesto; no sobrescribir.")
            old = json.loads(existing_manifest.read_text(encoding="utf-8"))
            if old.get("id") != route_id or old.get("format") != "estudio-slam-public-v1":
                abort("La carpeta existente no coincide con este recorrido SLAM.")

        extracted = 0
        for member in info:
            if member.filename == "INSTRUCCIONES-PUBLICAR.txt":
                continue
            target_path = Path(member.filename)
            target_path.parent.mkdir(parents=True, exist_ok=True)
            target_path.write_bytes(z.read(member))
            extracted += 1

    return route_id, len(items), extracted


if __name__ == "__main__":
    try:
        args = sys.argv[1:]
        allow_update = "--update" in args
        files = [Path(x) for x in args if x != "--update"]
        if not files:
            abort("Pasa el ZIP como argumento.")
        for path in files:
            route_id, markers, created = import_zip(path, allow_update=allow_update)
            print(f"PUBLICADO: {route_id} | marcadores: {markers} | archivos: {created}")
            repository = os.getenv("GITHUB_REPOSITORY", "")
            if "/" in repository:
                owner, name = repository.split("/", 1)
                print(f"URL: https://{owner}.github.io/{name}/recorrido.html?id={route_id}")
            else:
                print("Abre recorrido.html?id=" + route_id + " en la web de GitHub Pages de tu copia.")
    except Exception as exc:
        print("Error de importación: " + str(exc), file=sys.stderr)
        raise SystemExit(1)
