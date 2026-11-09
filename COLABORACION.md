# Estudio SLAM · Trabajo colaborativo y publicación

**Editor:** https://angelv-salazar.github.io/webAR-SLAM-Lab/estudio.html  
**Proyecto de Supabase:** https://supabase.com/dashboard/project/kflgqbqbpzhxmiyovsvg  
**Código:** https://github.com/angelv-salazar/webAR-SLAM-Lab

## Elegir entre recorrido individual y colectivo · v11

La portada de Estudio SLAM ahora muestra dos modos claramente separados:

**Individual**
- No exige iniciar sesión, Supabase ni invitar a otras personas.
- «1. Recorridos · individuales»: crear un nombre, escribir una descripción,
  añadir marcadores, GLB, animaciones y guardar en este navegador.
- «Vista previa AR (este dispositivo)» utiliza el borrador guardado en
  IndexedDB. El botón «Preparar ZIP para publicar en GitHub» produce la
  versión independiente; ese ZIP aún se sube a GitHub manualmente.
- Los proyectos individuales se mantienen al pasar a Colectivo.

**Colectivo**
- En «Colaboración → Administración de recorridos», crear una sola vez
  el proyecto compartido (nombre, descripción, invitación).
- Al seleccionar «Mis recorridos como coordinador» se conecta
  automáticamente un borrador local al **mismo identificador del proyecto
  Supabase**. No es necesario volver a nombrar ni crear el recorrido en
  «1. Recorridos».
- Un organizador puede crear marcadores propios con «+ Agregar marcador»
  y guardarlos con «Guardar esta obra en la nube». También puede recibir
  marcadores de invitados. Las obras propias aparecen en «Aportaciones
  en la nube» junto a las ajenas.
- Una vez guardadas en la nube, «Descargar marcador PNG» y «Generar enlace
  de prueba AR» quedan disponibles para cada obra.
- «Cargar obras recibidas para editar» es **opcional**: si aún no hay aportes,
  el editor igualmente permite crear la primera obra del coordinador.
- Cambiar a Individual no elimina el proyecto compartido ni lo despublica.
  «Cerrar acceso de coordinación» también devuelve el editor al modo Individual.

**Mover una obra local a un colectivo:** al entrar por primera vez en un
proyecto diferente, Estudio ofrece **copiar** las obras individuales que ya
tengan imagen o GLB. La copia recibe el identificador del recorrido compartido;
el borrador individual original se conserva. Se solicita confirmación y se
evita sobrescribir aportaciones ya presentes en el colectivo. Después de
copiar, guardar la aportación en la nube para que aparezca y pueda probarse.

**Diferencia entre guardados:**
- «Guardar recorrido» / «Guardar mi borrador»: solo IndexedDB, este navegador.
- «Guardar esta obra en la nube» / «Guardar cambios en la nube»: Supabase.
- «Publicar recorrido»: después de guardar todo en la nube, activa la versión
  pública para visitantes.

Para la primera publicación individual totalmente automática todavía se
requiere un flujo adicional; el recorrido individual conserva la prueba local
y la exportación a GitHub que ya tenía antes.

## Crear un recorrido colectivo (procedimiento principal)

**Un recorrido colectivo se crea únicamente en la parte superior del Estudio:**

1. Abrir **Colaboración → Administración de recorridos** con el correo de
   coordinador verificado.
2. Escribir el **nombre del nuevo recorrido colectivo** y, si se desea,
   una **descripción** de hasta 500 caracteres.
3. Pulsar **Crear recorrido colectivo e invitación**.
4. En **Mis recorridos como coordinador**, seleccionar el proyecto creado.
5. Pulsar **Copiar invitación para artistas**, compartir el enlace y esperar
   sus aportaciones. Cada artista participa sin cuenta GitHub.
6. Verificar las obras en la nube y pulsar **Publicar recorrido**. Después
   descargar los PNG e imprimirlos a 15 × 15 cm, escala 100 %.

