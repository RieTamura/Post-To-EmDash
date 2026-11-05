import { describe, expect, it } from 'vitest';
import { fontCssUrl, formatDate, isAutoThumbnail, logoLayout, metaLayout, parseFontCss, readDesign, splitTokens, wrapText } from '../src/thumbnail';

/** 1文字を1の幅として測る */
const measure = (s: string) => [...s].length;

describe('readDesign', () => {
	it('サイトの返事をそのまま使う', () => {
		const design = readDesign({
			width: 1200, height: 630,
			background: { color: '#112233', image: '/_emdash/api/plugins/auto-thumbnail/image?kind=background', overlay: true },
			textColor: '#ffffff', font: 'Noto Sans JP', siteName: ' りえたむら ', logo: '/_emdash/api/plugins/auto-thumbnail/image?kind=logo', logoShape: 'circle', datePosition: 'right', logoPosition: 'left', metaSize: 'normal',
		});
		expect(design).toEqual({
			width: 1200, height: 630,
			background: { color: '#112233', image: '/_emdash/api/plugins/auto-thumbnail/image?kind=background', overlay: true },
			textColor: '#ffffff', font: 'Noto Sans JP', siteName: 'りえたむら', logo: '/_emdash/api/plugins/auto-thumbnail/image?kind=logo', logoShape: 'circle', datePosition: 'right', logoPosition: 'left', metaSize: 'normal',
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
			textColor: '#3A2E25', font: 'Zen Maru Gothic', siteName: null, logo: null, logoShape: 'original', datePosition: 'left', logoPosition: 'right', metaSize: 'normal',
		});
		expect(readDesign(null).font).toBe('Zen Maru Gothic');
	});
});

describe('readDesign の logoShape', () => {
	it('古いプラグインの返事や知らない形は original にする', () => {
		expect(readDesign({}).logoShape).toBe('original');
		expect(readDesign({ logoShape: 'star' }).logoShape).toBe('original');
		expect(readDesign({ logoShape: 'square' }).logoShape).toBe('square');
	});
});

describe('logoLayout', () => {
	it('original は全体を、比を変えずに枠へ収める', () => {
		const layout = logoLayout(200, 100, 56, 'original');
		expect(layout.source).toEqual({ x: 0, y: 0, width: 200, height: 100 });
		expect(layout.width).toBeCloseTo(56);
		expect(layout.height).toBeCloseTo(28);
		expect(layout.radius).toBe(0);
	});

	it('横長・縦長の画像は中央を正方形に切り抜く', () => {
		expect(logoLayout(200, 100, 56, 'square')).toEqual({ source: { x: 50, y: 0, width: 100, height: 100 }, width: 56, height: 56, radius: 12 });
		expect(logoLayout(100, 200, 56, 'circle')).toEqual({ source: { x: 0, y: 50, width: 100, height: 100 }, width: 56, height: 56, radius: 28 });
	});
});

describe('readDesign の場所', () => {
	it('古いプラグインの返事や知らない値は、日付を左、ロゴを右にする', () => {
		expect(readDesign({})).toMatchObject({ datePosition: 'left', logoPosition: 'right' });
		expect(readDesign({ datePosition: 'top', logoPosition: 'top' })).toMatchObject({ datePosition: 'left', logoPosition: 'right' });
	});
});

describe('metaLayout', () => {
	const base = { width: 1200, padding: 72, baseline: 558, dateWidth: 200, logoWidth: 56, nameWidth: 150 };

	it('日付が左、ロゴが右なら、これまでと同じ並びになる', () => {
		expect(metaLayout({ ...base, datePosition: 'left', logoPosition: 'right' })).toEqual({ dateX: 72, dateBaseline: 558, logoX: 906, nameX: 978 });
	});

	it('左右を入れ替えられる', () => {
		expect(metaLayout({ ...base, datePosition: 'right', logoPosition: 'left' })).toEqual({ dateX: 928, dateBaseline: 558, logoX: 72, nameX: 144 });
	});

	it('同じ側なら、日付を上の段に置く', () => {
		expect(metaLayout({ ...base, datePosition: 'left', logoPosition: 'left' })).toEqual({ dateX: 72, dateBaseline: 498, logoX: 72, nameX: 144 });
		expect(metaLayout({ ...base, datePosition: 'right', logoPosition: 'right' })).toEqual({ dateX: 928, dateBaseline: 498, logoX: 906, nameX: 978 });
	});

	it('ロゴもサイト名もなければ、同じ側でも日付は下の段のまま', () => {
		const layout = metaLayout({ ...base, logoWidth: 0, nameWidth: 0, datePosition: 'right', logoPosition: 'right' });
		expect(layout).toMatchObject({ dateX: 928, dateBaseline: 558 });
	});

	it('サイト名がなければ、ロゴを端まで寄せる', () => {
		expect(metaLayout({ ...base, nameWidth: 0, datePosition: 'left', logoPosition: 'right' }).logoX).toBe(1072);
	});
});

describe('meta の大きさ', () => {
	it('知らない値や古いプラグインでは normal にする', () => {
		expect(readDesign({}).metaSize).toBe('normal');
		expect(readDesign({ metaSize: 'huge' }).metaSize).toBe('normal');
		expect(readDesign({ metaSize: 'xlarge' }).metaSize).toBe('xlarge');
	});

	it('四角のロゴの角の丸みを、ロゴの大きさに合わせる', () => {
		expect(logoLayout(100, 100, 56, 'square').radius).toBe(12);
		expect(logoLayout(100, 100, 84, 'square').radius).toBe(18);
	});

	const base = { width: 1200, padding: 72, baseline: 558, dateWidth: 250, logoWidth: 88, nameWidth: 300 };

	it('すき間も大きさに合わせる', () => {
		const layout = metaLayout({ ...base, datePosition: 'left', logoPosition: 'left', scale: 1.5 });
		expect(layout).toMatchObject({ dateBaseline: 468, logoX: 72, nameX: 184 });
	});

	it('反対側でも入りきらなければ、日付を上の段に置く', () => {
		expect(metaLayout({ ...base, datePosition: 'right', logoPosition: 'left' }).dateBaseline).toBe(558);
		expect(metaLayout({ ...base, nameWidth: 800, datePosition: 'right', logoPosition: 'left' }).dateBaseline).toBe(498);
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
