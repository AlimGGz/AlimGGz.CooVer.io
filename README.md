# ConteoVerde V6 — Búsqueda auxiliar por SKU POS y SAP

La aplicación conserva todas las funciones de la V5 y añade un catálogo auxiliar de **equivalencias SKU POS ↔ Código SAP** extraídas de la *Lista de Precios Merch XMAS 2026_WK 45 C1.pdf*.

## Cómo instalar en GitHub Pages

1. Si tienes un inventario sin terminar, descarga primero un reporte como respaldo.
2. Sustituye **sólo `index.html`** en la raíz de tu repositorio de GitHub (conserva `.nojekyll` si ya existe).
3. Haz *Commit changes*; en GitHub Pages utiliza la rama `main`, directorio `/(root)`.
4. Abre tu sitio y recarga con **Ctrl+Shift+R**. Debe decir «V6 · BÚSQUEDA SKU POS».
5. Sube tu Excel de inventario como de costumbre (`.xls` o `.xlsx`) y busca por descripción, SAP o SKU POS.

La lista auxiliar **no aparece** en pantalla, no añade productos inexistentes al Excel ni se incorpora a los reportes. Los conteos siguen guardándose localmente. No se incluye el PDF de precios, las imágenes ni los importes.

**Importante:** cuando varios SKU POS comparten el mismo SAP, la búsqueda muestra las coincidencias posibles del Excel, y la persona que cuenta debe comprobar la descripción. No se realiza una correspondencia automática infalible. Al presionar Enter, si hay varios resultados, se solicita elegir uno manualmente.

## Actualizar el catálogo auxiliar cada viernes

**Opción A (más simple):** envía el nuevo PDF semanal al chat y solicita «actualiza las equivalencias SKU POS de ConteoVerde».

**Opción B (sin depender del chat):** utiliza el paquete independiente **Actualizador Semanal Merch** en tu computadora. Incluye un script y un archivo `.bat` para Windows.

1. Instala Python 3 y la librería `pymupdf` (una sola vez): `py -3 -m pip install pymupdf`.
2. Copia `actualizar_lista_merch.py` y `Actualizar_Merch_Windows.bat` a la misma carpeta donde tengas **`index.html`**.
3. Arrastra el PDF semanal sobre `Actualizar_Merch_Windows.bat` (o ejecuta `py -3 actualizar_lista_merch.py "Nuevo Merch.pdf"`).
4. El script reemplaza las equivalencias dentro de `index.html`; publica **sólo el nuevo `index.html`** en GitHub.
5. No publiques el PDF original, el script, ni una carpeta con archivos internos del negocio.

Si el PDF semanal cambia de diseño, la extracción debe revisarse antes de actualizar (la herramienta se detiene si no encuentra suficientes códigos).

## Advertencia de confidencialidad

**GitHub Pages es público.** Aunque la lista auxiliar no aparezca visualmente, las equivalencias numéricas incluidas en `index.html` **pueden ser examinadas por alguien que vea el código fuente**. Este esquema sirve para ocultarla de la interfaz, **no para proteger información realmente confidencial**. Para que los códigos sean inaccesibles a los visitantes hace falta consultar un servicio privado con autenticación (backend), en lugar de incrustarlos en una página pública.

La fuente compartida indica que es información confidencial y prohíbe su distribución. Confirma la autorización de tu empresa antes de publicar esta versión. Si no tienes esa autorización, no la subas a un repositorio público; sería necesario un diseño con servidor privado.

## Pruebas efectuadas

- Se extrajeron **341 pares válidos** SKU POS / SAP del PDF (330 SAP distintos y 335 SKU POS distintos). Se ignoraron registros sin SKU POS numérico.
- Probado con el archivo **`ReporteInventario_NP2893.xls`**: 285 productos, incluidos resultados por SKU POS.
- Probado con **`lista.xlsx`**: 262 productos, suma, resta y descarga XLSX/PDF.
- Las equivalencias sólo se usan en la búsqueda; no alteran los conteos, ni la importación, ni los reportes.
