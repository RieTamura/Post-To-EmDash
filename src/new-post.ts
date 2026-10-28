/** コマンド「EmDash の記事を新規作成」で作るノートの中身（obsidian を import しない） */

/** YAML の値として安全な形にする。記号を含むときだけ "…" で囲む（JSON の文字列は YAML でも正しい） */
export function yamlString(value: string): string {
	const needsQuote =
		value === '' ||
		/[:#[\]{},&*!|>'"%@`\\]/.test(value) ||
		/^[-?\s]/.test(value) ||
		/\s$/.test(value) ||
		/^(true|false|null|yes|no|on|off|~|[-+]?\d[\d._]*(e[-+]?\d+)?)$/i.test(value);
	return needsQuote ? JSON.stringify(value) : value;
}

/** ノートの名前に使えない文字を外す（Obsidian と Windows・スマホで使えない文字） */
export function safeFileName(title: string): string {
	return title
		.replace(/[\\/:*?"<>|#^[\]]/g, ' ')
		.replace(/\s+/g, ' ')
		.trim()
		.replace(/^\.+/, '')
		.slice(0, 120)
		.trim();
}

/** 同じ名前があれば「名前 2」「名前 3」…にする。exists はフォルダの中のパスがあるか */
export function uniquePath(folder: string, name: string, exists: (path: string) => boolean): string {
	const base = folder ? `${folder}/${name}` : name;
	if (!exists(`${base}.md`)) return `${base}.md`;
	for (let n = 2; ; n++) {
		if (!exists(`${base} ${n}.md`)) return `${base} ${n}.md`;
	}
}

export function buildNewPostNote(title: string, guide: string | null): string {
	const lines = [
		'---',
		`title: ${yamlString(title)}`,
		// 空の値は、送るときに「書いていない」と同じに扱われる
		'slug:',
		'excerpt:',
		'category:',
		// tags は入れない。空のまま送ると、管理画面で付けたタグが外れるため
		'cover:',
		'status: draft',
		'---',
		'',
	];
	if (guide) lines.push('%%', guide.trim(), '%%', '');
	lines.push('');
	return lines.join('\n');
}
