<script lang="ts">
	import snarkdown from 'snarkdown';
	import DOMPurify from 'dompurify';

	interface Emote {
		name: string;
		url: string;
	}

	interface Props {
		text: string;
		emotes?: Emote[];
	}

	let { text, emotes = [] }: Props = $props();

	function escapeHtml(raw: string): string {
		return raw.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
	}

	function replaceEmotes(raw: string): string {
		if (!emotes.length) return raw;
		const emoteMap = new Map(emotes.map((e) => [e.name, e.url]));
		return raw.replace(/:([a-zA-Z0-9_-]+):/g, (match, name) => {
			const url = emoteMap.get(name);
			if (!url) return match;
			return `<img src="${escapeHtml(url)}" alt=":${escapeHtml(name)}:" class="inline-emote" width="20" height="20" loading="lazy" />`;
		});
	}

	function renderMarkdown(raw: string): string {
		const html = snarkdown(raw);
		const withEmotes = replaceEmotes(html);
		return DOMPurify.sanitize(withEmotes, {
			ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'code', 'pre', 's', 'br', 'del', 'h1', 'h2', 'h3', 'ul', 'ol', 'li', 'blockquote', 'p', 'img'],
			ALLOWED_ATTR: ['href', 'target', 'rel', 'src', 'alt', 'class', 'width', 'height', 'loading'],
			ALLOW_DATA_ATTR: false
		});
	}
</script>

<span class="markdown-text">{@html renderMarkdown(text)}</span>

<style>
	.markdown-text :global(.inline-emote) {
		display: inline-block;
		vertical-align: middle;
		margin: 0 1px;
	}
	.markdown-text :global(a) {
		color: var(--color-accent);
		text-decoration: underline;
		text-underline-offset: 2px;
	}
	.markdown-text :global(pre) {
		background: rgba(0, 0, 0, 0.25);
		padding: var(--space-sm);
		border-radius: var(--radius-md);
		overflow-x: auto;
		font-size: var(--text-sm);
		margin: 0;
	}
	.markdown-text :global(code) {
		background: rgba(0, 0, 0, 0.2);
		padding: 1px 4px;
		border-radius: var(--radius-sm);
		font-size: 0.9em;
	}
	.markdown-text :global(pre code) {
		background: none;
		padding: 0;
	}
	.markdown-text :global(strong) {
		font-weight: var(--weight-bold);
	}
	.markdown-text :global(em) {
		font-style: italic;
	}
	.markdown-text :global(del) {
		text-decoration: line-through;
		opacity: 0.7;
	}
</style>
