# Publicar un recorrido individual con un ZIP

Esta carpeta se usa para publicar **recorridos individuales** en GitHub Pages. Los colectivos pueden publicarse automáticamente con Supabase, sin usarla.

1. Desde **tu propio Fork**, abrí Estudio SLAM y elegí **Individual**.
2. Creá el recorrido y pulsá **Guardar recorrido**.
3. Pulsá **Preparar ZIP para publicar en GitHub** y descargá el archivo.
4. Abrí la carpeta `importar/` en **tu repositorio GitHub**.
5. Elegí **Add file → Upload files**, subí el ZIP **sin descomprimir** y guardá con **Commit changes**.
6. En la pestaña **Actions**, seguí el flujo **Importar ZIP de recorrido SLAM**.
7. Tu URL será:

```text
https://TU_USUARIO.github.io/TU_REPO/recorrido.html?id=ID_DEL_RECORRIDO
```

El workflow valida los archivos antes de publicarlos. Para actualizar un recorrido, subí un ZIP nuevo generado por el Estudio, conservando su identificador.

**No copies aquí ZIP de los recorridos de otras personas:** pueden contener modelos o imágenes privados. Los ZIP antiguos del laboratorio fueron eliminados de la rama principal.
