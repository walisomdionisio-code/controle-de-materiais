const SUPABASE_URL="https://jyocklhngsylbbghdsyy.supabase.co";
const SUPABASE_PUBLISHABLE_KEY="sb_publishable_bZWOcTa0iVwjVUQFkadhBQ_cbeT8fXv";
const VALID=["Planejado","Em produção","Validação","Finalizado"];
const wait=ms=>new Promise(r=>setTimeout(r,ms));

async function request(url,options,attempts=3){
  let last;
  for(let i=1;i<=attempts;i++){
    try{
      const r=await fetch(url,options);
      if(r.ok||r.status<500)return r;
      last=new Error("HTTP "+r.status);
    }catch(e){last=e}
    if(i<attempts)await wait(i*400);
  }
  throw last||new Error("Falha de comunicação.");
}

export default async function handler(req,res){
  if(req.method!=="POST"){res.setHeader("Allow","POST");return res.status(405).json({error:"Método não permitido."})}
  try{
    const body=typeof req.body==="string"?JSON.parse(req.body):(req.body||{});
    const {id,status,oldStatus,usuario}=body;
    if(!id||!VALID.includes(status))return res.status(400).json({error:"Status ou atividade inválida."});

    const headers={
      "apikey":SUPABASE_PUBLISHABLE_KEY,
      "Authorization":"Bearer "+SUPABASE_PUBLISHABLE_KEY,
      "Content-Type":"application/json",
      "Accept":"application/json",
      "Prefer":"return=representation"
    };

    const update=await request(
      SUPABASE_URL+"/rest/v1/controle_materiais?id=eq."+encodeURIComponent(id),
      {method:"PATCH",headers,body:JSON.stringify({status,updated_at:new Date().toISOString()})}
    );
    const raw=await update.text();let parsed=null;try{parsed=raw?JSON.parse(raw):null}catch{}
    if(!update.ok)return res.status(update.status).json({error:parsed?.message||"Não foi possível atualizar o status."});
    const row=Array.isArray(parsed)?parsed[0]:parsed;
    if(!row)return res.status(502).json({error:"O banco não retornou a atividade atualizada."});

    if(usuario){
      const detail=(row.nome||"Atividade")+" · "+(oldStatus||"—")+" → "+status;
      try{
        await request(SUPABASE_URL+"/rest/v1/controle_materiais_atividade",{
          method:"POST",headers:{...headers,"Prefer":"return=minimal"},
          body:JSON.stringify([{material_id:id,usuario,acao:"Moveu no pipeline",detalhe:detail}])
        },2);
      }catch(e){console.warn("Histórico do pipeline não registrado",e)}
    }
    return res.status(200).json({data:row});
  }catch(err){
    console.error("pipeline-status",err);
    return res.status(500).json({error:"O servidor não conseguiu atualizar o status agora."});
  }
}