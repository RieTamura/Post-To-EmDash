import { Notice, Plugin, TFile, normalizePath, requestUrl } from 'obsidian';
import { EmDashApi, EmDashError, normalizeSiteUrl } from './api';
import { confirm } from './confirm';
import { convertMarkdown, type ImageBlock } from './convert';
import { getLocale, type LocaleStrings } from './i18n';
import { fillImageBlock, mimeTypeOf, parseCoverValue, toFeaturedImage, type FeaturedImage, type MediaItem } from './media';
import { FRONTMATTER_KEYS, noteBody, readNoteFields } from './note';
import { postUrl, sendPost, type PostInput, type PostResult } from './publish';
import { resolveTaxonomies, UnknownCategoryError } from './taxonomy';
import { DEFAULT_SETTINGS, PostToEmDashSettingTab, type PostToEmDashSettings } from './settings';

export default class PostToEmDashPlugin extends Plugin {
	settings: PostToEmDashSettings = DEFAULT_SETTINGS;
	locale: LocaleStrings = getLocale();
	private isPosting = false;

	async onload() {
		await this.loadSettings();
		this.addSettingTab(new PostToEmDashSettingTab(this.app, this));

		this.addCommand({
			id: 'post-current-note',
			name: this.locale.commandPostNote,
			checkCallback: (checking) => {
				const file = this.app.workspace.getActiveFile();
				if (!file || file.extension !== 'md') return false;
				if (!checking) void this.postNote(file);
				return true;
			},
		});

		this.addRibbonIcon('upload', this.locale.ribbonPostNote, () => {
			const file = this.app.workspace.getActiveFile();
			if (!file || file.extension !== 'md') {
				new Notice(this.locale.noActiveNote);
				return;
			}
			void this.postNote(file);
		});
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData() as Partial<PostToEmDashSettings> | null);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	/** キーチェーンからトークンを取り出す。未設定・削除済みなら空文字 */
	getToken(): string {
		const id = this.settings.tokenSecretId.trim();
		if (!id) return '';
		try {
			return this.app.secretStorage.getSecret(id) ?? '';
		} catch (e) {
			console.error('Failed to read the access token from secret storage:', e);
			return '';
		}
	}

	/** 設定から API の窓口を作る。足りない・間違っているときは理由のメッセージを返す */
	createApi(): EmDashApi | string {
		const token = this.getToken();
		if (!this.settings.siteUrl || !token) return this.locale.settingsMissing;
		const siteUrl = normalizeSiteUrl(this.settings.siteUrl);
		if (!siteUrl) return this.locale.siteUrlInvalid;
		return new EmDashApi(siteUrl, token, this.settings.networkTimeoutMs);
	}

	/** エラーを、何をすればよいかがわかる文に変える */
	describeError(e: unknown): string {
		const locale = this.locale;
		if (e instanceof UnknownCategoryError) return locale.errUnknownCategory(e.category, e.available);
		if (!(e instanceof EmDashError)) return locale.errOther(0, e instanceof Error ? e.message : String(e));
		if (e.timedOut) return locale.errTimeout;
		if (e.status === 0) return locale.errNetwork(e.message);
		if (e.code === 'NOT_EMDASH') return locale.errNotEmDash;
		if (e.status === 401) return locale.errUnauthorized;
		if (e.code === 'ENTRY_LOCKED') return locale.errLocked;
		if (e.code === 'SLUG_CONFLICT') return locale.errSlugTaken(e.message.match(/'([^']*)'/)?.[1] ?? '');
		if (e.status === 403) return locale.errForbidden(e.message);
		if (e.status === 404) return locale.errNotFound;
		return locale.errOther(e.status, e.message);
	}

	async checkConnection(): Promise<void> {
		const api = this.createApi();
		if (typeof api === 'string') {
			new Notice(api);
			return;
		}
		const notice = new Notice(this.locale.checking, 0);
		try {
			await api.checkConnection();
			notice.setMessage(this.locale.checkOk);
		} catch (e) {
			console.error('Post To EmDash: connection check failed', e);
			notice.setMessage(this.describeError(e));
		}
		window.setTimeout(() => notice.hide(), 6000);
	}

