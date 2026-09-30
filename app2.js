function renderMonthChrome(){const label=monthLabel(currentMonth.year,currentMonth.month);["homeMonthBadge","capacityMonthBadge","calendarMonthLabel","directorMonthBadge","planningMonthBadge"].forEach(id=>document.getElementById(id).textContent=label);document.getElementById("planningMonthTitle").textContent=`Planejamento • ${label}`}
function renderKPIs(){const list=monthMaterials();document.getElementById("kpiTotal").textContent=list.length;document.getElementById("kpiUrgent").textContent=list.filter(isUrgent).length;document.getElementById("kpiRecurring").textContent=list.filter(x=>x.recurrence!=="Sob demanda").length;document.getElementById("kpiValidation").textContent=list.filter(x=>x.requiresValidation&&x.status==="Validação"&&x.validator==="Adriana").length}
function statusOrder(m){
  if(m.status==="Em produção")return 0;
  if(m.status==="Validação")return 1;
  if(m.status==="Planejado")return 2;
  if(m.status==="Finalizado")return 3;
  return 4;
}
function prioritizedMonthMaterials(){
  return [...monthMaterials()].sort((a,b)=>{
    const sa=statusOrder(a), sb=statusOrder(b);
    if(sa!==sb)return sa-sb;
    if(sa===3)return b.date.localeCompare(a.date);
    return a.date.localeCompare(b.date);
  });
}
function materialHTML(m){return`<div class="material" onclick="openMaterial(${m.id})"><div class="priority-stripe ${stripeClass(m)}"></div><div class="material-body"><div class="mat-name">${esc(m.name)}</div><div class="mat-meta">${fullDate(m.date)} · ${esc(m.createdBy==="Sistema"?"Automático":m.createdBy)} · ${daysUntil(m.date)>=0?daysUntil(m.date)+" dias":"realizado"}</div><div class="mat-tags"><span class="tag ${isUrgent(m)?"urgent":""}">${isUrgent(m)?"Importante + urgente":"Importante"}</span><span class="tag rec">${recurrenceIcon(m.recurrence)} ${esc(m.recurrence)}</span><span class="tag ${m.nature==="Material"?"material":""}">${natureIcon(m.nature)} ${esc(m.nature)}</span></div></div><div class="material-side"><span class="status ${statusClass(m.status)}">${esc(m.status)}</span></div></div>`}
function renderHome(){}
function weekBuckets(list){const last=new Date(currentMonth.year,currentMonth.month+1,0).getDate(),out=[];for(let start=1;start<=last;start+=7){const end=Math.min(start+6,last),count=list.filter(x=>{const d=Number(x.date.slice(-2));return d>=start&&d<=end}).length;out.push({label:`${String(start).padStart(2,"0")}–${String(end).padStart(2,"0")}`,start,end,count})}return out}
function itemDate(iso){return new Date(`${iso}T12:00:00`)}
function joinAgendaNames(items,limit=2){const names=[...items].sort((a,b)=>(Number(isUrgent(b))-Number(isUrgent(a)))||(statusOrder(a)-statusOrder(b))||a.date.localeCompare(b.date)).slice(0,limit).map(x=>x.name);if(!names.length)return"";if(names.length===1)return names[0];return`${names.slice(0,-1).join(", ")} e ${names[names.length-1]}`}
function renderCapacity(){
  const list=monthMaterials();
  const active=list.filter(x=>x.status!=="Finalizado");
  const b=weekBuckets(active);
  document.getElementById("capacity").innerHTML=b.map(x=>`<div class="cap-row"><div class="cap-label">${x.label}</div><div class="bar"><span style="width:${Math.min(100,x.count*30)}%"></span></div><div class="cap-score">${x.count} item${x.count===1?"":"s"}</div></div>`).join("");

  const insight=document.getElementById("insightText");
  if(!list.length){insight.textContent="Sem itens cadastrados neste mês.";return{label:"—",count:0}}

  const now=new Date();now.setHours(12,0,0,0);
  const selectedIsCurrent=currentMonth.year===now.getFullYear()&&currentMonth.month===now.getMonth();
  const anchor=selectedIsCurrent?now:new Date(currentMonth.year,currentMonth.month,1,12,0,0,0);
  const horizon=new Date(anchor);horizon.setDate(horizon.getDate()+13);

  const operationalScope=selectedIsCurrent
    ? materials.filter(x=>x.status!=="Finalizado"&&itemDate(x.date)>=anchor&&itemDate(x.date)<=horizon)
    : active.filter(x=>itemDate(x.date)>=anchor&&itemDate(x.date)<=horizon);

  const overdue=selectedIsCurrent?active.filter(x=>itemDate(x.date)<anchor):[];
  const upcomingInMonth=active.filter(x=>itemDate(x.date)>=anchor).sort((a,b)=>a.date.localeCompare(b.date));
  const focus=operationalScope.filter(x=>x.status==="Em produção"||x.status==="Validação");
  const urgent=operationalScope.filter(isUrgent);
  const prod=operationalScope.filter(x=>x.status==="Em produção").length;
  const validation=operationalScope.filter(x=>x.status==="Validação").length;

  const anchorDay=selectedIsCurrent?anchor.getDate():1;
  const futureBuckets=b.filter(x=>x.end>=anchorDay);
  const peak=futureBuckets.reduce((a,x)=>x.count>a.count?x:a,{label:"—",count:0,start:0,end:0});

  if(overdue.length){
    const names=joinAgendaNames(overdue,2);
    const next=operationalScope.length?` Nos próximos 14 dias há ${operationalScope.length} entrega${operationalScope.length===1?"":"s"} ativa${operationalScope.length===1?"":"s"}.`:"";
    insight.textContent=`Há ${overdue.length} item${overdue.length===1?"":"s"} vencido${overdue.length===1?"":"s"} ainda não finalizado${overdue.length===1?"":"s"}: ${names}.${next}`;
    return peak;
  }

  if(operationalScope.length){
    const statusBits=[];
    if(prod)statusBits.push(`${prod} em produção`);
    if(validation)statusBits.push(`${validation} em validação`);
    const statusText=statusBits.length?` ${statusBits.join(" e ")}.`:"";
    const urgentNames=joinAgendaNames(urgent,2);
    const focusNames=joinAgendaNames(focus,2);
    const priorityText=urgentNames?` Priorize ${urgentNames}.`:focusNames?` Acompanhe de perto ${focusNames}.`:" Mantenha os marcos D-7 e D-4 para evitar novas urgências.";
    const concentration=peak.count?`A próxima concentração está na semana ${peak.label}, com ${peak.count} entrega${peak.count===1?"":"s"} ativa${peak.count===1?"":"s"}.`:`Há ${operationalScope.length} entrega${operationalScope.length===1?"":"s"} ativa${operationalScope.length===1?"":"s"} nos próximos 14 dias.`;
    insight.textContent=`${concentration}${statusText}${priorityText}`;
    return peak;
  }

  if(active.length===0){
    insight.textContent="As entregas do mês foram concluídas. Não há pendências operacionais no período.";
    return{label:"—",count:0};
  }

  if(upcomingInMonth.length){
    const next=upcomingInMonth[0];
    insight.textContent=`As próximas duas semanas estão sem concentração crítica. A próxima entrega ativa é ${next.name}, em ${fullDate(next.date)}.`;
    return peak;
  }

  insight.textContent="Não há entregas ativas futuras neste mês.";
  return peak;
}
function renderCalendar(){const el=document.getElementById("calendar"),names=["Seg","Ter","Qua","Qui","Sex","Sáb","Dom"];let h=names.map(n=>`<div class="dayname">${n}</div>`).join("");const first=new Date(currentMonth.year,currentMonth.month,1),off=(first.getDay()+6)%7,prev=new Date(currentMonth.year,currentMonth.month,0).getDate();for(let i=off-1;i>=0;i--)h+=`<div class="day muted"><div class="daynum">${prev-i}</div></div>`;const last=new Date(currentMonth.year,currentMonth.month+1,0).getDate(),today=new Date();for(let d=1;d<=last;d++){const iso=`${currentMonth.year}-${String(currentMonth.month+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`,evs=materials.filter(x=>x.date===iso),isToday=today.getFullYear()===currentMonth.year&&today.getMonth()===currentMonth.month&&today.getDate()===d?" today":"";h+=`<div class="day${isToday}"><div class="daynum">${d}</div>${evs.map(m=>`<div class="event-chip ${m.status==="Finalizado"?"ev-done":isUrgent(m)?"ev-urgent":"ev-important"}" onclick="event.stopPropagation();openMaterial(${m.id})">${esc(m.name)}</div>`).join("")}</div>`}const rest=(7-((off+last)%7))%7;for(let d=1;d<=rest;d++)h+=`<div class="day muted"><div class="daynum">${d}</div></div>`;el.innerHTML=h}
function renderDirector(){const list=prioritizedMonthMaterials();document.getElementById("directorGrid").innerHTML=list.length?list.map(m=>`<div class="card dir-card ${stripeClass(m)}"><div class="dir-date">${fullDate(m.date)}</div><div class="dir-title">${esc(m.name)}</div><div class="mat-tags"><span class="tag ${isUrgent(m)?"urgent":""}">${isUrgent(m)?"Importante + urgente":"Importante"}</span><span class="tag rec">${recurrenceIcon(m.recurrence)} ${esc(m.recurrence)}</span><span class="tag ${m.nature==="Material"?"material":""}">${natureIcon(m.nature)} ${esc(m.nature)}</span></div><div class="dir-row"><span class="status ${statusClass(m.status)}">${esc(m.status)}</span>${m.link?`<a href="${esc(m.link)}" target="_blank" rel="noopener" style="font-size:11px;font-weight:900;color:var(--purple-700)">Abrir SharePoint ↗</a>`:""}</div></div>`).join(""):'<div class="card panel empty" style="grid-column:1/-1">Nenhum item neste mês.</div>'}
