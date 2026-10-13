// Retries share one deadline; individual post 404s remain permanent by default.
export async function collectionRequest(url,{headers={},format='json',fetcher=fetch,now=Date.now,sleep=ms=>new Promise(r=>setTimeout(r,ms)),budgetMs=18000,retryStatuses=[429,500,502,503,504],maxAttempts=2,retryDelayMs=250}={}) {
 const deadline=now()+budgetMs;
 for(let attempt=0;attempt<maxAttempts;attempt++) {
  const remaining=deadline-now();if(remaining<=0)throw new Error('Request budget exhausted');
  try {
   const response=await fetcher(url,{headers:{'User-Agent':'CodexResetTracker/1.0 (public announcement monitoring)',...headers},signal:AbortSignal.timeout(Math.ceil(remaining))});
   if(response.ok)return format==='text'?await response.text():await response.json();
   const error=new Error(`HTTP ${response.status}`);
   if(attempt===maxAttempts-1||!retryStatuses.includes(response.status))throw error;
   const retryAfter=response.headers.get('retry-after');
   const wait=retryAfter===null?Math.min(1500,retryDelayMs*2**attempt):/^\d+(?:\.\d+)?$/.test(retryAfter)?Number(retryAfter)*1000:Math.max(0,Date.parse(retryAfter)-now());
   if(!Number.isFinite(wait)||wait>1500||wait>=deadline-now())throw error;
   await sleep(wait);
  }catch(error) {
   const wait=Math.min(1500,retryDelayMs*2**attempt);
   if(attempt===maxAttempts-1||!['TypeError','TimeoutError','AbortError'].includes(error.name)||deadline-now()<=wait)throw error;
   await sleep(wait);
  }
 }
 throw new Error('Request budget exhausted');
}