	private async postNote(file: TFile): Promise<void> {
		const locale = this.locale;
		if (this.isPosting) {
			new Notice(locale.alreadyPosting);
			return;
		}
		const api = this.createApi();
		if (typeof api === 'string') {
			new Notice(api);
			return;
		}
		const siteUrl = normalizeSiteUrl(this.settings.siteUrl) ?? this.settings.siteUrl;

		this.isPosting = true;
		const progress = new Notice(locale.posting, 0);
		try {
			const cache = this.app.metadataCache.getFileCache(file);
			const fields = readNoteFields(cache?.frontmatter, file.basename);
			const body = noteBody(await this.app.vault.read(file), cache?.frontmatterPosition?.end.offset);
			const { blocks, images } = convertMarkdown(body, {
				resolveWikiLink: (target) => this.postedUrlOf(target, file.path),
			});

			// 画像をアップロードして、本文の画像ブロックにメディアの ID を入れる。
			// 見つからない画像と、アップロードしない設定のときの画像は外す
			const dropped = new Set<ImageBlock>();
			const missing: string[] = [];
			let featuredImage: FeaturedImage | undefined;
			if (this.settings.uploadImages) {
				const cover = parseCoverValue(fields.cover);
				const sources = [...new Set([...(cover ? [cover] : []), ...images.map((i) => i.asset.url ?? '')])].filter(Boolean);
				const uploaded = new Map<string, MediaItem>();
				for (const [index, src] of sources.entries()) {
					progress.setMessage(locale.uploadingImage(index + 1, sources.length));
					const loaded = await this.loadImage(src, file);
					if (loaded) uploaded.set(src, await api.uploadImage(loaded));
					else missing.push(src);
				}
				let first: { media: MediaItem; alt: string } | undefined;
				for (const image of images) {
					const media = uploaded.get(image.asset.url ?? '');
					if (!media) {
						dropped.add(image);
						continue;
					}
					first ??= { media, alt: image.alt };
					fillImageBlock(image, media);
				}
				// アイキャッチは cover の画像。なければ本文の最初の画像
				const coverMedia = cover ? uploaded.get(cover) : undefined;
				if (coverMedia) featuredImage = toFeaturedImage(coverMedia, '');
				else if (first) featuredImage = toFeaturedImage(first.media, first.alt);
			} else {
				images.forEach((i) => dropped.add(i));
			}
			const content = blocks.filter((b) => !(b._type === 'image' && dropped.has(b)));

			progress.setMessage(locale.posting);
			const input: PostInput = {
				id: fields.id,
				rev: fields.rev,
				title: fields.title,
				slug: fields.slug,
				excerpt: fields.excerpt,
				content,
				featuredImage,
				taxonomies: await resolveTaxonomies(api, fields.category, fields.tags),
				publish: fields.publish,
			};
			const result = await this.sendWithConfirm(api, input);
			if (!result) {
				progress.hide();
				new Notice(locale.cancelled);
				return;
			}

			await this.app.fileManager.processFrontMatter(file, (fm: Record<string, unknown>) => {
				fm[FRONTMATTER_KEYS.id] = result.id;
				fm[FRONTMATTER_KEYS.url] = postUrl(siteUrl, result.slug);
				fm[FRONTMATTER_KEYS.rev] = result.rev;
			});

			progress.hide();
			new Notice(this.resultMessage(fields.title, result), 8000);
			if (missing.length) new Notice(locale.imagesMissing(missing), 10000);
		} catch (e) {
			console.error('Post To EmDash: posting failed', e);
			progress.hide();
			new Notice(this.describeError(e), 10000);
		} finally {
			this.isPosting = false;
		}
	}

	/**
	 * 送る。サイト側で直されていた（409）ときと、サイトで削除されていた（404）ときは、
	 * どうするかを聞いてから送り直す。やめたときは null
	 */
	private async sendWithConfirm(api: EmDashApi, input: PostInput): Promise<PostResult | null> {
		const locale = this.locale;
		try {
			return await sendPost(api, input);
		} catch (e) {
			if (!(e instanceof EmDashError) || !input.id) throw e;
			if (e.status === 409 && e.code === 'CONFLICT') {
				const ok = await confirm(this.app, locale.conflictTitle, locale.conflictMessage, locale.conflictOverwrite, locale.cancel);
				return ok ? sendPost(api, { ...input, force: true }) : null;
			}
			if (e.status === 404) {
				const ok = await confirm(this.app, locale.deletedTitle, locale.deletedMessage, locale.deletedPostAsNew, locale.cancel);
				return ok ? sendPost(api, { ...input, id: undefined, rev: undefined }) : null;
			}
			throw e;
		}
	}

	private resultMessage(title: string, result: PostResult): string {
		const locale = this.locale;
		if (result.published) return locale.published(title);
		if (result.created) return locale.postedDraft(title);
		return result.hasLiveVersion ? locale.updatedDraftLiveKept(title) : locale.updatedDraft(title);
	}

	/**
	 * 画像を読む。保管庫の画像は ![[…]] と同じ探し方（ノートからの相対・ファイル名だけでもよい）、
	 * http(s) の画像はダウンロードする。見つからなければ null
	 */
	private async loadImage(src: string, from: TFile): Promise<{ name: string; data: ArrayBuffer; type: string } | null> {
		if (/^https?:\/\//i.test(src)) {
			try {
				const response = await requestUrl({ url: src, throw: false });
				if (response.status < 200 || response.status >= 300) return null;
				const name = decodeURIComponent(new URL(src).pathname.split('/').pop() || 'image');
				const headerType = Object.entries(response.headers).find(([k]) => k.toLowerCase() === 'content-type')?.[1];
				const type = headerType?.startsWith('image/') ? headerType.split(';')[0] : mimeTypeOf(name);
				return { name, data: response.arrayBuffer, type };
			} catch (e) {
				console.error('Post To EmDash: could not download image', src, e);
				return null;
			}
		}
		const target = this.app.metadataCache.getFirstLinkpathDest(src, from.path)
			?? this.app.vault.getFileByPath(normalizePath(src));
		if (!target) return null;
		return { name: target.name, data: await this.app.vault.readBinary(target), type: mimeTypeOf(target.name) };
	}

	/** [[ノート]] の相手がサイトに投稿済みなら、その記事の URL */
	private postedUrlOf(linkpath: string, sourcePath: string): string | null {
		const target = this.app.metadataCache.getFirstLinkpathDest(linkpath, sourcePath);
		if (!target) return null;
		const url: unknown = this.app.metadataCache.getFileCache(target)?.frontmatter?.[FRONTMATTER_KEYS.url];
		return typeof url === 'string' && /^https?:\/\//.test(url) ? url : null;
	}
}
