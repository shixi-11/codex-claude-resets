import './icon.mjs';
import sharp from 'sharp';
import { mkdir, cp, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const root=new URL('../',import.meta.url);
const out=new URL('public/assets/',root);await mkdir(out,{recursive:true});
const source=await readFile(new URL('public/assets/mascot.png',root));

await sharp(source).trim().resize(800,800,{fit:'inside'}).webp({quality:88}).toFile(fileURLToPath(new URL('mascot.webp',out)));
const image=await sharp(source).trim().resize(560,560,{fit:'inside'}).toBuffer();
const overlay=Buffer.from('<svg width="1200" height="630"><text x="65" y="92" fill="#122e25" font-family="Arial" font-size="33" font-weight="bold">Codex &amp; Claude Resets</text><text x="62" y="246" fill="#122e25" font-family="Arial" font-size="72" font-weight="bold" letter-spacing="-2">When is the</text><text x="62" y="326" fill="#122e25" font-family="Arial" font-size="72" font-weight="bold" letter-spacing="-2">next reset?</text><text x="65" y="399" fill="#52665a" font-family="Arial" font-size="29">Latest resets.</text><text x="65" y="438" fill="#52665a" font-family="Arial" font-size="29">Your local time.</text><text x="65" y="552" fill="#122e25" font-family="Arial" font-size="22">shixilin.com/ai/codex-claude-resets/</text></svg>');
await sharp({create:{width:1200,height:630,channels:3,background:'#f8f9f4'}}).composite([{input:image,left:610,top:70},{input:overlay}]).jpeg({quality:92}).toFile(fileURLToPath(new URL('social.jpg',out)));
await cp(new URL('node_modules/@fontsource-variable/manrope/files/manrope-latin-wght-normal.woff2',root),new URL('manrope-latin.woff2',out));
await cp(new URL('node_modules/@fontsource-variable/dm-sans/files/dm-sans-latin-wght-normal.woff2',root),new URL('dm-sans-latin.woff2',out));
