import {writeFile,readFile} from 'node:fs/promises';
// One pixel grid controls the complete perimeter, including the sloping left edge.
const polygon=[[5,2],[3,18],[8,13],[11,21],[15,19],[11,12],[18,13]];
const inside=(x,y)=>{let c=false;for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){const a=polygon[i],b=polygon[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])c=!c;}return c;};
const pixels=new Set();for(let y=0;y<24;y++)for(let x=0;x<22;x++)if(inside(x+.5,y+.5))pixels.add(`${x},${y}`);
const rects=[];for(const point of pixels){const[x,y]=point.split(',').map(Number);const edge=[[1,0],[-1,0],[0,1],[0,-1]].some(([dx,dy])=>!pixels.has(`${x+dx},${y+dy}`));const highlight=!edge&&!pixels.has(`${x-2},${y}`);rects.push(`<rect x="${x}" y="${y}" width="1" height="1" fill="${edge?'#183025':highlight?'#e4f8ac':'#cde877'}"/>`);}
const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 22 24" shape-rendering="crispEdges">${rects.join('')}</svg>`;
await writeFile('public/favicon.svg',svg);
const file='scripts/build.mjs';let text=await readFile(file,'utf8');text=text.replace(/const cursor = '[^\n]*';/,`const cursor = '${svg.replace('<svg xmlns="http://www.w3.org/2000/svg"','<svg class="brand-icon" aria-hidden="true"')}';`);await writeFile(file,text);
