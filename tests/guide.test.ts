import { describe, expect, it, vi } from 'vitest';
import { convertMarkdown } from '../src/convert';
import { buildNewPostNote } from '../src/new-post';

let language = 'ja';
vi.mock('obsidian', () => ({ getLanguage: () => language }));

const { getLocale } = await import('../src/i18n');

describe('項目の説明（newPostGuide）', () => {
	for (const lang of ['ja', 'en']) {
		it(`${lang}：説明の中に %% が無く、全部がサイトに送られない`, () => {
			language = lang;
			const guide = getLocale().newPostGuide;
			// 説明の途中に %% があると、そこでコメントが終わってしまう
			expect(guide).not.toContain('%%');
			const note = buildNewPostNote('題', guide);
			const body = note.slice(note.indexOf('---', 3) + 4);
			expect(convertMarkdown(body + '本文').blocks).toHaveLength(1);
		});
	}
});
