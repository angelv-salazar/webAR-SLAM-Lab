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

## Limpieza del Estudio y coordenadas (noviembre de 2026)

Se conserva el encabezado **Estudio SLAM**, con una descripción clara de su función como espacio de creación de experiencias AR con objetos 3D. Se eliminan el distintivo redundante «8th Wall + SLAM», el botón de importar proyectos del editor WebAR anterior y la exportación separada de descripciones JSON. La prueba local de cámara permanece como **Vista previa AR (este dispositivo)** y necesita que los archivos estén guardados en el mismo navegador.

Los controles de posición se muestran como **X (horizontal), Y (profundidad) y Z (altura)**. Para no romper recorridos históricos, el formato guardado todavía utiliza sus propiedades anteriores (`x` horizontal, `y` altura, `z` profundidad); el Estudio presenta las etiquetas y los campos en el orden artístico XYZ solicitado, y el visor interpreta correctamente el formato histórico. La vista previa 3D y la publicación permanecen sin otros cambios.

El nuevo máximo de tamaño es **100 cm**, sin recortar automáticamente obras ya guardadas de mayor tamaño. Si se modifica expresamente el control de tamaño de una obra histórica de 144,5 cm, a partir de entonces su máximo será 100 cm. Ningún recorrido público cambia hasta que se exporta y sube un ZIP actualizado.

## Animaciones experimentales de objetos 3D

El selector **Animación** del Estudio ofrece ahora dos combinaciones adicionales, además de rotación continua, flotación, pulsación y animaciones incluidas en el GLB:

- **Órbita irregular · flotar y balancearse** (`animation: "orbit"`): combina pequeños desplazamientos laterales alrededor de la posición definida, levitación suave, balanceo y oscilaciones de giro. El radio de los movimientos locales se adapta al tamaño y no supera 6 cm en los ejes horizontales.
- **Metamorfosis · pulsos asimétricos** (`animation: "metamorphosis"`): mezcla pulsaciones de diferente frecuencia en los ejes X/Y/Z, inclinación lenta y una oscilación vertical. **No deforma vértices ni reentrena el GLB**: cambia temporalmente sus proporciones por escala no uniforme.

El Estudio y el visor AR comparten las fórmulas del módulo `object-animations.js`. Las transformaciones actúan únicamente sobre un grupo **dentro del objeto anclado**, nunca sobre el `root` ni el sistema de seguimiento espacial de 8th Wall. En el visor, los gestos de pinza siguen limitando la escala total por eje a **50–150 %**. Las nuevas opciones no alteran recorridos antiguos si no se seleccionan y no modifican los marcadores físicos.

Para probarlas, elegí un marcador en **Vista previa y transformación → Animación** y observá su respuesta en el visor 3D del Estudio. Para que la animación nueva aparezca en un teléfono ajeno al editor, guardá el recorrido, descargá el ZIP mediante **Preparar publicación** y subilo a la carpeta `importar/` de GitHub, como en las ediciones anteriores. No hace falta reimprimir el QR.

### Ajustes de interfaz de esta etapa

Los controles de transformación llevan ahora solo las etiquetas **X, Y, Z**, sin texto junto a cada eje. Se retiró la explicación redundante bajo el control de tamaño. En el bloque del QR permanecen el título y la frase **«Se asigna automáticamente al crear el recorrido.»**; ya no se imprime la dirección web ni el estado borrador junto al código. Se mantiene intacto el pie de página de Estudio WebAR.

## Rotaciones de dos ejes y textos neutros

El panel **Transformar objeto** tiene ahora dos deslizadores independientes:
- **Rotación horizontal:** giro alrededor del eje vertical de la escultura (Y en la escena 3D; conserva el campo histórico `rotation` y `rotationDeg`).
- **Rotación vertical:** inclinación y volteo alrededor del eje X de la escultura, de −180° a +180° (nuevo campo `rotationVertical` y `verticalRotationDeg`).

