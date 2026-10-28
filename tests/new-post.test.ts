import { describe, expect, it } from 'vitest';
import { convertMarkdown } from '../src/convert';
import { buildNewPostNote, safeFileName, uniquePath, yamlString } from '../src/new-post';

describe('yamlString', () => {
	it('ふつうの文字はそのまま', () => {
		expect(yamlString('はじめての記事')).toBe('はじめての記事');
		expect(yamlString('My first post')).toBe('My first post');
	});

	it('YAML で意味のある書き方は "…" で囲む', () => {
		for (const v of ['題: 副題', '#タグ', '[メモ]', '- 箇条', 'true', 'no', '2026', '1.5', '', ' 前に空白', 'a "b"']) {
			const out = yamlString(v);
			expect(out.startsWith('"')).toBe(true);
			expect(JSON.parse(out)).toBe(v);
		}
	});
});

describe('safeFileName', () => {
	it('使えない文字を外す', () => {
		expect(safeFileName('a/b:c*d?"e"<f>|g#h^i[j]')).toBe('a b c d e f g h i j');
		expect(safeFileName('  ..隠し  ')).toBe('隠し');
		expect(safeFileName('???')).toBe('');
	});
});

describe('uniquePath', () => {
	it('同じ名前があれば番号を付ける', () => {
		const existing = new Set(['記事/題.md', '記事/題 2.md']);
		expect(uniquePath('記事', '題', (p) => existing.has(p))).toBe('記事/題 3.md');
		expect(uniquePath('記事', '新しい', (p) => existing.has(p))).toBe('記事/新しい.md');
		expect(uniquePath('', '題', () => false)).toBe('題.md');
	});
});

describe('buildNewPostNote', () => {
	it('項目と説明が入り、tags は入らない', () => {
		const note = buildNewPostNote('題: 副題', '説明です');
		expect(note).toBe([
			'---',
			'title: "題: 副題"',
			'slug:',
			'excerpt:',
			'category:',
			'cover:',
			'status: draft',
			'---',
			'',
			'%%',
			'説明です',
			'%%',
			'',
			'',
		].join('\n'));
	});

	it('説明なし', () => {
		expect(buildNewPostNote('題', null)).not.toContain('%%');
	});

	it('説明はサイトに送られない', () => {
		const note = buildNewPostNote('題', '- title：記事のタイトル\n- [[リンク]] や **太字** も');
		const body = note.slice(note.indexOf('---', 3) + 4);
		expect(convertMarkdown(body + '本文').blocks).toHaveLength(1);
	});
});
