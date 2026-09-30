let sb;
const SUPABASE_URL="https://jyocklhngsylbbghdsyy.supabase.co";
const SUPABASE_PUBLISHABLE_KEY="sb_publishable_bZWOcTa0iVwjVUQFkadhBQ_cbeT8fXv";
async function initSupabase(){
  if(sb)return sb;
  sb=window.supabase.createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY);
  return sb;
}

let materials=[], activities=[], editingId=null;
let currentMonth={year:new Date().getFullYear(),month:new Date().getMonth()};
let activeUser=localStorage.getItem("cm_active_user")||"";
let viewedThisSession=new Set();

const RECURRENCE_INTERVAL_DAYS={
  "Semanal":7,
  "Quinzenal":14
};

function esc(v){return String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[m]))}
function isoDate(d){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`}
function monthLabel(y,m){return new Intl.DateTimeFormat("pt-BR",{month:"long",year:"numeric"}).format(new Date(y,m,1)).replace(/^./,s=>s.toUpperCase())}
function fullDate(iso){const [y,m,d]=iso.split("-").map(Number);return new Intl.DateTimeFormat("pt-BR",{day:"2-digit",month:"2-digit",year:"numeric"}).format(new Date(y,m-1,d))}
function shortDate(iso){const [y,m,d]=iso.split("-").map(Number);return new Intl.DateTimeFormat("pt-BR",{day:"2-digit",month:"short"}).format(new Date(y,m-1,d)).replace(".","")}
function sameMonth(iso,y,m){const [yy,mm]=iso.split("-").map(Number);return yy===y&&mm-1===m}
function monthMaterials(){return materials.filter(x=>sameMonth(x.date,currentMonth.year,currentMonth.month)).sort((a,b)=>a.date.localeCompare(b.date))}
function isUrgent(m){return m.priority==="Importante e urgente"}
function stripeClass(m){return isUrgent(m)?"urgent":"important"}
function statusClass(s){return s==="Finalizado"?"st-done":s==="Em produção"?"st-prod":s==="Validação"?"st-val":"st-plan"}
function recurrenceIcon(r){return r==="Sob demanda"?"◆":"↻"}
function natureIcon(n){return n==="Material"?"📄":n==="Demanda extraordinária"?"⚡":"🎤"}
function fromDb(r){return{id:r.id,name:r.nome,date:r.data_rito,status:r.status,priority:r.prioridade||"Importante / não urgente",nature:r.natureza||"Rito",recurrence:r.recorrencia||"Sob demanda",origin:r.origem_recorrencia||"",createdBy:r.criado_por||"Walisom",requiresValidation:r.requer_validacao!==false,validator:r.requer_validacao===false?"Não se aplica":(r.validador||"Adriana"),link:r.link_sharepoint||"",notes:r.observacao||""}}
function toDb(m){return{nome:m.name,data_rito:m.date,status:m.status,prioridade:m.priority,natureza:m.nature,recorrencia:m.recurrence,origem_recorrencia:m.origin||null,criado_por:m.createdBy||activeUser||"Walisom",requer_validacao:m.requiresValidation!==false,validador:m.requiresValidation===false?"Não se aplica":(m.validator||"Adriana"),link_sharepoint:m.link||null,observacao:m.notes||null}}
function getMilestones(iso,requiresValidation=true){const base=new Date(iso+"T12:00:00");return[{key:"D-7",label:"Início",off:7},{key:"D-4",label:"Estrutura",off:4},{key:"D-2",label:requiresValidation?"Validação":"Revisão",off:2},{key:"D-1",label:"Final",off:1}].map(x=>{const d=new Date(base);d.setDate(d.getDate()-x.off);return{...x,date:isoDate(d)}})}
function daysUntil(iso){const now=new Date();now.setHours(0,0,0,0);const d=new Date(iso+"T12:00:00");d.setHours(0,0,0,0);return Math.ceil((d-now)/86400000)}
function formatActivityDate(ts){return new Intl.DateTimeFormat("pt-BR",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"}).format(new Date(ts))}
function currentUserInitial(){return activeUser?activeUser[0].toUpperCase():"?"}

async function logActivity(action,materialId=null,detail=""){
  if(!activeUser)return;
  const {error}=await sb.from("controle_materiais_atividade").insert({material_id:materialId,usuario:activeUser,acao:action,detalhe:detail||null});
  if(error)console.error("activity",error);
}
async function loadActivities(){
  const {data,error}=await sb.from("controle_materiais_atividade").select("*").order("created_at",{ascending:false}).limit(80);
  if(error){console.error(error);return}
  activities=data||[];
  renderActivity();
}
async function loadMaterials(){
  const {data,error}=await sb.from("controle_materiais").select("*").order("data_rito",{ascending:true});
  if(error){alert("Não foi possível carregar a agenda compartilhada.");console.error(error);return}
  materials=(data||[]).map(fromDb);
  await ensureRecurringForMonth(currentMonth.year,currentMonth.month);
  renderAll();
}

function isRecurrenceMaster(m){
  return m.recurrence!=="Sob demanda"&&!m.origin;
}

function recurrenceDatesForMonth(master,y,m){
  const out=[];
  const start=new Date(master.date+"T12:00:00");
  const monthStart=new Date(y,m,1,12,0,0,0);
  const monthEnd=new Date(y,m+1,0,12,0,0,0);
  if(monthEnd<start)return out;

  if(master.recurrence==="Mensal"){
    const diffMonths=(y-start.getFullYear())*12+(m-start.getMonth());
    if(diffMonths<0)return out;
    const day=Math.min(start.getDate(),monthEnd.getDate());
    out.push(new Date(y,m,day,12,0,0,0));
    return out;
  }

  const step=RECURRENCE_INTERVAL_DAYS[master.recurrence];
  if(!step)return out;

  let d=new Date(start);
  if(d<monthStart){
    const diffDays=Math.floor((monthStart-d)/86400000);
    const jumps=Math.floor(diffDays/step);
    d.setDate(d.getDate()+jumps*step);
    while(d<monthStart)d.setDate(d.getDate()+step);
  }
  while(d<=monthEnd){
    if(d>=monthStart)out.push(new Date(d));
    d.setDate(d.getDate()+step);
  }
  return out;
}

async function ensureRecurringForMonth(y,m){
  const masters=materials.filter(isRecurrenceMaster);
  if(!masters.length)return;

  const {data:excludedRows,error:excludedError}=await sb.from("controle_materiais_recorrencia_excecoes").select("origem_recorrencia");
  const exclusions=new Set((excludedError?[]:(excludedRows||[])).map(x=>x.origem_recorrencia));
  let inserted=false;

  for(const master of masters){
    for(const d of recurrenceDatesForMonth(master,y,m)){
      const date=isoDate(d);
      const origin=`series:${master.id}:${date}`;
      const isMasterDate=master.date===date;
      const exists=isMasterDate||materials.some(x=>x.origin===origin);
      if(exists||exclusions.has(origin))continue;

      const payload=toDb({
        ...master,
        id:undefined,
        date,
        status:"Planejado",
        origin,
        createdBy:"Sistema"
      });

      const {data,error}=await sb.from("controle_materiais").insert(payload).select().single();
      if(!error&&data){
        materials.push(fromDb(data));
        inserted=true;
      }else if(error&&error.code!=="23505"){
        console.error("recurrence",error);
      }
    }
  }

  if(inserted)materials.sort((a,b)=>a.date.localeCompare(b.date));
}
function chooseProfile(force=false){if(force||!activeUser)document.getElementById("profileOverlay").classList.add("show")}
async function setActiveUser(name){
  activeUser=name;localStorage.setItem("cm_active_user",name);document.getElementById("profileOverlay").classList.remove("show");renderUser();
  const sessionKey=`cm_access_logged_${name}`;
  if(!sessionStorage.getItem(sessionKey)){sessionStorage.setItem(sessionKey,"1");await logActivity("Acessou a agenda",null,"Abriu o Controle de Materiais");await loadActivities()}
}
function renderUser(){document.getElementById("topUser").textContent=activeUser||"Selecionar usuário";document.getElementById("topAvatar").textContent=currentUserInitial();document.getElementById("helloTitle").textContent=activeUser?`Bom dia, ${activeUser}.`:"Controle de Materiais"}

