import { Notice, Plugin, TFile } from 'obsidian';
import { EmDashApi, EmDashError, normalizeSiteUrl } from './api';
import { confirm } from './confirm';
import { convertMarkdown } from './convert';
import { getLocale, type LocaleStrings } from './i18n';
import { FRONTMATTER_KEYS, noteBody, readNoteFields } from './note';
import { postUrl, sendPost, type PostInput, type PostResult } from './publish';
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
			// 画像のアップロードはステップ6。それまでは画像を外して送る
			const content = blocks.filter((b) => b._type !== 'image');

			const input: PostInput = {
				id: fields.id,
				rev: fields.rev,
				title: fields.title,
				slug: fields.slug,
				excerpt: fields.excerpt,
				content,
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
			if (images.length) new Notice(locale.imagesSkipped(images.length), 8000);
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

	/** [[ノート]] の相手がサイトに投稿済みなら、その記事の URL */
	private postedUrlOf(linkpath: string, sourcePath: string): string | null {
		const target = this.app.metadataCache.getFirstLinkpathDest(linkpath, sourcePath);
		if (!target) return null;
		const url: unknown = this.app.metadataCache.getFileCache(target)?.frontmatter?.[FRONTMATTER_KEYS.url];
		return typeof url === 'string' && /^https?:\/\//.test(url) ? url : null;
	}
}
