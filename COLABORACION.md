# Estudio SLAM · Colaboración v1

Este documento describe la integración de **Estudio SLAM** alojada en GitHub Pages con **Supabase**, para que cada participante aporte obras sin tener cuentas de GitHub.

## URLs

- Editor: https://angelv-salazar.github.io/webAR-SLAM-Lab/estudio.html
- Carpeta de publicación: https://github.com/angelv-salazar/webAR-SLAM-Lab/tree/main/importar
- Proyecto Supabase: https://supabase.com/dashboard/project/kflgqbqbpzhxmiyovsvg
- Visor de un recorrido publicado: \`recorrido.html?id=<id-del-recorrido>\`

## Antes de la primera prueba

En Supabase, desde **Authentication → Providers**, habilitar **Anonymous Sign-Ins**. Esta opción no crea cuentas de GitHub ni exige nombre de usuario/correo al participante. Las identidades se conservan dentro de los datos del navegador. Limpiar esos datos hace que el usuario no pueda recuperar su identidad anterior.

Para exposiciones públicas se recomienda configurar **CAPTCHA/Turnstile** y definir el método de recuperación de la identidad del organizador antes de convocar participantes externos.

La aplicación usa una **clave pública (publishable)** y las políticas SQL de RLS. No guardar ninguna clave secreta de Supabase ni tokens de GitHub en los HTML o JavaScript.

## Organizador

1. Abrir el editor y desplegar **Colaboración**.
2. Escribir el nombre del recorrido y elegir **Crear espacio compartido**.
3. Pulsar **Copiar invitación para artistas** y conservar ese enlace en lugar seguro.
4. Enviar el enlace a los participantes.
5. Revisar las aportaciones recibidas (botón **Actualizar aportaciones**).
6. Cuando estén listas, opcionalmente pulsar **Cerrar aportaciones**.
7. Pulsar **Reunir todas las obras en el editor**. Esto importa al almacenamiento local una instantánea del proyecto con su identificador estable.
8. Verificar modelos, tamaños, animaciones e imágenes.
9. Pulsar **Preparar publicación** y descargar el ZIP de publicación.
10. Subir el ZIP sin descomprimir a la carpeta \`importar/\` del repositorio desde GitHub → Add file → Upload files. GitHub Actions valida y publica el recorrido. El identificador y los QR se mantienen cuando se actualiza un ZIP del mismo recorrido.

**Importante:** la publicación directa desde Supabase a GitHub mediante un solo clic todavía NO está implementada. El organizador realiza el paso 10; los participantes no tienen acceso a GitHub.

## Participante

1. Abrir el enlace de invitación.
2. Desplegar **Colaboración** (el enlace lo abre automáticamente), escribir un nombre y elegir **Unirme al recorrido**.
3. En las secciones habituales del editor, configurar un marcador local, añadir una imagen propia, validarla y cargar el GLB.
4. Volver a la sección Colaboración, elegir el marcador local y pulsar **Guardar esta obra en la nube**.
5. La herramienta genera de nuevo el marcador imprimible y el QR con el identificador del recorrido compartido, y guarda los recursos en Supabase. Cada persona puede editar y volver a enviar su propia obra sin sobrescribir la de otros usuarios.

Es posible compartir varios marcadores de un mismo participante. El límite actual es **20 obras por recorrido**, con un máximo de **20 MB por archivo** en el almacenamiento compartido.

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
