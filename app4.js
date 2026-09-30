function setStatusFieldVisible(visible=true){const field=document.getElementById("statusField");if(field)field.classList.toggle("hidden",!visible)}
function openModal(){setStatusFieldVisible(true);editingId=null;document.getElementById("modalTitle").textContent="Novo material";document.getElementById("deleteBtn").classList.add("hidden");document.getElementById("historyBox").classList.add("hidden");["fName","fDate","fLink","fNotes"].forEach(id=>document.getElementById(id).value="");document.getElementById("fStatus").value="Planejado";document.getElementById("fPriority").value="Importante e urgente";document.getElementById("fNature").value="Demanda extraordinária";document.getElementById("fRecurrence").value="Sob demanda";document.getElementById("fRequiresValidation").value="true";document.getElementById("fValidator").value="Adriana";updateValidationField();document.getElementById("modal").classList.add("show")}
function editMaterial(id){setStatusFieldVisible(true);const m=materials.find(x=>x.id===id);if(!m)return;editingId=id;document.getElementById("modalTitle").textContent=m.name;document.getElementById("deleteBtn").classList.remove("hidden");document.getElementById("fName").value=m.name;document.getElementById("fDate").value=m.date;document.getElementById("fStatus").value=m.status;document.getElementById("fPriority").value=m.priority;document.getElementById("fNature").value=m.nature;document.getElementById("fRecurrence").value=m.recurrence;document.getElementById("fRequiresValidation").value=String(m.requiresValidation);document.getElementById("fValidator").value=m.requiresValidation?"Adriana":"Não se aplica";document.getElementById("fLink").value=m.link;document.getElementById("fNotes").value=m.notes;updateValidationField();renderItemHistory(id);document.getElementById("modal").classList.add("show")}
function closeModal(){document.getElementById("modal").classList.remove("show")}
async function saveMaterial(){
  const btn=document.querySelector("#modal .modal-actions-right .btn-primary");
  const originalText=btn?.textContent||"Salvar";
  if(!activeUser){
    chooseProfile(true);
    alert("Selecione quem está acessando antes de salvar a agenda.");
    return;
  }
  const name=document.getElementById("fName").value.trim();
  const date=document.getElementById("fDate").value;
  if(!name||!date){
    alert("Preencha o nome e a data.");
    return;
  }
  try{
    if(btn){btn.disabled=true;btn.textContent="Salvando...";}
    const obj={
      name,date,
      status:document.getElementById("fStatus").value,
      priority:document.getElementById("fPriority").value,
      nature:document.getElementById("fNature").value,
      recurrence:document.getElementById("fRecurrence").value,
      requiresValidation:document.getElementById("fRequiresValidation").value==="true",
      origin:editingId?(materials.find(x=>x.id===editingId)?.origin||""):"",
      createdBy:editingId?(materials.find(x=>x.id===editingId)?.createdBy||activeUser):activeUser,
      validator:document.getElementById("fRequiresValidation").value==="true"?"Adriana":"Não se aplica",
      link:document.getElementById("fLink").value.trim(),
      notes:document.getElementById("fNotes").value.trim()
    };
    const payload=toDb(obj);
    const response=await fetch("/api/material",{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({editingId,payload})
    });
    const result=await response.json().catch(()=>({}));
    if(!response.ok)throw new Error(result?.error||result?.detail||"Falha ao salvar pela Vercel.");
    if(!result.data)throw new Error("O servidor não confirmou o registro salvo.");
    const saved=fromDb(result.data);
    const idx=materials.findIndex(x=>x.id===saved.id);
    if(idx>=0)materials[idx]=saved; else materials.push(saved);
    materials.sort((a,b)=>a.date.localeCompare(b.date));
    const wasEditing=Boolean(editingId);
    const id=saved.id;
    closeModal();
    renderAll();
    if(sb){
      try{
        await logActivity(wasEditing?"Editou agenda":"Criou agenda",id,name);
        if(obj.requiresValidation&&obj.status==="Validação"){
          await logActivity("Enviou para validação",id,name+" · Adriana");
        }
      }catch(err){
        console.warn("Agenda salva, mas o histórico não pôde ser atualizado agora.",err);
      }
      try{
        await Promise.all([loadMaterials(),loadActivities()]);
      }catch(err){
        console.warn("Agenda salva, mas a sincronização imediata falhou.",err);
      }
    }
  }catch(err){
    console.error("saveMaterial",err);
    const raw=err?.message||"Falha de comunicação.";
    const friendly=/failed to fetch|network|load failed/i.test(raw)
      ?"Não foi possível acessar o servidor de salvamento agora. Tente novamente em alguns segundos."
      :raw;
    alert("Não foi possível salvar a agenda.\n\nDetalhe: "+friendly);
  }finally{
    if(btn){btn.disabled=false;btn.textContent=originalText;}
  }
}
function openDeleteOptions(){
  if(!editingId)return;
  const m=materials.find(x=>x.id===editingId);
  if(!m)return;
  const overlay=document.getElementById("deleteChoiceOverlay");
  const text=document.getElementById("deleteChoiceText");
  const allOption=document.getElementById("deleteAllOption");
  if(m.recurrence==="Sob demanda"){
    text.textContent=`${m.name} não possui recorrência. As duas opções removerão apenas este item.`;
    allOption.querySelector("span").textContent="Como não há recorrência, remove somente este item.";
  }else{
    text.textContent=`${m.name} está marcado como ${m.recurrence}. Escolha se deseja remover apenas esta ocorrência ou toda a série.`;
    allOption.querySelector("span").textContent="Remove todas as ocorrências desta série, incluindo futuras.";
  }
  overlay.classList.add("show");
}

