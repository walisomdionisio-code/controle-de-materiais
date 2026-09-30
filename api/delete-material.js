const SUPABASE_URL="https://jyocklhngsylbbghdsyy.supabase.co";
const SUPABASE_PUBLISHABLE_KEY="sb_publishable_bZWOcTa0iVwjVUQFkadhBQ_cbeT8fXv";
const wait=ms=>new Promise(r=>setTimeout(r,ms));

async function request(url,options,attempts=3){
  let last;
  for(let i=1;i<=attempts;i++){
    try{
      const r=await fetch(url,options);
      if(r.ok||r.status<500)return r;
      last=new Error("HTTP "+r.status);
    }catch(e){last=e}
    if(i<attempts)await wait(i*450);
  }
  throw last||new Error("Falha de comunicação.");
}

export default async function handler(req,res){
  if(req.method!=="POST"){
    res.setHeader("Allow","POST");
    return res.status(405).json({error:"Método não permitido."});
  }

  try{
    const body=typeof req.body==="string"?JSON.parse(req.body):(req.body||{});
    const {id,mode,usuario}=body;
    if(!id||!["item","tudo"].includes(mode)){
      return res.status(400).json({error:"Opção de exclusão inválida."});
    }

    const response=await request(
      SUPABASE_URL+"/rest/v1/rpc/excluir_material",
      {
        method:"POST",
        headers:{
          "apikey":SUPABASE_PUBLISHABLE_KEY,
          "Authorization":"Bearer "+SUPABASE_PUBLISHABLE_KEY,
          "Content-Type":"application/json",
          "Accept":"application/json"
        },
        body:JSON.stringify({
          p_id:Number(id),
          p_modo:mode,
          p_usuario:usuario||"Sistema"
        })
      },
      3
    );

    const raw=await response.text();
    let parsed=null;
    try{parsed=raw?JSON.parse(raw):null}catch{}

    if(!response.ok){
      return res.status(response.status).json({
        error:parsed?.message||parsed?.error||"Não foi possível concluir a exclusão."
      });
    }

    return res.status(200).json({data:parsed});
  }catch(err){
    console.error("delete-material",err);
    return res.status(500).json({error:"O servidor não conseguiu concluir a exclusão agora."});
  }
}