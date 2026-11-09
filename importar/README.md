# Publicar un recorrido individual con un ZIP

Esta carpeta se usa para publicar **recorridos individuales** en GitHub Pages. Los colectivos pueden publicarse automáticamente con Supabase, sin usarla.

1. Desde **tu propio Fork**, abre Estudio SLAM y elige **Individual**.
2. Crea el recorrido y presiona **Guardar recorrido**.
3. Presiona **Preparar ZIP para publicar en GitHub** y descarga el archivo.
4. Abre la carpeta `importar/` en **tu repositorio GitHub**.
5. Elige **Add file → Upload files**, sube el ZIP **sin descomprimir** y guarda con **Commit changes**.
6. En la pestaña **Actions**, sigue el flujo **Importar ZIP de recorrido SLAM**.
7. Tu URL será:

```text
https://TU_USUARIO.github.io/TU_REPO/recorrido.html?id=ID_DEL_RECORRIDO
```

El workflow valida los archivos antes de publicarlos. Para actualizar un recorrido, sube un ZIP nuevo generado por el Estudio, conservando su identificador.

**No copies aquí ZIP de los recorridos de otras personas:** pueden contener modelos o imágenes privados. Los ZIP antiguos del laboratorio fueron eliminados de la rama principal.
