function openModal(){editingId=null;document.getElementById("modalTitle").textContent="Novo material";document.getElementById("deleteBtn").classList.add("hidden");document.getElementById("historyBox").classList.add("hidden");["fName","fDate","fLink","fNotes"].forEach(id=>document.getElementById(id).value="");document.getElementById("fStatus").value="Planejado";document.getElementById("fPriority").value="Importante e urgente";document.getElementById("fNature").value="Demanda extraordinária";document.getElementById("fRecurrence").value="Sob demanda";document.getElementById("fRequiresValidation").value="true";document.getElementById("fValidator").value="Adriana";updateValidationField();document.getElementById("modal").classList.add("show")}
function editMaterial(id){const m=materials.find(x=>x.id===id);if(!m)return;editingId=id;document.getElementById("modalTitle").textContent=m.name;document.getElementById("deleteBtn").classList.remove("hidden");document.getElementById("fName").value=m.name;document.getElementById("fDate").value=m.date;document.getElementById("fStatus").value=m.status;document.getElementById("fPriority").value=m.priority;document.getElementById("fNature").value=m.nature;document.getElementById("fRecurrence").value=m.recurrence;document.getElementById("fRequiresValidation").value=String(m.requiresValidation);document.getElementById("fValidator").value=m.requiresValidation?"Adriana":"Não se aplica";document.getElementById("fLink").value=m.link;document.getElementById("fNotes").value=m.notes;updateValidationField();renderItemHistory(id);document.getElementById("modal").classList.add("show")}
function closeModal(){document.getElementById("modal").classList.remove("show")}
document.getElementById("fName").addEventListener("blur",e=>{if(editingId)return;const [p,n,r,v]=applyKnownDefaults(e.target.value);document.getElementById("fPriority").value=p;document.getElementById("fNature").value=n;document.getElementById("fRecurrence").value=r;document.getElementById("fRequiresValidation").value=String(v);updateValidationField()});
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
    if(!sb)await initSupabase();
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
    const result=editingId
      ? await sb.from("controle_materiais").update(payload).eq("id",editingId).select().single()
      : await sb.from("controle_materiais").insert(payload).select().single();
    if(result.error)throw result.error;
    if(!result.data)throw new Error("O Supabase não confirmou o registro salvo.");
    const saved=fromDb(result.data);
    const idx=materials.findIndex(x=>x.id===saved.id);
    if(idx>=0)materials[idx]=saved; else materials.push(saved);
    materials.sort((a,b)=>a.date.localeCompare(b.date));
    const wasEditing=Boolean(editingId);
    const id=saved.id;
    closeModal();
    const [y,m]=date.split("-").map(Number);
    currentMonth={year:y,month:m-1};
    renderAll();
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
  }catch(err){
    console.error("saveMaterial",err);
    const raw=err?.message||"Falha de comunicação.";
    const friendly=/failed to fetch|network|load failed/i.test(raw)
      ?"Não foi possível conectar ao Supabase agora. O serviço está instável; tente novamente em alguns segundos."
      :raw;
    alert("Não foi possível salvar a agenda.\n\nDetalhe: "+friendly);
  }finally{
    if(btn){btn.disabled=false;btn.textContent=originalText;}
  }
}
async function deleteMaterial(){if(!editingId)return;const m=materials.find(x=>x.id===editingId);if(!m)return;if(!confirm(`Excluir ${m.name} de ${fullDate(m.date)}?${m.origin?"\n\nEsta ocorrência automática ficará marcada como cancelada e não será recriada.":""}`))return;if(m.origin){const {error:exError}=await sb.from("controle_materiais_recorrencia_excecoes").upsert({origem_recorrencia:m.origin,nome:m.name,data_rito:m.date,excluido_por:activeUser||"Walisom"},{onConflict:"origem_recorrencia"});if(exError){alert("Não foi possível registrar a exclusão da recorrência.");console.error(exError);return}}await logActivity(m.origin?"Cancelou ocorrência recorrente":"Excluiu agenda",editingId,`${m.name} · ${fullDate(m.date)}`);const {error}=await sb.from("controle_materiais").delete().eq("id",editingId);if(error){alert("Não foi possível excluir.");return}closeModal();await Promise.all([loadMaterials(),loadActivities()])}
async function duplicateCurrentMonth(){if(!activeUser){chooseProfile();return}const source=monthMaterials().filter(x=>x.recurrence==="Sob demanda");if(!source.length){alert("Não há agendas sob demanda para duplicar neste mês.");return}const next=new Date(currentMonth.year,currentMonth.month+1,1),last=new Date(next.getFullYear(),next.getMonth()+1,0).getDate();if(!confirm(`Duplicar ${source.length} item(ns) sob demanda para ${monthLabel(next.getFullYear(),next.getMonth())}?`))return;const rows=source.map(m=>{const day=Math.min(Number(m.date.slice(-2)),last);return toDb({...m,id:undefined,date:`${next.getFullYear()}-${String(next.getMonth()+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`,status:"Planejado",origin:"",createdBy:activeUser,link:""})});const {data,error}=await sb.from("controle_materiais").insert(rows).select();if(error){alert("Não foi possível duplicar.");return}await logActivity("Duplicou agenda",null,`${source.length} item(ns) para ${monthLabel(next.getFullYear(),next.getMonth())}`);currentMonth={year:next.getFullYear(),month:next.getMonth()};await Promise.all([loadMaterials(),loadActivities()])}

document.querySelectorAll(".nav button").forEach(btn=>btn.addEventListener("click",()=>{document.querySelectorAll(".nav button").forEach(b=>b.classList.remove("active"));btn.classList.add("active");document.querySelectorAll(".view").forEach(v=>v.classList.remove("active"));document.getElementById(btn.dataset.view).classList.add("active")}));
document.getElementById("modal").addEventListener("click",e=>{if(e.target.id==="modal")closeModal()});
(async function init(){await initSupabase();sb.channel("controle-materiais-live").on("postgres_changes",{event:"*",schema:"public",table:"controle_materiais"},()=>loadMaterials()).on("postgres_changes",{event:"INSERT",schema:"public",table:"controle_materiais_atividade"},()=>loadActivities()).subscribe();chooseProfile();await ensureRecurringForMonth(currentMonth.year,currentMonth.month);await Promise.all([loadMaterials(),loadActivities()]);renderUser()})();
