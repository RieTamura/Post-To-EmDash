import { Notice, Plugin, TFile } from 'obsidian';
import { EmDashApi, EmDashError, normalizeSiteUrl } from './api';
import { getLocale, type LocaleStrings } from './i18n';
import { DEFAULT_SETTINGS, PostToEmDashSettingTab, type PostToEmDashSettings } from './settings';

export default class PostToEmDashPlugin extends Plugin {
	settings: PostToEmDashSettings = DEFAULT_SETTINGS;
	locale: LocaleStrings = getLocale();

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
		const api = this.createApi();
		if (typeof api === 'string') {
			new Notice(api);
			return;
		}
		// ステップ5以降で、変換・アップロード・投稿をここに入れる
		new Notice(this.locale.notReadyYet);
	}
}
