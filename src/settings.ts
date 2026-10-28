import { AbstractInputSuggest, App, PluginSettingTab, SecretComponent, Setting, TFolder } from 'obsidian';
import type { SettingDefinitionItem } from 'obsidian';
import type PostToEmDashPlugin from './main';

export interface PostToEmDashSettings {
	siteUrl: string;
	/**
	 * トークンそのものではなく、Obsidian のキーチェーン(Secret Storage)上の
	 * シークレットID。トークン本体は data.json には書かれない
	 */
	tokenSecretId: string;
	uploadImages: boolean;
	networkTimeoutMs: number;
	/** 「EmDash の記事を新規作成」でノートを作るフォルダ。空なら保管庫のいちばん上 */
	newPostFolder: string;
	insertGuide: boolean;
	/** 「アイキャッチを選ぶ」で候補にする画像のフォルダ。空なら保管庫のすべて */
	imageFolder: string;
}

export const DEFAULT_SETTINGS: PostToEmDashSettings = {
	siteUrl: '',
	tokenSecretId: '',
	uploadImages: true,
	networkTimeoutMs: 15000,
	newPostFolder: '',
	insertGuide: true,
	imageFolder: '',
};

function clampTimeout(value: unknown): number {
	const n = Number(value);
	return Number.isFinite(n) ? Math.min(Math.max(Math.round(n), 1000), 60000) : DEFAULT_SETTINGS.networkTimeoutMs;
}

export class PostToEmDashSettingTab extends PluginSettingTab {
	plugin: PostToEmDashPlugin;

