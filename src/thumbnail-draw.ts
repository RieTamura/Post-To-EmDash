import { fontCssUrl, logoLayout, META_SIZES, metaLayout, parseFontCss, wrapText, type ThumbnailDesign } from './thumbnail';

/** URL の中身を読む。失敗したら null（Obsidian では requestUrl） */
export type Fetcher = (url: string) => Promise<{ data: ArrayBuffer; text: string } | null>;

const PADDING = 72;
const TITLE_SIZES = [64, 56, 48];
const TITLE_MAX_LINES = 3;

/** Google Fonts からフォントを読み込む。読めなければ、ふつうのゴシック体で描く */
async function loadFont(design: ThumbnailDesign, text: string, fetch: Fetcher): Promise<string> {
	const family = `PostToEmDash ${design.font}`;
	try {
		// 返ってくる形式（TTF・WOFF2）は頼んだ側によって変わるが、FontFace はどちらも読める
		const css = await fetch(fontCssUrl(design.font, ['500', '700'], text));
		if (!css) return 'sans-serif';
		for (const face of parseFontCss(css.text)) {
			const file = await fetch(face.url);
			if (!file) continue;
			const font = new FontFace(family, file.data, { weight: face.weight });
			await font.load();
			// Canvas で使うには、ページのフォントに加える必要がある
			(document.fonts as unknown as { add(font: FontFace): void }).add(font);
		}
		return `"${family}", sans-serif`;
	} catch (e) {
		console.warn('Post To EmDash: could not load the thumbnail font', e);
		return 'sans-serif';
	}
}

async function loadBitmap(url: string | null, fetch: Fetcher): Promise<ImageBitmap | null> {
	if (!url) return null;
	try {
		const file = await fetch(url);
		return file ? await createImageBitmap(new Blob([file.data])) : null;
	} catch (e) {
		console.warn('Post To EmDash: could not load a thumbnail image', url, e);
		return null;
	}
}

/** 画像を、縦横の比を変えずに枠いっぱいに敷く（はみ出たところは切る） */
function drawCover(ctx: CanvasRenderingContext2D, image: ImageBitmap, width: number, height: number): void {
	const scale = Math.max(width / image.width, height / image.height);
	const w = image.width * scale;
	const h = image.height * scale;
	ctx.drawImage(image, (width - w) / 2, (height - h) / 2, w, h);
}

/**
 * 固定のデザインに、タイトルと日付を載せた PNG を作る。
 * siteUrl はデザインの画像（相対 URL）を読むため
 */
export async function drawThumbnail(
	design: ThumbnailDesign,
	text: { title: string; date: string },
	siteUrl: string,
	fetch: Fetcher,
): Promise<ArrayBuffer> {
	const { width, height } = design;
	const canvas = createEl('canvas', { attr: { width, height } });
	const ctx = canvas.getContext('2d');
	if (!ctx) throw new Error('Canvas is not available');

	const [fontFamily, background, logo] = await Promise.all([
		loadFont(design, `${text.title}${text.date}${design.siteName ?? ''}…`, fetch),
		loadBitmap(design.background.image && siteUrl + design.background.image, fetch),
		loadBitmap(design.logo && siteUrl + design.logo, fetch),
	]);

	ctx.fillStyle = design.background.color;
	ctx.fillRect(0, 0, width, height);
	if (background) {
		drawCover(ctx, background, width, height);
		if (design.background.overlay) {
			const inset = PADDING / 2;
			ctx.globalAlpha = 0.85;
			ctx.fillStyle = design.background.color;
			ctx.beginPath();
			ctx.roundRect(inset, inset, width - inset * 2, height - inset * 2, 24);
			ctx.fill();
			ctx.globalAlpha = 1;
		}
	}

	ctx.fillStyle = design.textColor;
	ctx.textBaseline = 'alphabetic';

	// タイトル：入りきるまで文字を小さくする。いちばん小さくても入らなければ「…」で切る
	const maxWidth = width - PADDING * 2;
	let title = { lines: [] as string[], size: TITLE_SIZES[0] };
	for (const size of TITLE_SIZES) {
		ctx.font = `700 ${size}px ${fontFamily}`;
		const wrapped = wrapText(text.title, maxWidth, TITLE_MAX_LINES, (s) => ctx.measureText(s).width);
		title = { lines: wrapped.lines, size };
		if (!wrapped.truncated) break;
	}
	ctx.font = `700 ${title.size}px ${fontFamily}`;
	const lineHeight = title.size * 1.45;
	title.lines.forEach((line, i) => ctx.fillText(line, PADDING, PADDING + title.size + i * lineHeight));

	// 下の段：日付と、ロゴとサイト名を、デザインで選んだ側に置く
	const baseline = height - PADDING;
	const metaSize = META_SIZES[design.metaSize];
	ctx.font = `500 ${metaSize.text}px ${fontFamily}`;
	const logoBox = logo && logoLayout(logo.width, logo.height, metaSize.logo, design.logoShape);
	const meta = metaLayout({
		width,
		padding: PADDING,
		baseline,
		dateWidth: ctx.measureText(text.date).width,
		logoWidth: logoBox?.width ?? 0,
		nameWidth: design.siteName ? ctx.measureText(design.siteName).width : 0,
		datePosition: design.datePosition,
		logoPosition: design.logoPosition,
		scale: metaSize.text / META_SIZES.normal.text,
	});
	ctx.fillText(text.date, meta.dateX, meta.dateBaseline);
	if (design.siteName) ctx.fillText(design.siteName, meta.nameX, baseline);
	if (logo && logoBox) {
		const { source, width: w, height: h, radius } = logoBox;
		const x = meta.logoX;
		// 文字の真ん中の高さにそろえる
		const y = baseline - metaSize.text * 0.35 - h / 2;
		ctx.save();
		if (radius > 0) {
			ctx.beginPath();
			ctx.roundRect(x, y, w, h, radius);
			ctx.clip();
		}
		ctx.drawImage(logo, source.x, source.y, source.width, source.height, x, y, w, h);
		ctx.restore();
	}

	const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
	if (!blob) throw new Error('Could not make the thumbnail image');
	return blob.arrayBuffer();
}
