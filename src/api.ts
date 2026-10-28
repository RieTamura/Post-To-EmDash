import { requestUrl } from 'obsidian';
import type { RequestUrlResponse } from 'obsidian';
import { EmDashError } from './errors';
import { buildMultipart, type MediaItem } from './media';

export { EmDashError };

interface ApiEnvelope<T> {
	success?: boolean;
	data?: T;
	error?: { code?: string; message?: string };
}

/** 末尾のスラッシュを落とす。http(s) 以外や壊れた URL は null */
export function normalizeSiteUrl(raw: string): string | null {
	try {
		const url = new URL(raw.trim());
		if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
		return url.origin + url.pathname.replace(/\/+$/, '');
	} catch {
		return null;
	}
}

/**
 * EmDash の REST API（/_emdash/api/…）を Obsidian の requestUrl で呼ぶ。
 * requestUrl はブラウザの CORS 制限を受けないので、スマホ版でもそのまま動く
 */
export class EmDashApi {
	constructor(
		private readonly siteUrl: string,
		private readonly token: string,
		private readonly timeoutMs: number,
	) {}

	async request<T>(method: string, path: string, body?: unknown): Promise<T> {
		if (body === undefined) return this.requestRaw<T>(method, path);
		return this.requestRaw<T>(method, path, JSON.stringify(body), 'application/json');
	}

	/** 本文をそのまま送る（画像のアップロードの multipart など） */
	async requestRaw<T>(method: string, path: string, body?: string | ArrayBuffer, contentType?: string, timeoutMs?: number): Promise<T> {
		const response = await this.send({
			url: `${this.siteUrl}/_emdash/api${path}`,
			method,
			headers: {
				Authorization: `Bearer ${this.token}`,
				// 書き込み系は、この印がないとクロスサイトの要求として断られる
				'X-EmDash-Request': '1',
			},
			body,
			contentType,
		}, timeoutMs);

		let json: ApiEnvelope<T> | null = null;
		try {
			json = response.json as ApiEnvelope<T>;
		} catch {
			// HTML のページなど、JSON でない応答。EmDash ではないサイトの可能性が高い
		}
		if (response.status >= 200 && response.status < 300 && json?.success !== false && json) {
			return json.data as T;
		}
		throw new EmDashError(
			json?.error?.message ?? `HTTP ${response.status}`,
			response.status,
			json?.error?.code ?? (json ? '' : 'NOT_EMDASH'),
		);
	}

	/**
	 * 画像をアップロードする。同じ画像は二重に保存されず、前のものが返る（deduplicate）。
	 * 大きい画像もあるので、待つ時間は60秒以上にする
	 */
	async uploadImage(file: { name: string; data: ArrayBuffer; type: string }): Promise<MediaItem> {
		const { body, contentType } = buildMultipart(file, { deduplicate: 'true' });
		const data = await this.requestRaw<{ item: MediaItem }>('POST', '/media', body, contentType, Math.max(this.timeoutMs, 60000));
		return data.item;
	}

	/** トークンで記事一覧が読めるかを確かめる（content:read の権限で足りる） */
	async checkConnection(): Promise<void> {
		await this.request('GET', '/content/posts?limit=1');
	}

	private async send(params: Parameters<typeof requestUrl>[0] & object, timeoutMs = this.timeoutMs): Promise<RequestUrlResponse> {
		let timer: number | null = null;
		const timeout = new Promise<never>((_, reject) => {
			timer = window.setTimeout(() => reject(new EmDashError('Request timed out', 0, '', true)), timeoutMs);
		});
		try {
			// throw: false にしないと 400 以上で requestUrl が中身のないエラーを投げ、
			// EmDash のエラーメッセージが読めなくなる
			return await Promise.race([requestUrl({ ...params, throw: false }), timeout]);
		} catch (e) {
			if (e instanceof EmDashError) throw e;
			throw new EmDashError(e instanceof Error ? e.message : String(e), 0);
		} finally {
			if (timer !== null) window.clearTimeout(timer);
		}
	}
}
