# Arquitectura y mantenimiento de Estudio SLAM

Este documento explica cómo está organizado el código. **Si no programás**, empieza con la [guía de instalación](INSTALACION-PASO-A-PASO.md).

## El mismo editor, dos modalidades

**Individual:** `estudio.html` guarda borradores con IndexedDB dentro del navegador. Para compartir un recorrido entre teléfonos, el editor exporta un ZIP; el workflow de GitHub lo convierte en una publicación en `recorridos/<ID>/`.

**Colectivo:** `colaboracion-slam.js` conecta el editor con Supabase (Auth, Postgres, Storage). El coordinador crea el proyecto y sus invitaciones. Los artistas añaden sus obras; luego el coordinador publica una instantánea. El borrador local y el proyecto en Supabase comparten un mismo `route_id`.

**Visor:** `recorrido.html` y `recorrido-slam.js` muestran primero el manifiesto publicado en Supabase; si no existe, pueden utilizar la publicación ZIP alojada en GitHub Pages. Las pruebas temporales se cargan desde Supabase y muestran solo una obra.

## Archivos principales

| Archivo/carpeta | Para qué sirve |
| --- | --- |
| `index.html` | Portada |
| `estudio.html` | Editor, marcadores y vista previa 3D |
| `recorrido.html`, `recorrido-slam.js` | Visor AR de los visitantes |
| `studio-config.js` | URL y clave **pública** de tu Supabase |
| `colaboracion-slam.js`, `colaboracion-slam.css` | Invitados, proyectos y publicación |
| `marker-composer.js`, `marker-validation.js` | QR, imagen y validaciones |
| `image-targets.js`, `marker-stability.js`, `anchor-safety.js` | Reconocimiento y seguimiento espacial |
| `object-animations.js`, `touch-objects.js`, `record-clip.js` | Animaciones, gestos y video |
| `theme-biomech-*.css`, `assets/` | Diseño biomecánico actual |
| `supabase/migrations/0001_instalacion.sql` | Tablas, funciones y permisos de Supabase |
| `supabase/functions/` | Prueba individual, publicación y eliminación |
| `importar/`, `scripts/`, `.github/workflows/` | Publicación alternativa vía ZIP |

## Configuración segura para tu Fork

Edita solamente el objeto `TU_SUPABASE` de `studio-config.js`. La configuración del sitio original solo se usa en la **URL original exacta**, no en los Forks. Sin esos dos campos, se permite Individual, pero se bloquea Colectivo.

No incluir claves `service_role`, `sb_secret_` ni contraseñas en JavaScript, GitHub o archivos públicos. Solo la **clave publishable** debe aparecer en `studio-config.js`.

Supabase protege los archivos de trabajo con RLS, membresías y un bucket privado, mientras que los objetos publicados (GLB, PNG y manifiesto) pasan a un bucket público para visitantes. Los invitados tienen una identidad anónima limitada al navegador donde ingresaron.

## Instalación del servidor

En un **Supabase nuevo y vacío**, ejecutar el SQL de `supabase/migrations/0001_instalacion.sql` desde SQL Editor. Incluye tablas, índices, políticas RLS, dos buckets, funciones y triggers. Después autorizar el correo del coordinador:

```sql
insert into slam_private.coordinators(email)
values (lower('tu-correo@example.com'))
on conflict (email) do nothing;
```

Habilitar **Anonymous Sign-Ins** y configurar Site URL / Redirect URLs.

Desplegar las tres Edge Functions: `slam-preview`, `slam-publicar` y `slam-borrar-recorrido`. Configurar estos secretos desde el panel Supabase:

```text
STUDIO_ORIGIN=https://tuusuario.github.io
STUDIO_VIEWER_URL=https://tuusuario.github.io/turepositorio/recorrido.html
```

**STUDIO_ORIGIN** es solo el origen sin ruta, **STUDIO_VIEWER_URL** incluye el camino completo. Si usas claves `sb_publishable_`, las tres funciones tienen **Verify JWT del gateway desactivado**; las funciones verifican internamente token y/o identidad según la operación.

## Datos y límites

- Hasta **20 obras por recorrido**.
- Archivos subidos de hasta **20 MB**.
- GLB, imagen de reconocimiento, marcador PNG y patrón auxiliar por aportación.
- Prueba temporal individual válida **7 días**; URLs firmadas de archivos por una hora.
- Publicar cierra nuevas aportaciones; reabrir no quita la publicación existente.
- Los modelos publicados son públicamente descargables desde el bucket de publicación.
- Un invitado puede perder su identidad si borra los datos del navegador.
- Los planes y cuotas de almacenamiento/transferencia de Supabase pueden afectar la disponibilidad. Guarda copias de seguridad.

## Licencias

El código original de Estudio SLAM usa [MIT](../LICENSE), pero **eso no convierte las dependencias en MIT**. El motor de seguimiento espacial de la versión binaria 8th Wall / Niantic Spatial tiene [una licencia separada y restrictiva](https://github.com/8thwall/engine/blob/main/LICENSE), que debe revisarse antes de redistribuir o comercializar un producto.

Otras librerías externas (A-Frame, Three.js, Supabase JS, JSZip, herramientas QR y Google Fonts) también conservan sus licencias. No se incluyen fuentes tipográficas de terceros en este repositorio.

## Conservación del proyecto

Los prototipos iniciales, estilos descartados y ZIP antiguos se retiraron de la rama principal para que sea más fácil clonar el proyecto, pero **siguen recuperables desde el historial de commits de Git**. El visor y las rutas actuales se han preservado.
