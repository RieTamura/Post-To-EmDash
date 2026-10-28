# Post To EmDash - Obsidian plugin

Language: **English** | [日本語](./README_JA.md)

Post a note written in Obsidian to an [EmDash](https://github.com/emdash-cms/emdash) site as a blog post.

## Features

- **Create new EmDash post**: asks for a title and creates a note with the fields ready to fill in
- **Choose featured image**: pick an image from your image folder, shown with thumbnails, and put it in `cover`
- **Post this note to EmDash**: sends the open note (command or ribbon button)
  - Sent as a draft; published right away only when the frontmatter says `status: publish`
  - Images are uploaded and placed in the post. The featured image is `cover`, or the first image in the body
  - Category, tags and excerpt are sent too. Tags the site lacks are created
  - Sending the same note again updates the same post. If it was edited in the admin, you are asked before overwriting
- Converts headings, emphasis, links, nested lists, checkboxes, quotes, callouts, tables and code. `%%comments%%` are not sent

## Installation

**From community plugins (recommended)**

1. In Obsidian, open Settings → Community plugins and turn off Restricted mode
2. Select Browse, search for "Post To EmDash", then install and enable it

**Manually**

1. Download `main.js`, `manifest.json` and `styles.css` from [Releases](https://github.com/RieTamura/Post-To-EmDash/releases)
2. Put them in your vault's `.obsidian/plugins/post-to-emdash/` folder
3. Reload Obsidian and enable the plugin under Community plugins

## Usage

1. In the EmDash admin, create a token under "API Tokens" with the scopes `content:read`, `content:write` and `media:write`
2. In the plugin settings, enter the site URL and the token, then select "Check"
3. Run "Create new EmDash post" to make a note and write your post (or add the fields below to any note)
4. Run "Post this note to EmDash" (or use the ribbon button). The first send arrives as a draft
5. Check it in the admin and publish it there, or set `status: publish` and send again

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
| Image folder | Images offered by "Choose featured image". Empty means every image in the vault |
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
