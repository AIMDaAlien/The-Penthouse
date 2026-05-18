import { themes, type ThemeMode, type PaletteVars } from '$lib/themes';

const STORAGE_KEY = 'penthouse-appearance';
const LEGACY_KEY = 'penthouse-theme-pref';

function getSystemMode(): 'dark' | 'light' {
	if (typeof window === 'undefined') return 'dark';
	return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

interface StoredPref {
	themeId: string;
	mode: 'dark' | 'light' | 'system';
}

function loadPref(): StoredPref {
	// Try new format first
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (raw) {
			const parsed = JSON.parse(raw) as StoredPref;
			if (parsed.themeId && parsed.mode) {
				return parsed;
			}
		}
	} catch { /* fallthrough */ }

	// Migrate from legacy format
	try {
		const legacy = localStorage.getItem(LEGACY_KEY);
		if (legacy) {
			const parsed = JSON.parse(legacy);
			if (parsed.kind === 'variant') {
				// Old variant system — map to nearest theme, default to periwinkle
				return { themeId: 'periwinkle', mode: parsed.variant.startsWith('T-L') ? 'light' : 'dark' };
			}
			if (parsed.kind === 'auto') {
				return { themeId: 'periwinkle', mode: parsed.mode };
			}
		}
		// Even older: plain string 'dark' | 'light' | 'system'
		if (legacy === 'dark' || legacy === 'light' || legacy === 'system') {
			return { themeId: 'periwinkle', mode: legacy };
		}
	} catch { /* fallthrough */ }

	return { themeId: 'periwinkle', mode: 'dark' };
}

// Module-level reactive state for system mode (updated by media query listener)
let systemMode = $state<'dark' | 'light'>(getSystemMode());

class AppearanceStore {
	themeId = $state(loadPref().themeId);
	mode = $state<'dark' | 'light' | 'system'>(loadPref().mode);

	theme = $derived(themes.find((t) => t.id === this.themeId) ?? themes[0]);
	resolvedMode = $derived(this.mode === 'system' ? systemMode : this.mode);
	tokens = $derived(this.theme[this.resolvedMode] as PaletteVars);

	setTheme(id: string) {
		const found = themes.find((t) => t.id === id);
		if (found) {
			this.themeId = found.id;
			this.#persist();
		}
	}

	setMode(m: 'dark' | 'light' | 'system') {
		this.mode = m;
		this.#persist();
	}

	#persist() {
		if (typeof localStorage !== 'undefined') {
			localStorage.setItem(
				STORAGE_KEY,
				JSON.stringify({ themeId: this.themeId, mode: this.mode })
			);
		}
	}
}

export const appearanceStore = new AppearanceStore();

// Listen for system changes — updates module-level state, which triggers deriveds
if (typeof window !== 'undefined') {
	const media = window.matchMedia('(prefers-color-scheme: dark)');
	media.addEventListener('change', () => {
		systemMode = getSystemMode();
	});
}
