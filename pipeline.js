const SUPABASE_URL="https://jyocklhngsylbbghdsyy.supabase.co";
const SUPABASE_PUBLISHABLE_KEY="sb_publishable_bZWOcTa0iVwjVUQFkadhBQ_cbeT8fXv";
const STATUSES=["Planejado","Em produção","Validação","Finalizado"];
let sb=null,materials=[],sortables=[];
let currentMonth={year:new Date().getFullYear(),month:new Date().getMonth()};
let activeUser=localStorage.getItem("cm_active_user")||"";

function esc(v){return String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[m]))}
function sameMonth(iso){const [y,m]=String(iso).split("-").map(Number);return y===currentMonth.year&&m-1===currentMonth.month}
function fullDate(iso){const [y,m,d]=iso.split("-").map(Number);return new Intl.DateTimeFormat("pt-BR",{day:"2-digit",month:"2-digit"}).format(new Date(y,m-1,d))}
function monthLabel(){return new Intl.DateTimeFormat("pt-BR",{month:"long",year:"numeric"}).format(new Date(currentMonth.year,currentMonth.month,1)).replace(/^./,s=>s.toUpperCase())}
function urgent(m){return m.prioridade==="Importante e urgente"}
function recurrenceIcon(r){return r==="Sob demanda"?"◆":"↻"}
function toast(msg,error=false){const el=document.getElementById("toast");el.textContent=msg;el.className="toast show"+(error?" error":"");clearTimeout(window.__toastTimer);window.__toastTimer=setTimeout(()=>el.className="toast",2600)}
function setHealth(state,text){const el=document.getElementById("health");el.className="health "+state;el.querySelector("span").textContent=text}
function chooseProfile(force=false){if(force||!activeUser)document.getElementById("profileOverlay").classList.add("show")}
function setUser(name){activeUser=name;localStorage.setItem("cm_active_user",name);document.getElementById("profileOverlay").classList.remove("show");renderUser()}
function renderUser(){document.getElementById("userName").textContent=activeUser||"Selecionar";document.getElementById("avatar").textContent=activeUser?activeUser[0].toUpperCase():"?"}
function changeMonth(delta){const d=new Date(currentMonth.year,currentMonth.month+delta,1);currentMonth={year:d.getFullYear(),month:d.getMonth()};render()}
function cardHTML(m){return `<article class="kcard" data-id="${m.id}" data-status="${esc(m.status)}">
  <div class="card-top"><div class="card-title">${esc(m.nome)}</div><div class="date">${fullDate(m.data_rito)}</div></div>
  <div class="meta">
    <span class="pill ${urgent(m)?"urgent":""}">${urgent(m)?"Importante + urgente":"Importante"}</span>
    <span class="pill rec">${recurrenceIcon(m.recorrencia)} ${esc(m.recorrencia||"Sob demanda")}</span>
    <span class="pill">${esc(m.natureza||"Rito")}</span>
  </div>
  <div class="owner"><span>${esc(m.criado_por||"—")}</span><span>${m.requer_validacao===false?"Sem validação":"Validação Adriana"}</span></div>
</article>`}
function render(){
  document.getElementById("monthLabel").textContent=monthLabel();
  const list=materials.filter(m=>sameMonth(m.data_rito));
  document.getElementById("totalCount").textContent=list.length;
  document.getElementById("progressCount").textContent=list.filter(m=>m.status==="Em produção").length;
  document.getElementById("validationCount").textContent=list.filter(m=>m.status==="Validação").length;
  document.getElementById("doneCount").textContent=list.filter(m=>m.status==="Finalizado").length;
  for(const status of STATUSES){
    const rows=list.filter(m=>m.status===status).sort((a,b)=>status==="Finalizado"?b.data_rito.localeCompare(a.data_rito):a.data_rito.localeCompare(b.data_rito));
    document.getElementById("count-"+status).textContent=rows.length;
    document.getElementById("zone-"+status).innerHTML=rows.length?rows.map(cardHTML).join(""):`<div class="empty">Nenhum item</div>`;
  }
  initSortables();
}
function initSortables(){
  sortables.forEach(s=>s.destroy());sortables=[];
  document.querySelectorAll(".dropzone").forEach(zone=>{
    sortables.push(new Sortable(zone,{
      group:"controle-pipeline",animation:180,ghostClass:"sortable-ghost",dragClass:"sortable-drag",
      draggable:".kcard",fallbackOnBody:true,swapThreshold:.65,
      onStart:()=>document.querySelectorAll(".dropzone").forEach(z=>z.classList.add("dragover")),
      onEnd:async evt=>{
        document.querySelectorAll(".dropzone").forEach(z=>z.classList.remove("dragover"));
        const id=Number(evt.item.dataset.id);
        const newStatus=evt.to.dataset.status;
        const oldStatus=evt.from.dataset.status;
        if(!id||!newStatus||newStatus===oldStatus){render();return}
        await moveCard(id,oldStatus,newStatus);
      }
    }));
  });
}
async function moveCard(id,oldStatus,newStatus){
  if(!activeUser){chooseProfile(true);render();return}
  const m=materials.find(x=>x.id===id);if(!m){render();return}
  m.status=newStatus;render();
  try{
    const r=await fetch("/api/status",{
      method:"POST",headers:{"Content-Type":"application/json"},
      body:JSON.stringify({id,status:newStatus,oldStatus,usuario:activeUser})
    });
    const result=await r.json().catch(()=>({}));
    if(!r.ok)throw new Error(result.error||"Não foi possível atualizar o status.");
    if(result.data){const idx=materials.findIndex(x=>x.id===id);if(idx>=0)materials[idx]=result.data}
    toast(`${m.nome}: ${oldStatus} → ${newStatus}`);
    render();
  }catch(err){
    m.status=oldStatus;render();toast(err.message||"Falha ao mover o card.",true);
  }
}
async function load(){
  try{
    setHealth("","Conectando");
    const {data,error}=await sb.from("controle_materiais").select("*").order("data_rito",{ascending:true});
    if(error)throw error;
    materials=data||[];
    setHealth("ok","Banco conectado");
    render();
  }catch(err){console.error(err);setHealth("bad","Banco indisponível");toast("Não foi possível carregar o pipeline.",true)}
}
(async function init(){
  sb=window.supabase.createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY);
  renderUser();chooseProfile();
  await load();
  sb.channel("pipeline-live").on("postgres_changes",{event:"*",schema:"public",table:"controle_materiais"},()=>load()).subscribe();
})();