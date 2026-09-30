let pipelineSortables=[];
let pipelineJustDragged=false;
const PIPE_STATUSES=[
  {status:"Planejado",zone:"pipeZone-Planned",count:"pipeCount-Planned",kpi:"pipeKpiPlanned"},
  {status:"Em produção",zone:"pipeZone-Production",count:"pipeCount-Production",kpi:"pipeKpiProduction"},
  {status:"Validação",zone:"pipeZone-Validation",count:"pipeCount-Validation",kpi:"pipeKpiValidation"},
  {status:"Finalizado",zone:"pipeZone-Done",count:"pipeCount-Done",kpi:"pipeKpiDone"}
];

function pipelineCardHTML(m){
  return `<div class="pipeline-card" data-id="${m.id}" data-status="${esc(m.status)}" onclick="if(!pipelineJustDragged)openPipelineMaterial(${m.id})">
    <div class="pipeline-card-top">
      <div class="pipeline-card-title">${esc(m.name)}</div>
      <div class="pipeline-card-date">${shortDate(m.date)}</div>
    </div>
    <div class="mat-tags">
      <span class="tag ${isUrgent(m)?"urgent":""}">${isUrgent(m)?"Importante + urgente":"Importante"}</span>
      <span class="tag rec">${recurrenceIcon(m.recurrence)} ${esc(m.recurrence)}</span>
      <span class="tag ${m.nature==="Material"?"material":""}">${natureIcon(m.nature)} ${esc(m.nature)}</span>
    </div>
    <div class="pipeline-owner"><span>${esc(m.createdBy==="Sistema"?"Automático":m.createdBy)}</span><span>${m.requiresValidation?"Validação Adriana":"Sem validação"}</span></div>
  </div>`;
}

function renderPipeline(){
  const label=document.getElementById("pipelineMonthLabel");
  if(!label)return;
  label.textContent=monthLabel(currentMonth.year,currentMonth.month);
  const list=monthMaterials();
  PIPE_STATUSES.forEach(cfg=>{
    const rows=list.filter(m=>m.status===cfg.status).sort((a,b)=>cfg.status==="Finalizado"?b.date.localeCompare(a.date):a.date.localeCompare(b.date));
    document.getElementById(cfg.count).textContent=rows.length;
    document.getElementById(cfg.kpi).textContent=rows.length;
    const zone=document.getElementById(cfg.zone);
    zone.innerHTML=rows.length?rows.map(pipelineCardHTML).join(""):'<div class="pipeline-empty">Nenhum item</div>';
  });
  initPipelineSortables();
}

function initPipelineSortables(){
  if(typeof Sortable==="undefined")return;
  pipelineSortables.forEach(s=>s.destroy());
  pipelineSortables=[];
  document.querySelectorAll(".pipeline-zone").forEach(zone=>{
    pipelineSortables.push(new Sortable(zone,{
      group:"controle-materiais-pipeline",
      animation:180,
      ghostClass:"sortable-ghost",
      dragClass:"sortable-drag",
      draggable:".pipeline-card",
      fallbackOnBody:true,
      swapThreshold:.65,
      onStart:()=>document.querySelectorAll(".pipeline-zone").forEach(z=>z.classList.add("dragover")),
      onEnd:async evt=>{
        document.querySelectorAll(".pipeline-zone").forEach(z=>z.classList.remove("dragover"));
        pipelineJustDragged=true;
        setTimeout(()=>pipelineJustDragged=false,250);
        const id=Number(evt.item.dataset.id);
        const oldStatus=evt.from.dataset.status;
        const newStatus=evt.to.dataset.status;
        if(!id||!newStatus||oldStatus===newStatus){renderPipeline();return}
        await movePipelineCard(id,oldStatus,newStatus);
      }
    }));
  });
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
  }
}

async function openPipelineMaterial(id){
  const m=materials.find(x=>x.id===id);
  if(!m)return;
  editMaterial(id);
  setStatusFieldVisible(false);
  if(activeUser&&!viewedThisSession.has(`${activeUser}:${id}`)){
    viewedThisSession.add(`${activeUser}:${id}`);
    try{
      await logActivity("Visualizou material",id,m.name);
      await loadActivities();
    }catch{}
  }
}

setTimeout(()=>{if(document.getElementById("pipeline"))renderPipeline()},0);