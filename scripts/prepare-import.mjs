import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const [input, output] = process.argv.slice(2);
if (!input || !output || !output.endsWith('.private.sql')) {
 throw new Error('Uso: node scripts/prepare-import.mjs imports/lote.json imports/lote.private.sql');
}
const rows = JSON.parse(readFileSync(input, 'utf8'));
if (!Array.isArray(rows) || !rows.length) throw new Error('O arquivo precisa conter uma lista de questões.');
const tracks = new Set(['Step 1', 'Step 2 CK']);
const batches = new Map();
const fingerprints = new Set();
const isText = value => typeof value === 'string' && value.trim().length > 0;
const normalize = value => value.trim().toLowerCase().replace(/\s+/gu, ' ');
const cleanRows = rows.map(({track,stage,mode,topic,stem,options,answer,reason,tutor}, index) => {
 const valid = tracks.has(track) && isText(stage) && stage.length <= 100
  && ['practice','mock'].includes(mode) && [topic,stem,reason].every(isText)
  && [options,tutor].every(values => Array.isArray(values) && values.length === 4 && values.every(isText))
  && new Set(options.map(normalize)).size === 4 && Number.isInteger(answer) && answer >= 0 && answer <= 3;
 if (!valid) throw new Error('Questão '+(index+1)+': campos inválidos. Confira o formato no README.');
 const normalizedStem = normalize(stem);
 if (fingerprints.has(normalizedStem)) throw new Error('Questão '+(index+1)+': enunciado duplicado no lote.');
 fingerprints.add(normalizedStem);
 stage=stage.trim();
 const group=batches.get(normalize(stage))??{track,stage,practice:false,mock:false};
 if (group.track!==track||group.stage!==stage) throw new Error('Use um nome único e consistente para cada etapa.');
 group[mode]=true;
 batches.set(normalize(stage),group);
 return {track,stage,mode,topic,stem,options,answer,reason,tutor};
});
for (const group of batches.values()) {
 if (!group.practice || !group.mock) throw new Error('A etapa '+group.stage+' precisa de questões distintas de treino e simulado.');
}
const payload=JSON.stringify(cleanRows);
const tag='$med_'+createHash('sha256').update(payload).digest('hex')+'$';
if(payload.includes(tag))throw new Error('Dados incompatíveis com o delimitador.');
const sql=`begin;
lock table public.study_questions in share row exclusive mode;

create temporary table question_import (track text, stage text, mode text, topic text, stem text, options jsonb, answer integer, reason text, tutor jsonb) on commit drop;
insert into question_import (track,stage,mode,topic,stem,options,answer,reason,tutor)
select track,stage,mode,topic,stem,options,answer,reason,tutor
from jsonb_populate_recordset(null::public.study_questions, ${tag}${payload}${tag});

do $validate$
begin
 if exists (
  select 1 from question_import q join public.study_questions s
  on lower(btrim(q.stage)) = lower(btrim(s.stage))
     or lower(regexp_replace(btrim(q.stem), '[[:space:]]+', ' ', 'g')) =
        lower(regexp_replace(btrim(s.stem), '[[:space:]]+', ' ', 'g'))
 ) then raise exception 'O lote contém uma etapa ou enunciado já cadastrado.'; end if;
end
$validate$;

insert into public.study_questions (id,track,stage,mode,topic,stem,options,answer,reason,tutor)
select coalesce((select max(id) from public.study_questions),-1) + row_number() over (order by stage, mode, stem),
 track,stage,mode,topic,stem,options,answer,reason,tutor from question_import;
commit;
`;
writeFileSync(output,sql,{flag:'wx',mode:0o600});
console.log(cleanRows.length+' questões, '+batches.size+' etapas. SQL preparado.');
