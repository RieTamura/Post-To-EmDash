/** frontmatter のカテゴリー・タグを、サイトのカテゴリー・タグの slug に変える（obsidian を import しない） */

import type { ApiLike } from './publish';

interface Term {
	slug: string;
	label: string;
	children?: Term[];
}

/** カテゴリーがサイトに無いときのエラー。カテゴリーは勝手に作らない */
export class UnknownCategoryError extends Error {
	constructor(readonly category: string, readonly available: string[]) {
		super(`Unknown category: ${category}`);
		this.name = 'UnknownCategoryError';
	}
}

/** 名前の比べ方：大文字小文字と前後の空白を気にしない */
const normalize = (value: string) => value.trim().toLowerCase();

function flatten(terms: Term[]): Term[] {
	return terms.flatMap((t) => [t, ...flatten(t.children ?? [])]);
}

async function listTerms(api: ApiLike, taxonomy: string): Promise<Term[]> {
	const data = await api.request<{ terms: Term[] }>('GET', `/taxonomies/${taxonomy}/terms`);
	return flatten(data.terms ?? []);
}

function find(terms: Term[], name: string): Term | undefined {
	const n = normalize(name);
	return terms.find((t) => normalize(t.label) === n) ?? terms.find((t) => normalize(t.slug) === n);
}

/**
 * 送るときの taxonomies を作る。frontmatter に書いていない方は入れない
 * （入れると、管理画面で付けたカテゴリー・タグが消えるため）。
 * タグはサイトに無ければ作る。同じ名前で作ると「-1」付きの別のタグになるので、必ず先に探す
 */
export async function resolveTaxonomies(
	api: ApiLike,
	category: string | undefined,
	tags: string[] | undefined,
): Promise<Record<string, string[]>> {
	const result: Record<string, string[]> = {};

	if (category !== undefined) {
		const terms = await listTerms(api, 'category');
		const term = find(terms, category);
		if (!term) throw new UnknownCategoryError(category, terms.map((t) => t.label));
		result.category = [term.slug];
	}

	if (tags !== undefined) {
		const terms = await listTerms(api, 'tag');
		const slugs: string[] = [];
		for (const tag of tags) {
			let term = find(terms, tag);
			if (!term) {
				const created = await api.request<{ term: Term }>('POST', '/taxonomies/tag/terms', { label: tag });
				term = created.term;
				terms.push(term);
			}
			if (!slugs.includes(term.slug)) slugs.push(term.slug);
		}
		result.tag = slugs;
	}

	return result;
}
