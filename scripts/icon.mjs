import {fileURLToPath} from 'node:url';
import {writeFile} from 'node:fs/promises';
import sharp from 'sharp';
const svg="<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 64 64\"><path d=\"M14 6h34l10 15v29a8 8 0 0 1-8 8H14a8 8 0 0 1-8-8V21Z\" fill=\"#f6f2e7\" stroke=\"#254133\" stroke-width=\"3\"/><path d=\"M6 23h52M14 6l-8 17M48 6l10 17\" fill=\"none\" stroke=\"#254133\" stroke-width=\"2\"/><rect x=\"22\" y=\"33\" width=\"5\" height=\"12\" rx=\"2\" fill=\"#19372b\"/><rect x=\"37\" y=\"33\" width=\"5\" height=\"12\" rx=\"2\" fill=\"#19372b\"/><path d=\"M38 17a8 5 0 1 0-7 3M38 12v6h-7\" fill=\"none\" stroke=\"#70952b\" stroke-width=\"3\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/></svg>";
await writeFile(new URL('../public/favicon.svg',import.meta.url),svg);
for(const [name,size] of [['apple-touch-icon.png',180],['favicon-32.png',32]])await sharp(Buffer.from(svg)).resize(size).png().toFile(fileURLToPath(new URL('../public/'+name,import.meta.url)));
