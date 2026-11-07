# Importar recorridos SLAM desde un solo archivo ZIP

Esta carpeta permite publicar un recorrido exportado por **Estudio SLAM**.

## Subir el ZIP

1. Abrí esta carpeta en GitHub y elegí **Add file → Upload files**.
2. Arrastrá aquí el ZIP original exportado por el editor, por ejemplo:
   publicar-slam-id-mw5osb74-mmcia4.zip
3. Pulsá **Commit changes** a la rama main.
4. En la pestaña **Actions** se ejecuta **Importar ZIP de recorrido SLAM**.
5. La automatización valida el ZIP y coloca los archivos en recorridos/<id>/.
6. Cuando GitHub Pages publique el contenido, la URL del QR estará activa.

**No tenés que descomprimir el ZIP ni subir los archivos individuales.**

La importación rechaza archivos con rutas inseguras, modelos GLB inválidos, target JSON incoherente o identificadores duplicados. No sobrescribe automáticamente recorridos ya publicados.

Si una ejecución de Actions falla, conservá el ZIP original y compartí el mensaje de error antes de volver a intentar.

Esta carpeta no debe contener contraseñas ni tokens.

## Actualizar un recorrido que ya existe

El Estudio genera un ZIP nuevo con un sello de fecha/hora, para no reutilizar el archivo anterior. Subí el ZIP nuevo a esta misma carpeta con **Add file → Upload files**. El flujo GitHub Actions solo procesa los ZIP modificados en ese commit, valida el contenido y **sobrescribe los archivos del mismo identificador de recorrido**. La URL y los QR permanecen iguales; no hace falta reimprimirlos si solo cambiás tamaños o posiciones.

No borres manualmente los archivos del recorrido publicado para actualizarlo.
