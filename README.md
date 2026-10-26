# ConteoVerde V5 · Importación XLS corregida

**Publicación simplificada:** GitHub Pages sólo necesita `index.html`. Este archivo es independiente y trae dentro los estilos, el lector de Excel `.xls`/`.xlsx`, el buscador, el conteo y la exportación a Excel y PDF. No usa scripts externos ni CDN. Se incluye la licencia de JSZip.

## Para reemplazar la versión anterior

1. Si hay un inventario en curso, exporta primero una copia de sus resultados como respaldo.
2. En tu repositorio de GitHub, reemplaza el archivo `index.html` de la carpeta principal por el de este ZIP y confirma el cambio (commit). Los archivos anteriores `css/`, `js/` y `vendor/` se pueden dejar, pero la versión V5 ya no los carga.
3. Si aún no tienes GitHub Pages habilitado: `Settings` → `Pages` → `Deploy from a branch` → rama `main` → carpeta `/(root)`.
4. Abre tu sitio publicado y verifica que debajo del título aparezca **“V5 · LECTOR XLS INTEGRADO”**. Si no aparece, actualiza sin caché con **Ctrl+Shift+R** (en móviles, vuelve a abrir la página).
5. Pulsa “Cambiar Excel” o carga un archivo en la pantalla inicial y selecciona **`ReporteInventario_NP2893.xls`**. El lector identifica el formato binario y debe mostrar **285 productos**, hoja **Datos** y **345 registros duplicados omitidos**.
6. Si aparece una falla, ahora tendrás un **mensaje de error persistente** en la página; úsalo para reportar exactamente qué ocurre.

## Características

- Lee `.xls` de Excel 97–2003, `.xlsx` y algunos reportes Excel con formato HTML o XML de 2003 aunque usen extensión `.xls`.
- Detecta por el contenido real del archivo si es XLS clásico o ZIP/XLSX. Importa sin enviar el documento a internet.
- Detecta el catálogo mediante `Familia`, `Producto Descripción` o `Cod. Producto` (SAP), `Producto` y `Ud` (unidad). Deduplica por SAP.
- Mantiene piezas por defecto; permite la unidad alternativa cuando corresponde; suma, resta con botón rojo, deshace y mantiene el historial.
- Exporta PDF o XLSX con columnas `Piezas`, `Cant. Unid`, `Unidad`, en ese orden y centradas.
- Guarda localmente y trata de preservar inventarios en curso de versiones anteriores **en el mismo navegador y mismo dominio**. Cambiar de catálogo reemplaza los conteos actuales sólo tras tu confirmación.
- No incluye los datos de inventario personales precargados ni usa servidores.

## Solución alternativa

Si el navegador o el origen exporta un `.xls` incompatible, se puede importar el catálogo convertido a `.xlsx` (siempre que tenga SAP, producto y unidad), pero la V5 está preparada para leer directamente el `.xls` entregado.

**Consejo:** Los conteos se guardan en este navegador. No borres los datos locales mientras realizas un inventario y descarga un respaldo antes de cambiar el archivo fuente.