Las dos rotaciones se aplican tanto a la vista previa 3D como al visor del teléfono mediante la misma composición Euler `YXZ`, y se combinan con las animaciones existentes. La pose `root` del marcador y los límites de estabilidad SLAM **no cambian**. Los recorridos antiguos sin el nuevo campo se interpretan con rotación vertical de 0°. Para publicar un cambio, guarda el recorrido y sube el ZIP de publicación habitual; no necesitas imprimir marcadores nuevos.

Se eliminó el aviso técnico sobre IndexedDB debajo de la lista de marcadores y se simplificó su descripción a: «Cada imagen activa un objeto independiente con 8th Wall. Todos los QR comparten la URL del recorrido.» La interfaz del Estudio y el visor, los mensajes de grabación y las validaciones utilizan español latinoamericano neutro.

## Selector de recorridos y creación (noviembre de 2026)

El inicio del Estudio muestra la sección **1. Recorridos** de forma contextual:
- Si ya existen recorridos guardados en el navegador, el selector **Elegir recorrido** muestra sus nombres. Al seleccionar uno, no se repiten sus campos de nombre y descripción.
- El botón **+ Nuevo recorrido** o la opción equivalente del selector inicia un recorrido nuevo. **Solo entonces** se muestran **Nombre del recorrido** y **Descripción (opcional)**.
- Al guardar por primera vez (con un nombre no vacío), esos campos se ocultan y el recorrido queda seleccionado por nombre en la lista. Se mantienen los controles de guardado de cambios, respaldo ZIP, marcadores y publicación.
- Si todavía no hay recorridos guardados, los campos de creación aparecen directamente, sin mostrar un selector vacío.
- El título del apartado 3 es **Imagen, QR y modelo GLB**, y se retira la etiqueta **En vivo** de la vista previa. No se alteró el funcionamiento del seguimiento SLAM ni el visor del teléfono.

La identidad tipográfica actual usa Chakra Petch para títulos y Saira para el resto de los textos.

## Identidad tipográfica: Chakra Petch + Saira

La interfaz del **Estudio SLAM y del visor AR para celular** utiliza la siguiente combinación de tipografías libres:

- **Chakra Petch:** títulos principales, encabezados de secciones, títulos de las obras y textos de identificación.
- **Saira:** descripciones, controles, botones, opciones de formulario y mensajes de estado.
- **Monoespaciada del sistema:** solo para el diagnóstico técnico del visor.

Se cargan desde la hoja CSS oficial de Google Fonts; cuando no hay conexión, el navegador usa automáticamente tipografías alternativas de sistema. Los archivos de las fuentes no se distribuyen en este repositorio. Ambas familias permiten uso web bajo SIL Open Font License 1.1.

Se retiraron la prueba de Klavika, su botón de carga ZIP y su módulo `font-preview.js`. El Estudio también solicita la eliminación de su antigua base local de fuentes `estudio-slam-klavika-local-preview` sin modificar los recorridos guardados en otra base IndexedDB.

## Diseño visual Biomech / Toxic Chrome (primera versión en vivo)

La interfaz del **Estudio SLAM** utiliza temporalmente una capa visual llamada `theme-biomech.css`, inspirada en el concepto seleccionado de membranas biomecánicas oscuras, chrome semitransparente, contornos perforados y acentos verde ácido. No modifica los datos de los recorridos, las imágenes, los QR, los GLB ni el visor AR móvil.

- Fondo: `assets/biomech-weave.svg`, con filamentos, membranas huecas y estructuras metálicas abstractas originales.
- Marcos de módulos: `assets/biomech-card.svg`, superpuesto mediante pseudoelementos para crear bordes y ganchos orgánicos sin tapar campos ni botones.
- Estilos: paneles oscuros translúcidos, encabezados Chakra Petch, textos Saira, controles metálicos y estados de validación de alto contraste.
- La vista 3D del Estudio tiene un fondo oscuro y una retícula verde; el modelo, sus transformaciones y la navegación OrbitControls no se alteraron.
- La hoja incluye diseños para pantallas medianas, móviles y preservación de impresión de marcadores de 15 × 15 cm.

