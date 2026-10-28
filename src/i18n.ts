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
	notReadyYet: string;
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
	notReadyYet: '投稿の機能はまだ作っている途中です。',
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
	notReadyYet: 'Posting is not built yet.',
};

/** Obsidian の表示言語に合わせる。日本語以外は英語 */
export function getLocale(): LocaleStrings {
	try {
		return getLanguage().startsWith('ja') ? ja : en;
	} catch {
		return en;
	}
}
