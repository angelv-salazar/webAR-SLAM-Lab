# Guía de uso de Estudio SLAM

Esta guía es para quien **ya tiene el Estudio abierto**. Para crear tu propia copia en GitHub, consultá [la instalación para principiantes](INSTALACION-PASO-A-PASO.md).

## 1. Artistas que trabajan solos

Elegí **Individual** en la parte superior del editor. En **1. Recorridos**, escribí el nombre y una descripción. Agregá un marcador; cargá una imagen reconocible y un GLB. Generá el marcador imprimible, ajustá tamaño, rotaciones, animación y texto, y pulsá **Guardar recorrido**.

**Importante:** se guarda en **ese navegador**, no en la nube. Si querés mostrarlo desde otros dispositivos, prepará el ZIP y publicalo en tu propia web GitHub Pages, siguiendo [estas instrucciones](../importar/README.md). El modo individual no necesita Supabase.

## 2. Coordinación de un recorrido colectivo

Elegí **Colectivo**, iniciá sesión con el correo autorizado y abrí **Administración de recorridos**. Escribí un nombre y opcionalmente una descripción. Pulsá **Crear recorrido colectivo e invitación**.

En **Mis recorridos como coordinador**, seleccioná el recorrido y pulsá **Copiar invitación para artistas**. Compartí el enlace con quienes participen.

Tu editor ya está conectado a ese colectivo: **no crees otro recorrido en el apartado 1**. Podés agregar tus propias obras como cualquier participante. Para sumar una obra: armá el marcador y el GLB, pulsá **Guardar recorrido** y, después, **Guardar esta obra en la nube**.

Revisá **Aportaciones en la nube**. Si necesitás corregir una obra recibida, usá **Cargar obras recibidas para editar**. Cuando hayas terminado, pulsá **Publicar recorrido**. El sistema mostrará el QR definitivo, un enlace público y los marcadores PNG listos para imprimir.

Al publicar, se cierran las aportaciones temporalmente. Para actualizar después: **Reabrir aportaciones → Guardar las correcciones en la nube → Publicar recorrido**.

## 3. Artistas invitados

Abrí el enlace de invitación que envió el coordinador. Escribí tu nombre y pulsá **Unirme y crear mi marcador**.

Prepará una imagen, generá su marcador, cargá un GLB y ajustá el objeto. Guardá en dos pasos:

1. **Guardar mi borrador** protege el trabajo en tu navegador.
2. **Guardar esta obra en la nube** envía la aportación al colectivo.

Una vez subida, podés **Descargar marcador PNG** y **Generar enlace de prueba AR**. Mostrá el marcador en una computadora o imprimilo; abrí el enlace temporal con un celular y apuntá la cámara al marcador.

Los invitados **no publican recorridos** ni necesitan GitHub. Solo el coordinador publica el conjunto. Si el proyecto aparece **cerrado**, el coordinador debe pulsar **Reabrir aportaciones** antes de aceptar nuevas obras.

## 4. Visitantes de una exposición

Escaneá el **QR definitivo** impreso en un marcador. Abrí el enlace desde el celular, autorizá la cámara y apuntá al marcador. El recorrido puede contener diferentes objetos y textos, uno por marcador. No necesitás instalar una app ni iniciar sesión.

Los marcadores deben imprimirse a **15 × 15 cm y escala 100 %**, sin deformar la imagen. Usá buena luz y comprobá que el teléfono soporte el visor AR/WebGL.

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
