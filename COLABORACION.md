# Estudio SLAM · Trabajo colaborativo y publicación

**Editor:** https://angelv-salazar.github.io/webAR-SLAM-Lab/estudio.html  
**Proyecto de Supabase:** https://supabase.com/dashboard/project/kflgqbqbpzhxmiyovsvg  
**Código:** https://github.com/angelv-salazar/webAR-SLAM-Lab

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
