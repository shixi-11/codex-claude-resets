# Blender drummer

`20260912_敲鼓.blend` is the editable scene. Rebuild with Blender 4.5:

```sh
blender --background --python scripts/render-drummer.py -- frames
node scripts/pack-drummer.mjs
npm run build
```

The original keycap character has two green felt mallets, a laced drum and transparent studio lighting. The 48 frames play at 30 fps. The packing script applies one shared crop and writes the transparent WebP poster and atlas into `public/assets`, with frame metadata in `src/drummer-data.mjs`. Intermediate PNG frames are excluded from Git.
