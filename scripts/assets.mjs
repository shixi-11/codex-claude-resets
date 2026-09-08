import './icon.mjs';
import sharp from 'sharp';
import { mkdir, cp, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const root=new URL('../',import.meta.url);
const out=new URL('public/assets/',root);await mkdir(out,{recursive:true});
const source=await readFile(new URL('public/assets/mascot.png',root));

await sharp(source).trim().resize(800,800,{fit:'inside'}).webp({quality:88}).toFile(fileURLToPath(new URL('mascot.webp',out)));
const image=await sharp(source).trim().resize(560,560,{fit:'inside'}).toBuffer();
const overlay=Buffer.from('<svg width="1200" height="630"><text x="65" y="90" fill="#122e25" font-family="Arial" font-size="29" font-weight="bold">Codex &amp; Claude Resets</text><text x="65" y="257" fill="#122e25" font-family="Arial" font-size="56" font-weight="bold">When is the</text><text x="65" y="326" fill="#122e25" font-family="Arial" font-size="48" font-weight="bold">next reset?</text><text x="65" y="420" fill="#667168" font-family="Arial" font-size="23">Two platforms. Timers. Reminders.</text><text x="65" y="553" fill="#122e25" font-family="Arial" font-size="20">shixilin.com/ai/codex-reset</text></svg>');
await sharp({create:{width:1200,height:630,channels:3,background:'#f8f9f4'}}).composite([{input:image,left:610,top:70},{input:overlay}]).jpeg({quality:92}).toFile(fileURLToPath(new URL('social.jpg',out)));
await cp(new URL('node_modules/@fontsource-variable/manrope/files/manrope-latin-wght-normal.woff2',root),new URL('manrope-latin.woff2',out));
await cp(new URL('node_modules/@fontsource-variable/dm-sans/files/dm-sans-latin-wght-normal.woff2',root),new URL('dm-sans-latin.woff2',out));