**Reversibilidad:** la hoja temática se enlaza desde `estudio.html` como `<link rel="stylesheet" href="./theme-biomech.css?v=1">`. Quitar ese enlace devuelve el diseño CSS previo, con la salvedad de que la escena 3D se oscureció mediante un cambio separado de sus valores de color. No se alteró `recorrido.html` ni `recorrido-slam.js`.

Esta es una primera traducción funcional del render conceptual al navegador, pendiente de la evaluación visual en el equipo del usuario.

## Crear un recorrido

1. Abrir **estudio.html** desde una computadora.
2. Crear un recorrido y escribir su nombre.
3. Seleccionar **Agregar marcador** tantas veces como sea necesario.
4. Para cada marcador:
   - Cargar una **imagen cuadrada de alto contraste** (recomendado 1024 × 1024 px).
   - Validar su calidad y presionar **Generar marcador final**. El editor compone un PNG imprimible de **15 × 15 cm**, con un **QR que comparte la URL del recorrido**.
   - Cargar el modelo **.glb** de esa estación.
   - Ajustar X e Y sobre el plano y Z como altura vertical, tamaño de 1 a 100 cm, rotación y animaciones disponibles.
   - Escribir una descripción de hasta 500 caracteres (opcional).
   - Comprobar la vista previa con Three.js.