**No se necesita crear el mismo recorrido en «1. Recorridos».** Esa sección
gestiona borradores en el navegador actual (IndexedDB), útiles para pruebas
individuales, ajustes o importar obras del colectivo. El botón
**Eliminar borrador** solo afecta a la copia local, no a Supabase.

## Eliminar un recorrido colectivo completo

Solo aparece para un coordinador verificado que haya seleccionado uno de
**Mis recorridos como coordinador**. El botón está en **Colaboración →
Administración del recorrido colectivo → Eliminar recorrido colectivo
definitivamente**.

- La persona coordinadora debe escribir **el nombre exacto del recorrido** y
  confirmar la eliminación una segunda vez.
- El backend verifica la sesión de correo y la propiedad del proyecto,
  antes de eliminar archivos.
- Se borran las aportaciones, los miembros, la invitación, los enlaces de
  prueba individual, los archivos privados y los archivos publicados en
  Supabase. La eliminación se hace mediante Storage API y cascadas de DB.
- Los otros proyectos del coordinador no se modifican. Los borradores de
  otros navegadores no se pueden borrar remotamente.
- Tras eliminarlo, el QR público dejará de funcionar (puede persistir
  una copia temporal en cachés). Los materiales descargados por terceros
  no pueden revocarse. Si el recorrido se publicó también manualmente
  en GitHub usando un ZIP, ese paquete GitHub debe eliminarse por separado.

**Advertencia:** la eliminación es irreversible. Descargar previamente un
respaldo de los GLB y marcadores si se quieren conservar.

## Edición curatorial de obras invitadas (sin duplicarlas)

El coordinador puede corregir una obra original de un invitado: GLB, imagen,
posición, escala, rotación, animación o descripción, sin perder el nombre del
autor ni generar un nuevo identificador.

1. Abrir **Colaboración**, entrar como coordinador y elegir el recorrido.
2. Si ya se publicó y está cerrado, pulsar **Reabrir aportaciones**.
3. Pulsar **Cargar obras del recorrido para editar**. Este paso importa
   todos los archivos desde Supabase a un borrador del editor local. Si hay
   cambios locales sin guardar, la aplicación solicitará confirmación
   antes de reemplazarlos.
4. En el listado **2. Marcadores del recorrido**, seleccionar la obra
   deseada. El selector **Obra del editor a guardar** de Colaboración
   acompaña esa selección.
5. Ajustar modelo, imagen, descripción o controles de transformación,
   y utilizar **Guardar recorrido** para conservar la copia local.
