import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, sep, extname } from 'node:path';
const root = resolve(process.env.KS_ROOT || '.');
const port = Number(process.env.PORT || 4173);
const mime = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.webmanifest':'application/manifest+json','.svg':'image/svg+xml','.png':'image/png','.txt':'text/plain'};
const server = http.createServer(async (req,res) => {
  const pathname = decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  const path = resolve(root, '.' + pathname, pathname.endsWith('/') ? 'index.html' : '.');
  if (path !== root && !path.startsWith(root + sep)) { res.writeHead(403); res.end('Forbidden'); return; }
  try {
    if (!(await stat(path)).isFile()) throw new Error('Not file');
    const body = await readFile(path);
    res.writeHead(200,{'Content-Type':mime[extname(path)]||'application/octet-stream','Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'});
    res.end(body);
  } catch { res.writeHead(404);res.end('404 – Arquivo não encontrado'); }
});
server.listen(port,'0.0.0.0',()=>console.log(`🎤 Karaoke Show: http://localhost:${port}`));