5. Guardar el recorrido. Los datos se guardan en **IndexedDB** de ese navegador, no en GitHub.
6. Para comprobar en **ese mismo navegador**, presionar **Vista previa AR (este dispositivo)**, que abre el visor con el parámetro `preview=1` y utiliza la cámara de ese dispositivo.
7. Para utilizarlo en otros teléfonos, presionar **Preparar publicación** y guardar el ZIP. Entrar a la carpeta [importar/](https://github.com/angelv-salazar/webAR-SLAM-Lab/tree/main/importar), elegir **Add file → Upload files** y subir **únicamente ese ZIP**. GitHub Actions lo validará y descomprimirá automáticamente en recorridos/<id>/.
   También es posible descomprimirlo y subir manualmente sus archivos respetando las rutas originales.
8. Esperar la publicación de GitHub Pages, abrir el enlace reservado y comprobar los marcadores impresos.

## Probar tamaños grandes y actualizar un recorrido ya publicado

En Estudio SLAM seleccioná Susi, Rosi o Ico y cambiá **Tamaño del objeto**: los nuevos ajustes permiten **1 a 100 cm (1 metro)**, tanto con el deslizador como con el campo numérico. Los modelos conservan sus proporciones. Los controles visuales ahora son **X y Y sobre el suelo, Z para altura**; internamente se mantienen las coordenadas antiguas del manifiesto para que recorridos previamente publicados conserven su orientación. Para encuadrar un objeto grande utilizá **Encuadrar modelo 3D**. **Los tamaños históricos superiores a 100 cm se conservan al editar otras propiedades**; solo bajan si el usuario ajusta expresamente el tamaño.

Para aplicar cambios al recorrido publicado:

1. Cambiá los tamaños deseados y pulsá **Guardar recorrido**.
2. Pulsá **Preparar publicación** para generar un ZIP nuevo con un sufijo temporal; no es necesario regenerar los marcadores ni cambiar los GLB.
3. En GitHub abrí [importar/](https://github.com/angelv-salazar/webAR-SLAM-Lab/tree/main/importar), elegí **Add file → Upload files**, subí ese **nuevo ZIP** y pulsá **Commit changes**.
4. La automatización importará solo el ZIP nuevo o modificado, comprobará que el manifiesto tenga el mismo identificador y **actualizará el recorrido existente manteniendo la misma URL/QR**.
5. Cuando GitHub Pages complete el despliegue, recargá el visor en el teléfono (o añadí un parámetro de versión como `&v=2`).

**Atención:** cambiar solo los datos guardados en el navegador del Estudio no modifica la versión pública hasta que se suba el ZIP nuevo. El límite de 1 m se aplica a los nuevos cambios de tamaño del Estudio y no garantiza estabilidad en todas las salas o celulares: hay que probar iluminación, distancia y deriva SLAM.

**No hay publicación automática desde el navegador**: basta con subir **un solo ZIP** a importar/ en GitHub. La automatización lo extrae y solicita la reconstrucción de Pages. También podés pedir que se verifique el estado después de subirlo. No pongas tokens de GitHub en el código público.

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

## Grabar videos MP4 del recorrido (un solo botón)

En el visor, el botón rojo **● Grabar** inicia una grabación de la cámara más los modelos 3D renderizados. **■ Detener** termina la captura y, cuando 8th Wall finaliza el archivo, inicia automáticamente la descarga de un **MP4** identificado con el ID del recorrido y la fecha.

- Se utiliza el **grabador nativo de XR8** integrado con el compositor de cámara/AR, en vez de otro renderizador de video.
- Máximo de **60 segundos** y dimensión de salida hasta **720 px**, para limitar el consumo en teléfonos durante el seguimiento SLAM.
- **Sin grabación de micrófono** ni solicitud de permiso para audio.
- El botón queda desactivado mientras no esté lista la cámara o mientras se procesa un video. Un clip nuevo se puede iniciar después del anterior.
- **Android:** el navegador inicia una descarga; buscar el MP4 en **Descargas/Archivos**. La ubicación final depende de las preferencias del navegador.
- **iPhone/iPad:** se intenta descargar el MP4 al detener, pero Safari puede exigir una intervención del visitante para guardarlo en Fotos. En ese caso, el mismo botón muestra **Guardar video**, que activa la hoja nativa de compartir para que la persona elija **Guardar video**. Los navegadores no pueden forzar que se guarde silenciosamente en la galería Fotos.
- Si aparece un error o el navegador no ofrece la función, los marcadores y las esculturas siguen funcionando normalmente.

**Importante:** comprobar en el teléfono real que el archivo incluye tanto el fondo de cámara como los GLB. Si el SDK cambia o los permisos del navegador bloquean la grabación, la interfaz muestra el motivo. No hace falta volver a subir el ZIP ni imprimir marcadores.

## Manipulación táctil directa (sin modo exploración)

Cuando un marcador activa una escultura en el visor, se puede interactuar **tocando directamente la geometría del objeto**, sin activar ningún modo ni control adicional:

- **Arrastrar con un dedo:** rotar el modelo en sus ejes vertical y horizontal, manteniendo su posición en el espacio.
- **Pellizcar con dos dedos:** modificar temporalmente la escala **entre el 50 % y el 150 %** del tamaño configurado en Estudio SLAM. En esculturas con animación de pulsación también se limita la escala total a ese rango.
- **Soltar los dedos:** la escultura conserva su rotación y escala ajustadas mientras esté abierta esa sesión del recorrido.
- **Volver a reconocer el marcador:** continúa funcionando el reanclaje automático de posición y orientación del marcador. Los gestos no alteran las coordenadas X/Y/Z ni la escala original definida en el Estudio.
- **Reiniciar la página:** restaura la escala al 100 % y la orientación táctil a su estado inicial. El modelo y su tamaño original publicado no cambian.

Para que una escultura con rotación automática (como Susi) no compita con el gesto del usuario, la rotación automática se detiene durante el contacto y unos segundos después.

**Precisión técnica:** las transformaciones del visitante están en un nodo hijo diferente del anclaje 8th Wall. El usuario puede inspeccionar el modelo, pero **no arrastrarlo ni desplazar su marcador**. En móviles la compatibilidad de gestos debe comprobarse físicamente con la cámara y los GLB.

## Estabilidad equilibrada (modo predeterminado, ajustado para exteriores)

Después de comprobar que 700 ms generaban parpadeos y que la versión de 6,5 s con 1,25 m resultaba más estable, ampliamos la tolerancia para una experiencia en un espacio abierto y en relación con el paisaje:

- **Hasta 10 segundos sin detectar un marcador**: la escultura permanece visible mientras no supere las condiciones de seguridad espacial.
- **2 metros de desplazamiento de cámara** respecto de su última posición validada al reconocer ese marcador.
- **2 metros de alejamiento radial adicional** respecto de la distancia cámara–marcador registrada mientras se reconocía el papel.
- **320 ms de confirmación** cuando se supera un límite espacial, para evitar cortes por una lectura aislada.
- **Salto extremo de 3,5 m** estimados: se oculta inmediatamente porque puede indicar una pérdida súbita del seguimiento.
- **Volver a enfocar el marcador**: reaparece y se reancla automáticamente, sin pulsar botones. Conserva la escala y rotación táctiles de la sesión.

La primera condición cumplida (tiempo máximo o límite espacial) oculta solo esa escultura. Ninguno de estos valores es un perímetro físico absoluto: dependen de la posición estimada por SLAM, que puede derivar si no se ve el marcador. El temporizador impide que una escultura persista indefinidamente en caso de pérdida de referencia.

Los modos experimentales se comparan con el parámetro URL: `&stability=balanced` (predeterminado si se omite), `&stability=strict` (700 ms) y `&stability=legacy` (persistencia anterior sin límite de tiempo). No se modificaron el tamaño de los GLB, la grabación de video, los gestos táctiles ni los QR/ZIP.

## Estabilidad estricta tras revisar el video del 7 de noviembre de 2026

En una grabación de prueba (~20 segundos) se observó que la escultura permanecía anclada a la impresión sobre la mesa durante los primeros 7 segundos, pero entre los segundos 10 y 19 seguía apareciendo en paredes y puerta cuando la imagen ya no se reconocía. El problema observado es compatible con deriva o pérdida de localización de cámara SLAM, y **el perímetro de 1 m, al depender de la misma estimación espacial, no pudo garantizar que se ocultara**.

Por eso, el visor usa **estabilidad estricta** por defecto: cuando pasan **700 ms sin una actualización válida de un marcador**, la escultura de ese marcador queda **oculta**, en lugar de seguir flotando con el teléfono. Se mantiene el anclaje en memoria, pero **solo reaparece después de volver a reconocer su propio marcador** y acumular las muestras coherentes de la confirmación temporal. Al reaparecer, se reancla automáticamente, conservando las interacciones táctiles de esa sesión.

Este es un compromiso deliberado: **reduce los objetos flotantes, pero limita cuánto tiempo puede rodearse una escultura sin tener su marcador a la vista**. No equivale a solucionar SLAM de forma permanente. Para comparar sin cambiar ningún archivo, añadí `&stability=legacy` a la URL del recorrido: utiliza el comportamiento anterior, con conservación de anclajes y botón `Zona +1 m / +2 m / Sin límite`. Sin ese parámetro, el modo estricto es el predeterminado y ese botón redundante se oculta.

No requiere modificar el ZIP, los GLB ni los QR existentes.

## Zona de confianza espacial para evitar arrastre entre estaciones

En el visor de recorridos, cada imagen impresa sigue creando un anclaje independiente y se reancla automáticamente al volver a reconocerla.

Sin el marcador visible, **SLAM no conoce el error de posición real respecto del papel**. Por eso el sistema incluye una protección aproximada: memoriza la **distancia de la cámara al centro del marcador** mientras está reconocido. Una vez que se pierde, conserva el modelo mientras la cámara no se aleje radialmente más de **1 metro adicional** respecto de esa última distancia confirmada.

- **1 m (predeterminado):** si el teléfono se aleja más de 1 m adicional desde la última distancia de reconocimiento, la obra se oculta. No mueve otros anclajes.
- **2 m:** mayor libertad de desplazamiento antes de ocultarse, pero permite más deriva.
- **Sin límite:** desactiva la protección y permite comparar con el seguimiento anterior.

La opción se cambia desde el botón **Zona +1 m** del visor; no hace falta generar ZIP ni reimprimir el marcador. Se usa distancia **radial**, no distancia total caminada, para permitir rodear la escultura a una distancia similar. Una escultura de 1,45 m se mide desde el centro de su marcador, **no desde el tamaño ni la geometría del GLB**.

Cuando una estación sobrepasa la zona, **queda oculta hasta que se vuelve a reconocer su propio marcador**. Entonces reaparece y se reancla automáticamente, sin pulsar ningún botón. El sistema no conoce la ubicación absoluta real del papel cuando no lo ve; por tanto, el límite de 1 m es una regla preventiva basada en el desplazamiento estimado de la cámara, **no una medición exacta de un metro de deriva física**. Si la propia localización SLAM falla sin que cambie la distancia radial estimada, el límite no garantiza detectar ese fallo.

## Evitar confusión entre marcadores (modo recorrido protegido)

El recorrido usa un guardián de anclajes independientes (marker-guard.js):

1. **Identidad comprobada:** requiere al menos tres actualizaciones geométricas coherentes durante aproximadamente 180 ms antes de activar o recuperar una estación. Una falsa detección muy breve no cambia de obra.
2. **Cada estación tiene su propio anclaje:** el visor muestra por defecto **todos los marcadores ya reconocidos**; no mueve otros anclajes cuando aparece uno nuevo. El botón **Ver último** permite aislar solo el espécimen activo.
3. **Protección frente a confusiones espaciales:** si dos marcadores están siendo reconocidos al mismo tiempo y el motor atribuye a uno una pose a menos de unos 19 cm del anclaje activo del otro, se descarta esa lectura. Los anclajes antiguos no bloquean el reanclaje: pueden haber derivado.
4. **Saltos e incoherencias:** rechaza actualizaciones individuales con movimientos o giros exagerados.
5. **Reanclaje automático:** al volver a reconocer un marcador mediante varias muestras coherentes, el visor actualiza automáticamente la posición, orientación y escala de **ese** modelo, sin botón. La posición anterior se sustituye para evitar que la obra se deslice arrastrándose por la sala. Mientras el marcador sigue visible, las correcciones normales se suavizan.

### Evitar que el QR compartido confunda al reconocimiento

En Test_1 los tres marcadores imprimibles contienen el mismo QR para abrir la misma URL. El target original de 8th Wall incluía la mayor parte de ese QR en la zona de reconocimiento: era una región visual casi idéntica en todos ellos.

El modo predeterminado genera en memoria, al abrir el recorrido, **una región de seguimiento exclusiva situada a la izquierda de la impresión, sin el QR**. El QR impreso y la imagen completa NO cambian; tampoco hace falta volver a publicar el ZIP. Se corrige automáticamente el desplazamiento del centro de ese recorte para mantener el contorno de calibración de 15 × 15 cm alineado con el papel y conservar los parámetros X/Y/Z del editor.

- Modo nuevo: URL normal del recorrido (o \`?target=unique\`).
- Prueba A/B del reconocimiento anterior: agregar \`&target=original\` a la URL del recorrido.

**Límites:** los filtros reducen los falsos cambios, pero no demuestran certeza absoluta ni reconstruyen una cartografía global permanente. La calidad de las imágenes, la iluminación, la textura de la sala y el movimiento de la cámara siguen influyendo en SLAM. Si los marcadores van a estar a menos de 19 cm, habrá que ajustar el umbral de proximidad.

## Licencia y dependencia

El motor utiliza el **8th Wall Engine Binary**, que proporciona SLAM. Es un componente distribuido de código cerrado y sujeto a su licencia, diferente de los componentes abiertos del ecosistema 8th Wall.

> This product includes the XR Engine software developed by Niantic Spatial, Inc.  
> Copyright © 2026 Niantic Spatial, Inc. All rights reserved.  
> License: https://github.com/8thwall/engine/blob/main/LICENSE

Referencia oficial: [8th Wall Engine overview](https://8thwall.org/docs/engine/overview), [XR8.XrController.configure](https://8thwall.org/docs/api/engine/xrcontroller/configure).

## Prueba recomendada

Comenzar con un recorrido que tenga **dos marcadores diferentes** y dos GLB livianos. Imprimir los marcadores en papel mate a escala real 15 × 15 cm; colocarlos sobre superficies con buena iluminación. Reconocer el primero, alejarse, volver a enfocarlo y comprobar corrección del anclaje; repetir con el segundo y usar **Ver todo**. Anotar estabilidad, carga, saltos y pérdida de reconocimiento.

Una prueba con un solo marcador no garantiza que múltiples marcadores y modelos sean igualmente estables. El proyecto original webAR-QR queda intacto.
