/**
 * Obsidian の Markdown を EmDash の本文の形式（Portable Text）に変える。
 *
 * EmDash 公式の markdownToPortableText は1行を1段落にし、`*斜体*` や入れ子の強調、
 * 表、Obsidian 独自の書き方を扱わないため、ここで同じ形のブロックを自前で作る。
 * obsidian を import しないので、そのままテストできる。
 */

export interface Span {
	_type: 'span';
	_key: string;
	text: string;
	marks: string[];
}

export interface LinkDef {
	_type: 'link';
	_key: string;
	href: string;
}

export interface TextBlock {
	_type: 'block';
	_key: string;
	style: string;
	listItem?: 'bullet' | 'number';
	level?: number;
	markDefs: LinkDef[];
	children: Span[];
}

export interface CodeBlock {
	_type: 'code';
	_key: string;
	code: string;
	language?: string;
}

export interface ImageBlock {
	_type: 'image';
	_key: string;
	alt: string;
	/** 変換直後は url にノートに書かれたままの画像の場所が入る。アップロード後に _ref へ置きかえる */
	asset: { url?: string; _ref?: string };
	width?: number;
	height?: number;
}

export interface BreakBlock {
	_type: 'break';
	_key: string;
	style: 'line';
}

export interface TableCell {
	_type: 'tableCell';
	_key: string;
	content: Span[];
	markDefs: LinkDef[];
	isHeader?: boolean;
	textAlign?: 'left' | 'center' | 'right';
}

export interface TableBlock {
	_type: 'table';
	_key: string;
	hasHeaderRow: boolean;
	rows: { _type: 'tableRow'; _key: string; cells: TableCell[] }[];
}

export type Block = TextBlock | CodeBlock | ImageBlock | BreakBlock | TableBlock;

export interface ConvertOptions {
	/** `[[ノート]]` のリンク先。サイトに投稿済みなら URL、まだなら null（ただの文字になる） */
	resolveWikiLink?: (target: string) => string | null;
}

export interface ConvertResult {
	blocks: Block[];
	/** 本文の画像（blocks の中の画像と同じもの）。アップロードのときに使う */
	images: ImageBlock[];
}

const IMAGE_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'avif', 'bmp', 'svg']);

const FENCE_REGEX = /^[ \t]{0,3}(`{3,}|~{3,})[ \t]*([^`\s]*)/;
const HEADING_REGEX = /^[ \t]{0,3}(#{1,6})[ \t]+(.*?)(?:[ \t]+#+)?[ \t]*$/;
const THEMATIC_BREAK_REGEX = /^[ \t]{0,3}([-*_])(?:[ \t]*\1){2,}[ \t]*$/;
const LIST_ITEM_REGEX = /^([ \t]*)([-*+]|\d{1,9}[.)])[ \t]+(.*)$/;
const TASK_REGEX = /^\[([ xX])\][ \t]+/;
const QUOTE_REGEX = /^[ \t]{0,3}>/;
const CALLOUT_REGEX = /^\[![^\]]+\][+-]?[ \t]*/;
const TABLE_SEPARATOR_REGEX = /^[ \t]*\|?[ \t]*:?-+:?[ \t]*(\|[ \t]*:?-+:?[ \t]*)*\|?[ \t]*$/;
const MATH_FENCE_REGEX = /^[ \t]*\$\$/;
/** 1行まるごとの画像：![[画像.png|alt]] または ![alt](url "title") */
const EMBED_REGEX = /!\[\[([^\]|]+)(?:\|([^\]]*))?\]\]/g;
const MD_IMAGE_REGEX = /!\[([^\]]*)\]\((<[^>]*>|[^)\s]+)(?:[ \t]+"[^"]*")?\)/g;

