// Retries share one deadline; individual post 404s remain permanent by default.
export async function collectionRequest(url,{headers={},format='json',fetcher=fetch,now=Date.now,sleep=ms=>new Promise(r=>setTimeout(r,ms)),budgetMs=18000,retryStatuses=[429,500,502,503,504],maxAttempts=2,retryDelayMs=250,validate=value=>value,retryInvalidResponse=false,onAttempt=()=>{}}={}) {
 const deadline=now()+budgetMs;
 for(let attempt=0;attempt<maxAttempts;attempt++) {
  const remaining=deadline-now();if(remaining<=0)throw new Error('Request budget exhausted');
  // Reserve time for later attempts; one stalled response must not consume the
  // whole shared deadline before a timeout retry can even start.
  const timeoutMs=Math.max(1,Math.floor(remaining/(maxAttempts-attempt)));
  const started=now(),outcome={attempt:attempt+1,timeoutMs,ok:false};
  try {
   const response=await fetcher(url,{headers:{'User-Agent':'CodexResetTracker/1.0 (public announcement monitoring)',...headers},signal:AbortSignal.timeout(timeoutMs)});
   outcome.status=response.status;
   if(response.ok){
    try{
     const result=validate(format==='text'?await response.text():await response.json());
     outcome.ok=true;return result;
    }catch(error){if(retryInvalidResponse&&error.retryable!==false)error.name='InvalidResponseError';throw error;}
   }
   const error=new Error(`HTTP ${response.status}`);
   outcome.error=error.message;
   if(attempt===maxAttempts-1||!retryStatuses.includes(response.status))throw error;
   const retryAfter=response.headers.get('retry-after');
   const wait=retryAfter===null?Math.min(1500,retryDelayMs*2**attempt):/^\d+(?:\.\d+)?$/.test(retryAfter)?Number(retryAfter)*1000:Math.max(0,Date.parse(retryAfter)-now());
   if(!Number.isFinite(wait)||wait>1500||wait>=deadline-now())throw error;
   await sleep(wait);
  }catch(error) {
   outcome.error=error.message;
   const wait=Math.min(1500,retryDelayMs*2**attempt);
   if(error.retryable===false||attempt===maxAttempts-1||!['TypeError','TimeoutError','AbortError',...(retryInvalidResponse?['InvalidResponseError']:[])].includes(error.name)||deadline-now()<=wait)throw error;
   await sleep(wait);
  }finally{onAttempt({...outcome,elapsedMs:Math.max(0,now()-started)});}
 }
 throw new Error('Request budget exhausted');
}
