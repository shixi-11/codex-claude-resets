// Old saved snapshots remain usable without republishing unsupported current
// conditions. This is a projection, never a new source verification.
export function publicPlatforms(platforms) {
 const data=structuredClone(platforms);
 if(Array.isArray(data.claude?.gifts))data.claude.gifts=data.claude.gifts.map(gift=>{
  if(gift.type!=='usage-promotion'||gift.permanent!==true||gift.announcementId!=='2093742321473065266')return gift;
  const keys=['type','state','sourceUrl','announcementId','verifiedAt','benefit','eligible','eligiblePlans','effectiveOn','permanent','isResetCard'];
  return {...Object.fromEntries(keys.filter(key=>Object.hasOwn(gift,key)).map(key=>[key,gift[key]])),scope:'Claude Code weekly limits'};
 });
 return data;
}
