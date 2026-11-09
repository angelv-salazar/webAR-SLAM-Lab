# Estudio SLAM
### Recorridos de realidad aumentada con marcadores, modelos 3D y colaboración

**Estudio SLAM** es una herramienta web para crear experiencias de realidad aumentada (WebAR) sin instalar una aplicación: cada marcador impreso reconoce un modelo **GLB** y permite observarlo mediante la cámara de un teléfono. Podés trabajar por tu cuenta o invitar a otras personas a construir un mismo recorrido.

- **[Abrir la aplicación](https://angelv-salazar.github.io/webAR-SLAM-Lab/estudio.html)**
- **[Ver una demostración pública](https://angelv-salazar.github.io/webAR-SLAM-Lab/recorrido.html?id=id-mw9ab4l4-281p2g1x)**
- **[Guía de instalación para principiantes](docs/INSTALACION-PASO-A-PASO.md)**
- **[Guía para artistas y coordinadores](docs/USO-DEL-ESTUDIO.md)**
- **[Arquitectura y configuración técnica](docs/ARQUITECTURA.md)**

> **¿Nunca usaste GitHub o Supabase?** Empezá por la [guía paso a paso](docs/INSTALACION-PASO-A-PASO.md). No hace falta conocer comandos para poner en marcha la versión individual.

## ¿Qué se puede hacer?

| Individual | Colectivo |
| --- | --- |
| Crear recorridos propios | Crear proyectos y enviar invitaciones |
| Añadir hasta 20 marcadores | Recibir hasta 20 aportaciones por recorrido |
| Cargar GLB, imagen, texto y animaciones | Permitir a cada artista probar su obra en AR |
| Ajustar posición, rotación y escala | Revisar, corregir, cerrar y reabrir aportaciones |
| Guardar borradores en el navegador | Publicar el conjunto con un clic en Supabase |
| Exportar ZIP para publicarlo en GitHub Pages | Compartir un único QR final y descargar los marcadores |

Los marcadores imprimibles están diseñados para **15 × 15 cm**. La aplicación incorpora una vista previa 3D, animaciones (rotar, flotar, pulsar, orbitar, metamorfosis o animación embebida), descripciones, grabación de video y ajustes táctiles en dispositivos compatibles.

## Empezar rápidamente

### Opción A. Quiero crear un recorrido individual

1. Abrí [Estudio SLAM](https://angelv-salazar.github.io/webAR-SLAM-Lab/estudio.html).
2. Seleccioná **Individual**.
3. Nombrá el recorrido, cargá la imagen y el GLB, y generá el marcador.
4. Usá **Guardar recorrido** para guardar el borrador en tu navegador.
5. Si querés publicar en *tu propia web*, hacé un **Fork** del repositorio y activá GitHub Pages. La guía explica cómo subir el ZIP resultante.

**Atención:** el borrador individual se guarda en ese navegador, no en la nube. Si borrás los datos del navegador, podés perderlo.

### Opción B. Quiero coordinar un recorrido colectivo

1. Hacé un Fork del repositorio.
2. Creá **tu propio proyecto Supabase** y seguí la [instalación completa](docs/INSTALACION-PASO-A-PASO.md).
3. Configurá los dos datos públicos en **[studio-config.js](studio-config.js)**.
4. Elegí **Colectivo → Administración de recorridos** y creá un recorrido con invitaciones.
5. Cada artista agrega sus GLB y marcadores. Como coordinador, revisás y publicás.
6. El QR del recorrido se abre desde cualquier móvil compatible, **sin cuentas de visitante**.

**Importante:** al clonar, no heredás la base de datos ni las obras privadas del proyecto original. Un Fork de GitHub solo copia código; **Supabase se configura por separado**.

## ¿Qué incluye el repositorio?

```text
index.html                 Página de entrada
estudio.html               Editor WebAR
recorrido.html             Visor AR para teléfonos
studio-config.js           Configuración simple de Supabase (forks)
colaboracion-slam.js/.css  Gestión de participantes y publicación
recorrido-slam.js          Motor del recorrido y lectura de marcadores
marker-*.js y otros JS     Imagen, animaciones y herramientas del visor
theme-biomech-*.css        Diseño del Estudio
assets/                    Elementos gráficos usados por el diseño
supabase/
  migrations/              SQL para crear tu propio proyecto
  functions/               Tres funciones para prueba, publicación y borrado
importar/                  Carpeta para ZIP de publicación individual
scripts/                   Publicador alternativo con GitHub Actions
docs/                      Guías e información técnica
```

Las páginas de prototipos antiguos fueron retiradas del proyecto principal para que la descarga resulte más clara; el historial de Git conserva las versiones anteriores.

## Requisitos para visitantes

Un teléfono y navegador con compatibilidad AR/WebGL, cámara autorizada, **HTTPS**, conexión a internet y luz suficiente para reconocer el marcador. El seguimiento SLAM puede presentar deriva si se pierde la referencia: no es un sistema de posicionamiento geográfico absoluto. Probá siempre los modelos y marcadores en las condiciones reales de la exposición.

## Seguridad y privacidad

- El proyecto de Supabase del autor **solo se usa en la dirección original**. En un Fork, la colaboración queda desactivada hasta que conectes **tu propio** Supabase.
- Los borradores y modelos enviados siguen privados. **Publicar** hace públicos los GLB, las imágenes imprimibles y textos de la versión final.
- Las claves secretas, claves `service_role` y contraseñas **nunca** deben guardarse en GitHub ni en `studio-config.js`.
- Los invitados acceden con la invitación; cada persona edita sus archivos. El coordinador es quien publica.
- Hay políticas RLS y permisos limitados; antes de abrir una convocatoria pública se recomienda configurar protección antiabuso y supervisar consumo de Supabase.

## Licencias y créditos

El código original de este repositorio está disponible bajo **MIT**; consultá [LICENSE](LICENSE). **El motor binario de 8th Wall / Niantic Spatial usado para SLAM no está cubierto por MIT** y mantiene su [licencia propia](https://github.com/8thwall/engine/blob/main/LICENSE). Otros paquetes, fuentes y recursos externos conservan sus respectivas licencias. Revisá las condiciones de cada dependencia antes de uso comercial.

Proyecto de arte y tecnología desarrollado en Buenos Aires, Argentina. La interfaz y las herramientas pueden adaptarse para actividades artísticas, educativas y de investigación.
