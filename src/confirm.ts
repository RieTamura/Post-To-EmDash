import { App, Modal, Setting, requireApiVersion } from 'obsidian';

/** はい／いいえを聞く。閉じたときや Esc は「いいえ」 */
export function confirm(app: App, title: string, message: string, okText: string, cancelText: string): Promise<boolean> {
	return new Promise((resolve) => {
		new ConfirmModal(app, title, message, okText, cancelText, resolve).open();
	});
}

class ConfirmModal extends Modal {
	private answered = false;

	constructor(
		app: App,
		private readonly titleText: string,
		private readonly message: string,
		private readonly okText: string,
		private readonly cancelText: string,
		private readonly resolve: (ok: boolean) => void,
	) {
		super(app);
	}

	onOpen(): void {
		this.setTitle(this.titleText);
		this.contentEl.createEl('p', { text: this.message });
		new Setting(this.contentEl)
			.addButton((button) => button
				.setButtonText(this.cancelText)
				.onClick(() => this.answer(false)))
			.addButton((button) => {
				button.setButtonText(this.okText).onClick(() => this.answer(true));
				// setDestructive は 1.13.0 から。それより前は setWarning と同じ mod-warning を付ける
				if (requireApiVersion('1.13.0')) button.setDestructive();
				else button.buttonEl.addClass('mod-warning');
			});
	}

	onClose(): void {
		this.contentEl.empty();
		if (!this.answered) this.resolve(false);
	}

	private answer(ok: boolean): void {
		this.answered = true;
		this.resolve(ok);
		this.close();
	}
}
