# Estudio SLAM · Recorridos WebAR

**Editor de recorridos con marcadores personalizados, QR, modelos GLB y seguimiento espacial híbrido de 8th Wall.** Proyecto independiente del [Estudio WebAR-QR anterior](https://github.com/angelv-salazar/webAR-QR).

Este repositorio comenzó como un laboratorio de un único objeto colocado tocando el piso. Después de comprobar que **8th Wall + marcador + SLAM** permitía una colocación más estable en el teléfono de prueba, se integró el editor completo de recorridos del proyecto WebAR original.

## Abrir

- **Inicio:** https://angelv-salazar.github.io/webAR-SLAM-Lab/
- **Editor de recorridos (principal):** https://angelv-salazar.github.io/webAR-SLAM-Lab/estudio.html
- **Visor de recorridos:** https://angelv-salazar.github.io/webAR-SLAM-Lab/recorrido.html?id=ID_DEL_RECORRIDO
- **Editor experimental sin marcadores (conservado):** https://angelv-salazar.github.io/webAR-SLAM-Lab/estudio-libre.html
- **Prueba de colocación libre:** https://angelv-salazar.github.io/webAR-SLAM-Lab/visor.html
- **Prueba híbrida de un solo marcador:** https://angelv-salazar.github.io/webAR-SLAM-Lab/hibrido.html
- **Marcador de esa prueba:** https://angelv-salazar.github.io/webAR-SLAM-Lab/imprimir-hibrido.html

## Crear un recorrido

1. Abrir **estudio.html** desde una computadora.
2. Crear un recorrido y escribir su nombre.
3. Seleccionar **Agregar marcador** tantas veces como sea necesario.
4. Para cada marcador:
   - Cargar una **imagen cuadrada de alto contraste** (recomendado 1024 × 1024 px).
   - Validar su calidad y presionar **Generar marcador final**. El editor compone un PNG imprimible de **15 × 15 cm**, con un **QR que comparte la URL del recorrido**.
   - Cargar el modelo **.glb** de esa estación.
   - Ajustar posición X/Y/Z en cm, tamaño entre 1 y 60 cm, rotación y animaciones disponibles.
   - Escribir una descripción de hasta 500 caracteres (opcional).
   - Comprobar la vista previa con Three.js.
5. Guardar el recorrido. Los datos se guardan en **IndexedDB** de ese navegador, no en GitHub.
6. Para comprobar en **ese mismo navegador**, presionar **Probar con mi cámara**, que abre el visor con el parámetro preview=1.
7. Para utilizarlo en otros teléfonos, presionar **Preparar publicación**, guardar el ZIP y subir su carpeta recorridos/<id>/ a la rama main del repositorio, **manteniendo todas sus rutas**.
8. Esperar la publicación de GitHub Pages, abrir el enlace reservado y comprobar los marcadores impresos.

**No hay publicación automática desde el navegador**: es necesario subir el ZIP a GitHub o compartirlo con una herramienta que tenga permiso de escritura. No pongas tokens de GitHub en el código público.

### Importar proyectos del WebAR anterior

En Estudio SLAM está el botón **Importar recorridos del Estudio WebAR anterior**. Busca la base IndexedDB del antiguo editor **en ese mismo navegador y dispositivo**. Al elegir uno, copia sus modelos, imágenes, transformaciones y descripciones y **regenera los marcadores/QR** para la nueva ruta SLAM.

Los PNG impresos con QR para la URL antigua **no se redirigen** a la nueva experiencia; hace falta volver a imprimir los marcadores nuevos.

Los dos editores utilizan bases de datos diferentes para no sobrescribirse.

## ¿Qué hace el seguimiento híbrido?

- El image target de 8th Wall detecta una imagen impresa.
- La posición del modelo se establece mediante el marcador detectado.
- **SLAM sigue estimando la cámara y el espacio** cuando el marcador sale del encuadre; el modelo permanece en coordenadas del mundo.
- Al reaparecer la imagen, el anclaje se **corrige suavemente** con la nueva estimación del marcador.
- El visitante puede activar varias estaciones del recorrido sin cerrar la cámara.

En el visor se puede alternar entre **Ver último** y **Ver todo** (todos los marcadores ya reconocidos). Los modelos que nunca se han reconocido todavía no aparecen.

**Importante:** que el objeto siga visible no significa que haya un anclaje persistente perfecto. SLAM puede tener deriva, sobre todo al alejarse, girar bruscamente o atravesar zonas pobres en textura o luz. Los anclajes se pierden al cerrar/recargar la página.

### Limitaciones a ensayar

- El experimento de **un marcador** ya fue probado por el usuario en Android/Chrome; el **visor nuevo de múltiples marcadores** requiere una nueva prueba física.
- Aunque el editor conserva hasta 20 marcadores, ese número **no está validado como simultáneamente estable en el motor móvil**. Comenzar con dos o tres, comparar el rendimiento y aumentar progresivamente.
- No se garantiza funcionamiento en todos los Android o iPhone.
- No se calcula una malla 3D permanente de la sala ni un anclaje entre sesiones.
- Los GLB grandes pueden afectar la fluidez o la memoria.

## Archivos del proyecto

| Archivo | Función |
| --- | --- |
| index.html | Inicio y selección de modalidad |
| estudio.html | Editor **principal** de recorridos con múltiples marcadores |
| marker-composer.js | PNG de 15 cm con QR y archivo .patt heredado |
| marker-validation.js | Control de calidad de imágenes |
| image-targets.js | Conversión del PNG final a Image Target 8th Wall (PLANAR, JPEG gris 480 × 640) |
| recorrido.html | Interfaz móvil de recorridos SLAM |
| recorrido-slam.js | Seguimiento híbrido, posiciones independientes, GLB, animaciones y textos |
| estudio-libre.html | Versión conservada del primer editor de un objeto sin marcadores |
| visor.html | Colocación libre tocando el piso |
| hibrido.html | Prueba de un único marcador con SLAM |
| imprimir-hibrido.html | Marcador imprimible de la primera prueba |
| diagnostico.html | Diagnóstico de cámara/SLAM |

### Estructura del ZIP de publicación

La carpeta que genera Estudio SLAM contiene, para cada marcador:

- recorridos/<id>/manifest.json
- recorridos/<id>/targets/marcador-01-luminance.jpg
- recorridos/<id>/targets/marcador-01.json
- recorridos/<id>/modelos/marcador-01.glb
- recorridos/<id>/imprimir/marcador-01-15cm.png
- recorridos/<id>/patrones/marcador-01.patt (compatibilidad heredada, **no usado por 8th Wall**)

El recorte PLANAR se obtiene **del propio PNG imprimible**, con un área centrada de proporción 3:4, interpolación a 480 × 640 píxeles y conversión a escala de grises, en el formato del [image-target-cli oficial](https://github.com/8thwall/8thwall/tree/main/apps/image-target-cli).

La **URL de todos los QR del recorrido es la misma**, con un identificador reservado. Cada imagen impresa produce un reconocimiento diferente, que activa su GLB y sus propios datos.

## Licencia y dependencia

El motor utiliza el **8th Wall Engine Binary**, que proporciona SLAM. Es un componente distribuido de código cerrado y sujeto a su licencia, diferente de los componentes abiertos del ecosistema 8th Wall.

> This product includes the XR Engine software developed by Niantic Spatial, Inc.  
> Copyright © 2026 Niantic Spatial, Inc. All rights reserved.  
> License: https://github.com/8thwall/engine/blob/main/LICENSE

Referencia oficial: [8th Wall Engine overview](https://8thwall.org/docs/engine/overview), [XR8.XrController.configure](https://8thwall.org/docs/api/engine/xrcontroller/configure).

## Prueba recomendada

Comenzar con un recorrido que tenga **dos marcadores diferentes** y dos GLB livianos. Imprimir los marcadores en papel mate a escala real 15 × 15 cm; colocarlos sobre superficies con buena iluminación. Reconocer el primero, alejarse, volver a enfocarlo y comprobar corrección del anclaje; repetir con el segundo y usar **Ver todo**. Anotar estabilidad, carga, saltos y pérdida de reconocimiento.

Una prueba con un solo marcador no garantiza que múltiples marcadores y modelos sean igualmente estables. El proyecto original webAR-QR queda intacto.
