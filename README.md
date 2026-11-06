# WebAR · SLAM Lab

Laboratorio experimental de seguimiento espacial en navegadores, independiente de [webAR-QR](https://github.com/angelv-salazar/webAR-QR).

## Estado

**Prototipo técnico v0.1**. El código está publicado en este repositorio; la compatibilidad y estabilidad del seguimiento **deben verificarse en teléfonos reales**. No es todavía una aplicación de producción ni una garantía de funcionamiento universal.

Basado en **8th Wall Engine Binary** con SLAM (world tracking) y A-Frame/8-Frame. El motor binario se obtiene desde un CDN y está sujeto a su licencia propia; no se incluye ni se modifica el motor en este repositorio.

## Publicación con GitHub Pages

1. Abrir **Settings → Pages** en este repositorio.
2. En **Build and deployment**, seleccionar **Deploy from a branch**.
3. Seleccionar **main**, carpeta **/(root)** y guardar.
4. Una vez disponible la web, usar estas direcciones:
   - Inicio: https://angelv-salazar.github.io/webAR-SLAM-Lab/
   - Editor: https://angelv-salazar.github.io/webAR-SLAM-Lab/estudio.html
   - Prueba de cámara: https://angelv-salazar.github.io/webAR-SLAM-Lab/visor.html

GitHub Pages proporciona HTTPS, necesario para acceder a la cámara en teléfonos.

## Primera prueba: SLAM

1. Abrir **visor.html** desde un teléfono con Android/Chrome o iPhone/Safari y conexión a Internet.
2. Permitir el acceso a la cámara.
3. Mover el teléfono lentamente alrededor de un área del piso bien iluminada, con textura y objetos reconocibles.
4. **Tocar el suelo** en la pantalla para colocar el espécimen virtual.
5. Alejarse y caminar alrededor del espécimen sin mantener ningún marcador impreso en cámara.
6. Tocar de nuevo para cambiar la ubicación o **Recolocar** para quitar el objeto.
7. Usar **Detalles** para ver el diagnóstico.

Esta prueba **no utiliza marcadores**: posiciona un objeto sobre un plano horizontal virtual con seguimiento espacial. Si el motor estima mal el plano o pierde el tracking, el objeto puede deslizarse o desplazarse. El anclaje no persiste entre sesiones y no implementa VPS.

### Android, iPhone y equipos no compatibles

8th Wall utiliza su propio sistema SLAM para funcionar en más navegadores que WebXR inmersivo por sí solo. Eso no garantiza compatibilidad universal. Pueden existir limitaciones por hardware, permisos, versiones del sistema, navegadores embebidos, memoria, cámara, iluminación y conexión. En escritorio, el parámetro allowedDevices: any puede presentar una escena 3D de simulación: **eso no prueba SLAM físico**.

Si el visor falla, comparar con los [ejemplos oficiales de 8th Wall](https://github.com/8thwall/aframe-world-effects-example) y consultar la [documentación actual del motor](https://8thwall.org/docs/engine/overview).

## Editor experimental

Desde **estudio.html** se puede:

- Crear proyectos independientes con un GLB opcional.
- Ajustar la **dimensión máxima entre 10 y 300 cm**, rotación, desplazamiento y altura.
- Agregar nombre y texto descriptivo de hasta 500 caracteres.
- Ver una previsualización 3D con cuadrícula en metros.
- Guardar proyectos en **IndexedDB** del mismo navegador.
- **Probar en este navegador** desde el visor con el identificador local. Este modo no comparte archivos con otros equipos.
- Descargar **Preparar publicación ZIP**. Contiene la carpeta experiencias/<id>/, con config.json y modelo.glb si lo cargaste.

### Publicar una obra propia

1. Configurar y guardar la obra en el editor.
2. Descargar el ZIP de publicación.
3. Descomprimirlo y subir la carpeta experiencias/<id>/ a la rama main de este repositorio.
4. Abrir la dirección web del visor con el parámetro exp=<id> en el teléfono.

La geometría de ejemplo funciona sin GLB. Una vez subida la obra, su URL puede mantenerse fija aunque actualicemos config.json o modelo.glb.

**Importante:** GitHub Pages no puede acceder por sí solo al IndexedDB de otro dispositivo. Guardar un proyecto en el editor no publica automáticamente sus archivos. El proyecto original webAR-QR no se modifica.

## Diseño técnico

- index.html: pantalla inicial del laboratorio.
- estudio.html: editor y vista previa Three.js, almacenamiento IndexedDB, exportación ZIP con JSZip.
- visor.html: motor 8th Wall (@8thwall/engine-binary@1, módulo SLAM), 8-Frame/A-Frame, colocación tocando el suelo, renderizado de GLB o figura alternativa, botón recolocar y diagnóstico.
- experiencias/<id>/config.json: manifiesto publicado para cada obra.
- experiencias/<id>/modelo.glb: modelo opcional.

La escala se calcula a partir de la dimensión máxima de la caja envolvente del GLB. La escala física estimada por SLAM puede tener pequeñas variaciones. Las coordenadas X/Y/Z son desplazamientos relativos al punto seleccionado sobre el suelo.

## Licencia y atribución del motor

Este laboratorio utiliza el componente distribuido cerrado **8th Wall XR Engine Binary** bajo los términos de Niantic Spatial. La distribución de ese motor **no equivale a una licencia MIT para el SLAM**.

> This product includes the XR Engine software developed by Niantic Spatial, Inc.  
> Copyright © 2026 Niantic Spatial, Inc. All rights reserved.  
> License: https://github.com/8thwall/engine/blob/main/LICENSE

Consultar [licencia y atribuciones](https://8thwall.org/docs/open-source) y el [código del motor distribuido](https://github.com/8thwall/engine).

Se usan bibliotecas alojadas en CDN; para una instalación estable se recomienda fijar versiones probadas y, si corresponde, alojar localmente los recursos conforme a sus licencias.

## Próximos ensayos

- Comparar estabilidad del mismo GLB en Android Chrome y iOS Safari.
- Medir error y deriva al alejarse del punto de colocación.
- Investigar detección real de plano, anclajes y relocalización.
- Considerar un modo híbrido de referencia visual inicial + SLAM, sin confundir el QR de apertura con un anclaje espacial.
