const fs=require('node:fs');const path=require('node:path');const vm=require('node:vm');const assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../dist');const files=[];
function walk(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,entry.name);if(entry.isDirectory())walk(p);else files.push(p);}}walk(root);
let syntax=0;for(const file of files){if(file.endsWith('.js')){new vm.Script(fs.readFileSync(file,'utf8'),{filename:file});syntax++;}if(file.endsWith('.html')){const text=fs.readFileSync(file,'utf8');for(const m of text.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)){if(!/\bsrc=/.test(m[1])&&m[2].trim()){new vm.Script(m[2],{filename:file});syntax++;}}for(const m of text.matchAll(/(?:src|href)="([^"#?]+)(?:[?#][^"]*)?"/g)){if(/^(https?:|data:|mailto:|tel:)/.test(m[1]))continue;const target=m[1].startsWith('/')?path.join(root,m[1]):path.resolve(path.dirname(file),m[1]);assert(fs.existsSync(target),file+' referência ausente: '+m[1]);}}}
const envContext={window:{}};vm.runInNewContext(fs.readFileSync(path.join(root,'config/environment.js'),'utf8'),envContext);const env=envContext.window.RaizEnvironment;
assert.equal(env.mode,'online');assert.equal(env.allowPresentation,false);assert.equal(env.allowLocalAdapter,false);assert(env.publishableKey.startsWith('sb_publishable_'));
const publicFiles=files.filter(f=>!f.includes(path.sep+'vendor'+path.sep)&&/\.(js|html|json)$/.test(f));for(const f of publicFiles){const s=fs.readFileSync(f,'utf8');assert(!/sb_secret_[A-Za-z0-9]+|-----BEGIN (?:RSA )?PRIVATE KEY-----/.test(s),'Segredo no bundle: '+f);}
assert(fs.readFileSync(path.join(root,'_headers'),'utf8').includes('Content-Security-Policy:'));
assert(fs.readFileSync(path.join(root,'privacidade.html'),'utf8').includes('suporteraiz.mkt@hotmail.com'));
assert(fs.statSync(path.join(root,'assets/vitrine-botanica.webp')).size<fs.statSync(path.resolve(root,'../assets/source/vitrine-botanica.png')).size);
console.log(JSON.stringify({syntax,localReferences:'aprovadas',secrets:'nenhum detectado',presentation:'desabilitada',headers:'CSP presente'}));
