/* Browser-native PDF writer. No CDN, remote service or paid dependency. */
(function (root) {
  'use strict';
  const WIDTH = 842, HEIGHT = 595, LEFT = 32, RIGHT = 32, BODY_BOTTOM = 548;
  const CP1252 = { '€':128,'‚':130,'ƒ':131,'„':132,'…':133,'†':134,'‡':135,'ˆ':136,'‰':137,'Š':138,'‹':139,'Œ':140,'Ž':142,'‘':145,'’':146,'“':147,'”':148,'•':149,'–':150,'—':151,'˜':152,'™':153,'š':154,'›':155,'œ':156,'ž':158,'Ÿ':159 };
  function binaryBytes(text) {
    const out = new Uint8Array(text.length);
    for (let i=0;i<text.length;i++) {
      const code=text.charCodeAt(i);
      out[i]= code<=255 ? code : (CP1252[text[i]] ?? 63);
    }
    return out;
  }
  function pdfLiteral(value) {
    return String(value ?? '').normalize('NFC').replace(/[^\x00-\xFF€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ]/g,'?').replace(/\\/g, '\\\\').replace(/\(/g,'\\(').replace(/\)/g,'\\)').replace(/[\r\n]/g,' ');
  }
  function rgbHex(hex){ const s=hex.replace('#',''); return [0,2,4].map(i=>(parseInt(s.slice(i,i+2),16)/255).toFixed(3)).join(' '); }
  function rect(x,top,w,h,hex) {return `${rgbHex(hex)} rg ${x.toFixed(2)} ${(HEIGHT-top-h).toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re f\n`;}
  function line(x1,top1,x2,top2,color='#dde7dd') { return `${rgbHex(color)} RG 0.6 w ${x1} ${HEIGHT-top1} m ${x2} ${HEIGHT-top2} l S\n`; }
  function text(x,top,value,size=9,bold=false,color='#273d34') {
    return `BT /${bold ? 'B':'R'} ${size} Tf ${rgbHex(color)} rg 1 0 0 1 ${x.toFixed(2)} ${(HEIGHT-top-size).toFixed(2)} Tm (${pdfLiteral(value)}) Tj ET\n`;
  }
  const textWidth = (value,size=9) => Array.from(String(value)).reduce((sum,ch)=>sum+(ch===' ' ? .28 : 'il1.,;:\'!|'.includes(ch)? .27 : 'MW@%'.includes(ch)? .84 : 'ABCDEFGHKNPQRSTUVWXYZ'.includes(ch)? .68 : .52)*size,0);
  function fit(value,width,size=9) {
    const s=String(value ?? ''); if (textWidth(s,size)<=width) return s;
    let v=s; while(v.length>1 && textWidth(`${v}…`,size)>width) v=v.slice(0,-1);
    return `${v}…`;
  }
  function wrap(value,width,size=8,maxLines=2) {
    const words=String(value ?? '').split(/\s+/).filter(Boolean), lines=[];
    let running='';
    for(let i=0;i<words.length;i++) {
      let candidate=running?`${running} ${words[i]}`:words[i];
      if(textWidth(candidate,size)<=width){running=candidate;continue;}
      if(running){lines.push(running);running='';}
      if(lines.length>=maxLines){ lines[maxLines-1]=fit(`${lines[maxLines-1]} …`,width,size);break; }
      if(textWidth(words[i],size)>width) running=fit(words[i],width,size);
      else running=words[i];
    }
    if(running && lines.length<maxLines) lines.push(running);
    if(!lines.length)lines.push('');
    return lines;
  }
  const niceQty = milli => (milli/1000).toLocaleString('es-MX',{maximumFractionDigits:3});
  function topHeader(pageNum, totalPages, products, info) {
    let s='';
    s+=rect(0,0,WIDTH,89,'#123e34');
    s+=rect(LEFT,19,4,47,'#a2d7b2');
    s+=text(LEFT+16,18,'REPORTE FINAL DE INVENTARIO',18,true,'#ffffff');
    s+=text(LEFT+17,46,`Generado: ${new Date().toLocaleString('es-MX')}   ·   Origen: ${fit(info.filename,240,9)}`,8.7,false,'#d4e7dd');
    s+=text(LEFT,102,`Productos incluidos: ${products.length}`,9.3,true,'#123e34');
    s+=text(LEFT+169,102,`Con conteo: ${products.filter(p=>(p.totalsMilli?.piece || 0)>0 || (p.totalsMilli?.source || 0)>0).length}`,9.3,true,'#123e34');
    s+=text(WIDTH-RIGHT-125,103,`Página ${pageNum} de ${totalPages}`,8.6,false,'#718279');
    s+=rect(LEFT,126,WIDTH-LEFT-RIGHT,28,'#e9f3ec');
    s+=text(LEFT+8,134,'FAMILIA',8,true,'#31594a');
    s+=text(LEFT+126,134,'CÓDIGO',8,true,'#31594a');
    s+=text(LEFT+194,134,'PRODUCTO DESCRIPCIÓN',8,true,'#31594a');
    s+=text(LEFT+537,134,'PIEZAS',8,true,'#31594a');
    s+=text(LEFT+621,134,'UNIDAD',8,true,'#31594a');
    s+=text(LEFT+692,134,'CANT. UNID.',8,true,'#31594a');
    return s;
  }
  function footer(num,count){return line(LEFT,558,WIDTH-RIGHT,558) + text(LEFT,566,'Sin conversión entre piezas y unidad de Excel · Inventario inicial excluido',7.5,false,'#829088') + text(WIDTH-RIGHT-95,566,`${num} / ${count}`,8,false,'#829088');}
  function makePages(products,info){
    const pages=[];
    let rows=[], y=162;
    for(const p of products){
      const description=wrap(p.description,328,8.3,2);
      const family=wrap(p.family,114,8,2);
      const height=Math.max(description.length,family.length)*11+14;
      if(y+height>BODY_BOTTOM && rows.length){pages.push(rows);rows=[];y=162;}
      rows.push({p,y,height,description,family});
      y+=height;
    }
    if(rows.length || !pages.length) pages.push(rows);
    return pages.map((entries,i)=>{
      let s=topHeader(i+1,pages.length,products,info);
      for(let j=0;j<entries.length;j++){
        const r=entries[j];
        if(j%2===1) s+=rect(LEFT,r.y,WIDTH-LEFT-RIGHT,r.height,'#f7faf7');
        s+=line(LEFT,r.y+r.height,WIDTH-RIGHT,r.y+r.height,'#e8eee8');
        r.family.forEach((x,k)=>s+=text(LEFT+8,r.y+8+k*11,x,8,false,'#607168'));
        s+=text(LEFT+126,r.y+8,fit(r.p.code,62,8.1),8.1,true,'#166d4e');
        r.description.forEach((x,k)=>s+=text(LEFT+194,r.y+8+k*11,x,8.3,false,'#25392f'));
        const pieces=niceQty(r.p.totalsMilli?.piece || 0);
        s+=text(LEFT+610-textWidth(pieces,9.4),r.y+7,pieces,9.4,true,'#0b6545');
        s+=text(LEFT+621,r.y+8,fit(r.p.unit || '—',62,8.4),8.4,false,'#607168');
        const other = Boolean(r.p.unit) && !/^(pza|pzas|pz|pieza|piezas|und|un|unidad|unidades)$/i.test(r.p.unit.trim());
        const source=other?niceQty(r.p.totalsMilli?.source || 0):'—';
        s+=text(WIDTH-RIGHT-9-textWidth(source,9.4),r.y+7,source,9.4,true,'#0b6545');
      }
      s+=footer(i+1,pages.length);
      return s;
    });
  }
  function concatChunks(chunks){ const len=chunks.reduce((n,c)=>n+c.length,0);const out=new Uint8Array(len);let offset=0; for(const chunk of chunks){out.set(chunk,offset);offset+=chunk.length;}return out; }
  function writePDF(pages){
    const objects=[];
    const reserve=()=>{objects.push(null);return objects.length;};
    const add=s=>{objects.push(binaryBytes(s));return objects.length;};
    const catalog=reserve(), rootPages=reserve();
    const regular=add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
    const bold=add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
    const pageIds=[];
    for(const content of pages){
      const stream=binaryBytes(content);
      const streamId=add(`<< /Length ${stream.length} >>\nstream\n${content}\nendstream`);
      const page=add(`<< /Type /Page /Parent ${rootPages} 0 R /MediaBox [0 0 ${WIDTH} ${HEIGHT}] /Resources << /Font << /R ${regular} 0 R /B ${bold} 0 R >> >> /Contents ${streamId} 0 R >>`);
      pageIds.push(page);
    }
    objects[rootPages-1]=binaryBytes(`<< /Type /Pages /Kids [${pageIds.map(id=>`${id} 0 R`).join(' ')}] /Count ${pageIds.length} >>`);
    objects[catalog-1]=binaryBytes(`<< /Type /Catalog /Pages ${rootPages} 0 R >>`);
    const parts=[binaryBytes('%PDF-1.4\n%âãÏÓ\n')],offsets=[0]; let position=parts[0].length;
    for(let i=0;i<objects.length;i++){
      offsets.push(position);
      const prefix=binaryBytes(`${i+1} 0 obj\n`),suffix=binaryBytes('\nendobj\n');
      parts.push(prefix,objects[i],suffix); position+=prefix.length+objects[i].length+suffix.length;
    }
    const xrefPosition=position;
    let xref=`xref\n0 ${objects.length+1}\n0000000000 65535 f \n`;
    for(let i=1;i<offsets.length;i++)xref+=`${String(offsets[i]).padStart(10,'0')} 00000 n \n`;
    xref+=`trailer\n<< /Root ${catalog} 0 R /Size ${objects.length+1} >>\nstartxref\n${xrefPosition}\n%%EOF`;
    parts.push(binaryBytes(xref));
    return new Blob([concatChunks(parts)],{type:'application/pdf'});
  }
  function exportPDF(products,info){return writePDF(makePages(products,info));}
  root.InventoryPDF={exportPDF};
})(window);
