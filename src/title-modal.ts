import { App, Modal, Setting } from 'obsidian';

/** 記事のタイトルを聞く。Enter か「作成」で決定、閉じたときは null */
export function askTitle(app: App, heading: string, placeholder: string, okText: string): Promise<string | null> {
	return new Promise((resolve) => {
		new TitleModal(app, heading, placeholder, okText, resolve).open();
	});
}

class TitleModal extends Modal {
	private answered = false;
	private value = '';

	constructor(
		app: App,
		private readonly heading: string,
		private readonly placeholder: string,
		private readonly okText: string,
		private readonly resolve: (title: string | null) => void,
	) {
		super(app);
	}

	onOpen(): void {
		this.setTitle(this.heading);
		new Setting(this.contentEl)
			.addText((text) => {
				text.setPlaceholder(this.placeholder).onChange((v) => { this.value = v; });
				text.inputEl.addClass('post-to-emdash-title-input');
				text.inputEl.addEventListener('keydown', (e) => {
					// 日本語の変換中の Enter では決定しない
					if (e.key === 'Enter' && !e.isComposing) {
						e.preventDefault();
						this.submit();
					}
				});
				window.setTimeout(() => text.inputEl.focus(), 0);
			});
		new Setting(this.contentEl)
			.addButton((button) => button
				.setButtonText(this.okText)
				.setCta()
				.onClick(() => this.submit()));
	}

	onClose(): void {
		this.contentEl.empty();
		if (!this.answered) this.resolve(null);
	}

	private submit(): void {
		const title = this.value.trim();
		if (!title) return;
		this.answered = true;
		this.resolve(title);
		this.close();
	}
}
