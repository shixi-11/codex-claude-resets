import sharp from 'sharp';
import {readFile,writeFile} from 'node:fs/promises';
const root=new URL('../',import.meta.url),count=48,columns=6;
const frames=await Promise.all(Array.from({length:count},(_,i)=>readFile(new URL(`art/drummer/frames/drum_${String(i+1).padStart(4,'0')}.png`,root))));
let minX=384,minY=384,maxX=0,maxY=0;
for(const frame of frames){
 const {data,info}=await sharp(frame).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 if(info.width!==384||info.height!==384)throw Error('Frame size mismatch');
 for(let y=0;y<384;y++)for(let x=0;x<384;x++)if(data[(y*384+x)*4+3]>2){minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);}
}
const size=Math.min(384,Math.max(maxX-minX+1,maxY-minY+1)+16);
const left=Math.max(0,Math.min(384-size,Math.floor((minX+maxX-size)/2)));
const top=Math.max(0,Math.min(384-size,Math.floor((minY+maxY-size)/2)));
const cropped=await Promise.all(frames.map(frame=>sharp(frame).extract({left,top,width:size,height:size}).png().toBuffer()));
await writeFile(new URL('public/assets/drummer-poster.webp',root),await sharp(cropped[0]).webp({quality:90,alphaQuality:100,effort:6}).toBuffer());
const atlas=await sharp({create:{width:size*columns,height:size*Math.ceil(count/columns),channels:4,background:{r:0,g:0,b:0,alpha:0}}}).composite(cropped.map((input,i)=>({input,left:(i%columns)*size,top:Math.floor(i/columns)*size}))).webp({quality:86,alphaQuality:100,effort:6}).toBuffer();
await writeFile(new URL('public/assets/drummer-atlas.webp',root),atlas);
await writeFile(new URL('src/drummer-data.mjs',root),`// Fixed-camera Blender render, 48 frames at 30 fps.\nexport const drumFrames=${count},drumColumns=${columns},drumSize=${size},drumFps=30;\n`);
console.log(JSON.stringify({count,columns,size,crop:{left,top},atlasBytes:atlas.length}));
