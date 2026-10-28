import { describe, expect, it } from 'vitest';
import { noteBody, readNoteFields } from '../src/note';
import { postUrl, sendPost, type ApiLike } from '../src/publish';

/** 呼ばれた API を記録して、決まった返事をする偽物 */
function fakeApi(status = 'draft') {
	const calls: { method: string; path: string; body: unknown }[] = [];
	let rev = 0;
	const api: ApiLike = {
		async request<T>(method: string, path: string, body?: unknown): Promise<T> {
			calls.push({ method, path, body });
			rev++;
			const published = path.endsWith('/publish');
			return {
				item: { id: 'ID1', slug: 'my-post', status: published ? 'published' : status, liveRevisionId: published ? 'L' : null },
				_rev: `r${rev}`,
			} as T;
		},
	};
	return { api, calls };
}

describe('readNoteFields', () => {
	it('frontmatter から値を取る', () => {
		expect(readNoteFields({ title: ' 題 ', slug: 'a-b', excerpt: '紹介', status: 'Publish', emdash_id: 'X', emdash_rev: 'R' }, 'ファイル名')).toEqual({
			title: '題', slug: 'a-b', excerpt: '紹介', publish: true, id: 'X', rev: 'R',
		});
	});

	it('何もなければファイル名がタイトルで、下書き', () => {
		expect(readNoteFields(undefined, 'ファイル名')).toEqual({
			title: 'ファイル名', slug: undefined, excerpt: undefined, publish: false, id: undefined, rev: undefined,
		});
	});

	it('status: draft や空のタイトルは下書き・ファイル名', () => {
		const f = readNoteFields({ title: '', status: 'draft' }, 'n');
		expect(f.title).toBe('n');
		expect(f.publish).toBe(false);
	});
});

describe('noteBody', () => {
	it('frontmatter を除く', () => {
		const text = '---\ntitle: a\n---\n本文';
		expect(noteBody(text, text.indexOf('---', 3) + 3)).toBe('本文');
		expect(noteBody('本文だけ', undefined)).toBe('本文だけ');
	});
});

describe('sendPost', () => {
	const content = [{ _type: 'break' as const, _key: 'k0', style: 'line' as const }];

	it('はじめては下書きで作る', async () => {
		const { api, calls } = fakeApi();
		const result = await sendPost(api, { title: 'T', slug: 's', excerpt: 'E', content, publish: false });
		expect(calls).toEqual([{ method: 'POST', path: '/content/posts', body: { data: { title: 'T', content, excerpt: 'E' }, status: 'draft', slug: 's' } }]);
		expect(result).toMatchObject({ id: 'ID1', slug: 'my-post', rev: 'r1', created: true, published: false, hasLiveVersion: false });
	});

	it('emdash_id があれば、前の版を付けて更新する', async () => {
		const { api, calls } = fakeApi();
		await sendPost(api, { id: 'ID1', rev: 'old', title: 'T', content, publish: false });
		expect(calls[0]).toEqual({ method: 'PUT', path: '/content/posts/ID1', body: { data: { title: 'T', content }, _rev: 'old' } });
	});

	it('上書きするときは版を付けない', async () => {
		const { api, calls } = fakeApi();
		await sendPost(api, { id: 'ID1', rev: 'old', force: true, title: 'T', content, publish: false });
		expect(calls[0].body).toEqual({ data: { title: 'T', content } });
	});

	it('status: publish なら、続けて最新の版で公開する', async () => {
		const { api, calls } = fakeApi();
		const result = await sendPost(api, { title: 'T', content, publish: true });
		expect(calls[1]).toEqual({ method: 'POST', path: '/content/posts/ID1/publish', body: { _rev: 'r1' } });
		expect(result).toMatchObject({ rev: 'r2', published: true, hasLiveVersion: true });
	});

	it('公開中の記事を下書きで更新したことがわかる', async () => {
		const { api } = fakeApi('published');
		const result = await sendPost(api, { id: 'ID1', rev: 'r', title: 'T', content, publish: false });
		expect(result).toMatchObject({ published: false, hasLiveVersion: true, created: false });
	});
});

it('postUrl', () => {
	expect(postUrl('https://example.com', 'a-b')).toBe('https://example.com/posts/a-b');
});