function closeDeleteOptions(){
  document.getElementById("deleteChoiceOverlay")?.classList.remove("show");
}

async function deleteMaterialMode(mode){
  if(!editingId)return;
  const m=materials.find(x=>x.id===editingId);
  if(!m)return;

  const overlay=document.getElementById("deleteChoiceOverlay");
  const buttons=[...overlay.querySelectorAll("button")];
  buttons.forEach(b=>b.disabled=true);

  try{
    const response=await fetch("/api/delete-material",{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({
        id:editingId,
        mode,
        usuario:activeUser||"Walisom"
      })
    });

    const result=await response.json().catch(()=>({}));
    if(!response.ok)throw new Error(result?.error||"Não foi possível concluir a exclusão.");

    closeDeleteOptions();
    closeModal();
    editingId=null;
    await Promise.all([loadMaterials(),loadActivities()]);
  }catch(err){
    console.error("deleteMaterialMode",err);
    alert("Não foi possível excluir.\n\nDetalhe: "+(err?.message||"Falha de comunicação."));
  }finally{
    buttons.forEach(b=>b.disabled=false);
  }
}

async function duplicateCurrentMonth(){
  if(!activeUser){chooseProfile();return}
  const source=materials
    .filter(x=>sameMonth(x.date,agendaMonth.year,agendaMonth.month))
    .filter(x=>x.recurrence==="Sob demanda");

  if(!source.length){
    alert("Não há agendas sob demanda para duplicar neste mês.");
    return;
  }

  const next=new Date(agendaMonth.year,agendaMonth.month+1,1);
  const last=new Date(next.getFullYear(),next.getMonth()+1,0).getDate();

  if(!confirm(`Duplicar ${source.length} item(ns) sob demanda para ${monthLabel(next.getFullYear(),next.getMonth())}?`))return;

  const rows=source.map(m=>{
    const day=Math.min(Number(m.date.slice(-2)),last);
    return toDb({
      ...m,
      id:undefined,
      date:`${next.getFullYear()}-${String(next.getMonth()+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`,
      status:"Planejado",
      origin:"",
      createdBy:activeUser,
      link:""
    });
  });

  const {error}=await sb.from("controle_materiais").insert(rows);
  if(error){alert("Não foi possível duplicar.");return}

  await logActivity("Duplicou agenda",null,`${source.length} item(ns) para ${monthLabel(next.getFullYear(),next.getMonth())}`);
  agendaMonth={year:next.getFullYear(),month:next.getMonth()};
  await Promise.all([loadMaterials(),loadActivities()]);
}

document.querySelectorAll(".nav button").forEach(btn=>btn.addEventListener("click",async()=>{
  document.querySelectorAll(".nav button").forEach(b=>b.classList.remove("active"));
  btn.classList.add("active");
  document.querySelectorAll(".view").forEach(v=>v.classList.remove("active"));
  document.getElementById(btn.dataset.view).classList.add("active");

  // A Home concentra os indicadores operacionais. Sempre que ela volta a
  // ficar visível, sincroniza primeiro com o banco para evitar números stale.
  if(btn.dataset.view==="home"){
    const now=new Date();
    currentMonth={year:now.getFullYear(),month:now.getMonth()};
    try{await loadMaterials()}catch{}
  }else{
    renderAll();
  }
}));
document.getElementById("modal").addEventListener("click",e=>{if(e.target.id==="modal")closeModal()});
(async function init(){
  await initSupabase();
  sb.channel("controle-materiais-live")
    .on("postgres_changes",{event:"*",schema:"public",table:"controle_materiais"},()=>scheduleMaterialsReload())
    .on("postgres_changes",{event:"INSERT",schema:"public",table:"controle_materiais_atividade"},()=>loadActivities())
    .subscribe();
  chooseProfile();
  await Promise.all([loadMaterials(),loadActivities()]);
  renderUser();
})();
