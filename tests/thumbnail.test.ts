import { describe, expect, it } from 'vitest';
import { fontCssUrl, formatDate, isAutoThumbnail, parseFontCss, readDesign, splitTokens, wrapText } from '../src/thumbnail';

/** 1文字を1の幅として測る */
const measure = (s: string) => [...s].length;

describe('readDesign', () => {
	it('サイトの返事をそのまま使う', () => {
		const design = readDesign({
			width: 1200, height: 630,
			background: { color: '#112233', image: '/_emdash/api/plugins/auto-thumbnail/image?kind=background', overlay: true },
			textColor: '#ffffff', font: 'Noto Sans JP', siteName: ' りえたむら ', logo: '/_emdash/api/plugins/auto-thumbnail/image?kind=logo',
		});
		expect(design).toEqual({
			width: 1200, height: 630,
			background: { color: '#112233', image: '/_emdash/api/plugins/auto-thumbnail/image?kind=background', overlay: true },
			textColor: '#ffffff', font: 'Noto Sans JP', siteName: 'りえたむら', logo: '/_emdash/api/plugins/auto-thumbnail/image?kind=logo',
		});
	});

	it('おかしな値はふつうの値にし、ほかのサイトの画像は読まない', () => {
		const design = readDesign({
			background: { color: 'red', image: 'https://evil.example/a.png', overlay: 'yes' },
			textColor: 1, font: 'a;b', siteName: '', logo: '//evil.example/logo.png', width: 99999,
		});
		expect(design).toEqual({
			width: 1200, height: 630,
			background: { color: '#F5E6D3', image: null, overlay: false },
			textColor: '#3A2E25', font: 'Zen Maru Gothic', siteName: null, logo: null,
		});
		expect(readDesign(null).font).toBe('Zen Maru Gothic');
	});
});

describe('formatDate / isAutoThumbnail', () => {
	it('日付を「年.月.日」にする', () => {
		expect(formatDate(new Date(2026, 9, 3))).toBe('2026.10.03');
	});

	it('自動サムネイルのファイル名を見分ける', () => {
		expect(isAutoThumbnail('auto-thumbnail-20261030.png')).toBe(true);
		expect(isAutoThumbnail('表紙.png')).toBe(false);
		expect(isAutoThumbnail(undefined)).toBe(false);
	});
});

describe('wrapText', () => {
	it('英単語は分けず、日本語は1文字ずつ折り返す', () => {
		expect(splitTokens('Obsidianから投稿')).toEqual(['Obsidian', 'か', 'ら', '投', '稿']);
		expect(wrapText('Obsidianからの投稿', 10, 3, measure)).toEqual({ lines: ['Obsidianから', 'の投稿'], truncated: false });
	});

	it('句読点や小さい文字は行の頭に置かない', () => {
		expect(wrapText('あいうえお、かきくけこ', 5, 3, measure).lines).toEqual(['あいうえお、', 'かきくけこ']);
		expect(wrapText('あいうえおっと', 5, 3, measure).lines).toEqual(['あいうえおっ', 'と']);
	});

	it('入りきらなければ最後の行を「…」で切る', () => {
		const result = wrapText('あいうえおかきくけこさしすせそ', 5, 2, measure);
		expect(result).toEqual({ lines: ['あいうえお', 'かきくけ…'], truncated: true });
	});

	it('幅より長い英単語は途中で切る', () => {
		expect(wrapText('abcdefghij', 4, 3, measure).lines).toEqual(['abcd', 'efgh', 'ij']);
	});
});

describe('fonts', () => {
	it('使う文字だけを頼む URL を作る', () => {
		const url = fontCssUrl('Zen Maru Gothic', ['500', '700'], 'ああabc');
		expect(url).toBe(`https://fonts.googleapis.com/css2?family=Zen+Maru+Gothic:wght@500;700&text=${encodeURIComponent('あabc')}`);
	});

	it('CSS から太さごとのファイルを取り出す', () => {
		const css = `@font-face {
  font-family: 'Zen Maru Gothic';
  font-weight: 500;
  src: url(https://fonts.gstatic.com/l/font?kit=a) format('truetype');
}
@font-face {
  font-family: 'Zen Maru Gothic';
  font-weight: 700;
  src: url(https://fonts.gstatic.com/l/font?kit=b) format('truetype');
}`;
		expect(parseFontCss(css)).toEqual([
			{ weight: '500', url: 'https://fonts.gstatic.com/l/font?kit=a' },
			{ weight: '700', url: 'https://fonts.gstatic.com/l/font?kit=b' },
		]);
	});
});
