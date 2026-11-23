from pathlib import Path
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from functools import partial
import argparse
ROOT=Path(__file__).resolve().parents[1]
class Handler(SimpleHTTPRequestHandler):
    def end_headers(self):
        text=(ROOT/'dist/_headers').read_text(encoding='utf-8')
        for line in text.splitlines():
            if line.startswith('  ') and ': ' in line:
                key,value=line.strip().split(': ',1)
                # HSTS não tem efeito no HTTP local; demais headers espelham o pacote.
                if key!='Strict-Transport-Security':self.send_header(key,value)
        super().end_headers()
    def send_error(self,code,message=None,explain=None):
        if code!=404:return super().send_error(code,message,explain)
        body=(ROOT/'dist/404.html').read_bytes();self.send_response(404);self.send_header('Content-Type','text/html; charset=utf-8');self.send_header('Content-Length',str(len(body)));self.end_headers();self.wfile.write(body)
if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--port',type=int,default=3080);args=parser.parse_args()
    server=ThreadingHTTPServer(('127.0.0.1',args.port),partial(Handler,directory=str(ROOT/'dist')))
    print(f'RAIZ local: http://127.0.0.1:{args.port}/',flush=True)
    try:server.serve_forever()
    except KeyboardInterrupt:pass
    finally:server.server_close()
