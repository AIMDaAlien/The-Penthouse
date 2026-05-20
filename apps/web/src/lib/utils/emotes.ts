/**
 * Replace `:emoteName:` patterns with `<img>` tags for known emotes.
 */
export function replaceEmotesInText(text: string, emotes: Array<{ name: string; url: string }>): string {
	if (!emotes.length) return text;
	const emoteMap = new Map(emotes.map((e) => [e.name, e.url]));
	return text.replace(/:([a-zA-Z0-9_-]+):/g, (match, name) => {
		const url = emoteMap.get(name);
		if (!url) return match;
		return `<img src="${escapeHtml(url)}" alt=":${escapeHtml(name)}:" class="inline-emote" width="20" height="20" />`;
	});
}

function escapeHtml(raw: string): string {
	return raw
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
}
