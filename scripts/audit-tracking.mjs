import {readFile,writeFile,mkdir,appendFile} from 'node:fs/promises';
import {trackingAudit} from '../src/tracking-audit.mjs';
const root=new URL('../',import.meta.url);
const read=async path=>JSON.parse(await readFile(new URL(path,root),'utf8'));
let previous={};try{previous=await read('monitoring/state.json');}catch(e){if(e.code!=='ENOENT')throw e;}
const report=trackingAudit({platforms:await read('data/platforms.json'),events:await read('data/events.json'),health:await read('data/health.json'),previous});
await mkdir(new URL('monitoring/',root),{recursive:true});
await mkdir(new URL('output/',root),{recursive:true});
await writeFile(new URL('monitoring/state.json',root),JSON.stringify({checkedAt:report.checkedAt,openKeys:report.openKeys},null,2)+'\n');
await writeFile(new URL('output/tracking-audit.json',root),JSON.stringify(report,null,2)+'\n');
if(process.env.GITHUB_STEP_SUMMARY)await appendFile(process.env.GITHUB_STEP_SUMMARY,`## Reset tracking audit\n\n${report.issues.length} open issues; ${report.newIssues.length} new alerts. Full evidence is in the tracking-audit artifact.\n\n`+report.issues.map(i=>`- ${i.message.replace(/[\r\n]/g,' ')}`).join('\n')+'\n');
if(process.env.GITHUB_OUTPUT)await appendFile(process.env.GITHUB_OUTPUT,`new_alerts=${report.newIssues.length}\n`);
console.log(JSON.stringify({status:report.status,newAlerts:report.newIssues.length,pendingReview:report.queue.length}));
// Exit only after source records and audit state have been persisted by the workflow.
if(process.argv.includes('--fail-on-new')&&report.newIssues.length)process.exitCode=1;
