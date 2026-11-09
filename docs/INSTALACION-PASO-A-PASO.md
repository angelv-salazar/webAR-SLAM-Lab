# Instalación de Estudio SLAM desde cero
## Guía amigable para personas sin experiencia en programación

Esta guía permite crear **tu propia versión** de Estudio SLAM. Haz cada paso en orden. No tienes que instalar programas en tu computadora para el método principal.

> **Antes de empezar:** necesitas una cuenta gratuita de GitHub, un correo electrónico y, si quieres colaboración, una cuenta en Supabase. Un celular con cámara te servirá para las pruebas.

## 0. Elige qué quieres hacer

**A. Solo crear obras propias.** Necesitas GitHub. Puedes saltarte Supabase y usar el **modo Individual**, guardar borradores en tu navegador y publicar archivos ZIP en tu propia web.

**B. Invitar artistas y publicar colectivamente.** Necesitas GitHub **y Supabase**. Sigues todos los pasos de esta guía. El botón «Publicar recorrido» subirá los modelos y marcadores automáticamente.

**No confundas los servicios:**

- **GitHub** aloja el *código* de Estudio SLAM y el visor que ven los visitantes.
- **GitHub Pages** convierte tu copia del código en una *página web*.
- **Supabase** guarda los *recorridos colaborativos*, modelos, participantes e invitaciones.

El Fork de GitHub **no incluye** los datos privados ni las obras guardadas en el Supabase del autor.

---

## 1. Hacer tu propia copia en GitHub

1. Crea una cuenta en https://github.com, o inicia sesión.
2. Entra al proyecto original: https://github.com/angelv-salazar/webAR-SLAM-Lab
3. Arriba a la derecha elige **Fork** (crear tu propia copia).
4. Elige tu cuenta como propietaria. El nombre puede seguir siendo `webAR-SLAM-Lab` o cambiar a `estudio-slam`.
5. Presiona **Create fork**.

Ahora tendrás algo parecido a:

```text
https://github.com/TU_USUARIO/estudio-slam
```

**Consejo:** si nunca usaste GitHub, imagina que un Fork es «Guardar una copia» dentro de tu propia cuenta. Los cambios que hagas allí no afectarán al proyecto original.

### Activar la página web

1. Desde **tu repositorio** haz clic en **Settings**.
2. En el menú lateral abre **Pages**.
3. En **Build and deployment → Source**, elige **Deploy from a branch**.
4. En Branch selecciona **main** y la carpeta **/(root)**.
5. Presiona **Save**.
6. GitHub mostrará tu dirección. Normalmente será:

```text
https://TU_USUARIO.github.io/NOMBRE_REPOSITORIO/
```

Por ejemplo, si usas `artistaweb` y `estudio-slam`:

```text
https://artistaweb.github.io/estudio-slam/
https://artistaweb.github.io/estudio-slam/estudio.html
```

Es una web HTTPS. La publicación puede tardar algunos minutos. Si aparece una página 404, comprueba que Pages está activado, espera a que termine y recarga.

