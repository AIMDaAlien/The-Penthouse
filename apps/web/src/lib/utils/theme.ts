import { appearanceStore } from '$stores/appearance.svelte';
import { themes } from '$lib/themes';

export type ThemeId = (typeof themes)[number]['id'];
export type ThemeMode = 'dark' | 'light' | 'system';

export interface AppearancePref {
	themeId: ThemeId;
	mode: ThemeMode;
}

// ── Backward-compatible API (deprecated, use appearanceStore directly) ──

/** @deprecated Use appearanceStore.mode */
export function getTheme(): ThemeMode | 'system' {
	return appearanceStore.mode;
}

/** @deprecated Use appearanceStore.setMode() */
export function setTheme(mode: ThemeMode | 'system') {
	appearanceStore.setMode(mode);
}

/** @deprecated Use appearanceStore.setMode() */
export function applyTheme(mode: ThemeMode | 'system') {
	appearanceStore.setMode(mode);
}

/** @deprecated Store initializes automatically; no-op for compat */
export function initTheme() {
	// appearanceStore constructor handles everything
}

/** @deprecated Use appearanceStore.resolvedMode */
export function getResolvedTheme(): 'dark' | 'light' {
	return appearanceStore.resolvedMode;
}

/** @deprecated Use appearanceStore.resolvedMode */
export function getResolvedMode(): 'dark' | 'light' {
	return appearanceStore.resolvedMode;
}

// ── New API ──

export function setAppearance(pref: AppearancePref) {
	appearanceStore.setTheme(pref.themeId);
	appearanceStore.setMode(pref.mode);
}

export function getAppearance(): AppearancePref {
	return {
		themeId: appearanceStore.themeId as ThemeId,
		mode: appearanceStore.mode,
	};
}
