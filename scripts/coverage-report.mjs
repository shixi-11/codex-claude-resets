import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {pathToFileURL} from 'node:url';
const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function coverageReport(health){
 const authors=health.coverage?.authors||{};
 const columns=['discovered','skippedIrrelevant','skippedFuture','checked','failed','incomplete','pending'];
 const rows=Object.entries(authors).map(([author,counts])=>{
  const source=health.sources?.find(s=>s.author?.toLowerCase()===author.toLowerCase());
  const total=counts.discovered||1;
  const bars=['checked','skippedIrrelevant','failed'].map(key=>`<span class="${key}" style="width:${Math.max(0,Math.min(100,100*(counts[key]||0)/total))}%" title="${key}: ${counts[key]||0}"></span>`).join('');
  return `<tr><th>@${escape(author)}<div class="bar">${bars}</div></th><td>${source?.ok?'OK':escape(source?.error||'Not checked')}</td>${columns.map(key=>`<td>${Number(counts[key]||0)}</td>`).join('')}</tr>`;
 }).join('');
 const failures=[...(health.sources||[]).filter(s=>!s.ok),...(health.failedPosts||[])].map(f=>`<tr><td>${escape(f.name||f.url)}</td><td>${escape(f.stage||'discovery')}</td><td>${escape(f.kind)}</td><td>${escape(f.status)}</td><td>${escape(f.attempts)}</td><td>${escape(f.error)}</td></tr>`).join('');
 return `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Collection coverage report</title><style>body{font:16px system-ui;margin:32px;color:#172b25;background:#fafbf8}table{border-collapse:collapse;width:100%;margin:20px 0}th,td{padding:10px;border:1px solid #ccd3ca;text-align:left;overflow-wrap:anywhere}th{min-width:130px}.scroll{overflow-x:auto}.bar{display:flex;background:#e4e6e1;height:10px;margin-top:8px}.checked{background:#29835c}.skippedIrrelevant{background:#829183}.failed{background:#b94737}p{line-height:1.6}h1{font-size:26px}code{overflow-wrap:anywhere}</style><h1>Collection coverage: ${escape(health.status)}</h1><p>Attempt: ${escape(health.lastAttemptAt)}<br>Last fully successful check: ${escape(health.lastSuccessAt||'none')}<br>Raw / unique candidates: ${escape(health.coverage?.rawCandidates)} / ${escape(health.coverage?.uniqueCandidates)}<br>HTTP attempts / retries: ${escape(health.requests?.attempted)} / ${escape(health.requests?.retries)}<br>Run budget exhausted: ${escape(health.coverage?.budgetExhausted)}</p><p>Green = checked; gray = irrelevant complete timeline text; red = failed. Discovery alone is not verification. Incomplete relay checks overlap checked; pending checks overlap failed. Failed timelines keep platform health degraded even when fallback links succeed.</p><div class="scroll"><table><thead><tr><th>Author / candidate coverage</th><th>Timeline</th>${columns.map(key=>`<th>${key}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table><table><thead><tr><th>Resource</th><th>Stage</th><th>Failure kind</th><th>HTTP</th><th>Attempts</th><th>Error</th></tr></thead><tbody>${failures}</tbody></table></div></html>`;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 const input=resolve(process.argv[2]||'data/health.json'),output=resolve(process.argv[3]||'output/coverage/index.html');
 const health=JSON.parse(await readFile(input,'utf8'));await mkdir(dirname(output),{recursive:true});await writeFile(output,coverageReport(health));console.log(output);
}
