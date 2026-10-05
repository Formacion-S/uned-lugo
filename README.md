# Panel de estudio UNED Lugo

Sitio estático para GitHub Pages: https://formacion-s.github.io/uned-lugo/ en el repositorio `Formacion-S/uned-lugo`, con publicación desde GitHub Actions.

El sitio es público y no exige una cuenta ni inicio de sesión. Conserva localmente la planificación y los adjuntos personales del navegador. Es una iniciativa de estudiantes y no es un servicio oficial de la UNED.

## Biblioteca compartida

La colección inicial de 14 PDF del primer cuatrimestre se publica desde `docs/apuntes/` y se describe en `docs/apuntes/manifest.json`. Se carga junto con los aportes posteriores, que siguen usando la API separada en `https://estudio-uned-lugo.atencionalclie787805.chatgpt.site/api/library`, alojada actualmente en Sites/Cloudflare y fuera de este repositorio. Los aportes posteriores se pueden retirar desde el navegador que los creó; la colección inicial se actualiza o retira mediante mantenimiento del repositorio.

Cada navegador genera localmente un identificador aleatorio para poder retirar sus propios aportes. No se transmite en URLs, no se muestra en la página y no se exporta con la planificación. Si el navegador bloquea el almacenamiento local, el panel informa de que el identificador solo durará hasta recargar la página.

## Publicación

El flujo `.github/workflows/pages.yml` despliega exclusivamente `docs/`, sin compilación ni framework. La configuración actual usa las versiones recomendadas en la documentación oficial de GitHub Pages: `actions/configure-pages@v5`, `actions/upload-pages-artifact@v4` y `actions/deploy-pages@v4`.

El backend admite explícitamente el origen `https://formacion-s.github.io` y acepta el identificador anónimo de navegador en la cabecera `Authorization: Bearer …` para listar, aportar y retirar. Las descargas permanecen públicas mediante el enlace absoluto de la API.

La tarjeta de Fundamentos de Programación incluye la web del departamento ISSI: http://www.issi.uned.es/fp/ (título comprobado el 5 de octubre de 2026).
