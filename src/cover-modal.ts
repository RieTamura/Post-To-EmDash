import { App, SuggestModal, TFile } from 'obsidian';
import { isImagePath } from './convert';

/** フォルダの中の画像（下のフォルダも含む）を、新しい順に並べる。folder が空なら保管庫のすべて */
export function listImages(app: App, folder: string): TFile[] {
	const prefix = folder ? `${folder}/` : '';
	return app.vault.getFiles()
		.filter((f) => isImagePath(f.name) && (!prefix || f.path.startsWith(prefix)))
		.sort((a, b) => b.stat.mtime - a.stat.mtime);
}

/** 画像を、小さな絵付きの一覧から選ぶ。名前で絞り込める */
export class CoverSuggestModal extends SuggestModal<TFile> {
	constructor(
		app: App,
		private readonly images: TFile[],
		placeholder: string,
		private readonly onChoose: (file: TFile) => void,
	) {
		super(app);
		this.setPlaceholder(placeholder);
		this.limit = 100;
	}

	getSuggestions(query: string): TFile[] {
		const q = query.trim().toLowerCase();
		return q ? this.images.filter((f) => f.path.toLowerCase().includes(q)) : this.images;
	}

	renderSuggestion(file: TFile, el: HTMLElement): void {
		el.addClass('post-to-emdash-cover-item');
		el.createEl('img', {
			cls: 'post-to-emdash-cover-thumb',
			attr: { src: this.app.vault.getResourcePath(file), alt: '', loading: 'lazy' },
		});
		const text = el.createDiv({ cls: 'post-to-emdash-cover-text' });
		text.createDiv({ text: file.name });
		if (file.parent && file.parent.path !== '/') {
			text.createDiv({ text: file.parent.path, cls: 'post-to-emdash-cover-folder' });
		}
	}

	onChooseSuggestion(file: TFile): void {
		this.onChoose(file);
	}
}
