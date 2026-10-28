import { describe, expect, it } from 'vitest';
import { convertMarkdown } from '../src/convert';
import { buildMultipart, fillImageBlock, parseCoverValue, toFeaturedImage, type MediaItem } from '../src/media';
import { readNoteFields } from '../src/note';
import { sendPost, type ApiLike } from '../src/publish';
import { resolveTaxonomies, UnknownCategoryError } from '../src/taxonomy';

const media: MediaItem = {
	id: 'M1', filename: '写真.png', mimeType: 'image/png', width: 40, height: 20,
	storageKey: 'S1.png', url: '/_emdash/api/media/file/S1.png', blurhash: 'B', dominantColor: 'rgb(1,2,3)',
};

describe('buildMultipart', () => {
	it('欄とファイルを multipart にする', () => {
		const { body, contentType } = buildMultipart(
			{ name: '写真"1".png', data: new Uint8Array([1, 2, 3]).buffer, type: 'image/png' },
			{ deduplicate: 'true' },
		);
		const boundary = contentType.split('boundary=')[1];
		const bytes = new Uint8Array(body);
		const text = new TextDecoder().decode(bytes);
		expect(contentType.startsWith('multipart/form-data; boundary=')).toBe(true);
		expect(text).toContain(`--${boundary}\r\nContent-Disposition: form-data; name="deduplicate"\r\n\r\ntrue\r\n`);
		expect(text).toContain('name="file"; filename="写真_1_.png"\r\nContent-Type: image/png\r\n\r\n');
		expect(text.endsWith(`\r\n--${boundary}--\r\n`)).toBe(true);
		// ファイルの中身がそのまま入っている
		const start = bytes.length - `\r\n--${boundary}--\r\n`.length - 3;
		expect([...bytes.slice(start, start + 3)]).toEqual([1, 2, 3]);
	});
});

describe('画像の形', () => {
	it('本文の画像ブロックにメディアを入れる（表示の大きさは残す）', () => {
		const { images } = convertMarkdown('![[写真.png|300]]');
		fillImageBlock(images[0], media);
		expect(images[0]).toMatchObject({
			_type: 'image', alt: '',
			asset: { _ref: 'M1', url: '/_emdash/api/media/file/S1.png', provider: 'local' },
			width: 40, height: 20, displayWidth: 300, blurhash: 'B', dominantColor: 'rgb(1,2,3)',
		});
	});

	it('アイキャッチの形', () => {
		expect(toFeaturedImage(media, '説明')).toEqual({
			provider: 'local', id: 'M1', alt: '説明', width: 40, height: 20,
			mimeType: 'image/png', filename: '写真.png', meta: { storageKey: 'S1.png' },
		});
	});

	it('cover のいろいろな書き方', () => {
		expect(parseCoverValue('画像/表紙.png')).toBe('画像/表紙.png');
		expect(parseCoverValue('[[表紙.png]]')).toBe('表紙.png');
		expect(parseCoverValue('![[表紙.png|説明]]')).toBe('表紙.png');
		expect(parseCoverValue('![](画像/表%20紙.png)')).toBe('画像/表 紙.png');
		expect(parseCoverValue(['[[a.jpg]]'])).toBe('a.jpg');
		expect(parseCoverValue('')).toBeUndefined();
		expect(parseCoverValue(undefined)).toBeUndefined();
	});
});

describe('frontmatter のカテゴリー・タグ', () => {
	it('いろいろな書き方', () => {
		expect(readNoteFields({ category: '開発', tags: ['#Web開発', 'ツール', 'ツール'] }, 'n')).toMatchObject({ category: '開発', tags: ['Web開発', 'ツール'] });
		expect(readNoteFields({ category: ['開発', 'x'], tags: '#a, b c' }, 'n')).toMatchObject({ category: '開発', tags: ['a', 'b', 'c'] });
	});

	it('書いていなければ undefined、空なら空のリスト', () => {
		expect(readNoteFields({}, 'n')).toMatchObject({ category: undefined, tags: undefined });
		expect(readNoteFields({ tags: null }, 'n').tags).toEqual([]);
		expect(readNoteFields({ tags: [] }, 'n').tags).toEqual([]);
	});
});

/** カテゴリー・タグの一覧と、タグを作る API の偽物 */
function taxonomyApi() {
	const created: string[] = [];
	const terms: Record<string, { slug: string; label: string; children?: unknown[] }[]> = {
		category: [{ slug: 'development', label: '開発', children: [{ slug: 'web', label: 'ウェブ', children: [] }] }],
		tag: [{ slug: 'webdev', label: 'Web開発' }, { slug: 'tools', label: 'ツール' }],
	};
	const api: ApiLike = {
		async request<T>(method: string, path: string, body?: unknown): Promise<T> {
			const name = path.split('/')[2];
			if (method === 'GET') return { terms: terms[name] } as T;
			const label = (body as { label: string }).label;
			created.push(label);
			return { term: { slug: `new-${created.length}`, label } } as T;
		},
	};
	return { api, created };
}

describe('resolveTaxonomies', () => {
	it('名前（大文字小文字は気にしない）か slug で探す。入れ子のカテゴリーも', async () => {
		const { api, created } = taxonomyApi();
		expect(await resolveTaxonomies(api, 'ウェブ', ['web開発', 'tools'])).toEqual({ category: ['web'], tag: ['webdev', 'tools'] });
		expect(created).toEqual([]);
	});

	it('無いタグは1回だけ作る', async () => {
		const { api, created } = taxonomyApi();
		expect(await resolveTaxonomies(api, undefined, ['新しい', '新しい', 'ツール'])).toEqual({ tag: ['new-1', 'tools'] });
		expect(created).toEqual(['新しい']);
	});

	it('無いカテゴリーは作らずにエラー', async () => {
		const { api } = taxonomyApi();
		await expect(resolveTaxonomies(api, '料理', undefined)).rejects.toBeInstanceOf(UnknownCategoryError);
		await expect(resolveTaxonomies(api, '料理', undefined)).rejects.toMatchObject({ available: ['開発', 'ウェブ'] });
	});

	it('どちらも書いていなければ、何も聞かない', async () => {
		const { api } = taxonomyApi();
		expect(await resolveTaxonomies({ request: () => Promise.reject(new Error('呼ばない')) }, undefined, undefined)).toEqual({});
		expect(await resolveTaxonomies(api, undefined, [])).toEqual({ tag: [] });
	});
});

describe('sendPost にアイキャッチとカテゴリー・タグ', () => {
	it('作るときも更新するときも入れる', async () => {
		const bodies: unknown[] = [];
		const api: ApiLike = {
			async request<T>(_m: string, _p: string, body?: unknown): Promise<T> {
				bodies.push(body);
				return { item: { id: 'I', slug: 's', status: 'draft' }, _rev: 'r' } as T;
			},
		};
		const featuredImage = toFeaturedImage(media, '');
		const taxonomies = { category: ['development'], tag: ['webdev'] };
		await sendPost(api, { title: 'T', content: [], featuredImage, taxonomies, publish: false });
		await sendPost(api, { id: 'I', rev: 'r', title: 'T', content: [], featuredImage, taxonomies, publish: false });
		for (const body of bodies) {
			expect(body).toMatchObject({ data: { featured_image: featuredImage }, taxonomies });
		}
	});
});
