function renderPlanning(){const list=monthMaterials(),peak=weekBuckets(list).reduce((a,x)=>x.count>a.count?x:a,{label:"—",count:0});document.getElementById("planStatTotal").textContent=list.length;document.getElementById("planStatUrgent").textContent=list.filter(isUrgent).length;document.getElementById("planStatRecurring").textContent=list.filter(x=>x.recurrence!=="Sob demanda").length;document.getElementById("planStatPeak").textContent=peak.count?`${peak.label} · ${peak.count}`:"—";
document.getElementById("planningList").innerHTML=list.length?list.map(m=>`<div class="plan-item"><div class="plan-top"><div><div class="plan-title">${esc(m.name)}</div><div class="plan-meta">${fullDate(m.date)} · ${natureIcon(m.nature)} ${esc(m.nature)} · ${recurrenceIcon(m.recurrence)} ${esc(m.recurrence)}</div></div><div class="plan-actions"><span class="status ${statusClass(m.status)}">${esc(m.status)}</span><button class="btn btn-secondary" style="padding:8px 11px" onclick="openMaterial(${m.id})">Abrir</button></div></div><div class="milestone-row">${getMilestones(m.date,m.requiresValidation).map(ms=>`<div class="milestone"><strong>${ms.key} · ${ms.label}</strong><span>${fullDate(ms.date)}</span></div>`).join("")}</div></div>`).join(""):'<div class="empty">Nenhum item neste mês.</div>';
const summary=[["Total de itens",list.length],["Importantes e urgentes",list.filter(isUrgent).length],["Recorrentes",list.filter(x=>x.recurrence!=="Sob demanda").length],["Sob demanda",list.filter(x=>x.recurrence==="Sob demanda").length],["Aguardando Adriana",list.filter(x=>x.requiresValidation&&x.status==="Validação").length],["Semana mais carregada",peak.count?`${peak.label} (${peak.count})`:"—"]];document.getElementById("meetingSummary").innerHTML=summary.map(x=>`<div class="summary-line"><span>${x[0]}</span><strong>${x[1]}</strong></div>`).join("");
const p=[...list].sort((a,b)=>(Number(isUrgent(b))-Number(isUrgent(a)))||a.date.localeCompare(b.date)).slice(0,4);document.getElementById("priorityList").innerHTML=p.length?p.map(m=>`<div class="priority-item"><div><strong>${esc(m.name)}</strong><div class="muted-text">${fullDate(m.date)} · ${isUrgent(m)?"urgente":"planejável"}</div></div><span class="status ${statusClass(m.status)}">${esc(m.status)}</span></div>`).join(""):'<div class="empty">Sem prioridades.</div>';
const cross=materials.filter(m=>{if(sameMonth(m.date,currentMonth.year,currentMonth.month))return false;const d7=getMilestones(m.date,m.requiresValidation)[0].date;return sameMonth(d7,currentMonth.year,currentMonth.month)}).sort((a,b)=>getMilestones(a.date,a.requiresValidation)[0].date.localeCompare(getMilestones(b.date,b.requiresValidation)[0].date));document.getElementById("crossMonthPrep").innerHTML=cross.length?cross.map(m=>`<div class="priority-item"><div><strong>${esc(m.name)}</strong><div class="muted-text">Início ${fullDate(getMilestones(m.date,m.requiresValidation)[0].date)} · entrega ${fullDate(m.date)}</div></div><span class="badge badge-purple">D-7</span></div>`).join(""):'<div class="empty" style="padding:10px">Nenhuma preparação atravessando o mês.</div>'}
function renderActivity(){const lastSeen=localStorage.getItem(`cm_last_seen_${activeUser}`)||"",unread=activities.filter(a=>a.usuario!==activeUser&&(!lastSeen||a.created_at>lastSeen)).length;const count=document.getElementById("bellCount");count.textContent=unread;count.classList.toggle("hidden",unread===0);document.getElementById("activityList").innerHTML=activities.length?activities.map(a=>{const isUnread=a.usuario!==activeUser&&(!lastSeen||a.created_at>lastSeen);return`<div class="activity-item ${isUnread?"unread":""}"><strong>${esc(a.usuario)} · ${esc(a.acao)}</strong><p>${esc(a.detalhe||"")}</p><div class="activity-time">${formatActivityDate(a.created_at)}</div></div>`}).join(""):'<div class="empty">Ainda não há atividades registradas.</div>'}

