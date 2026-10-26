/* XLSX import/export. JSZip is bundled locally; files never leave the browser. */
(function (root) {
  'use strict';
  const MAIN_NS = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
  const R_NS = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
  const PKG_NS = 'http://schemas.openxmlformats.org/package/2006/relationships';
  const contentTypes = 'http://schemas.openxmlformats.org/package/2006/content-types';
  const el = (node, name) => Array.from(node.getElementsByTagName('*')).filter(child => child.localName === name);
  const norm = s => String(s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[_\s]+/g, ' ').trim().toLowerCase();
  const xmlEscape = value => String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');
  const xmlParse = xml => {
    const doc = new DOMParser().parseFromString(xml, 'application/xml');
    if (doc.getElementsByTagName('parsererror').length) throw new Error('El archivo tiene un XML de Excel no válido.');
    return doc;
  };
  const colIndex = reference => {
    const letters = String(reference).match(/^[A-Za-z]+/);
    if (!letters) return -1;
    return Array.from(letters[0].toUpperCase()).reduce((n, c) => n * 26 + c.charCodeAt(0) - 64, 0) - 1;
  };
  const fixExcelText = text => String(text ?? '').replace(/_x000D_/gi, '\n').trim();

  async function readSheet(zip, sheetPath, sharedStrings) {
    const file = zip.file(sheetPath);
    if (!file) return [];
    const doc = xmlParse(await file.async('string'));
    const data = el(doc, 'sheetData')[0];
    if (!data) return [];
    const rows = [];
    for (const row of Array.from(data.childNodes).filter(n => n.nodeType === 1 && n.localName === 'row')) {
      const values = [];
      let fallbackIndex = 0;
      for (const cell of Array.from(row.childNodes).filter(n => n.nodeType === 1 && n.localName === 'c')) {
        const index = colIndex(cell.getAttribute('r'));
        const column = index >= 0 ? index : fallbackIndex;
        fallbackIndex = column + 1;
        const type = cell.getAttribute('t');
        const v = el(cell, 'v')[0];
        const inlines = el(cell, 'is')[0];
        let value = '';
        if (type === 's') value = sharedStrings[Number(v?.textContent ?? '-1')] ?? '';
        else if (type === 'inlineStr' && inlines) value = el(inlines, 't').map(n => n.textContent).join('');
        else if (type === 'str' || type === 'e') value = v?.textContent || '';
        else if (v && v.textContent !== '') {
          const parsed = Number(v.textContent);
          value = Number.isFinite(parsed) ? parsed : v.textContent;
        }
        if (column < 100) values[column] = fixExcelText(value);
      }
      if (values.length) rows.push(values);
    }
    return rows;
  }

  async function readExcel(file) {
    if (!/\.xlsx$/i.test(file.name)) throw new Error('Selecciona un archivo de Excel con extensión .xlsx.');
    if (file.size > 20 * 1024 * 1024) throw new Error('El archivo excede el límite de 20 MB.');
    let zip;
    try { zip = await JSZip.loadAsync(await file.arrayBuffer()); }
    catch { throw new Error('No se pudo abrir el Excel. Confirma que el archivo sea .xlsx y no esté dañado.'); }
    const ssFile = zip.file('xl/sharedStrings.xml');
    let strings = [];
    if (ssFile) {
      const doc = xmlParse(await ssFile.async('string'));
      strings = el(doc, 'si').map(si => el(si, 't').map(t => t.textContent).join(''));
    }
    const sheets = [];
    const workbookFile = zip.file('xl/workbook.xml');
    const relationsFile = zip.file('xl/_rels/workbook.xml.rels');
    if (workbookFile && relationsFile) {
      const workbook = xmlParse(await workbookFile.async('string'));
      const relations = xmlParse(await relationsFile.async('string'));
      const paths = new Map(el(relations, 'Relationship').map(n => [n.getAttribute('Id'), n.getAttribute('Target')]));
      for (const sheet of el(workbook, 'sheet')) {
        const relationId = sheet.getAttributeNS(R_NS, 'id') || sheet.getAttribute('r:id');
        const target = paths.get(relationId);
        if (!target) continue;
        let path;
        if (target.startsWith('/')) path = target.replace(/^\//, '');
        else path = 'xl/' + target;
        const pathParts = [];
        for (const part of path.split('/')) { if (part === '..') pathParts.pop(); else if (part !== '.') pathParts.push(part); }
        sheets.push({ name: sheet.getAttribute('name'), path: pathParts.join('/') });
      }
    }
    if (!sheets.length) {
      zip.file(/^xl\/worksheets\/[^/]+\.xml$/).forEach(f => sheets.push({ name: f.name, path: f.name }));
    }
    for (const sheet of sheets) {
      const rows = await readSheet(zip, sheet.path, strings);
      const header = rows.slice(0, 40).findIndex(row => row.some(c => /^producto descripcion$/.test(norm(c))));
      if (header < 0) continue;
      const columns = rows[header].map(norm);
      const descCol = columns.findIndex(c => /^producto descripcion$/.test(c));
      const familyCol = columns.findIndex(c => c === 'familia');
      const products = [];
      for (const r of rows.slice(header + 1)) {
        const description = String(r[descCol] ?? '').trim();
        if (!description) continue;
        if (products.length >= 20000) throw new Error('Se admite un máximo de 20,000 productos por archivo.');
        const firstDash = description.match(/^(\d+)\s*-\s*(.+)$/);
        const code = firstDash ? firstDash[1] : '';
        const afterCode = firstDash ? firstDash[2] : description;
        const unitMatch = afterCode.match(/\s+-\s+([A-Za-zÁÉÍÓÚÑáéíóúñ0-9.]{1,10})\s*$/);
        const unit = unitMatch ? unitMatch[1] : '';
        const name = unitMatch ? afterCode.slice(0, -unitMatch[0].length).trim() : afterCode.trim();
        products.push({ id: `p${products.length + 1}`, family: String(familyCol >= 0 ? r[familyCol] ?? '' : '').trim() || 'Sin familia', description, code, name, unit, totalsMilli: {piece: 0, source: 0}, history: [] });
      }
      if (products.length) return { products, worksheet: sheet.name, filename: file.name };
    }
    throw new Error('No encontré productos debajo de la columna “Producto Descripción”. Verifica el encabezado y el contenido del archivo.');
  }

  const column = n => { let result = ''; for (let i = n + 1; i > 0; i = Math.floor((i - 1) / 26)) result = String.fromCharCode(65 + (i - 1) % 26) + result; return result; };
  function cell(value, col, row, style = 0, numeric = false) {
    const ref = `${column(col)}${row}`;
    if (numeric) return `<c r="${ref}" s="${style}"><v>${Number(value) || 0}</v></c>`;
    return `<c r="${ref}" s="${style}" t="inlineStr"><is><t xml:space="preserve">${xmlEscape(value)}</t></is></c>`;
  }
  function row(number, cells, height) { return `<row r="${number}"${height ? ` ht="${height}" customHeight="1"` : ''}>${cells.join('')}</row>`; }

  async function exportExcel(products, info) {
    const data = products;
    const withCount = data.filter(p => (p.totalsMilli?.piece || 0) > 0 || (p.totalsMilli?.source || 0) > 0).length;
    const createdAt = new Date();
    const cells = [];
    cells.push(row(1, [cell('REPORTE FINAL DE INVENTARIO', 0, 1, 2)], 33));
    cells.push(row(2, [cell(`Generado: ${createdAt.toLocaleString('es-MX')}  ·  Archivo: ${info.filename}`, 0, 2, 3)], 24));
    cells.push(row(4, [cell('PRODUCTOS EN REPORTE', 0, 4, 4), cell(data.length, 1, 4, 5, true), cell('CON CONTEO', 2, 4, 4), cell(withCount, 3, 4, 5, true)], 23));
    cells.push(row(6, [cell('Piezas y unidad del Excel se cuentan por separado (sin conversión). El inventario inicial no se suma.', 0, 6, 3)], 23));
    const headers = ['Familia', 'Código', 'Producto Descripción', 'Unidad del Excel', 'Total piezas', 'Total en unidad del Excel', 'Registros'];
    cells.push(row(7, headers.map((h, i) => cell(h, i, 7, 1)), 29));
    data.forEach((p, i) => {
      const r = i + 8;
      const normalStyle = i % 2 ? 7 : 0;
      const numericStyle = i % 2 ? 8 : 6;
      const other = !/^(pza|pzas|pz|pieza|piezas|und|un|unidad|unidades)$/i.test(String(p.unit || '').trim()) && Boolean(p.unit);
      cells.push(row(r, [cell(p.family, 0, r, normalStyle), cell(p.code, 1, r, normalStyle), cell(p.description, 2, r, normalStyle), cell(p.unit || '—', 3, r, normalStyle), cell((p.totalsMilli?.piece || 0) / 1000, 4, r, numericStyle, true), other ? cell((p.totalsMilli?.source || 0) / 1000, 5, r, numericStyle, true) : cell('—', 5, r, normalStyle), cell(p.history.length, 6, r, i % 2 ? 8 : 5, true)], 23));
    });
    const lastRow = 7 + data.length;
    const worksheet = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="${MAIN_NS}"><dimension ref="A1:G${Math.max(7,lastRow)}"/><sheetViews><sheetView workbookViewId="0"><pane ySplit="7" topLeftCell="A8" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><sheetFormatPr defaultRowHeight="19"/><cols><col min="1" max="1" width="25" customWidth="1"/><col min="2" max="2" width="17" customWidth="1"/><col min="3" max="3" width="71" customWidth="1"/><col min="4" max="4" width="18" customWidth="1"/><col min="5" max="5" width="19" customWidth="1"/><col min="6" max="6" width="29" customWidth="1"/><col min="7" max="7" width="13" customWidth="1"/></cols><sheetData>${cells.join('')}</sheetData><mergeCells count="3"><mergeCell ref="A1:G1"/><mergeCell ref="A2:G2"/><mergeCell ref="A6:G6"/></mergeCells><autoFilter ref="A7:G${Math.max(lastRow,7)}"/><pageMargins left="0.3" right="0.3" top="0.5" bottom="0.5" header="0.2" footer="0.2"/><pageSetup orientation="landscape" paperSize="9" fitToHeight="0" fitToWidth="1"/></worksheet>`;
    const styles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="${MAIN_NS}"><numFmts count="1"><numFmt numFmtId="164" formatCode="0.###"/></numFmts><fonts count="4"><font><sz val="10"/><name val="Aptos"/><color rgb="FF273D34"/></font><font><b/><sz val="10"/><name val="Aptos"/><color rgb="FFFFFFFF"/></font><font><b/><sz val="19"/><name val="Aptos Display"/><color rgb="FF123E34"/></font><font><sz val="10"/><name val="Aptos"/><color rgb="FF7C8980"/></font></fonts><fills count="4"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF123E34"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFF1F8F3"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="9"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFill="1" applyFont="1"/><xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"/><xf numFmtId="0" fontId="3" fillId="0" borderId="0" xfId="0" applyFont="1"/><xf numFmtId="0" fontId="3" fillId="3" borderId="0" xfId="0" applyFill="1"/><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/><xf numFmtId="0" fontId="0" fillId="3" borderId="0" xfId="0" applyFill="1"/><xf numFmtId="164" fontId="0" fillId="3" borderId="0" xfId="0" applyNumberFormat="1" applyFill="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;
    const zip = new JSZip();
    zip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="${contentTypes}"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`);
    zip.file('_rels/.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="${PKG_NS}"><Relationship Id="rId1" Type="${R_NS}/officeDocument" Target="xl/workbook.xml"/></Relationships>`);
    zip.file('xl/workbook.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="${MAIN_NS}" xmlns:r="${R_NS}"><bookViews><workbookView/></bookViews><sheets><sheet name="Inventario" sheetId="1" r:id="rId1"/></sheets></workbook>`);
    zip.file('xl/_rels/workbook.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="${PKG_NS}"><Relationship Id="rId1" Type="${R_NS}/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="${R_NS}/styles" Target="styles.xml"/></Relationships>`);
    zip.file('xl/worksheets/sheet1.xml', worksheet);
    zip.file('xl/styles.xml', styles);
    return await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 }, mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  }
  root.InventoryExcel = { readExcel, exportExcel };
})(window);
