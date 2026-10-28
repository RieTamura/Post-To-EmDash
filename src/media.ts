/** 画像のアップロードと、記事に入れる画像の形（obsidian を import しない） */

import type { ImageBlock } from './convert';

/** POST /media が返すメディア */
export interface MediaItem {
	id: string;
	filename: string;
	mimeType: string;
	width?: number | null;
	height?: number | null;
	storageKey: string;
	url: string;
	blurhash?: string | null;
	dominantColor?: string | null;
}

/** 記事の featured_image に入れる形（管理画面で選んだときと同じ） */
export interface FeaturedImage {
	provider: 'local';
	id: string;
	alt: string;
	width?: number;
	height?: number;
	mimeType: string;
	filename: string;
	meta: { storageKey: string };
}

const MIME_BY_EXTENSION: Record<string, string> = {
	png: 'image/png',
	jpg: 'image/jpeg',
	jpeg: 'image/jpeg',
	gif: 'image/gif',
	webp: 'image/webp',
	avif: 'image/avif',
	bmp: 'image/bmp',
	svg: 'image/svg+xml',
};

export function mimeTypeOf(filename: string): string {
	const ext = filename.split('.').pop()?.toLowerCase() ?? '';
	return MIME_BY_EXTENSION[ext] ?? 'application/octet-stream';
}

/**
 * multipart/form-data の本文を作る。requestUrl は FormData を送れないので、自分で組み立てる
 */
export function buildMultipart(
	file: { name: string; data: ArrayBuffer; type: string },
	fields: Record<string, string>,
): { body: ArrayBuffer; contentType: string } {
	const boundary = `----PostToEmDash${Math.random().toString(16).slice(2)}${Date.now().toString(16)}`;
	const encoder = new TextEncoder();
	const quote = (value: string) => value.replace(/["\r\n\\]/g, '_');
	const parts: Uint8Array[] = [];
	for (const [name, value] of Object.entries(fields)) {
		parts.push(encoder.encode(`--${boundary}\r\nContent-Disposition: form-data; name="${quote(name)}"\r\n\r\n${value}\r\n`));
	}
	parts.push(encoder.encode(
		`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${quote(file.name)}"\r\nContent-Type: ${file.type}\r\n\r\n`,
	));
	parts.push(new Uint8Array(file.data));
	parts.push(encoder.encode(`\r\n--${boundary}--\r\n`));

	const total = parts.reduce((sum, p) => sum + p.byteLength, 0);
	const body = new Uint8Array(total);
	let offset = 0;
	for (const p of parts) {
		body.set(p, offset);
		offset += p.byteLength;
	}
	return { body: body.buffer, contentType: `multipart/form-data; boundary=${boundary}` };
}

/** アップロードした画像を、本文の画像ブロックに入れる */
export function fillImageBlock(block: ImageBlock, media: MediaItem): void {
	block.asset = { _ref: media.id, url: media.url, provider: 'local' };
	if (media.width) block.width = media.width;
	if (media.height) block.height = media.height;
	if (media.blurhash) block.blurhash = media.blurhash;
	if (media.dominantColor) block.dominantColor = media.dominantColor;
}

export function toFeaturedImage(media: MediaItem, alt: string): FeaturedImage {
	const image: FeaturedImage = {
		provider: 'local',
		id: media.id,
		alt,
		mimeType: media.mimeType,
		filename: media.filename,
		meta: { storageKey: media.storageKey },
	};
	if (media.width) image.width = media.width;
	if (media.height) image.height = media.height;
	return image;
}

/**
 * frontmatter の cover の書き方をそろえる。
 * 「画像/表紙.png」「[[表紙.png]]」「![[表紙.png|説明]]」「![](表紙.png)」のどれでもよい
 */
export function parseCoverValue(value: unknown): string | undefined {
	if (Array.isArray(value)) value = value[0];
	if (typeof value !== 'string') return undefined;
	let v = value.trim();
	const wiki = v.match(/^!?\[\[([^\]|]+)(?:\|[^\]]*)?\]\]$/);
	if (wiki) v = wiki[1];
	const md = v.match(/^!?\[[^\]]*\]\((<[^>]*>|[^)\s]+)[^)]*\)$/);
	if (md) v = md[1].replace(/^<|>$/g, '');
	v = v.trim();
	if (!v) return undefined;
	try {
		return decodeURI(v);
	} catch {
		return v;
	}
}