/* PIPELINE_V34 */
window.pipelineDragState=null;
window.pipelineJustDragged=false;
const PIPELINE_COLUMNS=[
  {status:"Planejado",zone:"pipeZone-Planned",count:"pipeCount-Planned",kpi:"pipeKpiPlanned"},
  {status:"Em produção",zone:"pipeZone-Production",count:"pipeCount-Production",kpi:"pipeKpiProduction"},
  {status:"Validação",zone:"pipeZone-Validation",count:"pipeCount-Validation",kpi:"pipeKpiValidation"},
  {status:"Finalizado",zone:"pipeZone-Done",count:"pipeCount-Done",kpi:"pipeKpiDone"}
];

function pipelineCardHTML(m){
  return `<div class="pipeline-card" draggable="true" data-id="${m.id}" data-status="${esc(m.status)}"
    ondragstart="pipelineDragStart(event,${m.id},'${esc(m.status)}')"
    ondragend="pipelineDragEnd(event)"
    onclick="if(!window.pipelineJustDragged)openPipelineMaterial(${m.id})">
    <div class="pipeline-card-top">
      <div class="pipeline-card-title">${esc(m.name)}</div>
      <div class="pipeline-card-date">${shortDate(m.date)}</div>
    </div>
    <div class="mat-tags">
      <span class="tag ${isUrgent(m)?"urgent":""}">${isUrgent(m)?"Importante + urgente":"Importante"}</span>
      <span class="tag rec">${recurrenceIcon(m.recurrence)} ${esc(m.recurrence)}</span>
      <span class="tag ${m.nature==="Material"?"material":""}">${natureIcon(m.nature)} ${esc(m.nature)}</span>
    </div>
    <div class="pipeline-owner">
      <span>${esc(m.createdBy==="Sistema"?"Automático":m.createdBy)}</span>
      ${m.requiresValidation?'<span>Validação Adriana</span>':""}
    </div>
  </div>`;
}

function renderPipeline(){
  const firstZone=document.getElementById("pipeZone-Planned");
  if(!firstZone)return;
  const list=monthMaterials();
  PIPELINE_COLUMNS.forEach(cfg=>{
    const rows=list.filter(m=>m.status===cfg.status)
      .sort((a,b)=>cfg.status==="Finalizado"?b.date.localeCompare(a.date):a.date.localeCompare(b.date));
    const count=document.getElementById(cfg.count),kpi=document.getElementById(cfg.kpi),zone=document.getElementById(cfg.zone);
    if(count)count.textContent=rows.length;
    if(kpi)kpi.textContent=rows.length;
    if(zone)zone.innerHTML=rows.length?rows.map(pipelineCardHTML).join(""):'<div class="pipeline-empty">Nenhum item</div>';
  });
}

