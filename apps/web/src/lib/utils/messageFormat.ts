const ESC: Record<string, string> = {
	'&': '&amp;',
	'<': '&lt;',
	'>': '&gt;',
	'"': '&quot;',
	"'": '&#39;'
};

function escapeHtml(s: string): string {
	return s.replace(/[&<>"']/g, (c) => ESC[c]);
}

export function formatMessageContent(raw: string): string {
	const escaped = escapeHtml(raw);
	return escaped
		.replace(/`([^`]+)`/g, '<code>$1</code>')
		.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
		.replace(/\*(.+?)\*/g, '<em>$1</em>')
		.replace(/~~(.+?)~~/g, '<del>$1</del>')
		.replace(/\n/g, '<br>');
}
