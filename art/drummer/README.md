# Blender drummer

`20260912_敲鼓.blend` is the editable scene. Rebuild with Blender 4.5:

```sh
blender --background --python scripts/render-drummer.py -- frames
node scripts/pack-drummer.mjs
npm run build
```

The original keycap character has two green felt mallets, a laced drum and transparent studio lighting. The 48 frames play at 30 fps. The packing script applies one shared crop and writes the transparent WebP poster and atlas into `public/assets`, with frame metadata in `src/drummer-data.mjs`. Intermediate PNG frames are excluded from Git.

The revised pose keeps the right mallet resting on the drumhead and the other by the body before playback. The drum sits at x=1.35. Two-segment arms use a fixed-length solve (0.62 upper arm, 0.70 forearm); the shoulder and elbow rotate without stretching. Four alternating strikes use slower preparation, an accelerating downstroke and a short rebound. The final pose matches the poster for replay.

Motion reference: San Jose Taiko Conservatory, Yurika Chiba, “3 Types of Basic Striking” (https://www.taikoconservatory.org/prc-blog/2020/12/4/3-types-of-basic-striking). Viewed the embedded demonstration and sampled its raised/alternating-arm sequence. The character and rendered assets remain original.
