# Post To EmDash - Obsidian plugin

Language: [日本語](./README.md) | **English**

Post a note written in Obsidian to an [EmDash](https://github.com/emdash-cms/emdash) site as a blog post.

> **Work in progress.** Only the settings and the command exist so far; posting does not work yet. The plan (in Japanese) is in [docs/plan-obsidian-to-emdash.md](./docs/plan-obsidian-to-emdash.md).

## Planned features

- Send the open note to EmDash with a command or the ribbon button
- Send as a draft (publish right away only when the frontmatter says `status: publish`)
- Send images, category, tags, excerpt and the featured image too
- Sending the same note again updates the same post

## Settings

| Setting | What it is |
| --- | --- |
| Site URL | The URL of your EmDash site |
| Access token | A token made under "API Tokens" in the EmDash admin (`ec_pat_…`) with the `content:read`, `content:write` and `media:write` scopes |
| Upload images | Whether to send the note's images to EmDash |
| Timeout | How long to wait for the site (ms) |

The token is kept in the Obsidian keychain, not in the plugin's `data.json`, so syncing your vault does not spread it. The keychain is per device, so enter it on each computer and phone.

## Development

```bash
npm install
npm run dev     # watch and build
npm run build   # production build (main.js)
npm run lint
```

Put `main.js`, `manifest.json` and `styles.css` in your vault's `.obsidian/plugins/post-to-emdash/` to load it.

## License

[0BSD](./LICENSE)
