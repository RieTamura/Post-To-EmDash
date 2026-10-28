import { describe, expect, it } from 'vitest';
import { convertMarkdown, type Block, type LinkDef, type Span } from '../src/convert';

/** 比べやすいように、_key を外して「印:文字」の形にする */
function spansOf(spans: Span[], markDefs: LinkDef[] = []): string[] {
	return spans.map((s) => {
		const marks = s.marks.map((m) => {
			const def = markDefs.find((d) => d._key === m);
			return def ? `link(${def.href})` : m;
		});
		return marks.length ? `${marks.join('+')}:${s.text}` : s.text;
	});
}

function simplify(blocks: Block[]): unknown[] {
	return blocks.map((b) => {
		switch (b._type) {
			case 'block':
				return {
					style: b.style,
					...(b.listItem ? { list: `${b.listItem}${b.level}` } : {}),
					text: spansOf(b.children, b.markDefs),
				};
			case 'code':
				return { code: b.code, language: b.language };
			case 'image':
				return { image: b.asset.url, alt: b.alt, width: b.displayWidth, height: b.displayHeight };
			case 'break':
				return 'hr';
			case 'table':
				return { table: b.rows.map((r) => r.cells.map((c) => spansOf(c.content, c.markDefs).join(''))) };
		}
	});
}

const run = (md: string, options = {}) => simplify(convertMarkdown(md, options).blocks);

describe('段落と見出し', () => {
	it('続いた行は1つの段落にして、改行を残す', () => {
		expect(run('一行目\n二行目\n\n次の段落')).toEqual([
			{ style: 'normal', text: ['一行目\n二行目'] },
			{ style: 'normal', text: ['次の段落'] },
		]);
	});

	it('見出し', () => {
		expect(run('# 大\n## 中 ##\n###### 小\n#タグ')).toEqual([
			{ style: 'h1', text: ['大'] },
			{ style: 'h2', text: ['中'] },
			{ style: 'h6', text: ['小'] },
			{ style: 'normal', text: ['#タグ'] },
		]);
	});

	it('Windows の改行でも同じ', () => {
		expect(run('a\r\nb')).toEqual([{ style: 'normal', text: ['a\nb'] }]);
	});
});

describe('文中の書き方', () => {
	it('太字・斜体・取り消し線・コード', () => {
		expect(run('**太** と *斜* と _斜_ と ~~消~~ と `code`')).toEqual([
			{ style: 'normal', text: ['strong:太', ' と ', 'em:斜', ' と ', 'em:斜', ' と ', 'strike-through:消', ' と ', 'code:code'] },
		]);
	});

	it('入れ子の強調', () => {
		expect(run('**太 *斜* 太**')).toEqual([
			{ style: 'normal', text: ['strong:太 ', 'strong+em:斜', 'strong: 太'] },
		]);
	});

	it('ハイライトは印だけ外す', () => {
		expect(run('ここが ==大事== です')).toEqual([{ style: 'normal', text: ['ここが 大事 です'] }]);
	});

	it('snake_case やかけ算の * はそのまま', () => {
		expect(run('my_var_name と 2 * 3 * 4')).toEqual([{ style: 'normal', text: ['my_var_name と 2 * 3 * 4'] }]);
	});

	it('エスケープした記号はそのまま', () => {
		expect(run('\\*強調しない\\*')).toEqual([{ style: 'normal', text: ['*強調しない*'] }]);
	});

	it('リンク・<URL>・そのままの URL', () => {
		expect(run('[サイト](https://example.com) と <https://a.example> と https://b.example/x。')).toEqual([
			{
				style: 'normal',
				text: ['link(https://example.com):サイト', ' と ', 'link(https://a.example):https://a.example', ' と ', 'link(https://b.example/x):https://b.example/x', '。'],
			},
		]);
	});

	it('リンクの文字の中の太字', () => {
		expect(run('[**太い**リンク](https://example.com)')).toEqual([
			{ style: 'normal', text: ['link(https://example.com)+strong:太い', 'link(https://example.com):リンク'] },
		]);
	});

	it('[[ノート]] は投稿済みならリンク、まだなら文字', () => {
		const resolveWikiLink = (t: string) => (t === '投稿済み' ? 'https://site/posts/done' : null);
		expect(run('[[投稿済み]] と [[まだ|別名]] と [[ノート#見出し]]', { resolveWikiLink })).toEqual([
			{ style: 'normal', text: ['link(https://site/posts/done):投稿済み', ' と 別名 と ノート > 見出し'] },
		]);
	});
});

describe('箇条書き', () => {
	it('入れ子と番号付き（タブ）', () => {
		expect(run('- a\n\t- b\n\t\t- c\n- d\n1. one\n2. two')).toEqual([
			{ style: 'normal', list: 'bullet1', text: ['a'] },
			{ style: 'normal', list: 'bullet2', text: ['b'] },
			{ style: 'normal', list: 'bullet3', text: ['c'] },
			{ style: 'normal', list: 'bullet1', text: ['d'] },
			{ style: 'normal', list: 'number1', text: ['one'] },
			{ style: 'normal', list: 'number1', text: ['two'] },
		]);
	});

	it('入れ子（スペース）とチェックボックス', () => {
		expect(run('- [ ] やる\n  - [x] やった')).toEqual([
			{ style: 'normal', list: 'bullet1', text: ['☐ やる'] },
			{ style: 'normal', list: 'bullet2', text: ['☑ やった'] },
		]);
	});

	it('項目のあいだの空行と、字下げした続きの行', () => {
		expect(run('- a\n  続き\n\n- b\n\n段落')).toEqual([
			{ style: 'normal', list: 'bullet1', text: ['a\n続き'] },
			{ style: 'normal', list: 'bullet1', text: ['b'] },
			{ style: 'normal', text: ['段落'] },
		]);
	});
});

