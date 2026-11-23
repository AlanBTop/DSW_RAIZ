import { createClient } from 'npm:@supabase/supabase-js@2.119.2';

// Configure RAIZ_WEB_ORIGIN com a origem HTTPS exata do site antes do deploy.
Deno.serve(async request => {
  const origin = Deno.env.get('RAIZ_WEB_ORIGIN') || '';
  const cors = {'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info','Vary':'Origin'};
  const response = (status:number,body:unknown) => new Response(JSON.stringify(body),{status,headers:{...cors,'Content-Type':'application/json','Cache-Control':'no-store'}});
  if(!origin || request.headers.get('origin') !== origin) return response(403,{erro:'Origem não autorizada'});
  if(request.method==='OPTIONS') return new Response(null,{status:204,headers:{...cors,'Access-Control-Allow-Methods':'POST, OPTIONS'}});
  if(request.method!=='POST') return response(405,{erro:'Método não permitido'});
  const url=Deno.env.get('SUPABASE_URL')!;
  const publicKey=Deno.env.get('SUPABASE_ANON_KEY')!;
  const secret=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const authorization=request.headers.get('authorization') || '';
  if(!authorization.startsWith('Bearer ')) return response(401,{erro:'Autenticação necessária'});
  const userClient=createClient(url,publicKey,{global:{headers:{Authorization:authorization}},auth:{persistSession:false}});
  const {data:user,error:authError}=await userClient.auth.getUser();
  if(authError || !user.user) return response(401,{erro:'Sessão inválida'});
  const access=await userClient.rpc('raiz_acesso');
  if(access.error || access.data!=='admin') return response(403,{erro:'Acesso negado'});
  const admin=createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false}});
  let protocolo:string;
  try {protocolo=(await request.json()).protocolo;}catch {return response(400,{erro:'Pedido inválido'});}
  if(!/^[0-9a-f-]{36}$/i.test(protocolo)) return response(400,{erro:'Protocolo inválido'});
  const query=await admin.from('raiz_solicitacoes_privacidade').select('usuario_id,status').eq('id',protocolo).single();
  if(query.error) return response(503,{erro:'Serviço de exclusão indisponível. Verifique a configuração do banco.'});
  if(!query.data) return response(404,{erro:'Solicitação não encontrada'});
  if(query.data.status==='Concluída') return response(200,{concluida:true});
  // Se Auth foi excluído antes de uma interrupção, apenas conclui o protocolo.
  if(query.data.usuario_id){
    const prepare=await admin.rpc('raiz_preparar_exclusao',{p_protocolo:protocolo,p_operador:user.user.id});
    if(prepare.error) return response(409,{erro:'Encerre as operações pendentes ou confira a autorização antes da exclusão'});
    const deleted=await admin.auth.admin.deleteUser(prepare.data);
    if(deleted.error) return response(503,{erro:'Dados tratados; exclusão da identidade pendente. Repita o mesmo protocolo.'});
  }
  const done=await admin.rpc('raiz_concluir_exclusao',{p_protocolo:protocolo});
  if(done.error) return response(503,{erro:'Conclusão do protocolo pendente. Repita a solicitação.'});
  return response(200,{concluida:true,protocolo});
});
