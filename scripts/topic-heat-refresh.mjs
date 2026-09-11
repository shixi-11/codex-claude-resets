import {readFile,writeFile,rename} from 'node:fs/promises';
export async function refreshTopicHeat(root,request){
 const file=new URL('data/topic-heat.json',root),previous=JSON.parse(await readFile(file,'utf8'));
 const posts=await Promise.all(previous.posts.map(async post=>{
  const author=new URL(post.url).pathname.split('/')[1];
  const result=await request(`https://api.fxtwitter.com/${author}/status/${post.id}`),tweet=result?.tweet;
  if(String(tweet?.id)!==post.id||tweet?.author?.screen_name?.toLowerCase()!==author.toLowerCase()||!Number.isSafeInteger(tweet?.views)||tweet.views<0)throw Error('Invalid view count or post identity');
  return {...post,views:tweet.views};
 }));
 const next={...previous,observedAt:new Date().toISOString(),posts};
 const temp=new URL('data/topic-heat.json.tmp',root);
 await writeFile(temp,JSON.stringify(next,null,2)+'\n');await rename(temp,file);
 return next;
}