**¿Solo quieres usar Individual?** Con esto alcanza para empezar. Abre `estudio.html`, elige **Individual**, carga imagen y GLB, guarda el borrador y experimenta. Para publicar tu recorrido individual en la web, sigue el [paso 9](#9-publicar-un-recorrido-individual-sin-supabase).

---

## 2. Crear tu propia base de datos Supabase (modo Colectivo)

1. Entra a https://supabase.com y crea una cuenta.
2. Entra a **Dashboard → New project**.
3. Pon un nombre, por ejemplo `Mi Estudio SLAM`.
4. Define una contraseña segura de la base de datos y guardala **en un lugar privado**, nunca en GitHub.
5. Elige la región y el plan disponibles para tu cuenta.
6. Termina de crear el proyecto.

### Anota solo estos dos datos públicos

Abre **Project Settings / Connect / API Keys** (el menú exacto puede cambiar):

- **Project URL**: parecido a `https://abcdefghijkl.supabase.co`
- **Publishable key**: empieza por `sb_publishable_` (algunos proyectos antiguos usan una clave pública JWT `eyJ...`).

**No copies `service_role`, `sb_secret_`, contraseñas ni tokens administrativos al código de la web.** Esos datos son secretos.

---

## 3. Crear las tablas y los permisos

Este es el paso que prepara Supabase para recibir las obras.

1. En **tu proyecto Supabase**, abre **SQL Editor**.
2. En **tu Fork de GitHub**, abre el archivo [`supabase/migrations/0001_instalacion.sql`](../supabase/migrations/0001_instalacion.sql).
3. Presiona el botón para ver/copiar el texto del archivo (**Raw** o el icono de copiar).
4. Vuelve a Supabase, crea una **New query** y pega todo el contenido.
5. Presiona **Run**. La consulta debe completarse sin errores.

El script instala **tablas, invitaciones, límites, permisos RLS, almacenamiento privado, almacenamiento público y funciones de la base de datos**.

**Muy importante:** este script se debe ejecutar **una sola vez en un proyecto Supabase nuevo y vacío**. No lo ejecutes sobre un proyecto donde ya tengas obras que quieras conservar.

### Autorizar tu propio correo como coordinador

En **SQL Editor → New query**, pega esto cambiando el correo:

```sql
insert into slam_private.coordinators (email)
values (lower('tu-correo@example.com'))
on conflict (email) do nothing;
```

Presiona **Run**. Ese correo será el que use el coordinador para entrar al Estudio. Puedes agregar más coordinadores autorizados ejecutando otra consulta con un correo diferente.

---

## 4. Permitir que los artistas entren sin cuenta

Dentro de Supabase:

1. Abre **Authentication**.
2. Busca **Providers / Sign-in methods**.
3. Activa **Anonymous Sign-Ins**.
4. Comprueba que el proveedor **Email** esté habilitado para el correo del coordinador.

**¿Por qué?** Los artistas invitados no necesitan un correo ni una cuenta en GitHub, pero Supabase les crea una identidad anónima para saber qué obra puede editar cada uno.

**Importante:** una sesión anónima depende del navegador/dispositivo. Si un invitado borra los datos del sitio o cambia de navegador, puede perder el acceso a su identidad anterior; el coordinador todavía puede recuperar la obra guardada.

### Autorizar la dirección de tu Estudio

En Supabase abre **Authentication → URL Configuration**:

- En **Site URL** pon la dirección de tu Estudio, por ejemplo `https://artistaweb.github.io/estudio-slam/estudio.html`.
- En **Redirect URLs** agrega esa misma dirección y, si hace falta, una regla para las páginas del mismo proyecto.

Esto permite regresar desde el correo de verificación al editor.

---

## 5. Activar las tres funciones de publicación

Una **Edge Function** es una pequeña rutina que funciona dentro de Supabase y permite realizar operaciones que no pueden hacerse con seguridad desde el navegador.

Estudio SLAM necesita estas tres:

| Función | Para qué sirve |
| --- | --- |
| `slam-preview` | Enlace temporal de prueba AR de una obra |
| `slam-publicar` | Publicación definitiva de un recorrido |
| `slam-borrar-recorrido` | Eliminación segura de un proyecto completo |

Sus códigos están incluidos en tu Fork, dentro de [`supabase/functions/`](../supabase/functions/).

### Método sencillo: desde el panel Supabase

1. Abre **Edge Functions** en Supabase.
2. Elige **Deploy new function / Via Editor** (la etiqueta puede variar).
3. Pon el nombre exacto `slam-preview`.
4. Copia el contenido de [`supabase/functions/slam-preview/index.ts`](../supabase/functions/slam-preview/index.ts) y reemplaza el código del editor.
5. Desactiva **Verify JWT** para esa función: su código controla el acceso por token temporal.
6. Presiona **Deploy**.
7. Repite con `slam-publicar` y `slam-borrar-recorrido`.

En **las tres** funciones, desactiva **Verify JWT** del gateway cuando utilices claves `sb_publishable_`. No significa dejarlas sin protección: la función de publicar/borrar comprueba el JWT y la titularidad del proyecto por sí misma.

### Indicar a las funciones cuál es tu web (importante)

En Supabase entra a **Edge Functions → Secrets**. Agrega **dos secretos de configuración**, usando tus valores reales:

```text
STUDIO_ORIGIN=https://TU_USUARIO.github.io
STUDIO_VIEWER_URL=https://TU_USUARIO.github.io/NOMBRE_REPOSITORIO/recorrido.html
```

Ejemplo:

```text
STUDIO_ORIGIN=https://artistaweb.github.io
STUDIO_VIEWER_URL=https://artistaweb.github.io/estudio-slam/recorrido.html
```

El primero es el **origen**, sin `/estudio-slam`, sin barra final. El segundo es la URL **completa** del visor, incluyendo el nombre del repositorio. Si usas un dominio propio, usa ese dominio en ambos.

No hace falta subir ni introducir una clave secreta del servidor: Supabase proporciona a sus funciones el acceso de servicio desde su entorno. **Nunca pegues secretos privados en GitHub.**

---

## 6. Conectar Estudio SLAM a tu Supabase

Ya tienes tu web en GitHub y tu base de datos Supabase. Ahora solo hay que unirlas.

1. Abre **tu Fork** en GitHub.
2. Haz clic en el archivo [`studio-config.js`](../studio-config.js).
3. Arriba a la derecha presiona el **lápiz (Edit)**.
4. Busca estas líneas:

```js
const TU_SUPABASE = {
  url: '',
  publishableKey: ''
};
```

5. Escribe tus datos públicos. Por ejemplo:

```js
const TU_SUPABASE = {
  url: 'https://abcdefghijkl.supabase.co',
  publishableKey: 'sb_publishable_TU_CLAVE_PUBLICA_AQUI'
};
```

6. Baja y presiona **Commit changes** para guardar la modificación.
7. Vuelve a tu página de GitHub Pages, recarga y elige **Colectivo**.

**No edites `ORIGINAL`**: esa parte del archivo conserva la configuración del sitio original únicamente en su propia dirección. Tu Fork utiliza exclusivamente los valores de `TU_SUPABASE`.

Si usas solo Individual, puedes dejar esos campos vacíos.

---

## 7. Crear el primer recorrido colectivo

1. Abre `https://TU_USUARIO.github.io/NOMBRE_REPOSITORIO/estudio.html`.
2. Selecciona **Colectivo**.
3. Abre **Colaboración → Acceso de coordinación**.
4. Escribe el correo autorizado en el paso 3 y pide el enlace de acceso.
5. Abre el correo de Supabase y presiona el enlace. Volverás al editor.
6. En **Administración de recorridos**, escribe un **nombre** y opcionalmente una **descripción**.
7. Presiona **Crear recorrido colectivo e invitación**.
8. Seleccionalo en **Mis recorridos como coordinador**.

En este modo **no tienes que crear otro recorrido en «1. Recorridos»**. El editor ya está conectado al proyecto colectivo.

### Invitar a otra persona

- Presiona **Copiar invitación para artistas**.
- Envía ese enlace por WhatsApp, correo o cualquier medio privado.
- El invitado abre la URL, escribe su nombre y entra al proyecto.
- Cada uno puede crear un marcador, cargar su GLB y pulsar **Guardar esta obra en la nube**.

Como coordinador también puedes crear **tus propios marcadores** dentro del mismo recorrido.

---

## 8. Probar y publicar un recorrido colectivo

### Antes de publicar

1. En cada marcador, agrega una imagen reconocible y un GLB.
2. Ajusta tamaño, rotación, posición, animación y texto.
3. Presiona **Guardar recorrido** para conservar el borrador local.
4. Presiona **Guardar esta obra en la nube** para compartir los archivos.
5. En **Prueba individual**, descarga el PNG y genera su enlace temporal.
6. Escanea el QR temporal con otro celular y apunta al marcador impreso o mostrado en una pantalla.

### Publicar el recorrido

1. Como coordinador, abre **Publicación del recorrido colectivo**.
2. Comprueba que todas las obras figuran en **Aportaciones en la nube**.
3. Presiona **Publicar recorrido**.
4. Se cerrarán temporalmente las aportaciones para crear una versión estable.
5. Aparecerán el **QR definitivo**, la URL y **Descargar todos los marcadores (.zip)**.
6. Imprime los PNG a **15 × 15 cm**, escala **100 %**, sin «ajustar a página».
7. Visitantes con teléfonos compatibles podrán escanear el QR y reconocer los marcadores, sin iniciar sesión.

**Corregir después:** presiona **Reabrir aportaciones**, guarda los cambios en la nube y vuelve a publicar. La URL sigue siendo la misma; si cambiás la imagen reconocible, reimprime el marcador.

---

## 9. Publicar un recorrido individual sin Supabase

Los recorridos individuales son borradores **guardados localmente**. GitHub Pages no los recibe de forma automática.

1. Elige **Individual** y crea tu recorrido.
2. Carga las imágenes y modelos GLB.
3. Presiona **Guardar recorrido**.
4. Presiona **Preparar ZIP para publicar en GitHub** y descarga el archivo.
5. Entra a la carpeta [`importar/`](../importar/) de **tu propio Fork**.
6. Elige **Add file → Upload files** y sube el ZIP **sin descomprimir**.
7. Presiona **Commit changes**.
8. En **Actions** verás el proceso `Importar ZIP de recorrido SLAM`.
9. Cuando termine, abre el enlace de tu recorrido desde tu GitHub Pages.

El script está preparado para detectar el usuario y el nombre de tu Fork. Si GitHub solicita permisos adicionales para el flujo, revisa **Settings → Actions → General → Workflow permissions** y las opciones de GitHub Pages.

**No confundas los botones:** «Preparar ZIP» descarga archivos; **no los publica por sí solo**. «Publicar recorrido» sí publica automáticamente, pero pertenece al modo Colectivo configurado con Supabase.

---

## 10. Si algo falla

**«El modo Colectivo pide configurar studio-config.js».**  
Todavía no escribiste la URL y clave **pública** de tu propio Supabase, o no guardaste los cambios en GitHub.

**«No recibo el correo de coordinación».**  
Comprueba que autorizaste exactamente ese correo en `slam_private.coordinators`, habilitaste Email en Auth y agregaste tu URL en Redirect URLs.

**«new row violates row-level security policy».**  
El recorrido puede estar **cerrado después de publicar**, o el usuario no tener permiso sobre esa obra. Reabre aportaciones como coordinador y actualiza la lista; no desactives RLS para «arreglarlo».

**«Failed to fetch» o error de origen (CORS) al publicar.**  
Comprueba `STUDIO_ORIGIN` y `STUDIO_VIEWER_URL` en Supabase. Vuelve a desplegar las tres funciones si editaste su código.

**«El QR se abre pero no aparece el modelo».**  
Confirma que publicaste la versión final (no solo guardaste el borrador), que la cámara está autorizada, que hay conexión, y que la imagen impresa es la versión correcta.

**«No veo las obras en otro navegador».**  
El modo Individual guarda archivos en el navegador. Para compartir borradores entre dispositivos necesitas el modo Colectivo o una publicación en GitHub.

**«El recorrido funciona en mi computadora pero no en mi teléfono».**  
La cámara y el motor SLAM requieren HTTPS, WebGL, un navegador compatible y buenas condiciones de reconocimiento.

---

## 11. Qué puedes modificar libremente

Puedes cambiar los textos, los colores, los paneles y la estructura de tu propia versión. Usa GitHub para editar archivos o descarga/clona el código para trabajar con un editor como VS Code.

El código propio tiene licencia **MIT**; el motor **8th Wall Engine Binary** mantiene una licencia distinta. Lee [Licencias y arquitectura](ARQUITECTURA.md) antes de distribuir versiones comerciales.

### Enlaces oficiales de ayuda

- [Primeros pasos con GitHub](https://docs.github.com/es/get-started)
- [Publicación con GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)
- [Documentación de Supabase](https://supabase.com/docs)
- [Edge Functions desde el panel](https://supabase.com/docs/guides/functions/quickstart)
- [Sesiones anónimas de Supabase](https://supabase.com/docs/guides/auth/auth-anonymous)
- [Licencia del motor 8th Wall](https://github.com/8thwall/engine/blob/main/LICENSE)

**¡Eso es todo!** Con tu propia copia de GitHub y tu propio Supabase puedes crear recorridos, sumar artistas y publicar experiencias WebAR sin depender de la cuenta del autor original.
