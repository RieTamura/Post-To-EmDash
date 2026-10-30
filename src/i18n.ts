import { getLanguage } from 'obsidian';

export interface LocaleStrings {
	commandPostNote: string;
	ribbonPostNote: string;
	commandNewPost: string;
	ribbonNewPost: string;
	newPostHeading: string;
	newPostPlaceholder: string;
	newPostCreate: string;
	newPostGuide: string;
	newPostFailed: (detail: string) => string;
	newPostFolderLabel: string;
	newPostFolderDesc: string;
	insertGuideLabel: string;
	insertGuideDesc: string;
	commandPickCover: string;
	pickCoverPlaceholder: string;
	noImagesFound: (folder: string) => string;
	coverSet: (name: string) => string;
	imageFolderLabel: string;
	imageFolderDesc: string;
	siteUrlLabel: string;
	siteUrlDesc: string;
	tokenLabel: string;
	tokenDesc: string;
	uploadImagesLabel: string;
	uploadImagesDesc: string;
	autoThumbnailLabel: string;
	autoThumbnailDesc: string;
	makingThumbnail: string;
	thumbnailFailed: (detail: string) => string;
	timeoutLabel: string;
	timeoutDesc: string;
	noActiveNote: string;
	settingsMissing: string;
	checkLabel: string;
	checkDesc: string;
	checkButton: string;
	checking: string;
	checkOk: string;
	siteUrlInvalid: string;
	errUnauthorized: string;
	errForbidden: (detail: string) => string;
	errNotEmDash: string;
	errNotFound: string;
	errTimeout: string;
	errNetwork: (detail: string) => string;
	errOther: (status: number, detail: string) => string;
	errLocked: string;
	errSlugTaken: (slug: string) => string;
	posting: string;
	alreadyPosting: string;
	postedDraft: (title: string) => string;
	updatedDraft: (title: string) => string;
	updatedDraftLiveKept: (title: string) => string;
	published: (title: string) => string;
	uploadingImage: (index: number, total: number) => string;
	imagesMissing: (names: string[]) => string;
	errUnknownCategory: (name: string, available: string[]) => string;
	conflictTitle: string;
	conflictMessage: string;
	conflictOverwrite: string;
	deletedTitle: string;
	deletedMessage: string;
	deletedPostAsNew: string;
	cancel: string;
	cancelled: string;
}