	constructor(app: App, plugin: PostToEmDashPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	getSettingDefinitions(): SettingDefinitionItem[] {
		const locale = this.plugin.locale;
		return [
			{
				name: locale.siteUrlLabel,
				desc: locale.siteUrlDesc,
				control: { type: 'text', key: 'siteUrl', placeholder: 'https://example.com' }
			},
			{
				// トークン本体はキーチェーンが預かる。設定に残るのはシークレットIDだけなので
				// 宣言的コントロールではなく SecretComponent を render で差し込む
				name: locale.tokenLabel,
				desc: locale.tokenDesc,
				render: (setting) => this.addTokenInput(setting)
			},
			{
				name: locale.uploadImagesLabel,
				desc: locale.uploadImagesDesc,
				control: { type: 'toggle', key: 'uploadImages', defaultValue: DEFAULT_SETTINGS.uploadImages }
			},
			{
				name: locale.timeoutLabel,
				desc: locale.timeoutDesc,
				control: { type: 'number', key: 'networkTimeoutMs', placeholder: '15000', defaultValue: DEFAULT_SETTINGS.networkTimeoutMs, min: 1000, max: 60000, step: 1 }
			},
			{
				name: locale.newPostFolderLabel,
				desc: locale.newPostFolderDesc,
				control: { type: 'folder', key: 'newPostFolder', placeholder: '/', includeRoot: true }
			},
			{
				name: locale.insertGuideLabel,
				desc: locale.insertGuideDesc,
				control: { type: 'toggle', key: 'insertGuide', defaultValue: DEFAULT_SETTINGS.insertGuide }
			},
			{
				name: locale.imageFolderLabel,
				desc: locale.imageFolderDesc,
				control: { type: 'folder', key: 'imageFolder', placeholder: '/', includeRoot: true }
			},
			{
				name: locale.checkLabel,
				desc: locale.checkDesc,
				render: (setting) => this.addCheckButton(setting)
			},
		];
	}

	setControlValue(key: string, value: unknown): Promise<void> {
		if (key === 'networkTimeoutMs') value = clampTimeout(value);
		if (key === 'siteUrl' && typeof value === 'string') value = value.trim();
		(this.plugin.settings as unknown as Record<string, unknown>)[key] = value;
		return this.plugin.saveSettings();
	}

	private addTokenInput(setting: Setting): void {
		setting.addComponent((el) => new SecretComponent(this.app, el)
			.setValue(this.plugin.settings.tokenSecretId)
			.onChange(async (value) => {
				this.plugin.settings.tokenSecretId = value ?? '';
				await this.plugin.saveSettings();
			}));
	}

	private addCheckButton(setting: Setting): void {
		setting.addButton(button => button
			.setButtonText(this.plugin.locale.checkButton)
			.onClick(async () => {
				button.setDisabled(true);
				try {
					await this.plugin.checkConnection();
				} finally {
					button.setDisabled(false);
				}
			}));
	}

	private addFolderInput(containerEl: HTMLElement, name: string, desc: string, key: 'newPostFolder' | 'imageFolder'): void {
		new Setting(containerEl)
			.setName(name)
			.setDesc(desc)
			.addText(text => {
				text.setPlaceholder('/')
					.setValue(this.plugin.settings[key])
					.onChange(async (value) => {
						this.plugin.settings[key] = value.trim();
						await this.plugin.saveSettings();
					});
				new FolderSuggest(this.app, text.inputEl, (path) => {
					text.setValue(path);
					this.plugin.settings[key] = path;
					void this.plugin.saveSettings();
				});
			});
	}

	// Obsidian 1.13 未満用フォールバック（1.13+ では getSettingDefinitions から宣言的に描画される）
	display(): void {
		const { containerEl } = this;
		const locale = this.plugin.locale;
		containerEl.empty();

		new Setting(containerEl)
			.setName(locale.siteUrlLabel)
			.setDesc(locale.siteUrlDesc)
			.addText(text => text
				.setPlaceholder('https://example.com')
				.setValue(this.plugin.settings.siteUrl)
				.onChange(async (value) => {
					this.plugin.settings.siteUrl = value.trim();
					await this.plugin.saveSettings();
				}));

		this.addTokenInput(new Setting(containerEl)
			.setName(locale.tokenLabel)
			.setDesc(locale.tokenDesc));

		new Setting(containerEl)
			.setName(locale.uploadImagesLabel)
			.setDesc(locale.uploadImagesDesc)
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.uploadImages)
				.onChange(async (value) => {
					this.plugin.settings.uploadImages = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName(locale.timeoutLabel)
			.setDesc(locale.timeoutDesc)
			.addText(text => text
				.setPlaceholder('15000')
				.setValue(String(this.plugin.settings.networkTimeoutMs))
				.onChange(async (value) => {
					this.plugin.settings.networkTimeoutMs = clampTimeout(value);
					await this.plugin.saveSettings();
				}));

		this.addFolderInput(containerEl, locale.newPostFolderLabel, locale.newPostFolderDesc, 'newPostFolder');

		new Setting(containerEl)
			.setName(locale.insertGuideLabel)
			.setDesc(locale.insertGuideDesc)
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.insertGuide)
				.onChange(async (value) => {
					this.plugin.settings.insertGuide = value;
					await this.plugin.saveSettings();
				}));

		this.addFolderInput(containerEl, locale.imageFolderLabel, locale.imageFolderDesc, 'imageFolder');

		this.addCheckButton(new Setting(containerEl)
			.setName(locale.checkLabel)
			.setDesc(locale.checkDesc));
	}
}

/** フォルダの候補を出す入力欄。display() フォールバック（1.13 未満）専用 */
class FolderSuggest extends AbstractInputSuggest<TFolder> {
	constructor(app: App, inputEl: HTMLInputElement, private readonly onSelectFolder: (path: string) => void) {
		super(app, inputEl);
	}

	protected getSuggestions(query: string): TFolder[] {
		const q = query.toLowerCase();
		return this.app.vault.getAllFolders(true).filter((folder) => folder.path.toLowerCase().includes(q));
	}

	renderSuggestion(folder: TFolder, el: HTMLElement): void {
		el.setText(folder.path || '/');
	}

	selectSuggestion(folder: TFolder): void {
		this.onSelectFolder(folder.path === '/' ? '' : folder.path);
		this.close();
	}
}