describe('引用・コールアウト・区切り線', () => {
	it('続いた引用は1つにまとめる', () => {
		expect(run('> 一行目\n> 二行目\n>\n> 次')).toEqual([
			{ style: 'blockquote', text: ['一行目\n二行目'] },
			{ style: 'blockquote', text: ['次'] },
		]);
	});

	it('コールアウトは印を外して引用に', () => {
		expect(run('> [!note] メモ\n> 中身\n\n> [!tip]-\n> ヒント')).toEqual([
			{ style: 'blockquote', text: ['メモ\n中身'] },
			{ style: 'blockquote', text: ['ヒント'] },
		]);
	});

	it('区切り線', () => {
		expect(run('a\n\n---\n\n***\nb')).toEqual([
			{ style: 'normal', text: ['a'] }, 'hr', 'hr', { style: 'normal', text: ['b'] },
		]);
	});
});

describe('コード・数式・コメント', () => {
	it('コードの中は変換しない', () => {
		expect(run('```ts\nconst a = **b**;\n%% not a comment %%\n```')).toEqual([
			{ code: 'const a = **b**;\n%% not a comment %%', language: 'ts' },
		]);
	});

	it('~~~ のコードと、閉じていないコード', () => {
		expect(run('~~~\nx\n~~~\n```\ny')).toEqual([
			{ code: 'x', language: undefined },
			{ code: 'y', language: undefined },
		]);
	});

	it('数式は LaTeX のコードに', () => {
		expect(run('$$\nE = mc^2\n$$\n$$ a+b $$')).toEqual([
			{ code: 'E = mc^2', language: 'latex' },
			{ code: 'a+b', language: 'latex' },
		]);
	});

	it('%%コメント%% は送らない（複数行も）', () => {
		expect(run('見える %%見えない%% 見える\n\n%%\n隠す\n%%\n\n最後')).toEqual([
			{ style: 'normal', text: ['見える  見える'] },
			{ style: 'normal', text: ['最後'] },
		]);
	});
});

describe('画像と埋め込み', () => {
	it('![[画像]] と大きさ・説明', () => {
		expect(run('![[写真.png]]\n![[図/a.jpg|300]]\n![[b.webp|猫の写真]]')).toEqual([
			{ image: '写真.png', alt: '', width: undefined, height: undefined },
			{ image: '図/a.jpg', alt: '', width: 300, height: undefined },
			{ image: 'b.webp', alt: '猫の写真', width: undefined, height: undefined },
		]);
	});

	it('![alt|文字](url) は全体が説明文', () => {
		expect(run('![a|b](x.png)')).toEqual([{ image: 'x.png', alt: 'a|b', width: undefined, height: undefined }]);
	});

	it('![alt](url) と ![alt|300x200](url)', () => {
		expect(run('![説明](画像/x%20y.png)\n![小さく|300x200](https://example.com/a.png "title")')).toEqual([
			{ image: '画像/x y.png', alt: '説明', width: undefined, height: undefined },
			{ image: 'https://example.com/a.png', alt: '小さく', width: 300, height: 200 },
		]);
	});

	it('文の途中の画像は、前後を分けて画像ブロックに', () => {
		expect(run('前 ![[a.png]] 後')).toEqual([
			{ style: 'normal', text: ['前'] },
			{ image: 'a.png', alt: '', width: undefined, height: undefined },
			{ style: 'normal', text: ['後'] },
		]);
	});

	it('ノートの埋め込みは送らない', () => {
		expect(run('![[別のノート]]\n\n本文 ![[別のノート#節]] 続き')).toEqual([
			{ style: 'normal', text: ['本文  続き'] },
		]);
	});

	it('images に本文の画像が並ぶ', () => {
		const result = convertMarkdown('![[a.png]]\n\n文\n\n![b](b.jpg)');
		expect(result.images.map((i) => i.asset.url)).toEqual(['a.png', 'b.jpg']);
		expect(result.images[0]).toBe(result.blocks[0]);
	});
});

describe('表', () => {
	it('表を表のブロックに', () => {
		const result = convertMarkdown('| 名前 | 値 |\n| :--- | ---: |\n| **a** | 1 |\n| [[x\\|y]] | `a|b` |');
		expect(simplify(result.blocks)).toEqual([
			{ table: [['名前', '値'], ['strong:a', '1'], ['y', 'code:a|b']] },
		]);
		const table = result.blocks[0];
		if (table._type !== 'table') throw new Error('not a table');
		expect(table.rows[0].cells[0].isHeader).toBe(true);
		expect(table.rows[1].cells[1].textAlign).toBe('right');
	});
});

describe('ブロックの _key', () => {
	it('1つの記事の中で重ならない', () => {
		const result = convertMarkdown('# a\n\n**b** [c](https://x)\n\n- d\n\n| e | f |\n|---|---|\n| g | h |');
		const keys: string[] = [];
		const walk = (v: unknown) => {
			if (Array.isArray(v)) v.forEach(walk);
			else if (v && typeof v === 'object') {
				const o = v as Record<string, unknown>;
				if (typeof o._key === 'string') keys.push(o._key);
				Object.values(o).forEach(walk);
			}
		};
		walk(result.blocks);
		expect(new Set(keys).size).toBe(keys.length);
	});
});
