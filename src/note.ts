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
}

function text(value: unknown): string | undefined {
	if (typeof value === 'string') return value.trim() || undefined;
	if (typeof value === 'number') return String(value);
	return undefined;
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
	};
}

/** ノートの本文（frontmatter を除いた部分）。frontmatter の終わりの位置は Obsidian が教えてくれる */
export function noteBody(content: string, frontmatterEndOffset: number | undefined): string {
	if (frontmatterEndOffset === undefined) return content;
	return content.slice(frontmatterEndOffset).replace(/^\r?\n/, '');
}
