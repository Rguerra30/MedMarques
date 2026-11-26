'use strict';

const glossaryEntries = [
 ['HPI','History of Present Illness','História da doença atual','Prontuário','Cronologia e detalhes da queixa atual.'],
 ['CC','Chief Complaint','Queixa principal','Prontuário','Em um prontuário, é o motivo principal da consulta.'],
 ['PMH','Past Medical History','Antecedentes pessoais','Prontuário','Doenças e condições prévias.'],
 ['FH','Family History','História familiar','Prontuário','Condições relevantes em familiares.'],
 ['SH','Social History','História social','Prontuário','Pode incluir rotina, tabagismo, álcool e moradia.'],
 ['ROS','Review of Systems','Revisão de sistemas','Prontuário','Investigação de sintomas por sistemas.'],
 ['PE','Physical Examination','Exame físico','Prontuário','Em títulos de prontuário. Em contexto clínico, PE pode significar pulmonary embolism, embolia pulmonar.'],
 ['BP','Blood Pressure','Pressão arterial','Sinais vitais'],
 ['HR','Heart Rate','Frequência cardíaca','Sinais vitais','Em estudos, HR também pode ser hazard ratio, razão de riscos instantâneos.'],
 ['RR','Respiratory Rate','Frequência respiratória','Sinais vitais','Em estudos, RR também pode ser relative risk, risco relativo.'],
 ['SpO₂','Peripheral Oxygen Saturation','Saturação periférica de oxigênio','Sinais vitais','Valor estimado por oximetria de pulso.'],
 ['DOE','Dyspnea on Exertion','Dispneia aos esforços','Sintomas'],
 ['SOB','Shortness of Breath','Falta de ar','Sintomas'],
 ['Wheezing','Wheezing','Sibilância','Sintomas'],
 ['Crackles','Crackles','Estertores','Sintomas'],
 ['Syncope','Syncope','Síncope','Sintomas','Perda transitória da consciência.'],
 ['Failure to thrive','Failure to thrive','Ganho ponderal ou crescimento insuficiente','Pediatria','Também aparece como FTT ou faltering growth.'],
 ['Well-child visit','Well-child visit','Consulta de puericultura','Pediatria'],
 ['CBC','Complete Blood Count','Hemograma completo','Exames'],
 ['WBC','White Blood Cell Count','Contagem de leucócitos','Exames','Pode indicar os próprios leucócitos ou a contagem, conforme o contexto.'],
 ['Hb / Hgb','Hemoglobin','Hemoglobina','Exames'],
 ['Hct','Hematocrit','Hematócrito','Exames'],
 ['Plt','Platelets','Plaquetas','Exames'],
 ['MCV','Mean Corpuscular Volume','Volume corpuscular médio (VCM)','Exames'],
 ['BMP','Basic Metabolic Panel','Painel metabólico básico','Exames'],
 ['ABG','Arterial Blood Gas','Gasometria arterial','Exames'],
 ['UA','Urinalysis','Análise de urina','Exames','Em cardiologia, UA também pode indicar unstable angina, angina instável.'],
 ['CXR','Chest X-Ray','Radiografia de tórax','Exames'],
 ['ECG / EKG','Electrocardiogram','Eletrocardiograma','Exames'],
 ['CT','Computed Tomography','Tomografia computadorizada','Exames'],
 ['MRI','Magnetic Resonance Imaging','Ressonância magnética','Exames'],
 ['PO','By mouth (per os)','Via oral','Condutas'],
 ['IV','Intravenous','Intravenoso','Condutas'],
 ['IM','Intramuscular','Intramuscular','Condutas'],
 ['PRN','As needed (pro re nata)','Conforme a necessidade','Condutas'],
 ['NPO','Nothing by mouth (nil per os)','Nada por via oral','Condutas'],
 ['DDx','Differential Diagnosis','Diagnóstico diferencial','Raciocínio clínico'],
 ['Next best step','Next best step','Próxima melhor conduta','Raciocínio clínico','Pode ser um exame, uma medida imediata ou acompanhamento, conforme o enunciado.'],
 ['Most likely diagnosis','Most likely diagnosis','Diagnóstico mais provável','Raciocínio clínico'],
 ['Gold standard','Gold standard','Padrão de referência','Raciocínio clínico'],
 ['PPV','Positive Predictive Value','Valor preditivo positivo (VPP)','Bioestatística'],
 ['NPV','Negative Predictive Value','Valor preditivo negativo (VPN)','Bioestatística'],
 ['OR','Odds Ratio','Razão de chances','Bioestatística','Em contexto cirúrgico, também pode indicar operating room, sala cirúrgica.'],
 ['CI','Confidence Interval','Intervalo de confiança (IC)','Bioestatística'],
 ['NNT','Number Needed to Treat','Número necessário para tratar','Bioestatística'],
 ['USMLE','United States Medical Licensing Examination','Exames médicos de licenciamento dos EUA','Certificação'],
 ['IMG','International Medical Graduate','Graduado internacional em medicina','Certificação'],
 ['ECFMG','Educational Commission for Foreign Medical Graduates','Entidade responsável pela certificação de graduados internacionais','Certificação'],
 ['OET Medicine','Occupational English Test — Medicine','Teste de inglês profissional para medicina','Certificação'],
 ['NBME','National Board of Medical Examiners','Organização que oferece autoavaliações médicas','Certificação'],
 ['CBSSA','Comprehensive Basic Science Self-Assessment','Autoavaliação NBME para Step 1','Certificação'],
 ['CCSSA','Comprehensive Clinical Science Self-Assessment','Autoavaliação NBME para Step 2 CK','Certificação']
].sort((a,b)=>a[0].localeCompare(b[0]));

function glossaryKey(value){
 return value.normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase();
}

const glossarySearch = document.getElementById('glossarySearch');
const glossaryCategory = document.getElementById('glossaryCategory');
for(const category of [...new Set(glossaryEntries.map(entry=>entry[3]))].sort((a,b)=>a.localeCompare(b,'pt-BR'))){
 glossaryCategory.add(new Option(category,category));
}
function renderGlossary(){
 const words=glossaryKey(glossarySearch.value).trim().split(/\s+/).filter(Boolean);
 const results=glossaryEntries.filter(entry=>(!glossaryCategory.value||entry[3]===glossaryCategory.value)
   &&words.every(word=>glossaryKey(entry.join(' ')).includes(word)));
 document.getElementById('glossaryCount').textContent=results.length+' de '+glossaryEntries.length+' termos';
 document.getElementById('glossaryRows').replaceChildren(...results.map(([term,english,meaning,category,note])=>{
  const row=document.createElement('tr');
  for(const [index,value] of [term,english,meaning,category,note??'—'].entries()){
   const cell=document.createElement(index?'td':'th');
   if(!index)cell.scope='row';
   if(index===1)cell.lang='en';
   cell.textContent=value;
   row.append(cell);
  }
  return row;
 }));
}
glossarySearch.addEventListener('input',renderGlossary);
glossaryCategory.addEventListener('change',renderGlossary);
renderGlossary();
