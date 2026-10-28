import { Notice, Plugin, TFile } from 'obsidian';
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

	private async postNote(file: TFile): Promise<void> {
		if (!this.settings.siteUrl || !this.getToken()) {
			new Notice(this.locale.settingsMissing);
			return;
		}
		// ステップ5以降で、変換・アップロード・投稿をここに入れる
		new Notice(this.locale.notReadyYet);
	}
}
