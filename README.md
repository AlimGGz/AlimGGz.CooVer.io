# ConteoVerde · Aplicación web de inventarios

Aplicación estática para cargar un catálogo `.xls` o `.xlsx`, buscar por **Producto Descripción**, sumar y restar cantidades de cada producto y descargar el inventario en **Excel o PDF**.

## Funcionalidades

- Importa archivos **.xls (Excel antiguo con formato BIFF8/OLE) y .xlsx**. Acepta la columna **Producto Descripción** o, en reportes SAP, **Cod. Producto + Producto + Ud** (también reconoce **Familia**).
- Compatible con la estructura de `lista.xlsx`: **Familia | Producto Descripción | Inv. Inicial**.
- **Compatible con `ReporteInventario_NP2893.xls`**: detecta la hoja **Datos**, toma SAP de **Cod. Producto**, descripción de **Producto**, unidad de **Ud** y familia de **Familia**; la columna «Producto Descripción» puede estar vacía.
- **Elimina registros duplicados por SAP** (diferentes fechas del mismo artículo). Prueba: 630 filas del reporte → 285 artículos únicos, sin duplicar conteos.
- Para .xls se utiliza un lector local de BIFF8 que **no ejecuta macros ni contenido activo**.
- **Inv. Inicial no se suma**: todos los productos comienzan con total contado de **0**.
- Busca por texto, SAP o familia; filtra por productos contados y pendientes.
- **Nueva selección de unidades**: todos los productos comienzan en **Piezas**, incluso si el Excel especifica KG o L. En los productos con una unidad diferente puedes escoger esa unidad al contar.
- **Sin conversiones inventadas**: los conteos en piezas y los conteos en KG/L se acumulan **por separado**, con sus totales e historial por unidad y columnas distintas en Excel/PDF. Las unidades PZA y UND del catálogo se consideran piezas.
- **Compatibilidad con avances previos**: si ya había conteos en el navegador, se migran conservando su unidad original (sin convertir KG/L en piezas).
- Registra cantidades de hasta **tres decimales** (útil para KG y L). Botones rápidos para sumar cantidades.
- **Nuevo botón rojo «− Restar»** junto al botón verde «+ Sumar»: descuenta la cantidad ingresada en la unidad seleccionada, sin permitir que el total quede negativo.
- Histórico con sumas y restas identificadas por su signo y botón **Deshacer último** en cada producto.
- **Guardado automático en el navegador** mediante `localStorage` (no sincroniza entre dispositivos).
- **Finalizar inventario → Excel (.xlsx) o PDF (.pdf)**, eligiendo si incluir cantidades en cero. Los reportes usan **SAP** en vez de SKU/código y las columnas **Piezas | Cant. Unid | Unidad** se muestran centradas en ese orden.
- Reapertura para corregir un inventario finalizado y exportarlo nuevamente.
- Los datos **no se suben** a servidores; el Excel se procesa localmente en el navegador.
- Sin cuentas, sin backend, sin instalación y sin conexión a bases de datos.

## Subir la aplicación a GitHub Pages

1. Crea un **repositorio nuevo** en GitHub (por ejemplo, `conteoverde-inventario`).
2. Sube **todo el contenido de esta carpeta** al directorio raíz del repositorio. Asegúrate de conservar `index.html`, `css/`, `js/` y `vendor/`.
3. En el repositorio, ve a **Settings → Pages**.
4. Selecciona **Deploy from a branch**, rama **main**, carpeta **/(root)**. Guarda.
5. Abre el enlace que GitHub te mostrará, con formato `https://TU-USUARIO.github.io/conteoverde-inventario/`.
6. Carga tu propio `lista.xlsx` desde la página. **No es necesario ni recomendable publicarlo en GitHub**.

La aplicación también funciona abriendo `index.html` directamente en Chrome, Edge o Firefox actualizados.

## Cómo usar

1. **Subir Excel (.xls o .xlsx)** y esperar a que se reconozca el catálogo.
2. **Buscar** por descripción, SAP o familia y seleccionar el artículo.
3. **Contar en piezas por defecto**. Si el producto indica otra unidad en el Excel (por ejemplo KG o L), también puedes seleccionarla antes de sumar o restar. Ejemplo: 2 piezas y 1.5 KG quedan registrados en dos totales distintos; no se suman entre sí.
4. Si necesitas descontar, ingresa una cantidad y pulsa el botón rojo **− Restar**. No puedes restar más de lo registrado en esa unidad. Puedes corregir con **Deshacer último**.
5. Pulsa **Finalizar inventario**, selecciona **Excel o PDF** y descarga. Ambos reportes distinguen cantidades por unidad y muestran **SAP | Producto Descripción | Piezas | Cant. Unid | Unidad** (precedidas por Familia).

**Importante:** El archivo de inventario no viene precargado. La lista de productos del usuario se importa desde la interfaz; los conteos quedan almacenados únicamente en el navegador y dispositivo usados. Borrar los datos del navegador, usar modo incógnito o cambiar de dispositivo puede borrar o separar el avance; descarga reportes periódicamente para respaldarte. Importar otro catálogo reemplaza la sesión actual (previa confirmación).

## Estructura

```
index.html               Página web principal
css/styles.css           Diseño adaptable a escritorio y móvil
js/app.js                Lógica de conteos, historial y almacenamiento
js/excel.js              Lectura XLSX, reconocimiento flexible del catálogo y exportación XLSX
js/xls.js                Lector local de Excel 97-2003 (.xls), sin macros
js/pdf.js                Exportación PDF sin servicios externos
vendor/jszip.min.js      Biblioteca JSZip incluida localmente
vendor/JSZip-LICENSE.md  Licencia de la biblioteca incluida
.nojekyll                Compatible con GitHub Pages
```

## Tecnología

HTML, CSS y JavaScript sin frameworks ni pasos de compilación. Se incluye JSZip v3.10.1 (licencia MIT o GPLv3); los archivos de Excel se interpretan mediante XML de OpenXML y los PDF se generan localmente. No hay llamadas a APIs externas.

### Límites

- Archivos `.xls` (BIFF8/OLE) y `.xlsx`, hasta 20 MB y máximo 20,000 artículos únicos. Algunos `.xls` de otros formatos internos pueden no ser compatibles. Los reportes con varios almacenes se deben filtrar previamente para no mezclar inventarios de distintas tiendas.
- Cantidades no negativas con hasta 3 decimales.
- Los registros son **por navegador** y no hay colaboración simultánea multiusuario; para conteo compartido entre celulares o tiendas se necesitaría un backend.
- Exportación PDF en tamaño A4 horizontal.

---

Proyecto preparado para desplegarse como sitio estático en GitHub Pages.
