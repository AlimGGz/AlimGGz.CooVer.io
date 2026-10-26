# ConteoVerde · Aplicación web de inventarios

Aplicación estática para cargar un catálogo `.xlsx`, buscar por **Producto Descripción**, sumar cantidades de cada producto y descargar el inventario en **Excel o PDF**.

## Funcionalidades

- Importa archivos `.xlsx` con la columna **Producto Descripción** (también reconoce **Familia**).
- Compatible con la estructura de `lista.xlsx`: **Familia | Producto Descripción | Inv. Inicial**.
- **Inv. Inicial no se suma**: todos los productos comienzan con total contado de **0**.
- Busca por texto, código de producto o familia; filtra por productos contados y pendientes.
- Registra cantidades de hasta **tres decimales** (útil para KG y L). Botones rápidos **+0.5**, **+1**, **+5**.
- Histórico de los registros con botón **Deshacer último** en cada producto.
- **Guardado automático en el navegador** mediante `localStorage` (no sincroniza entre dispositivos).
- **Finalizar inventario → Excel (.xlsx) o PDF (.pdf)**, eligiendo si incluir cantidades en cero.
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

1. **Subir Excel** y esperar a que se reconozca el catálogo.
2. **Buscar** por descripción, código o familia y seleccionar el artículo.
3. **Sumar cantidades** con el campo de texto o los botones rápidos. Por ejemplo, agregar 2.5 y luego 1.2 deja el total en 3.7.
4. Corregir con **Deshacer último**, si lo necesitas.
5. Pulsar **Finalizar inventario**, seleccionar **Excel o PDF** y descargar.

**Importante:** El archivo de inventario no viene precargado. La lista de productos del usuario se importa desde la interfaz; los conteos quedan almacenados únicamente en el navegador y dispositivo usados. Borrar los datos del navegador, usar modo incógnito o cambiar de dispositivo puede borrar o separar el avance; descarga reportes periódicamente para respaldarte. Importar otro catálogo reemplaza la sesión actual (previa confirmación).

## Estructura

```
index.html               Página web principal
css/styles.css           Diseño adaptable a escritorio y móvil
js/app.js                Lógica de conteos, historial y almacenamiento
js/excel.js              Lectura y exportación de archivos XLSX
js/pdf.js                Exportación PDF sin servicios externos
vendor/jszip.min.js      Biblioteca JSZip incluida localmente
vendor/JSZip-LICENSE.md  Licencia de la biblioteca incluida
.nojekyll                Compatible con GitHub Pages
```

## Tecnología

HTML, CSS y JavaScript sin frameworks ni pasos de compilación. Se incluye JSZip v3.10.1 (licencia MIT o GPLv3); los archivos de Excel se interpretan mediante XML de OpenXML y los PDF se generan localmente. No hay llamadas a APIs externas.

### Límites

- Sólo `.xlsx`, hasta 20 MB y máximo 20,000 artículos.
- Cantidades no negativas con hasta 3 decimales.
- Los registros son **por navegador** y no hay colaboración simultánea multiusuario; para conteo compartido entre celulares o tiendas se necesitaría un backend.
- Exportación PDF en tamaño A4 horizontal.

---

Proyecto preparado para desplegarse como sitio estático en GitHub Pages.
