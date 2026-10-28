# Post To EmDash - Obsidian plugin

Language: [日本語](./README.md) | **English**

Post a note written in Obsidian to an [EmDash](https://github.com/emdash-cms/emdash) site as a blog post.

> Not yet listed in Obsidian's community plugins. The plan (in Japanese) is in [docs/plan-obsidian-to-emdash.md](./docs/plan-obsidian-to-emdash.md).

## Features

- **Create new EmDash post**: asks for a title and creates a note with the fields ready to fill in
- **Post this note to EmDash**: sends the open note (command or ribbon button)
  - Sent as a draft; published right away only when the frontmatter says `status: publish`
  - Images are uploaded and placed in the post. The featured image is `cover`, or the first image in the body
  - Category, tags and excerpt are sent too. Tags the site lacks are created
  - Sending the same note again updates the same post. If it was edited in the admin, you are asked before overwriting
- Converts headings, emphasis, links, nested lists, checkboxes, quotes, callouts, tables and code. `%%comments%%` are not sent

## Writing a note

```yaml
---
title: Post title             # defaults to the note name
slug: my-first-post           # last part of the URL; made from the title if empty
excerpt: A short summary
category: Development         # the name of a category on the site
tags: [webdev, tools]         # leave out to keep the site's tags
cover: "[[cover.png]]"        # featured image
status: draft                 # draft or publish
---
```

Sending adds `emdash_id`, `emdash_url` and `emdash_rev`. Remove them and the next send makes a new post.

## Settings

| Setting | What it is |
| --- | --- |
| Site URL | The URL of your EmDash site |
| Access token | A token made under "API Tokens" in the EmDash admin (`ec_pat_…`) with the `content:read`, `content:write` and `media:write` scopes |
| Upload images | Whether to send the note's images to EmDash |
| Timeout | How long to wait for the site (ms) |
| Folder for new posts | Where "Create new EmDash post" puts the note |
| Add field guide | Put a guide to the fields (`%% … %%`) in new posts |
| Check connection | Try reading posts with the URL and token |

The token is kept in the Obsidian keychain, not in the plugin's `data.json`, so syncing your vault does not spread it. The keychain is per device, so enter it on each computer and phone.

## Development

```bash
npm install
npm run dev     # watch and build
npm run build   # production build (main.js)
npm run lint
npm test        # converter tests
```

Put `main.js`, `manifest.json` and `styles.css` in your vault's `.obsidian/plugins/post-to-emdash/` to load it.

## License

[0BSD](./LICENSE)
