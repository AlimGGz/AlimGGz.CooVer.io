# ConteoVerde V7 — SAP y SKU POS visibles en los resultados

Actualización de interfaz sobre la V6. **No cambia la importación, la búsqueda, los conteos ni la exportación.**

## Novedades

- En los resultados de búsqueda, cada artículo del Excel muestra **SAP** y, cuando exista coincidencia en el catálogo auxiliar, **SKU POS**.
- Al seleccionar un artículo, los mismos códigos aparecen en la ficha de conteo.
- Si un SAP tiene varios SKU POS asociados, se muestran **todos**, con aviso para verificar la descripción; no se inventa una asociación uno a uno.
- Si el SAP no figura en la lista auxiliar semanal, la ficha indica **«SKU POS no disponible»**.
- La lista auxiliar no se convierte en productos adicionales ni aparece en una pantalla independiente.
- Se mantiene la compatibilidad con archivos `.xls` y `.xlsx`, suma, resta, piezas por defecto, otras unidades y reportes Excel/PDF.

## Publicar en GitHub Pages

1. Si tienes un inventario en curso, exporta una copia antes de actualizar.
2. Extrae el ZIP y **reemplaza `index.html`** de la raíz de tu repositorio con el nuevo archivo.
3. Confirma el cambio (*Commit changes*).
4. En GitHub Pages, recarga con **Ctrl + Shift + R** hasta ver «V7 · SAP + SKU POS».
5. Abre o carga un Excel de inventario y busca por descripción, SAP o SKU POS.

## Actualizar cada viernes

El actualizador de equivalencias de la V6 sigue funcionando: las marcas `CV_MERCH_ALIASES_BEGIN` y `CV_MERCH_ALIASES_END` se conservaron sin cambios. Actualiza el HTML de V7 con el nuevo PDF semanal y publica el HTML resultante.

## Confidencialidad

La fuente auxiliar es información empresarial confidencial. **Ocultar los datos de una lista visual no los protege en un sitio público.** Cualquier visitante con acceso al sitio de GitHub Pages puede inspeccionar las equivalencias incluidas en `index.html`. Antes de publicar, confirma que tienes autorización; para protegerlas realmente se requiere un backend privado con autenticación. No se incorpora el PDF de precios ni sus importes.
