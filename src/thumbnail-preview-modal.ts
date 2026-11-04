import { App, Modal } from 'obsidian';

/** できあがったサムネイルの見本を見せる。投稿もアップロードもしない */
export class ThumbnailPreviewModal extends Modal {
	private objectUrl = '';

	constructor(app: App, private readonly heading: string, private readonly png: ArrayBuffer, private readonly alt: string) {
		super(app);
	}

	onOpen(): void {
		this.setTitle(this.heading);
		this.objectUrl = URL.createObjectURL(new Blob([this.png], { type: 'image/png' }));
		this.contentEl.createEl('img', {
			cls: 'post-to-emdash-thumbnail-preview',
			attr: { src: this.objectUrl, alt: this.alt },
		});
	}

	onClose(): void {
		this.contentEl.empty();
		URL.revokeObjectURL(this.objectUrl);
	}
}
