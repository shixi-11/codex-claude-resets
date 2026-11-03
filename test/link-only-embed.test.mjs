import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {extractEmbed,classify} from '../src/evidence.mjs';
const fixture=JSON.parse(readFileSync(new URL('./fixtures/openai-link-only.json',import.meta.url)));
const url='https://x.com/OpenAI/status/2107596716367388924';
const body=text=>({...fixture,html:`<blockquote><p>${text}</p></blockquote>`});
test('verified official link-only mathematics post is not an empty failed embed',()=>{
 const source=extractEmbed(fixture,url);
 assert.equal(source.text,'https://t.co/edRBkXdUAN');assert.equal(source.truncated,false);
 assert.deepEqual(classify(source.text,source),{kind:'other',state:'information',reason:'unrelated'});
});
test('link-only fallback never accepts empty, hidden, mismatched or claim-labelled anchors',()=>{
 for(const text of ['', '  ', '<img src="x">', '<a href="https://t.co/abc"></a>', '<a href="https://t.co/abc">Reset completed</a>', '<a href="https://t.co/abc">https://t.co/def</a>', '<a href="javascript:alert(1)">javascript:alert(1)</a>'])assert.throws(()=>extractEmbed(body(text),url),/Empty post|Missing post text/);
 assert.throws(()=>extractEmbed({...fixture,author_url:'https://x.com/thsottiaux'},url),/Author mismatch/);
 assert.throws(()=>extractEmbed({...fixture,url:'https://x.com/OpenAI/status/123'},url),/Post mismatch/);
});
test('normal text and truncation before a link keep existing extraction semantics',()=>{
 const link='<a href="https://t.co/edRBkXdUAN">https://t.co/edRBkXdUAN</a>';
 assert.equal(extractEmbed(body('A reset is coming… '+link),url).truncated,true);
 assert.equal(extractEmbed(body('Hello<br>world '+link),url).text,'Hello\nworld');
});
