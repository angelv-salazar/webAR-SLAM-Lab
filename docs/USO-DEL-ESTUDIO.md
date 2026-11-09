# Guía de uso de Estudio SLAM

Esta guía es para quien **ya tiene el Estudio abierto**. Para crear tu propia copia en GitHub, consulta [la instalación para principiantes](INSTALACION-PASO-A-PASO.md).

## 1. Artistas que trabajan solos

Elige **Individual** en la parte superior del editor. En **1. Recorridos**, escribe el nombre y una descripción. Agrega un marcador; carga una imagen reconocible y un GLB. Genera el marcador imprimible, ajusta tamaño, rotaciones, animación y texto, y presiona **Guardar recorrido**.

**Importante:** se guarda en **ese navegador**, no en la nube. Si quieres mostrarlo desde otros dispositivos, prepara el ZIP y publícalo en tu propia web GitHub Pages, siguiendo [estas instrucciones](../importar/README.md). El modo individual no necesita Supabase.

## 2. Coordinación de un recorrido colectivo

Elige **Colectivo**, inicia sesión con el correo autorizado y abre **Administración de recorridos**. Escribe un nombre y opcionalmente una descripción. Presiona **Crear recorrido colectivo e invitación**.

En **Mis recorridos como coordinador**, selecciona el recorrido y presiona **Copiar invitación para artistas**. Comparte el enlace con quienes participen.

Tu editor ya está conectado a ese colectivo: **no crees otro recorrido en el apartado 1**. Puedes agregar tus propias obras como cualquier participante. Para sumar una obra: arma el marcador y el GLB, presiona **Guardar recorrido** y, después, **Guardar esta obra en la nube**.

Revisa **Aportaciones en la nube**. Si necesitas corregir una obra recibida, usa **Cargar obras recibidas para editar**. Cuando hayas terminado, presiona **Publicar recorrido**. El sistema mostrará el QR definitivo, un enlace público y los marcadores PNG listos para imprimir.

Al publicar, se cierran las aportaciones temporalmente. Para actualizar después: **Reabrir aportaciones → Guardar las correcciones en la nube → Publicar recorrido**.

## 3. Artistas invitados

Abre el enlace de invitación que envió el coordinador. Escribe tu nombre y presiona **Unirme y crear mi marcador**.

Prepara una imagen, genera su marcador, carga un GLB y ajusta el objeto. Guarda en dos pasos:

1. **Guardar mi borrador** protege el trabajo en tu navegador.
2. **Guardar esta obra en la nube** envía la aportación al colectivo.

Una vez subida, puedes **Descargar marcador PNG** y **Generar enlace de prueba AR**. Muestra el marcador en una computadora o imprímelo; abre el enlace temporal con un celular y apunta la cámara al marcador.

Los invitados **no publican recorridos** ni necesitan GitHub. Solo el coordinador publica el conjunto. Si el proyecto aparece **cerrado**, el coordinador debe pulsar **Reabrir aportaciones** antes de aceptar nuevas obras.

## 4. Visitantes de una exposición

Escanea el **QR definitivo** impreso en un marcador. Abre el enlace desde el celular, autoriza la cámara y apunta al marcador. El recorrido puede contener diferentes objetos y textos, uno por marcador. No necesitas instalar una app ni iniciar sesión.

Los marcadores deben imprimirse a **15 × 15 cm y escala 100 %**, sin deformar la imagen. Usa buena luz y comprueba que el teléfono soporte el visor AR/WebGL.

## ¿Qué hace cada botón?

| Acción | Resultado |
| --- | --- |
| Guardar recorrido / Guardar mi borrador | Guarda localmente en ese navegador |
| Guardar esta obra en la nube | Sube la aportación a Supabase |
| Generar enlace de prueba AR | Prueba temporal de una obra ya guardada |
| Publicar recorrido | Publica el colectivo para visitantes |
| Preparar ZIP para publicar en GitHub | Descarga el material del modo individual para subirlo después |

El QR temporal de prueba y el QR definitivo del recorrido **no son el mismo**.

## Más información

- [Instalar tu propia copia](INSTALACION-PASO-A-PASO.md)
- [Arquitectura y seguridad](ARQUITECTURA.md)
- [Publicar ZIP individual](../importar/README.md)