const ja: LocaleStrings = {
	commandPostNote: 'このノートを EmDash に投稿',
	ribbonPostNote: 'EmDash に投稿',
	commandNewPost: 'EmDash の記事を新規作成',
	ribbonNewPost: 'EmDash の記事を新規作成',
	newPostHeading: '新しい記事',
	newPostPlaceholder: '記事のタイトル',
	newPostCreate: '作成',
	newPostGuide: `Post To EmDash で送るための項目（このコメントの中はサイトに送られません）
- title：記事のタイトル
- slug：URL の最後（例 my-first-post）。空ならタイトルから自動で作られる
- excerpt：タイムラインに出る短い紹介文
- category：サイトにあるカテゴリーの名前。無い名前だと送れない
- tags：タグを付けるときは「tags: [タグ1, タグ2]」の行を足す。サイトに無いタグは新しく作られる
- cover：アイキャッチの画像（例 [[表紙.png]]）。空なら本文の最初の画像。それもなければ自動サムネイル
- status：draft（下書き）か publish（すぐ公開）
送ると emdash_id・emdash_url・emdash_rev が書き足される。消すと次は別の記事として送られる`,
	newPostFailed: (detail) => `ノートを作れませんでした（${detail}）。`,
	newPostFolderLabel: '新しい記事のフォルダ',
	newPostFolderDesc: '「EmDash の記事を新規作成」でノートを作る場所。空なら保管庫のいちばん上。',
	insertGuideLabel: '項目の説明を入れる',
	insertGuideDesc: '新しい記事の本文の先頭に、項目の書き方の説明を %% … %% で入れます（サイトには送られません）。',
	commandPickCover: 'アイキャッチを選ぶ',
	pickCoverPlaceholder: '画像の名前で絞り込む',
	noImagesFound: (folder) => folder ? `フォルダ「${folder}」に画像がありません。設定の「画像のフォルダ」を確かめてください。` : '保管庫に画像がありません。',
	coverSet: (name) => `アイキャッチを「${name}」にしました。`,
	imageFolderLabel: '画像のフォルダ',
	imageFolderDesc: '「アイキャッチを選ぶ」で候補にする画像のフォルダ（下のフォルダも含む）。空なら保管庫のすべての画像。',
	siteUrlLabel: 'サイトの URL',
	siteUrlDesc: 'EmDash のサイトの URL（例：https://example.com）。',
	tokenLabel: 'アクセストークン',
	tokenDesc: 'EmDash の管理画面「APIトークン」で作ったトークン（ec_pat_…）を Obsidian のキーチェーンに保存します。権限は content:read・content:write・media:write の3つが必要です。トークン本体はプラグインの設定ファイルには保存されません。',
	uploadImagesLabel: '画像をアップロードする',
	uploadImagesDesc: 'ノートの画像を EmDash にアップロードして記事に入れます。',
	autoThumbnailLabel: '自動サムネイル',
	autoThumbnailDesc: 'cover も本文の画像もない記事に、サイトで決めたデザインでタイトルと日付入りのアイキャッチを作って付けます。サイトに auto-thumbnail プラグインが必要です（ないときは何もしません）。管理画面で選んだアイキャッチは上書きしません。',
	makingThumbnail: 'サムネイルを作っています…',
	thumbnailFailed: (detail) => `サムネイルを作れなかったので、アイキャッチなしで送りました（${detail}）。`,
	timeoutLabel: 'タイムアウト（ミリ秒）',
	timeoutDesc: '通信を待つ時間。1000〜60000。',
	noActiveNote: '投稿するノートを開いてください。',
	settingsMissing: '設定で、サイトの URL とアクセストークンを入れてください。',
	checkLabel: '接続を確かめる',
	checkDesc: 'サイトの URL とアクセストークンで、記事を読めるかを試します。',
	checkButton: '確かめる',
	checking: '確かめています…',
	checkOk: '接続できました。',
	siteUrlInvalid: 'サイトの URL が正しくありません（https:// から始めてください）。',
	errUnauthorized: 'アクセストークンが正しくないか、期限が切れています。',
	errForbidden: (detail) => `アクセストークンの権限が足りません（${detail}）。`,
	errNotEmDash: 'このサイトは EmDash ではないようです。サイトの URL を確かめてください。',
	errNotFound: 'ブログ（posts）が見つかりません。サイトの URL を確かめてください。',
	errTimeout: 'サイトから返事がありません（タイムアウト）。',
	errNetwork: (detail) => `サイトにつながりません（${detail}）。`,
	errOther: (status, detail) => `エラーになりました（${status}：${detail}）。`,
	errSlugTaken: (slug) => `URL の最後が「${slug}」の記事が、もうサイトにあります（ゴミ箱の記事も含みます）。frontmatter の slug を変えるか、管理画面のゴミ箱から完全に削除してください。`,
	errLocked: 'この記事はいま管理画面で編集中です。管理画面を閉じてから、もう一度送ってください。',
	posting: 'EmDash に送っています…',
	alreadyPosting: '前の投稿がまだ終わっていません。',
	postedDraft: (title) => `「${title}」を下書きとして送りました。`,
	updatedDraft: (title) => `「${title}」の下書きを更新しました。`,
	updatedDraftLiveKept: (title) => `「${title}」の変更を下書きに保存しました。公開中の記事はそのままです（管理画面で公開するか、status: publish で送ってください）。`,
	published: (title) => `「${title}」を公開しました。`,
	uploadingImage: (index, total) => `画像をアップロードしています（${index}/${total}）…`,
	imagesMissing: (names) => `見つからなかった画像は外して送りました：${names.join('、')}`,
	errUnknownCategory: (name, available) => `カテゴリー「${name}」はサイトにありません。使えるのは：${available.join('、') || '（なし）'}。カテゴリーは管理画面で作ってください。`,
	conflictTitle: 'サイト側で変更があります',
	conflictMessage: 'この記事は、前に送ったあとに管理画面で直されています。上書きすると、管理画面での変更は消えます。上書きしますか？',
	conflictOverwrite: '上書きする',
	deletedTitle: 'サイトに記事がありません',
	deletedMessage: '前に送った記事が、サイトで削除されています。新しい記事として送りますか？',
	deletedPostAsNew: '新しい記事として送る',
	cancel: 'キャンセル',
	cancelled: '送るのをやめました。',
};

