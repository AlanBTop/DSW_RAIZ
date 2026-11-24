/* Exportações locais: nenhum dado financeiro é enviado a outro serviço. */
(() => {
  const encode = value => new TextEncoder().encode(value);
  const xml = value => String(value ?? '').replace(/[<>&"']/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&apos;'}[c]));
  const csvCell = value => '"' + String(value ?? '').replace(/^[=+@\-\t\r]/,"'$&").replace(/"/g,'""') + '"';
  function download(content,type,name) {
    const url=URL.createObjectURL(new Blob([content],{type})),link=document.createElement('a');
    link.href=url;link.download=name;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);
  }
  // XLSX OpenXML, ZIP sem compressão; células textuais não executam fórmulas.
  function zip(files) {
    const chunks=[],directory=[];let offset=0;
    const head=(size,values)=>{const b=new Uint8Array(size),v=new DataView(b.buffer);for(const [at,n,bytes] of values)bytes===2?v.setUint16(at,n,true):v.setUint32(at,n,true);return b;};
    for(const [path,text] of Object.entries(files)) {
      const name=encode(path),data=encode(text);let crc=0xffffffff;
      for(const byte of data){crc^=byte;for(let j=0;j<8;j++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}
      crc=(crc^0xffffffff)>>>0;
      const local=head(30,[[0,0x04034b50,4],[4,20,2],[10,0,2],[12,33,2],[14,crc,4],[18,data.length,4],[22,data.length,4],[26,name.length,2]]);
      chunks.push(local,name,data);
      directory.push(head(46,[[0,0x02014b50,4],[4,20,2],[6,20,2],[14,33,2],[16,crc,4],[20,data.length,4],[24,data.length,4],[28,name.length,2],[42,offset,4]]),name);
      offset+=local.length+name.length+data.length;
    }
    const size=directory.reduce((n,b)=>n+b.length,0),count=Object.keys(files).length;
    const end=head(22,[[0,0x06054b50,4],[8,count,2],[10,count,2],[12,size,4],[16,offset,4]]);
    const result=new Uint8Array(offset+size+22);let position=0;
    for(const chunk of [...chunks,...directory,end]){result.set(chunk,position);position+=chunk.length;}return result;
  }
  function xlsx(rows) {
    const sheet=rows.map((row,i)=>'<row r="'+(i+1)+'">'+row.map(value=>typeof value==='number'&&Number.isFinite(value)?'<c><v>'+value+'</v></c>':'<c t="inlineStr"><is><t xml:space="preserve">'+xml(value)+'</t></is></c>').join('')+'</row>').join('');
    const files={
      '[Content_Types].xml':'<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>',
      '_rels/.rels':'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>',
      'xl/workbook.xml':'<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Pagamentos RAIZ" sheetId="1" r:id="rId1"/></sheets></workbook>',
      'xl/_rels/workbook.xml.rels':'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>',
      'xl/worksheets/sheet1.xml':'<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>'+sheet+'</sheetData></worksheet>'
    };
    return zip(files);
  }
  window.RaizFinanceExport={
    csv:rows=>download('\ufeff'+rows.map(r=>r.map(csvCell).join(';')).join('\r\n'),'text/csv;charset=utf-8','raiz-pagamentos.csv'),
    excel:rows=>download(xlsx(rows),'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','raiz-pagamentos.xlsx')
  };
})();
