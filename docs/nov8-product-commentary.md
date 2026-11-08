# November 8 product communication reply

The primary [Tibo reply](https://x.com/thsottiaux/status/2119308687676432672) says:

> We hesitated to embed x.com into the codex app to make sense of the resets, but decided against it.

Its [parent](https://x.com/ForwardEditor/status/2119185994326905218) discusses needing an X account to follow Codex resets. The reply discusses product communication; it announces no new reset, reset date, completion, credit grant or allowance change. Preserve it as `commentary` / `information`, with its original source link, rather than deleting it or treating it as an unconfirmed reset.

The official oEmbed paragraph represents the visible `x.com` link with `https://t.co/TnRNoyTR5X`. The relay detail identifies the same Tibo post and parent; its URL facet maps that shortlink to `https://x.com` with display label `x.com`. The current link-removal parser had omitted the link completely. A pinned author, post ID and exact embed body restore only this checked label. The classification exception additionally requires the exact complete original text and rejects truncated content. Other posts, edited text, different links and unconfirmed reset wording retain the normal rules and alerts. No general link parsing or alert threshold changes are included.

The captured public embed/detail fixture is `test/fixtures/nov8-product-commentary.json`. Tests exercise both real collector entry points, replacement of the prior link-stripped wording, repeated collection, retained source identity, unchanged reset/credit summaries, and a separate genuine unconfirmed reset that must remain in the review queue.