function pipelineDragStart(event,id,status){
  window.pipelineDragState={id:Number(id),oldStatus:status};
  window.pipelineJustDragged=true;
  event.currentTarget.classList.add("dragging");
  event.dataTransfer.effectAllowed="move";
  event.dataTransfer.setData("text/plain",String(id));
}
function pipelineDragEnd(event){
  event.currentTarget.classList.remove("dragging");
  document.querySelectorAll(".pipeline-zone").forEach(z=>z.classList.remove("dragover"));
  setTimeout(()=>window.pipelineJustDragged=false,300);
}
function pipelineDragOver(event){
  event.preventDefault();
  event.dataTransfer.dropEffect="move";
  event.currentTarget.classList.add("dragover");
}
function pipelineDragLeave(event){
  if(!event.currentTarget.contains(event.relatedTarget))event.currentTarget.classList.remove("dragover");
}
async function pipelineDrop(event){
  event.preventDefault();
  const zone=event.currentTarget;
  zone.classList.remove("dragover");
  const state=window.pipelineDragState;
  if(!state)return;
  const newStatus=zone.dataset.status;
  if(!newStatus||newStatus===state.oldStatus){renderPipeline();return}
  await movePipelineCard(state.id,state.oldStatus,newStatus);
}
async function movePipelineCard(id,oldStatus,newStatus){
  if(!activeUser){chooseProfile(true);renderPipeline();return}
  const m=materials.find(x=>x.id===id);
  if(!m){renderPipeline();return}
  const previous=m.status;
  m.status=newStatus;
  renderAll();
  try{
    const response=await fetch("/api/status",{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({id,status:newStatus,oldStatus,usuario:activeUser})
    });
    const result=await response.json().catch(()=>({}));
    if(!response.ok)throw new Error(result?.error||"Não foi possível atualizar o status.");
    if(result.data){
      const saved=fromDb(result.data);
      const idx=materials.findIndex(x=>x.id===id);
      if(idx>=0)materials[idx]=saved;
    }
    renderAll();
    try{await loadActivities()}catch{}
  }catch(err){
    m.status=previous;
    renderAll();
    alert("Não foi possível mover a atividade.\n\nDetalhe: "+(err?.message||"Falha de comunicação."));
  }finally{
    window.pipelineDragState=null;
  }
}
async function openPipelineMaterial(id){
  const m=materials.find(x=>x.id===id);
  if(!m)return;
  editMaterial(id);
  setStatusFieldVisible(false);
  if(activeUser&&!viewedThisSession.has(`${activeUser}:${id}`)){
    viewedThisSession.add(`${activeUser}:${id}`);
    try{await logActivity("Visualizou material",id,m.name);await loadActivities()}catch{}
  }
}

function renderAll(){renderUser();renderMonthChrome();renderKPIs();renderHome();renderCapacity();renderCalendar();renderDirector();renderPlanning();renderActivity();if(typeof renderPipeline==="function")renderPipeline()}
async function changeMonth(delta){const d=new Date(agendaMonth.year,agendaMonth.month+delta,1);agendaMonth={year:d.getFullYear(),month:d.getMonth()};await loadMaterials()}
async function toggleActivity(){const p=document.getElementById("activityPanel"),opening=!p.classList.contains("show");p.classList.toggle("show");if(opening){localStorage.setItem(`cm_last_seen_${activeUser}`,new Date().toISOString());await loadActivities();renderActivity()}}
async function openMaterial(id){const m=materials.find(x=>x.id===id);if(!m)return;if(activeUser&&!viewedThisSession.has(`${activeUser}:${id}`)){viewedThisSession.add(`${activeUser}:${id}`);await logActivity("Visualizou material",id,m.name);await loadActivities()}editMaterial(id)}
function updateValidationField(){const req=document.getElementById("fRequiresValidation").value==="true";const v=document.getElementById("fValidator");v.value=req?"Adriana":"Não se aplica";v.style.opacity=req?"1":".55";renderAutoMilestonesPreview()}
function renderAutoMilestonesPreview(){const date=document.getElementById("fDate").value,target=document.getElementById("modalMilestones"),req=document.getElementById("fRequiresValidation").value==="true";target.innerHTML=date?getMilestones(date,req).map(ms=>`<div class="milestone"><strong>${ms.key} · ${ms.label}</strong><span>${fullDate(ms.date)}</span></div>`).join(""):'<div class="muted-text">Selecione a data.</div>'}
async function renderItemHistory(id){const {data}=await sb.from("controle_materiais_atividade").select("*").eq("material_id",id).order("created_at",{ascending:false}).limit(12);document.getElementById("historyBox").classList.remove("hidden");document.getElementById("historyList").innerHTML=(data||[]).length?(data||[]).map(a=>`<div class="history-line"><strong>${esc(a.usuario)}</strong> · ${esc(a.acao)} · ${formatActivityDate(a.created_at)}</div>`).join(""):'<div class="muted-text">Sem histórico.</div>'}
function applyKnownDefaults(){return["Importante e urgente","Demanda extraordinária","Sob demanda",true]}