export function isImagePath(path: string): boolean {
	const clean = path.split(/[?#]/)[0];
	const dot = clean.lastIndexOf('.');
	return dot >= 0 && IMAGE_EXTENSIONS.has(clean.slice(dot + 1).toLowerCase());
}

class Converter {
	private keyCounter = 0;
	readonly blocks: Block[] = [];
	readonly images: ImageBlock[] = [];

	constructor(private readonly options: ConvertOptions) {}

	key(): string {
		return `k${(this.keyCounter++).toString(36)}`;
	}

	run(markdown: string): void {
		const lines = expandImageLines(stripComments(markdown.replace(/\r\n?/g, '\n')).split('\n'));
		let i = 0;
		while (i < lines.length) {
			const line = lines[i];
			if (line.trim() === '') {
				i++;
				continue;
			}

			const fence = line.match(FENCE_REGEX);
			if (fence) {
				i = this.readFence(lines, i, fence[1], fence[2]);
				continue;
			}
			if (MATH_FENCE_REGEX.test(line)) {
				i = this.readMath(lines, i);
				continue;
			}
			if (THEMATIC_BREAK_REGEX.test(line)) {
				this.blocks.push({ _type: 'break', _key: this.key(), style: 'line' });
				i++;
				continue;
			}
			const heading = line.match(HEADING_REGEX);
			if (heading) {
				if (heading[2]) this.pushText(heading[2], `h${heading[1].length}`);
				i++;
				continue;
			}
			if (QUOTE_REGEX.test(line)) {
				i = this.readQuote(lines, i);
				continue;
			}
			if (LIST_ITEM_REGEX.test(line)) {
				i = this.readList(lines, i);
				continue;
			}
			if (this.isTableStart(lines, i)) {
				i = this.readTable(lines, i);
				continue;
			}
			if (this.tryImage(line)) {
				i++;
				continue;
			}
			i = this.readParagraph(lines, i);
		}
	}

	private readFence(lines: string[], start: number, marker: string, language: string): number {
		const code: string[] = [];
		let i = start + 1;
		const closing = new RegExp(`^[ \\t]{0,3}${marker[0] === '`' ? '`' : '~'}{${marker.length},}[ \\t]*$`);
		while (i < lines.length && !closing.test(lines[i])) {
			code.push(lines[i]);
			i++;
		}
		this.blocks.push({ _type: 'code', _key: this.key(), code: code.join('\n'), ...(language ? { language } : {}) });
		return i + 1;
	}

	/** 数式（$$ … $$）はサイトで表示できないので、LaTeX のコードとして見せる */
	private readMath(lines: string[], start: number): number {
		const first = lines[start].replace(MATH_FENCE_REGEX, '');
		// $$ x^2 $$ のように1行で閉じている場合
		const sameLine = first.indexOf('$$');
		if (sameLine >= 0) {
			this.blocks.push({ _type: 'code', _key: this.key(), code: first.slice(0, sameLine).trim(), language: 'latex' });
			return start + 1;
		}
		const code: string[] = first.trim() ? [first.trim()] : [];
		let i = start + 1;
		while (i < lines.length && !lines[i].includes('$$')) {
			code.push(lines[i]);
			i++;
		}
		if (i < lines.length) {
			const before = lines[i].slice(0, lines[i].indexOf('$$')).trim();
			if (before) code.push(before);
		}
		this.blocks.push({ _type: 'code', _key: this.key(), code: code.join('\n'), language: 'latex' });
		return i + 1;
	}

	/**
	 * 引用とコールアウト。続いている > の行をまとめて1つの引用にし、
	 * 中の空行（> だけの行）で引用を分ける。コールアウトの [!note] の印は外す
	 */
	private readQuote(lines: string[], start: number): number {
		const inner: string[] = [];
		let i = start;
		while (i < lines.length && QUOTE_REGEX.test(lines[i])) {
			inner.push(lines[i].replace(/^[ \t]{0,3}(?:>[ \t]?)+/, ''));
			i++;
		}
		if (inner.length && CALLOUT_REGEX.test(inner[0])) {
			inner[0] = inner[0].replace(CALLOUT_REGEX, '');
			// タイトルを書いていないコールアウトは、印の行ごと消す
			if (!inner[0].trim()) inner.shift();
		}
		let paragraph: string[] = [];
		const flush = () => {
			if (paragraph.length) this.pushText(paragraph.join('\n'), 'blockquote');
			paragraph = [];
		};
		for (const line of inner) {
			if (line.trim() === '') flush();
			else paragraph.push(line.trimEnd());
		}
		flush();
		return i;
	}

	/** 箇条書き。字下げの深さを積み上げて level を決める（タブでもスペースでもよい） */
	private readList(lines: string[], start: number): number {
		const indents: number[] = [];
		let i = start;
		while (i < lines.length) {
			const match = lines[i].match(LIST_ITEM_REGEX);
			if (!match) break;
			const width = indentWidth(match[1]);
			while (indents.length && indents[indents.length - 1] > width) indents.pop();
			if (!indents.length || indents[indents.length - 1] < width) indents.push(width);
			const level = indents.length;

			let text = match[3];
			const task = text.match(TASK_REGEX);
			if (task) text = (task[1] === ' ' ? '☐ ' : '☑ ') + text.slice(task[0].length);
			i++;
			// 字下げした続きの行は、同じ項目の改行として扱う
			while (i < lines.length && lines[i].trim() !== '' && /^[ \t]+/.test(lines[i]) && !LIST_ITEM_REGEX.test(lines[i])) {
				text += '\n' + lines[i].trim();
				i++;
			}
			const block = this.makeTextBlock(text.trimEnd(), 'normal');
			block.listItem = /^\d/.test(match[2]) ? 'number' : 'bullet';
			block.level = level;
			this.blocks.push(block);
			// 項目のあいだの空行1つまでは同じ箇条書きとみなす
			if (i + 1 < lines.length && lines[i]?.trim() === '' && LIST_ITEM_REGEX.test(lines[i + 1])) i++;
		}
		return i;
	}

	private isTableStart(lines: string[], i: number): boolean {
		return lines[i].includes('|') && i + 1 < lines.length && lines[i + 1].includes('-') && TABLE_SEPARATOR_REGEX.test(lines[i + 1]);
	}

	private readTable(lines: string[], start: number): number {
		const header = splitTableRow(lines[start]);
		const aligns = splitTableRow(lines[start + 1]).map((cell): TableCell['textAlign'] => {
			const left = cell.startsWith(':');
			const right = cell.endsWith(':');
			if (left && right) return 'center';
			if (right) return 'right';
			if (left) return 'left';
			return undefined;
		});
		const rows = [header];
		let i = start + 2;
		while (i < lines.length && lines[i].trim() !== '' && lines[i].includes('|')) {
			rows.push(splitTableRow(lines[i]));
			i++;
		}
		const width = header.length;
		this.blocks.push({
			_type: 'table',
			_key: this.key(),
			hasHeaderRow: true,
			rows: rows.map((cells, rowIndex) => ({
				_type: 'tableRow' as const,
				_key: this.key(),
				cells: Array.from({ length: width }, (_, col) => {
					const { spans, markDefs } = this.parseInline(cells[col] ?? '');
					const cell: TableCell = { _type: 'tableCell', _key: this.key(), content: spans, markDefs };
					if (rowIndex === 0) cell.isHeader = true;
					if (aligns[col]) cell.textAlign = aligns[col];
					return cell;
				}),
			})),
		});
		return i;
	}

	/** 1行まるごと画像なら画像ブロックにする。画像ではない埋め込み（![[ノート]]）は送らない */
	private tryImage(line: string): boolean {
		const trimmed = line.trim();
		const embed = matchWhole(trimmed, EMBED_REGEX);
		if (embed) {
			const path = embed[1].trim();
			if (!isImagePath(path)) return true;
			const { alt, width, height } = parseSizeOrAlt(embed[2]);
			this.pushImage(path, alt, width, height);
			return true;
		}
		const md = matchWhole(trimmed, MD_IMAGE_REGEX);
		if (md) {
			// Obsidian では ![alt|300](url) で大きさを指定できる
			const [altBeforeBar, size] = splitLast(md[1], '|');
			let altText = altBeforeBar;
			let parsed = size !== null ? parseSizeOrAlt(size) : { alt: '' };
			if (parsed.alt) {
				// | のあとが大きさではなければ、全体が説明文
				altText = md[1];
				parsed = { alt: '' };
			}
			let url = md[2];
			if (url.startsWith('<') && url.endsWith('>')) url = url.slice(1, -1);
			this.pushImage(safeDecode(url), altText, parsed.width, parsed.height);
			return true;
		}
		return false;
	}

	private pushImage(url: string, alt: string, width?: number, height?: number): void {
		const image: ImageBlock = { _type: 'image', _key: this.key(), alt, asset: { url } };
		if (width) image.width = width;
		if (height) image.height = height;
		this.blocks.push(image);
		this.images.push(image);
	}

	/** 段落。空行か、別のブロックが始まるまでの行を改行でつなぐ（Obsidian の見た目と同じ） */
	private readParagraph(lines: string[], start: number): number {
		const text: string[] = [lines[start].trim()];
		let i = start + 1;
		while (i < lines.length) {
			const line = lines[i];
			if (
				line.trim() === '' || FENCE_REGEX.test(line) || MATH_FENCE_REGEX.test(line) || HEADING_REGEX.test(line) ||
				QUOTE_REGEX.test(line) || LIST_ITEM_REGEX.test(line) || THEMATIC_BREAK_REGEX.test(line) ||
				this.isTableStart(lines, i) || matchWhole(line.trim(), EMBED_REGEX) || matchWhole(line.trim(), MD_IMAGE_REGEX)
			) break;
			text.push(line.trim());
			i++;
		}
		// 行末の \ （Markdown の改行の印）は外す。改行そのものは残る
		this.pushText(text.map((t) => t.replace(/\\$/, '')).join('\n'), 'normal');
		return i;
	}

	private pushText(text: string, style: string): void {
		this.blocks.push(this.makeTextBlock(text, style));
	}

	private makeTextBlock(text: string, style: string): TextBlock {
		const { spans, markDefs } = this.parseInline(text);
		return { _type: 'block', _key: this.key(), style, markDefs, children: spans };
	}

	parseInline(text: string): { spans: Span[]; markDefs: LinkDef[] } {
		const markDefs: LinkDef[] = [];
		const spans: Span[] = [];
		new InlineParser(this, this.options, markDefs, spans).parse(text, []);
		if (!spans.length) spans.push({ _type: 'span', _key: this.key(), text: '', marks: [] });
		return { spans, markDefs };
	}
}

/** 文中の書き方（強調・コード・リンクなど）を読む。入れ子の強調にも対応する */
class InlineParser {
	constructor(
		private readonly converter: Converter,
		private readonly options: ConvertOptions,
		private readonly markDefs: LinkDef[],
		private readonly spans: Span[],
	) {}

	parse(text: string, marks: string[]): void {
		let buffer = '';
		const flush = () => {
			if (buffer) this.pushSpan(buffer, marks);
			buffer = '';
		};
		let i = 0;
		while (i < text.length) {
			const ch = text[i];
			const rest = text.slice(i);

			// \* のようなエスケープは、記号そのものとして残す
			if (ch === '\\' && i + 1 < text.length && /[\\`*_{}[\]()#+\-.!|~=<>$%]/.test(text[i + 1])) {
				buffer += text[i + 1];
				i += 2;
				continue;
			}

			if (ch === '`') {
				const ticks = rest.match(/^`+/)![0];
				const end = text.indexOf(ticks, i + ticks.length);
				if (end > 0) {
					flush();
					this.pushSpan(text.slice(i + ticks.length, end).replace(/^ (.+) $/, '$1'), [...marks, 'code']);
					i = end + ticks.length;
					continue;
				}
			}

			if (rest.startsWith('[[')) {
				const end = text.indexOf(']]', i + 2);
				if (end > 0) {
					flush();
					this.wikiLink(text.slice(i + 2, end), marks);
					i = end + 2;
					continue;
				}
			}

			// 文の途中の ![[…]]（画像以外の埋め込み）は送らない
			if (rest.startsWith('![[')) {
				const end = text.indexOf(']]', i + 3);
				if (end > 0) {
					i = end + 2;
					continue;
				}
			}

			if (ch === '[') {
				const link = readMarkdownLink(text, i);
				if (link) {
					flush();
					this.link(link.label, link.href, marks);
					i = link.end;
					continue;
				}
			}

			if (ch === '<') {
				const auto = rest.match(/^<(https?:\/\/[^>\s]+)>/);
				if (auto) {
					flush();
					this.link(auto[1], auto[1], marks, true);
					i += auto[0].length;
					continue;
				}
			}

			if ((ch === 'h') && /^https?:\/\//.test(rest) && !/[\w/]$/.test(text.slice(0, i))) {
				const url = rest.match(/^https?:\/\/[^\s<>()[\]{}"'「」、。]+/)![0].replace(/[.,!?:;]+$/, '');
				flush();
				this.link(url, url, marks, true);
				i += url.length;
				continue;
			}

			const delimiter = readDelimiter(text, i);
			if (delimiter) {
				flush();
				const inner = text.slice(i + delimiter.open.length, delimiter.close);
				const mark = delimiter.mark;
				this.parse(inner, mark && !marks.includes(mark) ? [...marks, mark] : marks);
				i = delimiter.close + delimiter.open.length;
				continue;
			}

			buffer += ch;
			i++;
		}
		flush();
	}

	private wikiLink(inner: string, marks: string[]): void {
		const [target, alias] = splitFirst(inner, '|');
		// [[ノート#見出し]] は、表示する文字を「ノート > 見出し」にする（Obsidian と同じ）
		const display = alias ?? target.replace(/#\^?/g, ' > ').replace(/^ > /, '');
		const note = target.split('#')[0].trim();
		const href = note ? this.options.resolveWikiLink?.(note) ?? null : null;
		if (href) this.link(display, href, marks, true);
		else this.pushSpan(display, marks);
	}

	private link(label: string, href: string, marks: string[], plainLabel = false): void {
		const key = this.converter.key();
		this.markDefs.push({ _type: 'link', _key: key, href });
		if (plainLabel) this.pushSpan(label, [...marks, key]);
		else this.parse(label, [...marks, key]);
	}

	private pushSpan(text: string, marks: string[]): void {
		if (!text) return;
		const last = this.spans[this.spans.length - 1];
		// 同じ印の文字が続いたら1つにまとめる
		if (last && last.marks.length === marks.length && last.marks.every((m, idx) => m === marks[idx])) {
			last.text += text;
			return;
		}
		this.spans.push({ _type: 'span', _key: this.converter.key(), text, marks: [...marks] });
	}
}

const DELIMITERS: { open: string; mark: string | null }[] = [
	{ open: '**', mark: 'strong' },
	{ open: '__', mark: 'strong' },
	{ open: '~~', mark: 'strike-through' },
	// ハイライトはサイトに無いので、印だけ外して普通の文字にする
	{ open: '==', mark: null },
	{ open: '*', mark: 'em' },
	{ open: '_', mark: 'em' },
];

function readDelimiter(text: string, i: number): { open: string; mark: string | null; close: number } | null {
	for (const { open, mark } of DELIMITERS) {
		if (!text.startsWith(open, i)) continue;
		const after = text[i + open.length];
		if (after === undefined || /\s/.test(after)) continue;
		// snake_case の _ は強調にしない（英数字にはさまれた _ は普通の文字）
		const isUnderscore = open[0] === '_';
		if (isUnderscore && /[A-Za-z0-9]/.test(text[i - 1] ?? '')) continue;
		let search = i + open.length + 1;
		while (search <= text.length) {
			const close = text.indexOf(open, search);
			if (close < 0) break;
			const before = text[close - 1];
			const next = text[close + open.length];
			const validClose = !/\s/.test(before) &&
				// ** の中の * のように、より長い同じ記号の一部ではないこと
				!(open.length === 1 && next === open) &&
				!(isUnderscore && /[A-Za-z0-9]/.test(next ?? ''));
			if (validClose) return { open, mark, close };
			search = close + 1;
		}
	}
	return null;
}

function readMarkdownLink(text: string, start: number): { label: string; href: string; end: number } | null {
	let depth = 0;
	let i = start;
	for (; i < text.length; i++) {
		if (text[i] === '\\') { i++; continue; }
		if (text[i] === '[') depth++;
		else if (text[i] === ']') {
			depth--;
			if (depth === 0) break;
		}
	}
	if (depth !== 0 || text[i + 1] !== '(') return null;
	const label = text.slice(start + 1, i);
	const rest = text.slice(i + 2);
	const match = rest.match(/^(<[^>]*>|[^)\s]+)(?:[ \t]+"[^"]*")?\)/);
	if (!match) return null;
	let href = match[1];
	if (href.startsWith('<') && href.endsWith('>')) href = href.slice(1, -1);
	return { label, href, end: i + 2 + match[0].length };
}

/** %%コメント%% を消す（コードの中は残す）。複数行にまたがっていてもよい */
function stripComments(markdown: string): string {
	const out: string[] = [];
	let fence: string | null = null;
	let inComment = false;
	for (const line of markdown.split('\n')) {
		if (!inComment) {
			const fenceMatch = line.match(FENCE_REGEX);
			if (fence) {
				if (fenceMatch && fenceMatch[1][0] === fence[0] && fenceMatch[1].length >= fence.length && !fenceMatch[2]) fence = null;
				out.push(line);
				continue;
			}
			if (fenceMatch) {
				fence = fenceMatch[1];
				out.push(line);
				continue;
			}
		}
		let result = '';
		let rest = line;
		while (rest.length) {
			const at = rest.indexOf('%%');
			if (at < 0) {
				if (!inComment) result += rest;
				break;
			}
			if (!inComment) result += rest.slice(0, at);
			inComment = !inComment;
			rest = rest.slice(at + 2);
		}
		// コメントだけの行は、空行を増やさないように行ごと消す
		if (result.trim() === '' && line.trim() !== '') {
			if (!out.length || out[out.length - 1].trim() !== '') out.push('');
			continue;
		}
		out.push(result);
	}
	return out.join('\n');
}

/** 文の中に画像があれば、画像を1行に分けて、画像ブロックとして扱えるようにする */
function expandImageLines(lines: string[]): string[] {
	const out: string[] = [];
	let fence: string | null = null;
	for (const line of lines) {
		const fenceMatch = line.match(FENCE_REGEX);
		if (fence || fenceMatch) {
			if (fence && fenceMatch && fenceMatch[1][0] === fence[0] && !fenceMatch[2]) fence = null;
			else if (!fence && fenceMatch) fence = fenceMatch[1];
			out.push(line);
			continue;
		}
		const pattern = new RegExp(`${EMBED_REGEX.source}|${MD_IMAGE_REGEX.source}`, 'g');
		const matches = [...line.matchAll(pattern)].filter((m) => !m[1] || isImagePath(m[1].trim()));
		if (!matches.length || (matches.length === 1 && matches[0][0] === line.trim()) || LIST_ITEM_REGEX.test(line) || QUOTE_REGEX.test(line)) {
			out.push(line);
			continue;
		}
		let last = 0;
		for (const m of matches) {
			const before = line.slice(last, m.index).trim();
			if (before) out.push(before);
			out.push('', m[0], '');
			last = (m.index ?? 0) + m[0].length;
		}
		const after = line.slice(last).trim();
		if (after) out.push(after);
	}
	return out;
}

function matchWhole(text: string, pattern: RegExp): RegExpExecArray | null {
	const re = new RegExp(`^(?:${pattern.source})$`);
	return re.exec(text);
}

function indentWidth(indent: string): number {
	let width = 0;
	for (const ch of indent) width += ch === '\t' ? 4 : 1;
	return width;
}

function splitTableRow(line: string): string[] {
	let row = line.trim();
	if (row.startsWith('|')) row = row.slice(1);
	if (row.endsWith('|') && !row.endsWith('\\|')) row = row.slice(0, -1);
	const cells: string[] = [];
	let current = '';
	let inCode = false;
	for (let i = 0; i < row.length; i++) {
		const ch = row[i];
		if (ch === '\\' && row[i + 1] === '|') {
			current += '|';
			i++;
			continue;
		}
		if (ch === '`') inCode = !inCode;
		// [[ノート|別名]] の | は区切りではない
		if (ch === '|' && !inCode && !/\[\[[^\]]*$/.test(current)) {
			cells.push(current.trim());
			current = '';
			continue;
		}
		current += ch;
	}
	cells.push(current.trim());
	return cells;
}

/** ![[画像|300]]・![[画像|300x200]]・![[画像|説明]] の | のあとを読む */
function parseSizeOrAlt(value: string | undefined): { alt: string; width?: number; height?: number } {
	const v = (value ?? '').trim();
	const size = v.match(/^(\d+)(?:x(\d+))?$/);
	if (size) return { alt: '', width: Number(size[1]), height: size[2] ? Number(size[2]) : undefined };
	return { alt: v };
}

function splitFirst(text: string, sep: string): [string, string | null] {
	const at = text.indexOf(sep);
	return at < 0 ? [text, null] : [text.slice(0, at), text.slice(at + sep.length)];
}

function splitLast(text: string, sep: string): [string, string | null] {
	const at = text.lastIndexOf(sep);
	return at < 0 ? [text, null] : [text.slice(0, at), text.slice(at + sep.length)];
}

function safeDecode(url: string): string {
	try {
		return decodeURI(url);
	} catch {
		return url;
	}
}

export function convertMarkdown(markdown: string, options: ConvertOptions = {}): ConvertResult {
	const converter = new Converter(options);
	converter.run(markdown);
	return { blocks: converter.blocks, images: converter.images };
}
