export type Theme = 'dark' | 'light' | 'system';

const STORAGE_KEY = 'penthouse-theme';

function getSystemTheme(): 'dark' | 'light' {
	return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function getResolvedTheme(): 'dark' | 'light' {
	const stored = localStorage.getItem(STORAGE_KEY) as Theme | null;
	if (stored === 'light' || stored === 'dark') return stored;
	return getSystemTheme();
}

export function getTheme(): Theme {
	return (localStorage.getItem(STORAGE_KEY) as Theme | null) ?? 'system';
}

export function setTheme(theme: Theme) {
	localStorage.setItem(STORAGE_KEY, theme);
	applyTheme(theme);
}

export function applyTheme(theme: Theme) {
	const resolved = theme === 'system' ? getSystemTheme() : theme;
	document.documentElement.setAttribute('data-theme', resolved);
}

export function initTheme() {
	const theme = getTheme();
	applyTheme(theme);

	// Listen for system changes when in system mode
	const media = window.matchMedia('(prefers-color-scheme: dark)');
	media.addEventListener('change', () => {
		if (getTheme() === 'system') {
			applyTheme('system');
		}
	});
}
