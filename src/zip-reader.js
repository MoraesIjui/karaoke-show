/**
 * Leitor ZIP em JavaScript, sem dependências externas nem conexão com servidores.
 * Extrai uma música por vez, após validar o diretório central do ZIP.
 */
const MAX_ZIP_BYTES = 100 * 1024 * 1024;
const MAX_ENTRIES = 1000;
const MAX_MIDI_BYTES = 25 * 1024 * 1024;
const MAX_TOTAL_MIDI_BYTES = 256 * 1024 * 1024;

function asBytes(input) {
  return input instanceof Uint8Array ? input : new Uint8Array(input);
}

function fileName(bytes, utf8) {
  try { return new TextDecoder(utf8 ? 'utf-8' : 'utf-8', { fatal: true }).decode(bytes); }
  catch { return new TextDecoder('windows-1252').decode(bytes); }
}

function kindOf(name) {
  const leaf = name.split(/[\\/]/).pop() || '';
  if (/\.(kar|mid|midi)$/i.test(leaf)) return 'midi';
  if (/\.mk1$/i.test(leaf)) return 'mk1';
  if (/\.alb$/i.test(leaf)) return 'alb';
  return 'other';
}

const crcTable = Array.from({length:256},(_,n)=>{
  for(let i=0;i<8;i++) n=(n&1)?((n>>>1)^0xedb88320):(n>>>1);
  return n>>>0;
});

export function crc32(input) {
  const bytes=asBytes(input);
  let crc=0xffffffff;
  for(const byte of bytes) crc=crcTable[(crc^byte)&255]^(crc>>>8);
  return (crc^0xffffffff)>>>0;
}

export function inspectZip(input) {
  const bytes=asBytes(input);
  if(bytes.length>MAX_ZIP_BYTES) throw Error('ZIP acima de 100 MB. Divida em arquivos menores.');
  if(bytes.length<22) throw Error('Arquivo ZIP incompleto.');
  const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
  const u16=p=>view.getUint16(p,true),u32=p=>view.getUint32(p,true);
  let eocd=-1;
  for(let p=bytes.length-22;p>=Math.max(0,bytes.length-65557);p--){
    if(u32(p)===0x06054b50 && p+22+u16(p+20)===bytes.length){eocd=p;break;}
  }
  if(eocd<0) throw Error('Fim do ZIP não encontrado ou arquivo dividido em partes.');
  if(u16(eocd+4)!==0||u16(eocd+6)!==0) throw Error('ZIP multidisco não é suportado.');
  const count=u16(eocd+10),offset=u32(eocd+16),size=u32(eocd+12);
  if(count>MAX_ENTRIES || count===0xffff || offset===0xffffffff || size===0xffffffff)
    throw Error('ZIP com muitas entradas ou no formato ZIP64. Divida o acervo em partes menores.');
  if(offset+size>eocd) throw Error('Diretório ZIP inválido.');
  let pos=offset,totalMidiSize=0;
  const entries=[];
  for(let i=0;i<count;i++){
    if(pos+46>bytes.length || u32(pos)!==0x02014b50)
      throw Error('Índice de arquivos ZIP corrompido.');
    const flags=u16(pos+8),method=u16(pos+10);
    const compressedSize=u32(pos+20),sizeBytes=u32(pos+24);
    const nameLength=u16(pos+28),extraLength=u16(pos+30),commentLength=u16(pos+32);
    const end=pos+46+nameLength+extraLength+commentLength;
    if(end>bytes.length) throw Error('Nome ou metadados ZIP truncados.');
    const name=fileName(bytes.subarray(pos+46,pos+46+nameLength),!!(flags&0x800));
    const kind=kindOf(name);
    const entry={
      name,kind,method,flags,compressedSize,size:sizeBytes,
      checksum:u32(pos+16),offset:u32(pos+42)
    };
    if(name && !name.endsWith('/') && !name.endsWith('\\')){
      entries.push(entry);
      if(kind==='midi'){
        if(sizeBytes>MAX_MIDI_BYTES) entry.reason='Arquivo MIDI acima de 25 MB.';
        else totalMidiSize+=sizeBytes;
      }
    }
    pos=end;
  }
  if(totalMidiSize>MAX_TOTAL_MIDI_BYTES)
    throw Error('O ZIP possui mais de 256 MB de músicas MIDI. Separe o acervo em partes.');
  return entries;
}

function gzipEnvelope(compressed,checksum,rawSize) {
  const bytes=new Uint8Array(compressed.length+18);
  bytes.set([0x1f,0x8b,0x08,0,0,0,0,0,0,3]);
  bytes.set(compressed,10);
  const v=new DataView(bytes.buffer);
  v.setUint32(bytes.length-8,checksum,true);
  v.setUint32(bytes.length-4,rawSize,true);
  return bytes;
}

async function decompressedBytes(input,method,expected,checksum) {
  if(method===0)return input.slice();
  if(method!==8)throw Error('Método de compactação não suportado.');
  if(typeof DecompressionStream==='undefined')
    throw Error('Este navegador não suporta ZIP comprimido. Atualize o Android System WebView ou extraia o arquivo antes de importar.');
  let stream;
  try {
    stream=new Blob([input]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  } catch {
    // WebView sem suporte a deflate-raw: gzip usa o CRC32 e o tamanho já presentes no ZIP.
    const gzip=gzipEnvelope(input,checksum,expected);
    stream=new Blob([gzip]).stream().pipeThrough(new DecompressionStream('gzip'));
  }
  const reader=stream.getReader(),chunks=[];let total=0;
  try {
    while(true){
      const {done,value}=await reader.read();
      if(done)break;
      total+=value.byteLength;
      if(total>expected || total>MAX_MIDI_BYTES){
        await reader.cancel();
        throw Error('Conteúdo descompactado maior que o declarado no ZIP.');
      }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const out=new Uint8Array(total);
  let position=0;
  for(const chunk of chunks){out.set(chunk,position);position+=chunk.length;}
  return out;
}

/** Lê somente uma entrada selecionada, após inspecionar seu tamanho e integridade. */
export async function extractZipEntry(archive,entry) {
  const bytes=asBytes(archive);
  if(entry.kind!=='midi' || entry.reason) throw Error(entry.reason || 'Formato não compatível.');
  if(entry.flags&1)throw Error('Arquivo protegido por senha não suportado.');
  const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
  const at=entry.offset;
  if(at+30>bytes.length || view.getUint32(at,true)!==0x04034b50)
    throw Error('Cabeçalho local ZIP inválido.');
  const flags=view.getUint16(at+6,true);
  const method=view.getUint16(at+8,true);
  if(method!==entry.method || (flags&1)!==(entry.flags&1))
    throw Error('Metadados ZIP inconsistentes.');
  const start=at+30+view.getUint16(at+26,true)+view.getUint16(at+28,true);
  const end=start+entry.compressedSize;
  if(end>bytes.length)throw Error('Entrada ZIP truncada.');
  const result=await decompressedBytes(bytes.subarray(start,end),entry.method,entry.size,entry.checksum);
  if(result.length!==entry.size || crc32(result)!==entry.checksum)
    throw Error('Falha de integridade (CRC32) no arquivo ZIP.');
  return result;
}
