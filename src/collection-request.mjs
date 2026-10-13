// One retry for transient reads within the original total request budget.
export async function collectionRequest(url,{headers={},format='json',fetcher=fetch,now=Date.now,sleep=ms=>new Promise(r=>setTimeout(r,ms)),budgetMs=18000}={}) {
 const deadline=now()+budgetMs;
 for(let attempt=0;attempt<2;attempt++) {
  const remaining=deadline-now();if(remaining<=0)throw new Error('Request budget exhausted');
  try {
   const response=await fetcher(url,{headers:{'User-Agent':'CodexResetTracker/1.0 (public announcement monitoring)',...headers},signal:AbortSignal.timeout(Math.ceil(remaining))});
   if(response.ok)return format==='text'?await response.text():await response.json();
   const error=new Error(`HTTP ${response.status}`);
   if(attempt||![429,500,502,503,504].includes(response.status))throw error;
   const retryAfter=response.headers.get('retry-after');
   const wait=retryAfter===null?250:/^\d+(?:\.\d+)?$/.test(retryAfter)?Number(retryAfter)*1000:Math.max(0,Date.parse(retryAfter)-now());
   if(!Number.isFinite(wait)||wait>1500||wait>=deadline-now())throw error;
   await sleep(wait);
  }catch(error) {
   if(attempt||!['TypeError','TimeoutError','AbortError'].includes(error.name)||deadline-now()<=250)throw error;
   await sleep(250);
  }
 }
 throw new Error('Request budget exhausted');
}
