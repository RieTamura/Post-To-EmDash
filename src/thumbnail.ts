/** 自動サムネイルの、描く前の準備（obsidian を import しない） */

/** サイトの auto-thumbnail プラグインが返すデザイン */
export interface ThumbnailDesign {
	width: number;
	height: number;
	background: {
		color: string;
		/** サイトからの相対 URL。なければ背景色だけ */
		image: string | null;
		/** 文字の下に背景色の帯を敷くか */
		overlay: boolean;
	};
	textColor: string;
	/** Google Fonts のフォント名 */
	font: string;
	siteName: string | null;
	/** サイトからの相対 URL */
	logo: string | null;
}

/** デザインを返す窓口（サイトの auto-thumbnail プラグイン） */
export const DESIGN_PATH = '/plugins/auto-thumbnail/design';

/** 自動サムネイルのファイル名の頭。これで始まるアイキャッチは、作り直してよい */
export const THUMBNAIL_PREFIX = 'auto-thumbnail';

const COLOR = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;
const FONT = /^[A-Za-z0-9 ]{1,60}$/;

function relativeUrl(value: unknown): string | null {
	return typeof value === 'string' && value.startsWith('/') && !value.startsWith('//') ? value : null;
}

/** サイトの返事を確かめる。おかしなところは、ふつうの値にする */
export function readDesign(raw: unknown): ThumbnailDesign {
	const d = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>;
	const bg = (typeof d.background === 'object' && d.background !== null ? d.background : {}) as Record<string, unknown>;
	const color = (value: unknown, fallback: string) => typeof value === 'string' && COLOR.test(value) ? value : fallback;
	const size = (value: unknown, fallback: number) => typeof value === 'number' && value >= 100 && value <= 4000 ? Math.round(value) : fallback;
	return {
		width: size(d.width, 1200),
		height: size(d.height, 630),
		background: {
			color: color(bg.color, '#F5E6D3'),
			image: relativeUrl(bg.image),
			overlay: bg.overlay === true,
		},
		textColor: color(d.textColor, '#3A2E25'),
		font: typeof d.font === 'string' && FONT.test(d.font) ? d.font : 'Zen Maru Gothic',
		siteName: typeof d.siteName === 'string' && d.siteName.trim() ? d.siteName.trim() : null,
		logo: relativeUrl(d.logo),
	};
}

/** 「2026.10.30」。日付は書いた人の時間帯で */
export function formatDate(date: Date): string {
	const pad = (n: number) => String(n).padStart(2, '0');
	return `${date.getFullYear()}.${pad(date.getMonth() + 1)}.${pad(date.getDate())}`;
}

/** アイキャッチのファイル名が、自動サムネイルのものか */
export function isAutoThumbnail(filename: unknown): boolean {
	return typeof filename === 'string' && filename.startsWith(THUMBNAIL_PREFIX);
}

/** 行の頭に来てはいけない文字（前の行の終わりにくっつける） */
const NO_LINE_START = new Set([...'、。，．,.!?！？）)」』】〉》〕］]｝}ーぁぃぅぇぉっゃゅょゎァィゥェォッャュョヮヵヶ々…‥・：；:;']);

/** 折り返しの単位に分ける。英数字のひとつながり（後ろの空白も）は分けない */
export function splitTokens(text: string): string[] {
	return text.match(/[A-Za-z0-9À-ɏ'’\-_.@#&+/]+\s*|\s+|./gu) ?? [];
}

/**
 * タイトルを幅に合わせて折り返す。maxLines に入らなければ、最後の行を「…」で切る。
 * measure は文字の幅を返す関数（Canvas の measureText など）
 */
export function wrapText(text: string, maxWidth: number, maxLines: number, measure: (s: string) => number): { lines: string[]; truncated: boolean } {
	const lines: string[] = [];
	let line = '';
	const add = (token: string) => {
		if (!line && !token.trim()) return;
		const next = line + token;
		if (!line || measure(next.trimEnd()) <= maxWidth || NO_LINE_START.has(token)) {
			line = next;
		} else {
			lines.push(line.trimEnd());
			line = token.trimStart();
		}
	};
	for (const token of splitTokens(text.replace(/\s+/g, ' ').trim())) {
		// 幅より長い英単語は、1文字ずつに分けて入れる
		if (token.length > 1 && measure(token.trimEnd()) > maxWidth) [...token].forEach(add);
		else add(token);
	}
	if (line.trim()) lines.push(line.trimEnd());

	if (lines.length <= maxLines) return { lines, truncated: false };
	const kept = lines.slice(0, maxLines);
	let last = kept[maxLines - 1];
	while (last && measure(`${last}…`) > maxWidth) last = [...last].slice(0, -1).join('');
	kept[maxLines - 1] = `${last.trimEnd()}…`;
	return { lines: kept, truncated: true };
}

/** Google Fonts の CSS から、太さごとのフォントファイルの URL を取り出す */
export function parseFontCss(css: string): Array<{ weight: string; url: string }> {
	const faces: Array<{ weight: string; url: string }> = [];
	for (const block of css.match(/@font-face\s*{[^}]*}/g) ?? []) {
		const url = block.match(/src:\s*url\(([^)]+)\)/)?.[1]?.replace(/^['"]|['"]$/g, '');
		const weight = block.match(/font-weight:\s*(\d+)/)?.[1] ?? '400';
		if (url?.startsWith('https://')) faces.push({ weight, url });
	}
	return faces;
}

/** フォントの CSS の URL。使う文字だけを頼むと、日本語でも小さなファイルで済む */
export function fontCssUrl(font: string, weights: string[], text: string): string {
	const family = encodeURIComponent(font).replace(/%20/g, '+');
	const chars = [...new Set([...text])].join('');
	return `https://fonts.googleapis.com/css2?family=${family}:wght@${weights.join(';')}&text=${encodeURIComponent(chars)}`;
}
