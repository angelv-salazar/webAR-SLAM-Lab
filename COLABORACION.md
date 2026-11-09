# Estudio SLAM · Colaboración v1

Este documento describe la integración de **Estudio SLAM** alojada en GitHub Pages con **Supabase**, para que cada participante aporte obras sin tener cuentas de GitHub.

## URLs

- Editor: https://angelv-salazar.github.io/webAR-SLAM-Lab/estudio.html
- Carpeta de publicación: https://github.com/angelv-salazar/webAR-SLAM-Lab/tree/main/importar
- Proyecto Supabase: https://supabase.com/dashboard/project/kflgqbqbpzhxmiyovsvg
- Visor de un recorrido publicado: \`recorrido.html?id=<id-del-recorrido>\`

## Prueba individual de AR (sin publicar)

Los participantes pueden probar **cada obra individualmente desde otro celular** sin
publicar todavía el recorrido colectivo ni acceder a GitHub.

1. En el editor de invitado, terminar el modelo, validar la imagen y generar el marcador.
2. Guardar la aportación en el navegador y usar **Colaboración → Guardar esta obra en la nube**.
3. En el panel **Prueba individual · realidad aumentada**, seleccionar esa obra, pulsar
   **Descargar marcador PNG · 15 × 15 cm** y abrir el PNG en otra pantalla
   o imprimirlo en papel de **15 × 15 cm, escala 100%**.
4. Pulsar **Generar enlace de prueba AR**.
5. Aparece un **QR temporal y un enlace** para escanearlo con el celular.
   Abrirlo desde el celular, autorizar la cámara y apuntar al marcador
   visible en papel o en otra pantalla.
6. Si hay cambios en escala, posición, rotación o modelo, guardar la nueva
   versión en la nube y volver a probar. El enlace temporal lee los archivos
   más recientes guardados.
   
**Diferencia importante entre QR:** el QR **integrado dentro del marcador**
apunta al recorrido definitivo, que se abrirá después de la publicación.
El **QR temporal mostrado en la sección de colaboración** abre únicamente
la prueba individual y no reemplaza el QR impreso del marcador.

La URL temporal vence en **7 días**. Generar otra URL para la misma obra
invalida la anterior. Se basa en un token aleatorio de alta entropía:
solo su hash SHA-256 se almacena en PostgreSQL. Una Edge Function verifica
el token y emite enlaces firmados de **una hora** a un único GLB y PNG,
sin exponer claves privadas de Supabase. No se cargan las demás obras.
Los archivos siguen almacenados en el bucket privado.

La experiencia de cámara requiere un navegador compatible, permiso de cámara,
conexión y buena luz. Conviene realizar la primera prueba en dos dispositivos:
uno muestra el PNG y el otro lo reconoce con la cámara. Aún no se realizó
una prueba física del motor AR en un teléfono externo; el despliegue confirmado
de GitHub Pages y Supabase no sustituye esa comprobación.

## Acceso de coordinación y artistas — v2

La interfaz **se separa según el enlace que abra cada persona**.

### Configuración inicial: correo del coordinador

1. En Supabase, abrir **Authentication → URL Configuration**:
   https://supabase.com/dashboard/project/kflgqbqbpzhxmiyovsvg/auth/url-configuration
2. Configurar **Site URL** y agregar como **Redirect URL**:
   https://angelv-salazar.github.io/webAR-SLAM-Lab/estudio.html
3. Mantener habilitado el proveedor **Email** y **Anonymous Sign-Ins** en:
   https://supabase.com/dashboard/project/kflgqbqbpzhxmiyovsvg/auth/providers
4. En el editor normal, abrir **Colaboración → Acceso de coordinación**, escribir el mismo correo verificado que administra este proyecto y elegir **Recibir enlace por correo**.
5. Abrir el enlace de un solo uso recibido por email. Volver a **Colaboración** si estuviera cerrado.
6. El backend comprueba la identidad y el correo verificado contra la lista **privada** de coordinadores. Una sesión anónima no puede crear recorridos.
7. El primer recorrido de prueba, si se creó con la sesión anónima antigua, se recupera automáticamente cuando en este navegador exista todavía el token de invitación guardado.

No agregar contraseñas, service_role, API keys secretas ni tokens de GitHub al editor.

### Organizador

1. Abrir el editor normal https://angelv-salazar.github.io/webAR-SLAM-Lab/estudio.html e identificarse por correo.
2. Crear el recorrido en el bloque **Administración de recorridos**.
3. Elegir el recorrido en **Mis recorridos como coordinador**.
4. Pulsar **Copiar invitación para artistas**, guardar el enlace y compartirlo.
5. Consultar las aportaciones recibidas con **Actualizar aportaciones**.
6. Al finalizar, si corresponde, **Cerrar aportaciones**.
7. **Reunir todas las obras en el editor** para importar los aportes a un borrador local consolidado.
8. Revisar los GLB, imágenes, textos y marcadores. Elegir **Preparar publicación**.
9. Subir el ZIP sin descomprimir a \`importar/\` en el repositorio GitHub. La automatización publica los archivos.

### Artista invitado

1. Abrir la **URL recibida por invitación**, no el enlace general del editor.
2. Aparece **Recorrido compartido · invitación para artistas**. No puede crear ni elegir otros recorridos.
3. Escribir su nombre y pulsar **Unirme y crear mi marcador**. Su identificación en Supabase es anónima; no necesita correo ni cuenta.
4. Se abre el editor de su **aportación local** vinculado al recorrido del organizador, con el **mismo identificador y URL QR**. Se ocultan los controles de crear otros recorridos y de publicar.
5. Cargar una imagen, validarla, generar su marcador, añadir el GLB y completar descripción y transformación.
6. Guardar el borrador local y, en **Colaboración**, elegir el marcador para pulsar **Guardar esta obra en la nube**.
7. Los otros participantes no pueden sobrescribir su aportación. La organización verá el título y el nombre del autor.
8. Al abrir el mismo enlace y navegador, podrá seguir trabajando mientras conserve su sesión anónima y datos locales.

El QR de un marcador vinculado al recorrido no cargará la experiencia pública hasta que el organizador publique el paquete completo.

## Aspectos de la primera prueba y limitaciones

- La cuenta de coordinación exige **un correo verificado**; en Supabase Auth es independiente del ingreso a la consola de Supabase.
- El enlace mágico necesita que GitHub Pages esté autorizado como URL de retorno en Supabase.
- Una sesión anónima puede perderse al borrar los datos del navegador. No se ha implementado recuperación de aportaciones con cambio de dispositivo.
- Solo los organizadores autorizados crean recorridos en el servidor; los permisos también se validan en PostgreSQL, no solo en la interfaz.
- El máximo sigue siendo 20 obras por recorrido y 20 MB por archivo individual.
- La publicación final sigue pasando por ZIP → \`importar/\` → GitHub Actions. Los artistas no requieren cuenta GitHub.
- Antes de convocar a una exposición, comprobar en dos navegadores la invitación, el guardado y la recuperación.
- Revisar las advertencias del asesor de seguridad de Supabase: las invitaciones están aisladas en un esquema privado, pero aún es aconsejable añadir RLS de defensa en profundidad a \`slam_private.invites\`; las dos funciones de acceso protegido SECURITY DEFINER se utilizan intencionalmente para creación e incorporación.

## Arquitectura y seguridad

- Base de datos: \`public.slam_projects\`, \`public.slam_members\`, \`public.slam_entries\`.
- Invitaciones: \`slam_private.invites\`, con hash SHA-256 del código. Solo los procedimientos restringidos pueden acceder a la tabla.
- Storage: bucket privado \`slam-colaboraciones\`; rutas de usuario separadas por \`project_id/user_id/entry_id\`.
- El acceso a las tablas públicas y a los archivos se limita mediante RLS a los miembros del recorrido.
- Un participante solo puede modificar su propia aportación. El organizador puede reunir las aportaciones y bloquear el proyecto.
- El enlace de invitación es una credencial de acceso: solo compartirlo con las personas convocadas.
- No se invita a colaboradores a la cuenta GitHub ni a la consola de Supabase.

## Limitaciones conocidas

- Las sesiones anónimas **no pueden recuperarse automáticamente** en otro navegador si se borra el almacenamiento del origen. El organizador debe conservar su navegador y su enlace de invitación. La recuperación de administración será una mejora futura.
- Falta completar una prueba presencial de dos navegadores, subida de GLB, importación del organizador, ZIP, impresión y reconocimiento de marcadores.
- La ejecución de GitHub Pages confirma el despliegue de los archivos, **no** valida por sí sola los permisos de cámara o la comunicación anónima con Supabase.
- La auditoría automática de Supabase advierte que la tabla privada \`slam_private.invites\` tiene RLS desactivado. El esquema no se expone a la Data API y se revocaron todos los permisos para visitantes, pero se recomienda revisar y habilitar también RLS como defensa en profundidad. La modificación de esa advertencia requiere una decisión explícita del administrador.
- La auditoría también informa sobre dos funciones \`SECURITY DEFINER\` expuestas a usuarios autenticados para crear y aceptar invitaciones. Este acceso es intencional y está limitado mediante comprobación de identidad, tokens largos, límites de proyectos y ausencia de acceso directo a las invitaciones.

## Versionado

- Supabase JS CDN: versión fija \`2.118.0\`.
- Aplicación: \`colaboracion-slam.js\` y \`colaboracion-slam.css\`.
- Esquema: migración de Supabase \`estudio_slam_collaborative_workspace_v1\` (20261108155347).

- Esquema de verificación y recuperación de coordinación: \`estudio_slam_verified_coordinators_v2\`.
- Roles separados en interfaz: \`colaboracion-slam.js?v=2\` y \`colaboracion-slam.css?v=2\`.
