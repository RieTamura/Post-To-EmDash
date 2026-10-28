import { App, PluginSettingTab, SecretComponent, Setting } from 'obsidian';
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
}

export const DEFAULT_SETTINGS: PostToEmDashSettings = {
	siteUrl: '',
	tokenSecretId: '',
	uploadImages: true,
	networkTimeoutMs: 15000,
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

		this.addCheckButton(new Setting(containerEl)
			.setName(locale.checkLabel)
			.setDesc(locale.checkDesc));
	}
}
