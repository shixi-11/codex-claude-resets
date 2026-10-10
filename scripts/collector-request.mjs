export class CollectionRequestError extends Error {
 constructor(message,details={}){super(message);this.name='CollectionRequestError';this.details=details;}
}
export function retryAfterMs(value,now=Date.now()){
 if(value===null||value===undefined||value==='')return null;
 if(/^\d+(?:\.\d+)?$/.test(value.trim()))return Math.ceil(Number(value)*1000);
 const at=Date.parse(value);return Number.isFinite(at)?Math.max(0,at-now):null;
}
export function failureDetails(error){
 return {error:String(error.message).replace(/https?:\/\/\S+/g,'[url]').slice(0,160),...(error.details||{kind:'evidence',attempts:1,retryable:false})};
}
// Retry only transient transport/HTTP failures. A Retry-After beyond the budget
// stops the request rather than retrying early or sleeping without a bound.
export function createCollectionRequest({fetchImpl=fetch,now=Date.now,sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms)),random=Math.random,timeoutMs=18000,maxAttempts=3,maxElapsedMs=60000,deadline=Infinity,onAttempt=()=>{}}={}){
 return async(url,headers={},format='json')=>{
  const start=now(),end=Math.min(start+maxElapsedMs,deadline);let attempts=0;
  while(attempts<maxAttempts){
   const remaining=end-now();
   if(remaining<=0)throw new CollectionRequestError('Collection request budget exhausted',{kind:'budget',attempts,retryable:false});
   attempts++;let status=null,retryAfter=null;
   try{
    const response=await fetchImpl(url,{headers:{'User-Agent':'CodexResetTracker/1.0 (public announcement monitoring)',...headers},signal:AbortSignal.timeout(Math.max(1,Math.min(timeoutMs,remaining)))});
    status=response.status;
    if(!response.ok){retryAfter=retryAfterMs(response.headers.get('retry-after'),now());response.body?.cancel().catch(()=>{});throw new CollectionRequestError(`HTTP ${status}`);}
    const result=await (format==='text'?response.text():response.json());
    onAttempt({ok:true,attempts,status});return result;
   }catch(error){
    const kind=error.name==='TimeoutError'||error.name==='AbortError'?'timeout':error instanceof SyntaxError?'parse':status!==null&&status>=400?'http':'network';
    const retryable=[408,425,429,500,502,503,504].includes(status)||['timeout','network'].includes(kind);
    const wait=Math.max(retryAfter||0,Math.round(Math.min(4000,500*2**(attempts-1))*(1+random()*.25)));
    const exhausted=attempts>=maxAttempts||now()+wait>=end;
    onAttempt({ok:false,attempts,status,kind,retryable,willRetry:retryable&&!exhausted});
    if(!retryable||exhausted)throw new CollectionRequestError(String(error.message),{kind,attempts,status,retryable,exhausted:retryable,...(retryAfter!==null?{retryAfterMs:retryAfter}:{}),...(retryable&&now()+wait>=end?{budgetExhausted:true}:{})});
    await sleep(wait);
   }
  }
 };
}
