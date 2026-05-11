/**
 * Svelte action that traps focus within an element.
 * Tab/Shift+Tab cycles through focusable children.
 * Escape key calls the `onEscape` callback if provided.
 */
export function focusTrap(node: HTMLElement, options?: { onEscape?: () => void; initialFocus?: boolean }) {
	const focusableSelectors = [
		'button:not([disabled])',
		'a[href]',
		'input:not([disabled])',
		'select:not([disabled])',
		'textarea:not([disabled])',
		'[tabindex]:not([tabindex="-1"])'
	].join(', ');

	function getFocusable() {
		return Array.from(node.querySelectorAll<HTMLElement>(focusableSelectors)).filter(
			(el) => el.offsetParent !== null
		);
	}

	function handleKeyDown(e: KeyboardEvent) {
		if (e.key === 'Escape' && options?.onEscape) {
			e.preventDefault();
			options.onEscape();
			return;
		}
		if (e.key !== 'Tab') return;

		const focusable = getFocusable();
		if (focusable.length === 0) return;

		const first = focusable[0];
		const last = focusable[focusable.length - 1];

		if (e.shiftKey && document.activeElement === first) {
			e.preventDefault();
			last.focus();
		} else if (!e.shiftKey && document.activeElement === last) {
			e.preventDefault();
			first.focus();
		}
	}

	node.addEventListener('keydown', handleKeyDown);

	if (options?.initialFocus !== false) {
		const focusable = getFocusable();
		if (focusable.length > 0) {
			queueMicrotask(() => focusable[0].focus());
		}
	}

	return {
		destroy() {
			node.removeEventListener('keydown', handleKeyDown);
		}
	};
}
