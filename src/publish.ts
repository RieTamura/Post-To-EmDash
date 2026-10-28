import type { Block } from './convert';
import type { FeaturedImage } from './media';

/** EmDash の API を呼ぶ窓口。Obsidian では EmDashApi、テストでは fetch を使う */
export interface ApiLike {
	request<T>(method: string, path: string, body?: unknown): Promise<T>;
}

export interface PostInput {
	/** 前に送ったときの記事の ID（frontmatter の emdash_id）。なければ新しく作る */
	id?: string;
	/** 前に送ったときの版（emdash_rev）。サイト側で直されていれば 409 で断られる */
	rev?: string;
	/** true なら版を確かめずに上書きする（サイト側の変更を消してよいと確認したとき） */
	force?: boolean;
	title: string;
	/** 書いていなければ、新しく作るときは EmDash がタイトルから作り、更新では変えない */
	slug?: string;
	excerpt?: string;
	content: Block[];
	/** アイキャッチ。undefined なら送らない（サイトのアイキャッチは変えない） */
	featuredImage?: FeaturedImage;
	/** { category: [slug], tag: [slug…] }。書いた方だけ入れる */
	taxonomies?: Record<string, string[]>;
	publish: boolean;
}

export interface PostResult {
	id: string;
	slug: string;
	rev: string;
	created: boolean;
	/** 公開したか。false なら下書き（公開中の記事を更新したときは、公開中の版はそのまま） */
	published: boolean;
	/** サイトに公開中の版があるか */
	hasLiveVersion: boolean;
}

interface ItemResponse {
	item: { id: string; slug: string; status: string; liveRevisionId?: string | null };
	_rev: string;
}

const COLLECTION = 'posts';

export async function sendPost(api: ApiLike, input: PostInput): Promise<PostResult> {
	const data: Record<string, unknown> = { title: input.title, content: input.content };
	if (input.excerpt !== undefined) data.excerpt = input.excerpt;
	if (input.featuredImage) data.featured_image = input.featuredImage;
	const taxonomies = input.taxonomies && Object.keys(input.taxonomies).length ? input.taxonomies : undefined;

	let response: ItemResponse;
	const created = !input.id;
	if (input.id) {
		const body: Record<string, unknown> = { data };
		if (input.slug) body.slug = input.slug;
		if (taxonomies) body.taxonomies = taxonomies;
		// _rev を付けないと、EmDash は今の版に対して上書きする
		if (!input.force && input.rev) body._rev = input.rev;
		response = await api.request<ItemResponse>('PUT', `/content/${COLLECTION}/${encodeURIComponent(input.id)}`, body);
	} else {
		const body: Record<string, unknown> = { data, status: 'draft' };
		if (input.slug) body.slug = input.slug;
		if (taxonomies) body.taxonomies = taxonomies;
		response = await api.request<ItemResponse>('POST', `/content/${COLLECTION}`, body);
	}

	if (input.publish) {
		response = await api.request<ItemResponse>(
			'POST',
			`/content/${COLLECTION}/${encodeURIComponent(response.item.id)}/publish`,
			{ _rev: response._rev },
		);
	}

	return {
		id: response.item.id,
		slug: response.item.slug,
		rev: response._rev,
		created,
		published: input.publish,
		hasLiveVersion: response.item.status === 'published' || !!response.item.liveRevisionId,
	};
}

/** 記事のページの URL */
export function postUrl(siteUrl: string, slug: string): string {
	return `${siteUrl}/${COLLECTION}/${slug}`;
}
