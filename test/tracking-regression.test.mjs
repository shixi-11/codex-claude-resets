import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {classify,reclassifyEvents} from '../src/evidence.mjs';
import {priorityDetails} from '../src/priority-details.mjs';
import {offers} from '../src/offers.mjs';
const events=JSON.parse(readFileSync(new URL('../data/events.json',import.meta.url)));
test('previously missed real announcements remain classified across rule changes',()=>{
 const expected={
  '2098685367058612394':['global','reported'],
  '2102463847714247142':['banked','announced'],
  '2102438800836489554':['banked','reported'],
  '2103637477760311522':['global','announced'],
  '2103911959544610829':['global','reported'],
 };
 for(const [id,pair] of Object.entries(expected)){
  const e=events.find(e=>e.id===id);assert.ok(e,`Missing regression source ${id}`);
  const result=classify(e.fullText,e);assert.deepEqual([result.kind,result.state],pair,id);
 }
 assert.deepEqual(reclassifyEvents(reclassifyEvents(events)),reclassifyEvents(events));
});
test('greetings and contraction variants do not change a completed or announced reset',()=>{
 for(const text of ['Reset fully propagated. Thank you for waiting!','Resets have all propagated. Enjoy your day.','All reset for everyone. Happy coding!'])assert.equal(classify(text,{author:'thsottiaux'}).state,'reported',text);
 for(const text of ["We'll reset Codex usage for all users.",'We’re resetting usage for all paid Codex users.'])assert.equal(classify(text,{author:'thsottiaux'}).state,'announced',text);
 for(const text of ['Resets have not propagated.','Resets will propagate tomorrow.','"Resets all propagated."','Resets all propagated. Correction: that was wrong.'])assert.notEqual(classify(text,{author:'thsottiaux'}).state,'reported',text);
 assert.equal(classify('Pro and Max users receive one reset to use later.',{author:'ClaudeDevs'}).kind,'banked');
});
test('new ordinary news does not hide an outstanding reset, and completion supersedes it',()=>{
 const source=events.find(e=>e.id==='2103637477760311522');
 const announcement={...source,...classify(source.fullText,source)};
 const completedSource=events.find(e=>e.id==='2103911959544610829');
 const completion={...completedSource,...classify(completedSource.fullText,completedSource)};
 const ordinary={...announcement,id:'ordinary',kind:'usage',state:'information',publishedAt:'2026-09-28T00:00:00Z',excerpt:'Codex usage limits improved.',fullText:undefined};
 const p={name:'Codex',gifts:[],latest:ordinary,latestReset:announcement,lastReset:null};
 assert.ok(offers({codex:p},'en').includes(announcement.sourceUrl));
 assert.ok(priorityDetails(p,'codex',[ordinary,announcement],'en').includes(announcement.sourceUrl));
 p.latestReset=completion;p.lastReset=completion;
 assert.ok(offers({codex:p},'en').includes(completion.sourceUrl));
 assert.ok(priorityDetails(p,'codex',[ordinary,announcement,completion],'en').includes(completion.sourceUrl));
});
