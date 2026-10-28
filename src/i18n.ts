import { getLanguage } from 'obsidian';

export interface LocaleStrings {
	commandPostNote: string;
	ribbonPostNote: string;
	siteUrlLabel: string;
	siteUrlDesc: string;
	tokenLabel: string;
	tokenDesc: string;
	uploadImagesLabel: string;
	uploadImagesDesc: string;
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
	siteUrlLabel: 'サイトの URL',
	siteUrlDesc: 'EmDash のサイトの URL（例：https://example.com）。',
	tokenLabel: 'アクセストークン',
	tokenDesc: 'EmDash の管理画面「APIトークン」で作ったトークン（ec_pat_…）を Obsidian のキーチェーンに保存します。権限は content:read・content:write・media:write の3つが必要です。トークン本体はプラグインの設定ファイルには保存されません。',
	uploadImagesLabel: '画像をアップロードする',
	uploadImagesDesc: 'ノートの画像を EmDash にアップロードして記事に入れます。',
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
	siteUrlLabel: 'Site URL',
	siteUrlDesc: 'The URL of your EmDash site (e.g. https://example.com).',
	tokenLabel: 'Access token',
	tokenDesc: 'A token made under "API Tokens" in the EmDash admin (ec_pat_…), kept in the Obsidian keychain. It needs the content:read, content:write and media:write scopes. The token itself is not written to the plugin settings file.',
	uploadImagesLabel: 'Upload images',
	uploadImagesDesc: 'Upload the images in the note to EmDash and put them in the post.',
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