const en: LocaleStrings = {
	commandPostNote: 'Post this note to EmDash',
	ribbonPostNote: 'Post to EmDash',
	commandNewPost: 'Create new EmDash post',
	ribbonNewPost: 'Create new EmDash post',
	newPostHeading: 'New post',
	newPostPlaceholder: 'Post title',
	newPostCreate: 'Create',
	newPostGuide: `Fields used by Post To EmDash (nothing in this comment is sent to the site)
- title: the post title
- slug: the last part of the URL (e.g. my-first-post). Empty means it is made from the title
- excerpt: a short summary shown on the timeline
- category: the name of a category on the site. Unknown names cannot be sent
- tags: to add tags, add a line "tags: [tag1, tag2]". Tags the site does not have are created
- cover: the featured image (e.g. [[cover.png]]). Empty means the first image in the body, or else an automatic thumbnail
- status: draft or publish (publish right away)
Sending adds emdash_id, emdash_url and emdash_rev. Removing them makes the next send a new post`,
	newPostFailed: (detail) => `Could not create the note (${detail}).`,
	newPostFolderLabel: 'Folder for new posts',
	newPostFolderDesc: 'Where "Create new EmDash post" puts the note. Empty means the top of the vault.',
	insertGuideLabel: 'Add field guide',
	insertGuideDesc: 'Put a short guide to the fields at the top of new posts, inside %% … %% (not sent to the site).',
	commandPickCover: 'Choose featured image',
	pickCoverPlaceholder: 'Filter images by name',
	noImagesFound: (folder) => folder ? `No images in the folder "${folder}". Check "Image folder" in the settings.` : 'There are no images in the vault.',
	coverSet: (name) => `Featured image set to "${name}".`,
	imageFolderLabel: 'Image folder',
	imageFolderDesc: 'Images in this folder (and its subfolders) are offered by "Choose featured image". Empty means every image in the vault.',
	siteUrlLabel: 'Site URL',
	siteUrlDesc: 'The URL of your EmDash site (e.g. https://example.com).',
	tokenLabel: 'Access token',
	tokenDesc: 'A token made under "API Tokens" in the EmDash admin (ec_pat_…), kept in the Obsidian keychain. It needs the content:read, content:write and media:write scopes. The token itself is not written to the plugin settings file.',
	uploadImagesLabel: 'Upload images',
	uploadImagesDesc: 'Upload the images in the note to EmDash and put them in the post.',
	autoThumbnailLabel: 'Automatic thumbnail',
	autoThumbnailDesc: 'For a post with no cover and no image in the body, make a featured image with its title and date in the design set on the site. The site needs the auto-thumbnail plugin (without it, nothing happens). A featured image chosen in the admin is never replaced.',
	makingThumbnail: 'Making the thumbnail…',
	thumbnailFailed: (detail) => `Could not make the thumbnail, so the post was sent without a featured image (${detail}).`,
	timeoutLabel: 'Timeout (ms)',
	timeoutDesc: 'How long to wait for the site. 1000–60000.',
	noActiveNote: 'Open the note you want to post.',
	settingsMissing: 'Set the site URL and the access token in the settings.',
	checkLabel: 'Check connection',
	checkDesc: 'Try reading posts with the site URL and the access token.',
	checkButton: 'Check',
	checking: 'Checking…',
	checkOk: 'Connected.',
	siteUrlInvalid: 'The site URL is not valid (start it with https://).',
	errUnauthorized: 'The access token is wrong or has expired.',
	errForbidden: (detail) => `The access token lacks a scope (${detail}).`,
	errNotEmDash: 'This does not look like an EmDash site. Check the site URL.',
	errNotFound: 'The blog (posts) was not found. Check the site URL.',
	errTimeout: 'The site did not answer (timed out).',
	errNetwork: (detail) => `Could not reach the site (${detail}).`,
	errOther: (status, detail) => `Something went wrong (${status}: ${detail}).`,
	errSlugTaken: (slug) => `A post with the slug "${slug}" already exists on the site (posts in the trash count too). Change slug in the frontmatter, or delete that post for good from the trash in the admin.`,
	errLocked: 'This post is open in the admin editor. Close it there and send again.',
	posting: 'Sending to EmDash…',
	alreadyPosting: 'The previous post is still being sent.',
	postedDraft: (title) => `Sent "${title}" as a draft.`,
	updatedDraft: (title) => `Updated the draft of "${title}".`,
	updatedDraftLiveKept: (title) => `Saved the changes to "${title}" as a draft. The published version stays as it is (publish it in the admin, or send with status: publish).`,
	published: (title) => `Published "${title}".`,
	uploadingImage: (index, total) => `Uploading images (${index}/${total})…`,
	imagesMissing: (names) => `These images were not found and were left out: ${names.join(', ')}`,
	errUnknownCategory: (name, available) => `The category "${name}" does not exist on the site. Available: ${available.join(', ') || '(none)'}. Create categories in the admin.`,
	conflictTitle: 'The post was changed on the site',
	conflictMessage: 'This post was edited in the admin after you last sent it. Overwriting will discard those edits. Overwrite?',
	conflictOverwrite: 'Overwrite',
	deletedTitle: 'The post is gone from the site',
	deletedMessage: 'The post you sent before has been deleted on the site. Send this note as a new post?',
	deletedPostAsNew: 'Send as a new post',
	cancel: 'Cancel',
	cancelled: 'Cancelled.',
};

/** Obsidian の表示言語に合わせる。日本語以外は英語 */
export function getLocale(): LocaleStrings {
	try {
		return getLanguage().startsWith('ja') ? ja : en;
	} catch {
		return en;
	}
}
