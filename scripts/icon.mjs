import {fileURLToPath} from 'node:url';
import {writeFile} from 'node:fs/promises';
import sharp from 'sharp';
const svg="<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 64 64\"><path d=\"M14 6h34l10 15v29a8 8 0 0 1-8 8H14a8 8 0 0 1-8-8V21Z\" fill=\"#f6f2e7\" stroke=\"#254133\" stroke-width=\"3\"/><path d=\"M6 23h52M14 6l-8 17M48 6l10 17\" fill=\"none\" stroke=\"#254133\" stroke-width=\"2\"/><rect x=\"22\" y=\"33\" width=\"5\" height=\"12\" rx=\"2\" fill=\"#19372b\"/><rect x=\"37\" y=\"33\" width=\"5\" height=\"12\" rx=\"2\" fill=\"#19372b\"/><path d=\"M29 19C20 19 20 11 29 10C34 9 38 11 39 15M35 14l4 2 2-4\" fill=\"none\" stroke=\"#70952b\" stroke-width=\"2.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/></svg>";
await writeFile(new URL('../public/favicon.svg',import.meta.url),svg);
for(const [name,size] of [['apple-touch-icon.png',180],['favicon-32.png',32]])await sharp(Buffer.from(svg)).resize(size).png().toFile(fileURLToPath(new URL('../public/'+name,import.meta.url)));
// One logo for browser tabs, bookmarks and pinned shortcuts.
const frames=await Promise.all([16,32,48].map(size=>sharp(Buffer.from(svg)).resize(size).png().toBuffer()));
const header=Buffer.alloc(6+16*frames.length);header.writeUInt16LE(1,2);header.writeUInt16LE(frames.length,4);let offset=header.length;
frames.forEach((frame,i)=>{const p=6+i*16,size=[16,32,48][i];header[p]=size;header[p+1]=size;header.writeUInt16LE(1,p+4);header.writeUInt16LE(32,p+6);header.writeUInt32LE(frame.length,p+8);header.writeUInt32LE(offset,p+12);offset+=frame.length;});
await writeFile(new URL('../public/favicon.ico',import.meta.url),Buffer.concat([header,...frames]));
