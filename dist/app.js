'use strict';
const stages=[
 ['Confirmar a elegibilidade','Localize a faculdade no World Directory of Medical Schools. Na nota da ECFMG, confira se o ano de formatura está contemplado.','World Directory','https://www.wdoms.org/'],
 ['Preparar os documentos','Confira as orientações para solicitar a certificação e verificar o diploma e o histórico acadêmico.','Requisitos de documentação','https://www.ecfmg.org/2026ib/credentials-requirements.html'],
 ['Concluir o Step 1','Estude as ciências básicas aplicadas à medicina. O resultado oficial é divulgado como aprovação ou reprovação.','Amostras oficiais do Step 1','https://www.usmle.org/exam-resources/step-1-materials/step-1-sample-test-questions'],
 ['Concluir o Step 2 CK','Treine a aplicação do conhecimento clínico. O exame tem resultado numérico.','Amostras oficiais do Step 2 CK','https://www.usmle.org/exam-resources/step-2-ck-materials/step-2-ck-sample-test-questions'],
 ['Concluir o Pathway aplicável','Verifique qual Pathway se aplica ao seu caso, os prazos do ciclo e a pontuação exigida no OET Medicine.','Pathways da ECFMG','https://www.ecfmg.org/certification-pathways/'],
 ['Confirmar a certificação','Acompanhe a situação do pedido e a verificação das credenciais.','Requisitos da certificação','https://www.ecfmg.org/2026ib/certification-requirements.html']
];
let bank={};
const titles={fundamentos:'Mecanismos e ciências básicas',metodos:'Bioestatística e epidemiologia',clinica:'Raciocínio clínico e pediatria',evidencia:'Evidências e tomada de decisão'};
const tracks={'Step 1':[],'Step 2 CK':[]};
function loadBank(rows){
 bank={};
 for(const modules of Object.values(tracks)) modules.length=0;
 for(const row of rows){
  const modules=tracks[row.track];
  let module=modules.find(item=>item.id===row.stage);
  if(!module){
   module={id:row.stage,title:titles[row.stage]??row.stage,track:row.track,practice:[],mock:[]};
   modules.push(module);
  }
  module[row.mode].push(row.id);
  bank[row.id]=[row.topic,row.stem,row.options,row.answer,row.reason,row.tutor];
 }
 for(const modules of Object.values(tracks)){
  const ranking=Object.keys(titles);
  modules.sort((a,b)=>(ranking.includes(a.id)?ranking.indexOf(a.id):ranking.length)-(ranking.includes(b.id)?ranking.indexOf(b.id):ranking.length));
 }
 exercises=Object.values(tracks).flat();
}
const clinicalSources=[
 ['Pediatria e clínica · Merck Manual Professional','https://www.merckmanuals.com/professional/health-topics'],
 ['Conteúdo oficial do Step 1','https://www.usmle.org/step-exams/step-1/step-1-exam-content'],
 ['Conteúdo oficial do Step 2 CK','https://www.usmle.org/step-exams/step-2-ck/step-2-ck-exam-content']
];
const empty={hours:5,focus:'Step 1',sessions:[],attempts:{},errors:[],checked:[],draft:'',practiceLog:[],mockLog:[],nbme:[],activeMock:null};
let state=structuredClone(empty);
const by=id=>document.getElementById(id);
let api,activeUser,revision,saving=false,saveConflict=false,pendingSave=null,bootVersion=0;
function save(message){
 pendingSave={state:structuredClone(state),message};
 by('logout').disabled=true;
 if(saveConflict){
  by('logout').disabled=false;
  by('status').textContent='Há uma versão mais recente em outro dispositivo. O progresso desta sessão fica disponível nesta aba. Recarregue para usar a versão sincronizada.';
  return;
 }
 by('status').textContent='Sincronizando…';
 void flushProgress();
}
async function flushProgress(){
 if(saving||!activeUser||!pendingSave)return;
 saving=true;
 const snapshot=pendingSave,userId=activeUser.id,expected=revision;
 pendingSave=null;
 try {
  const updated=expected===0
   ? await api.from('study_progress').insert({user_id:userId,state:snapshot.state,revision:1}).select('revision').single()
   : await api.from('study_progress').update({state:snapshot.state,revision:expected+1}).eq('user_id',userId).eq('revision',expected).select('revision').maybeSingle();
  if(updated.error?.code==='23505'||(!updated.error&&!updated.data)){
   saveConflict=true;
   by('status').textContent='Outra sessão salvou uma versão mais recente. Recarregue a página para abrir o progresso sincronizado.';
   return;
  }
  if(updated.error)throw updated.error;
  revision=updated.data.revision;
  by('status').textContent=snapshot.message+' Progresso sincronizado.';
 }catch{
  pendingSave??=snapshot;
  const status=by('status');
  status.replaceChildren(document.createTextNode('Falha ao sincronizar. '),action('Tentar salvar novamente',()=>void flushProgress(),'secondary'));
 }finally{
  saving=false;
  by('logout').disabled=!!pendingSave&&!saveConflict;
 }
 if(pendingSave&&!saveConflict&&by('status').textContent.endsWith('sincronizado.'))void flushProgress();
}
function show(id,move=true){
 document.querySelectorAll('.panel').forEach(el=>el.hidden=el.id!==id);
 document.querySelectorAll('nav button').forEach(el=>el.setAttribute('aria-pressed',String(el.dataset.go===id)));
 if(id==='revisao') renderErrors();
 if(id==='semanas') renderWeeks();
 if(move){const heading=by(id).querySelector('h2');heading.focus();}
}
document.querySelectorAll('[data-go]').forEach(el=>el.onclick=()=>show(el.dataset.go));
const dateFormat=new Intl.DateTimeFormat('pt-BR',{day:'2-digit',month:'2-digit'});
function update(){
 const monday=weekStart(Date.now());
 const minutes=state.sessions.filter(s=>s.date>=monday).reduce((sum,s)=>sum+s.duration,0);
 const target=state.hours*60;
 by('heroCount').textContent=minutes+' / '+target+' min';
 by('meter').max=target;by('meter').value=minutes;
 by('minutes').textContent=minutes;
 const scores=Object.values(state.attempts);
 by('accuracy').textContent=scores.length?Math.round(scores.filter(Boolean).length/scores.length*100)+'% ('+scores.length+')':'—';
 by('pending').textContent=state.errors.length;
 by('focusHint').textContent={
 'Step 1':'Prioridade sugerida: ciências básicas e interpretação de estudos.',
 'Step 2 CK':'Prioridade sugerida: raciocínio clínico, prevenção e leitura crítica.',
 'OET Medicine':'Prioridade sugerida: prática de escrita e comunicação clínica em inglês.'
 }[state.focus];
 by('sessions').replaceChildren(...state.sessions.slice(-5).reverse().map(s=>element('li',dateFormat.format(s.date)+' · '+s.track+' · '+s.duration+' min')));
}
function element(tag,label,cls){
 const el=document.createElement(tag);el.textContent=label;if(cls)el.className=cls;return el;
}
by('hours').value=state.hours;by('focus').value=state.focus;by('sessionTrack').value=state.focus;
by('settings').onsubmit=e=>{
 e.preventDefault();state.hours=Number(by('hours').value);state.focus=by('focus').value;by('sessionTrack').value=state.focus;
 save('Meta de '+state.hours+' horas por semana salva.');update();
};
by('session').onsubmit=e=>{
 e.preventDefault();state.sessions.push({duration:Number(by('duration').value),track:by('sessionTrack').value,date:Date.now()});
 by('duration').value='';save('Sessão registrada.');update();
};
let exercises=[];
const weekFormat=new Intl.DateTimeFormat('pt-BR',{day:'2-digit',month:'2-digit',year:'numeric'});
const optionsFor=id=>bank[id][2];
let selectedTrack=Object.hasOwn(tracks,state.focus)?state.focus:'Step 1';
let practice=null;
let timer=null;
const action=(label,handler,style='primary')=>{
 const button=element('button',label,style);
 button.onclick=handler;
 return button;
};
function weekStart(date){
 const monday=new Date(date);
 monday.setHours(0,0,0,0);
 monday.setDate(monday.getDate()-(monday.getDay()+6)%7);
 return monday.getTime();
}
function displayPercent(correct,total){
 return total?Math.round(100*correct/total)+'% ('+correct+'/'+total+')':'—';
}
function renderModules(){
 by('trackSwitch').replaceChildren(...Object.keys(tracks).map(track=>{
  const button=action(track,()=>{selectedTrack=track;renderModules();},'pill');
  button.setAttribute('aria-pressed',String(track===selectedTrack));
  return button;
 }));
 const modules=tracks[selectedTrack];
 by('modules').replaceChildren(...modules.map((module,index)=>{
  const card=element('article','','card');
  const complete=module.practice.filter(id=>id in state.attempts).length;
  const latest=state.mockLog.filter(mock=>mock.module===module.id).at(-1);
  const buttons=element('div','','row');
  const mockLabel=state.activeMock?.module===module.id?'Retomar simulado':'Iniciar simulado';
  const mock=action(mockLabel,()=>startMock(module),'secondary');
  mock.disabled=(!module.mock.length||complete<module.practice.length||!!state.activeMock)&&state.activeMock?.module!==module.id;
  const training=action('Praticar',()=>startPractice(module.practice));
  buttons.append(training,mock);
  const summary='Treino: '+complete+'/'+module.practice.length+' · '+(latest?'Último simulado: '+displayPercent(latest.correct,latest.total):'Simulado: '+module.mock.length+' questões em '+module.mock.length*2+' min');
  card.append(element('h3',(index+1)+'. '+module.title),element('p',summary),buttons);
  if(complete<module.practice.length)card.append(element('p','Responda a todas as questões de treino para liberar o simulado.'));
  return card;
 }));
 const info=element('div','','card sources');
 info.append(element('h3','Materiais de referência'));
 clinicalSources.forEach(([label,url])=>{
  const link=element('a',label);
  link.href=url;link.target='_blank';link.rel='noopener noreferrer';info.append(link);
 });
 by('modules').append(info);
}
function activateQuestion(){
 show('treino',false);
 const area=by('question');
 area.hidden=false;
 area.tabIndex=-1;
 area.focus();
}
function startPractice(ids){
 if(state.activeMock){
  resumeMock();
  return;
 }
 practice={ids,cursor:0};
 renderPractice();
 activateQuestion();
}
function questionForm(id,submitLabel,onSubmit){
 const [,stem,options]=bank[id];
 const heading=element('h3',stem);heading.lang='en';
 const form=element('form','');
 form.setAttribute('aria-label','Alternativas da questão');
 options.forEach((option,index)=>{
  const label=element('label',option,'option');
  label.lang='en';
  const input=document.createElement('input');
  input.type='radio';input.name='answer';input.value=index;input.required=true;
  label.prepend(input);
  form.append(label);
 });
 form.append(element('button',submitLabel,'primary'));
 form.onsubmit=event=>{
  event.preventDefault();
  onSubmit(Number(new FormData(form).get('answer')),form);
 };
 return [heading,form];
}
function setReview(id,correct){
 if(correct)state.errors=state.errors.filter(item=>item!==id);
 else if(!state.errors.includes(id))state.errors.push(id);
}
function feedbackFor(id,selected){
 const [,,,answer,reason]=bank[id];
 const correct=selected===answer;
 const prefix=correct?'Correto. ':selected===undefined?'':'Resposta selecionada: '+optionsFor(id)[selected]+'. ';
 const panel=element('div','','feedback'+(correct?'':' wrong'));
 panel.append(element('p',prefix+'Resposta correta: '+optionsFor(id)[answer]+'. '+reason),tutorFor(id,selected));
 return panel;
}
function tutorFor(id,selected){
 const [,,options,answer,,rationales]=bank[id];
 const details=element('details','','tutor');
 const list=element('ul','');
 options.forEach((option,index)=>{
  const item=element('li','');
  const heading=element('strong',String.fromCharCode(65+index)+'. '+option+(index===answer?' · correta':index===selected?' · sua resposta':''));
  item.append(heading,document.createTextNode(' — '+rationales[index]));
  list.append(item);
 });
 details.append(element('summary','Tutor · por que cada alternativa está certa ou errada?'),list);
 return details;
}
function renderPractice(){
 const area=by('question');
 area.replaceChildren();
 if(practice.cursor===practice.ids.length){
  area.append(element('h3','Treino concluído'),action('Voltar às etapas',()=>{area.hidden=true;show('treino');}),action('Abrir caderno de erros',()=>show('revisao'),'secondary'));
  return;
 }
 const id=practice.ids[practice.cursor];
 const [topic,,,answer]=bank[id];
 area.append(element('div',(practice.cursor+1)+' / '+practice.ids.length+' · '+topic,'flag'));
 area.append(...questionForm(id,'Corrigir',(selected,form)=>{
  const correct=selected===answer;
  if(!(id in state.attempts)){
   state.attempts[id]=correct;
   const module=exercises.find(item=>item.practice.includes(id));
   if(module)state.practiceLog.push({id,track:module.track,correct,date:Date.now()});
  }
  setReview(id,correct);
  form.querySelectorAll('input,button').forEach(el=>el.disabled=true);
  const result=feedbackFor(id,selected);
  result.setAttribute('role','status');
  const next=action(practice.cursor+1===practice.ids.length?'Concluir treino':'Próxima questão',()=>{
   practice.cursor++;
   renderPractice();
   area.focus();
  });
  area.append(result,next);
  next.focus();
  save('Resposta registrada.');
  update();
  renderModules();
 }));
}
function startMock(module){
 if(!state.activeMock){
  state.activeMock={module:module.id,answers:[],started:Date.now(),deadline:Date.now()+module.mock.length*120000};
  save('Simulado iniciado.');
 }
 resumeMock();
}
function resumeMock(){
 renderMock();
 activateQuestion();
}
function renderMock(){
 clearInterval(timer);
 const attempt=state.activeMock;
 if(!attempt)return;
 const module=exercises.find(item=>item.id===attempt.module);
 if(Date.now()>=attempt.deadline||attempt.answers.length>=module.mock.length){
  finishMock(module);
  return;
 }
 const area=by('question');
 const index=attempt.answers.length;
 const id=module.mock[index];
 const clock=element('p','','flag');
 function tick(){
  const remaining=Math.max(0,Math.ceil((attempt.deadline-Date.now())/1000));
  if(!remaining){finishMock(module);return;}
  clock.textContent='Tempo restante: '+Math.floor(remaining/60)+':'+String(remaining%60).padStart(2,'0');
 }
 area.replaceChildren(element('h3','Simulado · '+module.title),clock,element('p','Questão '+(index+1)+' de '+module.mock.length));
 area.append(...questionForm(id,index+1===module.mock.length?'Enviar e concluir':'Salvar e avançar',selected=>{
  if(Date.now()>=attempt.deadline){finishMock(module);return;}
  attempt.answers.push(selected);
  save('Progresso do simulado salvo.');
  renderMock();
  area.focus();
 }));
 area.append(action('Encerrar simulado',()=>finishMock(module),'secondary'));
 renderModules();
 timer=setInterval(tick,500);
 tick();
}
function finishMock(module){
 clearInterval(timer);
 const attempt=state.activeMock;
 if(!attempt)return;
 let correct=0;
 module.mock.forEach((id,index)=>{
  const hit=attempt.answers[index]===bank[id][3];
  if(hit)correct++;
  setReview(id,hit);
 });
 const result={module:module.id,track:module.track,correct,total:module.mock.length,date:Math.min(Date.now(),attempt.deadline)};
 state.mockLog.push(result);
 state.activeMock=null;
 save('Resultado do simulado registrado.');
 update();
 renderModules();
 if(!by('semanas').hidden)renderWeeks();
 const area=by('question');
 area.replaceChildren(element('h3','Resultado · '+module.title),element('p',displayPercent(correct,result.total)+' de acertos. Questões em branco contam no total.'));
 for(const [index,id] of module.mock.entries()){
  const details=element('details','');
  const stem=element('p',bank[id][1]);stem.lang='en';
  details.append(element('summary','Questão '+(index+1)+' · '+bank[id][0]),stem,feedbackFor(id,attempt.answers[index]));
  area.append(details);
 }
 area.append(action('Voltar às etapas',()=>{area.hidden=true;show('treino');}),action('Ver evolução semanal',()=>show('semanas'),'secondary'));
}
function renderWeeks(){
 const track=by('weeklyTrack').value;
 const study=state.sessions.filter(item=>item.track===track);
 const answers=state.practiceLog.filter(item=>item.track===track);
 const mocks=state.mockLog.filter(item=>item.track===track);
 const dates=[...new Set([weekStart(Date.now()),...[...study,...answers,...mocks].map(item=>weekStart(item.date))])].sort((a,b)=>b-a);
 by('weeks').replaceChildren(...dates.map(date=>{
  const belongs=item=>weekStart(item.date)===date;
  const weekly=answers.filter(belongs);
  const mocksThisWeek=mocks.filter(belongs);
  const row=element('tr','');
  const label=element('th',weekFormat.format(date));label.scope='row';
  row.append(label,element('td',study.filter(belongs).reduce((sum,item)=>sum+item.duration,0)),element('td',weekly.length),
   element('td',displayPercent(weekly.filter(item=>item.correct).length,weekly.length)),
   element('td',mocksThisWeek.map(item=>exercises.find(module=>module.id===item.module).title+': '+displayPercent(item.correct,item.total)).join(' · ')||'—'));
  return row;
 }));
 const next=tracks[track].find(module=>!mocks.some(mock=>mock.module===module.id));
 const pending=state.errors.filter(id=>tracks[track].some(module=>module.practice.includes(id)||module.mock.includes(id))).length;
 by('weeklyPriority').textContent=pending?'Prioridade sugerida: revisar '+pending+' questão(ões) pendente(s) desta trilha.':
  next?'Próxima etapa: '+next.title+'.':'Etapas iniciais concluídas. Consulte o material oficial e registre sua autoavaliação NBME.';
 const step1=track==='Step 1';
 by('nbmeType').textContent=step1?'CBSSA · probabilidade estimada no relatório':'CCSSA · pontuação estimada no relatório';
 by('nbmeLabel').textContent=step1?'Probabilidade (%)':'Pontuação';
 by('nbmeScore').max=step1?100:300;
 by('nbmeScore').min=step1?0:1;
 by('nbmeList').replaceChildren(...state.nbme.filter(item=>item.track===track)
  .sort((a,b)=>b.date.localeCompare(a.date))
  .map(item=>element('li',weekFormat.format(new Date(item.date+'T12:00:00'))+' · '+item.score+(step1?'%':' pontos'))));
}
by('weeklyTrack').value=selectedTrack;
by('weeklyTrack').onchange=()=>{
 by('nbmeScore').value='';
 renderWeeks();
};
by('nbmeDate').max=new Date(Date.now()-new Date().getTimezoneOffset()*60000).toISOString().slice(0,10);
by('nbmeDate').value=by('nbmeDate').max;
by('nbmeForm').onsubmit=event=>{
 event.preventDefault();
 state.nbme.push({track:by('weeklyTrack').value,date:by('nbmeDate').value,score:Number(by('nbmeScore').value)});
 by('nbmeScore').value='';
 save('Resultado NBME registrado.');
 renderWeeks();
};
function renderErrors(){
 const area=by('errors');area.replaceChildren();
 if(!state.errors.length){area.append(element('p','Nenhuma questão pendente de revisão.'));return;}
 state.errors.forEach(id=>{
 const [topic,stem,,,reason]=bank[id], card=element('article','','card');
 const question=element('p',stem);question.lang='en';
 const retry=element('button','Tentar novamente','primary'), done=element('button','Marcar revisada','secondary');
 retry.onclick=()=>startPractice([id]);
 done.onclick=()=>{state.errors=state.errors.filter(item=>item!==id);save('Questão revisada.');update();renderErrors();by('revisao').querySelector('h2').focus();};
 const buttons=element('div','','row');buttons.append(retry,done);
 const details=element('details','');details.append(element('summary','Ver explicação'),element('p',reason),tutorFor(id));
 card.append(element('h3',topic),question,details,buttons);area.append(card);
 });
}
function renderChecklist(){
by('stages').replaceChildren();
stages.forEach(([title,description,label,url],i)=>{
 const card=element('article','','card stage'), labelEl=element('label',''), input=document.createElement('input');
 input.type='checkbox';input.checked=state.checked.includes(i);
 input.onchange=()=>{state.checked=state.checked.filter(item=>item!==i);if(input.checked)state.checked.push(i);save('Checklist atualizado.');};
 labelEl.append(input,element('strong',title));
 const link=element('a',label);link.href=url;link.target='_blank';link.rel='noopener noreferrer';
 card.append(labelEl,element('p',description),link);by('stages').append(card);
});
}
by('draft').value=state.draft;
by('writing').onsubmit=e=>{e.preventDefault();state.draft=by('draft').value;save('Rascunho salvo.');};
let signup=false;
function authMessage(message){by('authStatus').textContent=message;}
function authControls(disabled){
 for(const id of ['google','emailAction','switchMode','email','password'])by(id).disabled=disabled;
}
async function enter(session){
 const version=++bootVersion;
 clearInterval(timer);
 by('study').hidden=true;
 by('loginPage').hidden=false;
 by('retryBoot').hidden=true;
 if(!session){
  activeUser=null;
  authControls(false);
  return;
 }
 authControls(true);
 authMessage('Carregando sua conta…');
 activeUser=null;
 try {
  const results=await Promise.all([
   (async()=>{
    const rows=[];
    for(let from=0;;from+=500){
     const {data,error}=await api.from('study_questions').select('*').order('id').range(from,from+499);
     if(error)throw error;
     rows.push(...data);
     if(data.length<500)return rows;
    }
   })(),
   api.from('study_progress').select('state,revision').eq('user_id',session.user.id).maybeSingle()
  ]);
  if(version!==bootVersion)return;
  if(!results[0].length||results[1].error)throw Error('Banco indisponível');
  loadBank(results[0]);
  activeUser=session.user;
  revision=results[1].data?.revision??0;
  state={...structuredClone(empty),...results[1].data?.state};
  state.errors=state.errors.filter(id=>bank[id]);
  if(state.activeMock&&!exercises.some(module=>module.id===state.activeMock.module))state.activeMock=null;
  pendingSave=null;
  saveConflict=false;
  by('logout').disabled=false;
  by('status').textContent='';
  by('question').replaceChildren();
  by('question').hidden=true;
  by('accountEmail').textContent=activeUser.email??'Conta de estudo';
  by('hours').value=state.hours;
  by('focus').value=state.focus;
  by('sessionTrack').value=state.focus;
  by('draft').value=state.draft;
  selectedTrack=Object.hasOwn(tracks,state.focus)?state.focus:'Step 1';
  by('weeklyTrack').value=selectedTrack;
  renderChecklist();
  update();
  renderModules();
  by('study').hidden=false;
  by('loginPage').hidden=true;
  authMessage('');
  show('painel',false);
  if(state.activeMock)resumeMock();
 }catch{
  if(version!==bootVersion)return;
  authMessage('Não foi possível carregar as questões ou o progresso. Tente novamente.');
  by('retryBoot').hidden=false;
  by('retryBoot').onclick=()=>void enter(session);
 }
}
const returnTo=location.origin+location.pathname;
async function initializeAuth(){
 authControls(true);
 if(!window.supabase||!window.medConfig){
  authMessage('Não foi possível carregar a configuração de acesso. Recarregue a página.');
  return;
 }
 api=window.supabase.createClient(window.medConfig.url,window.medConfig.key,{auth:{flowType:'pkce'}});
 const callbackError=new URL(location.href).searchParams.get('error_description');
 api.auth.onAuthStateChange((event,session)=>{
  if(event==='INITIAL_SESSION'||event==='SIGNED_OUT'||(event==='SIGNED_IN'&&activeUser?.id!==session?.user.id)){
   setTimeout(()=>void enter(session),0);
  }
 });
 if(callbackError)authMessage('O acesso não foi concluído. Volte ao formulário e tente novamente.');
}
by('switchMode').onclick=()=>{
 signup=!signup;
 by('emailAction').textContent=signup?'Cadastrar':'Entrar';
 by('switchMode').textContent=signup?'Voltar para entrar':'Criar conta';
 by('password').autocomplete=signup?'new-password':'current-password';
 by('password').minLength=signup?8:0;
 authMessage('');
};
by('loginForm').onsubmit=async event=>{
 event.preventDefault();
 authControls(true);
 const email=by('email').value.trim(),password=by('password').value;
 try{
  const {data,error}=signup
   ? await api.auth.signUp({email,password,options:{emailRedirectTo:returnTo}})
   : await api.auth.signInWithPassword({email,password});
  if(error){
   authMessage(signup?'Não foi possível concluir o cadastro. Confira o e-mail e tente novamente.':'Não foi possível entrar. Confira seu e-mail, a confirmação de cadastro e a senha.');
   return;
  }
  by('password').value='';
  if(!data.session)authMessage('Confira sua caixa de entrada para confirmar o cadastro e depois entre na plataforma.');
 }catch{authMessage('Não foi possível conectar. Tente novamente.');}
 finally{authControls(false);}
};
by('google').onclick=async()=>{
 authControls(true);
 try{
  const {error}=await api.auth.signInWithOAuth({provider:'google',options:{redirectTo:returnTo}});
  if(error)throw error;
 }catch{
  authMessage('A entrada com Google ainda pode depender da configuração do projeto. Use o cadastro por e-mail ou tente novamente.');
  authControls(false);
 }
};
by('logout').onclick=async()=>{
 if(saving)return;
 const {error}=await api.auth.signOut({scope:'local'});
 if(error)by('status').textContent='Não foi possível sair. Tente novamente.';
};
void initializeAuth();