6. En Colaboración, pulsar **Guardar cambios en la nube**. El botón aparece
   para una obra ya existente en el recorrido y actualiza **la fila original**
   en la base de datos; mantiene el mismo \`user_id\`, \`project_id\`,
   \`source_entry_id\`, nombre de autor y rutas de archivos originales.
   No inserta una aportación nueva.
7. **Generar enlace de prueba AR** para comprobar los cambios desde el celular.
   Cuando esté listo todo el recorrido, **Publicar recorrido** nuevamente.
   El enlace público y los QR conservan su identidad.

### Copias accidentales del editor anterior

Las versiones antiguas podían crear otra aportación del coordinador con el mismo
\`source_entry_id\` que una obra invitada. La interfaz ahora:

- Bloquea nuevas duplicaciones en PostgreSQL, aunque se use una versión antigua.
- Cuando se pulsa **Cargar obras del recorrido para editar**, prioriza la obra
  **original del invitado** para el editor y no importa su copia adicional.
- Muestra **Copias duplicadas detectadas** al coordinador; este puede
  pulsar **Eliminar solo la copia**, confirmando expresamente la operación.
- La copia solo puede eliminarse mientras el recorrido esté abierto. Se conserva
  intacta la aportación del artista. **Los ajustes exclusivos de la copia se
  perderán**, por lo que conviene reproducir antes cualquier corrección deseada
  usando **Guardar cambios en la nube** sobre la obra original.
- La publicación automática rechaza los marcadores duplicados hasta que sean
  revisados. Una vez eliminada la copia, **Publicar recorrido** otra vez
  actualiza el contenido público conservando su URL y QR.

No se borran copias automáticamente ni se modifican las publicaciones
existentes al instalar esta actualización.

El botón **Guardar esta obra en la nube** sigue sirviendo para el primer envío
de una obra propia. El editor evita utilizarlo sobre una obra de otro autor,
porque eso anteriormente podía generar una copia bajo la cuenta del coordinador.

**Permisos:** los artistas invitados siguen sin poder editar aportaciones de
otras personas. El coordinador puede sobreescribir archivos de un invitado solo
mientras el recorrido está abierto; una protección adicional de PostgreSQL
impide transferir la autoría o los identificadores originales. Los archivos
de trabajo permanecen en el bucket privado.

**Observación:** si el invitado mantiene una versión local anterior y la vuelve
a enviar después, puede sobrescribir la corrección del coordinador. Conviene
coordinar las revisiones y republicar una vez aprobadas las obras.

La sección antigua **«Pruebas y publicación»** ya no se muestra en la columna
Recorridos, para ninguno de los modos. Las pruebas individuales y la
publicación colectiva están reunidas en **Colaboración**. El ZIP para GitHub
sigue disponible dentro de la opción desplegable de respaldo.

## Publicación definitiva con un clic (coordinador)

**Esta es ahora la forma principal de publicar.** La página del visor WebAR
sigue alojada en GitHub Pages; los modelos y marcadores de la publicación
automática se alojan en un bucket público de Supabase.

1. Abrir Estudio SLAM, desplegar **Colaboración** y acceder con el correo
   autorizado como coordinador.
2. Elegir el recorrido compartido. Usar **Actualizar aportaciones** para
   comprobar que todos los artistas hayan guardado su versión más reciente
   con **Guardar esta obra en la nube**.
3. En **Publicación del recorrido colectivo**, pulsar **Publicar recorrido**.
   Confirmar. El sistema copia los GLB y PNG definitivos al almacenamiento
   público y activa el manifiesto solo después de completar todos los archivos.
4. El sistema muestra el **QR final**, el enlace compartible y un botón
   **Descargar todos los marcadores (.zip)**. Imprimir cada PNG a **15 × 15 cm,
   escala 100 %, sin ajustar a página**.
5. Abrir el QR integrado en cualquier marcador desde un celular. El enlace
   del recorrido se mantiene estable en todas las publicaciones posteriores.

No es necesario exportar ZIP, cargar archivos a GitHub ni esperar un despliegue
de GitHub Pages al publicar una nueva versión.

Al publicar se **cierran automáticamente las aportaciones**, para obtener una
instantánea coherente. Si luego se necesita actualizar un modelo, posición,
animación, imagen o texto:

1. Pulsar **Reabrir aportaciones**.
2. Pedir a los artistas que guarden su nueva versión en la nube.
3. Pulsar **Publicar recorrido** otra vez. Se reemplaza el manifiesto público,
   conservando la misma URL y los mismos QR si la imagen de reconocimiento
   no cambió.

**Público vs. privado:** los borradores, archivos de otros recorridos y pruebas
individuales permanecen privados. Al publicar, se vuelven públicos los GLB,
los PNG de los marcadores y las descripciones del recorrido elegido.

**Importante sobre el alojamiento:** el contenido publicado por este método
depende de Supabase (plan gratuito). Si el proyecto se pausa por inactividad,
o se agotan los recursos del plan, los visitantes podrían no cargar los GLB
aunque GitHub Pages continúe funcionando. Para una muestra prolongada o
institucional conviene conservar además un **respaldo publicado en GitHub**.

## Respaldo opcional para GitHub

El método anterior de GitHub continúa disponible.

1. En el panel de coordinación, abrir **Opcional · revisar obras o preparar
   copia para GitHub**.
2. Usar **Reunir todas las obras en el editor**.
3. En la columna de recorridos elegir **Preparar publicación** y guardar el ZIP.
4. Subir ese ZIP sin descomprimir a la carpeta \`importar/\` del repositorio.
   El workflow \`importar-recorrido.yml\` publica los archivos en GitHub.

El visor compatible busca primero el manifiesto publicado en Supabase.
Si no existe uno para ese identificador, utiliza el paquete histórico de GitHub.
Ambos métodos mantienen la misma URL.

## Prueba individual antes de publicar

Cada artista puede verificar su modelo sin publicar el conjunto.

1. Abrir el enlace de invitación en el navegador, escribir el nombre y
   unirse al recorrido; no necesita correo ni cuenta GitHub.
2. Cargar imagen, generar marcador, subir GLB y configurar la transformación.
3. Pulsar **Guardar esta obra en la nube**.
4. En **Prueba individual · realidad aumentada**, elegir el marcador y pulsar
   **Descargar marcador PNG · 15 × 15 cm**.
5. Pulsar **Generar enlace de prueba AR**. Escanear el QR temporal con el
   celular. Apuntar la cámara al PNG mostrado en otra pantalla o impreso.
6. Para probar otra versión, volver a guardarla y usar el enlace de prueba.

Los enlaces temporales duran **7 días**. Generar uno nuevo invalida el anterior.
Los recursos siguen privados y el servidor genera enlaces firmados a un único
GLB y PNG. El QR temporal de prueba es **diferente** del QR integrado en el
marcador, que abre el recorrido definitivo.

## Arquitectura y seguridad

- **GitHub Pages** sirve \`estudio.html\` y \`recorrido.html\`.
- **Supabase Auth** usa correo verificado para coordinación y sesiones anónimas
  para artistas. Crear recorridos se restringe en el servidor a coordinadores.
- **Tablas:** \`public.slam_projects\`, \`public.slam_members\`,
  \`public.slam_entries\`.
- **Invitaciones:** \`slam_private.invites\`, con hash del token.
- **Archivos de trabajo:** bucket privado \`slam-colaboraciones\`; políticas RLS
  permiten modificar solo las contribuciones autorizadas.
- **Pruebas temporales:** Edge Function \`slam-preview\` y tabla privada
  \`slam_private.preview_links\`.
- **Publicación automática:** Edge Function \`slam-publicar\` verifica el JWT
  y la propiedad del proyecto; copia modelos y marcadores al bucket público
  \`slam-publicaciones\` usando credenciales internas del servidor, nunca
  incluidas en el navegador.
- **Versionado:** archivos públicos en carpetas de publicación inmutables;
  solo se reemplaza el \`manifest.json\` cuando todos están disponibles.
  Una republicación conserva la URL pública.
- **Límites iniciales:** 20 obras por recorrido, 20 MB por archivo. No
  compartir públicamente enlaces de invitación privados.
- Se recomienda activar CAPTCHA/Turnstile antes de recibir invitados
  desconocidos y revisar las advertencias de seguridad de Supabase.

**Advertencia de auditoría pendiente:** las tablas privadas
\`slam_private.invites\` y \`slam_private.coordinators\` todavía tienen RLS
desactivado. Están en un esquema no expuesto con permisos revocados, pero
conviene habilitar RLS como defensa adicional una vez revisados los
procedimientos de acceso. No cambiar las políticas sin revisar el esquema.

## Verificación

- Se comprobó previamente el trabajo de participantes en distintos
  navegadores y la prueba AR individual con marcadores reales.
- La publicación automática requiere una **primera prueba completa desde
  la cuenta del coordinador**: publicar, descargar los tres marcadores,
  abrir el enlace desde un celular y reconocer cada obra.
- GitHub Actions puede confirmar el despliegue del código, pero no reemplaza
  la prueba física ni la verificación de los permisos del servidor.
