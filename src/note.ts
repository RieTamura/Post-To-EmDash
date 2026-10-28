/** ノートの frontmatter から、送るときに使う値を取り出す（obsidian を import しない） */

export const FRONTMATTER_KEYS = {
	id: 'emdash_id',
	url: 'emdash_url',
	rev: 'emdash_rev',
} as const;

export interface NoteFields {
	title: string;
	slug?: string;
	excerpt?: string;
	publish: boolean;
	id?: string;
	rev?: string;
	/** 書いていなければ undefined（サイトのカテゴリーは変えない） */
	category?: string;
	/** 書いていなければ undefined（サイトのタグは変えない）。空のリストならタグを外す */
	tags?: string[];
	/** frontmatter の cover。そのままの値（場所の読み取りは media.ts） */
	cover?: unknown;
}

function text(value: unknown): string | undefined {
	if (typeof value === 'string') return value.trim() || undefined;
	if (typeof value === 'number') return String(value);
	return undefined;
}

/** tags: [a, b]・tags: "a, b"・tags: "#a #b" のどれでもよい */
function readTags(value: unknown): string[] | undefined {
	if (value === undefined || value === null) return value === null ? [] : undefined;
	const list: unknown[] = Array.isArray(value)
		? value
		: typeof value === 'string' || typeof value === 'number' ? String(value).split(/[,\s]+/) : [];
	const tags = list
		.filter((t): t is string | number => typeof t === 'string' || typeof t === 'number')
		.map((t) => String(t).trim().replace(/^#/, ''))
		.filter((t) => t.length > 0);
	return [...new Set(tags)];
}

export function readNoteFields(frontmatter: Record<string, unknown> | undefined, basename: string): NoteFields {
	const fm = frontmatter ?? {};
	const status = text(fm.status)?.toLowerCase();
	return {
		title: text(fm.title) ?? basename,
		slug: text(fm.slug),
		excerpt: text(fm.excerpt),
		publish: status === 'publish' || status === 'published',
		id: text(fm[FRONTMATTER_KEYS.id]),
		rev: text(fm[FRONTMATTER_KEYS.rev]),
		category: text(Array.isArray(fm.category) ? fm.category[0] : fm.category),
		tags: 'tags' in fm ? readTags(fm.tags) : undefined,
		cover: fm.cover,
	};
}

/** ノートの本文（frontmatter を除いた部分）。frontmatter の終わりの位置は Obsidian が教えてくれる */
export function noteBody(content: string, frontmatterEndOffset: number | undefined): string {
	if (frontmatterEndOffset === undefined) return content;
	return content.slice(frontmatterEndOffset).replace(/^\r?\n/, '');
}
