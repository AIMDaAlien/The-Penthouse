// Theme system source of truth.
// Each theme is a hand-tuned pair of palettes (dark + light).
// To add a theme: add one entry to `themes` below.
//
// We don't derive light-from-dark by OKLCH math because pastel palettes are
// aesthetic choices, not algorithmic outputs.

export interface PaletteVars {
	accent: string;
	accentSoft: string;
	accentEdge: string;
	bg: string;
	surface: string;
	surface2: string;
	text: string;
	text2: string;
	muted: string;
	secondary: string;
	line: string;
	line2: string;
	success: string;
	successSoft: string;
	successEdge: string;
	info: string;
	infoSoft: string;
	infoEdge: string;
	warning: string;
	warningSoft: string;
	warningEdge: string;
	error: string;
	errorSoft: string;
	errorEdge: string;
}

export interface ThemeDef {
	id: 'periwinkle' | 'sage' | 'slate' | 'plum' | 'charcoal';
	label: string;
	dark: PaletteVars;
	light: PaletteVars;
}

export type ThemeMode = 'dark' | 'light';

function darkPalette(opts: {
	hue: number;
	accent: string;
	accentHue?: number;
	textHue?: number;
}): PaletteVars {
	const { hue, accent, accentHue = hue, textHue = hue } = opts;
	return {
		accent,
		accentSoft: accent.replace(')', ' / 0.18)'),
		accentEdge: accent.replace(')', ' / 0.38)'),
		bg: `oklch(0.16 0.020 ${hue})`,
		surface: `oklch(0.21 0.026 ${hue})`,
		surface2: `oklch(0.26 0.032 ${hue})`,
		text: `oklch(0.93 0.012 ${textHue})`,
		text2: `oklch(0.80 0.025 ${textHue})`,
		muted: `oklch(0.65 0.050 ${textHue})`,
		secondary: `oklch(0.78 0.080 ${textHue})`,
		line: `oklch(0.78 0.080 ${textHue} / 0.14)`,
		line2: `oklch(0.78 0.080 ${textHue} / 0.26)`,
		success: 'oklch(0.68 0.140 145)',
		successSoft: 'oklch(0.68 0.140 145 / 0.14)',
		successEdge: 'oklch(0.68 0.140 145 / 0.32)',
		info: 'oklch(0.68 0.100 240)',
		infoSoft: 'oklch(0.68 0.100 240 / 0.14)',
		infoEdge: 'oklch(0.68 0.100 240 / 0.32)',
		warning: 'oklch(0.62 0.070 35)',
		warningSoft: 'oklch(0.62 0.070 35 / 0.12)',
		warningEdge: 'oklch(0.62 0.070 35 / 0.32)',
		error: 'oklch(0.58 0.110 25)',
		errorSoft: 'oklch(0.58 0.110 25 / 0.12)',
		errorEdge: 'oklch(0.58 0.110 25 / 0.32)',
	};
}

function lightPalette(opts: {
	bgHue: number;
	bgLightness?: number;
	accent: string;
	textHue?: number;
}): PaletteVars {
	const { bgHue, bgLightness = 0.96, accent, textHue = bgHue } = opts;
	return {
		accent,
		accentSoft: accent.replace(')', ' / 0.14)'),
		accentEdge: accent.replace(')', ' / 0.32)'),
		// surfaces step DARKER than bg so cards are visibly distinct on light
		bg: `oklch(${bgLightness.toFixed(2)} 0.020 ${bgHue})`,
		surface: `oklch(${(bgLightness - 0.05).toFixed(2)} 0.024 ${bgHue})`,
		surface2: `oklch(${(bgLightness - 0.10).toFixed(2)} 0.028 ${bgHue})`,
		text: `oklch(0.22 0.020 ${textHue})`,
		text2: `oklch(0.40 0.025 ${textHue})`,
		muted: `oklch(0.55 0.030 ${textHue})`,
		secondary: `oklch(0.40 0.030 ${textHue})`,
		// solid border on light mode (no alpha tricks — alpha disappears on light bg)
		line: `oklch(0.40 0.030 ${textHue} / 0.18)`,
		line2: `oklch(0.40 0.030 ${textHue} / 0.32)`,
		success: 'oklch(0.50 0.130 145)',
		successSoft: 'oklch(0.50 0.130 145 / 0.10)',
		successEdge: 'oklch(0.50 0.130 145 / 0.28)',
		info: 'oklch(0.48 0.100 240)',
		infoSoft: 'oklch(0.48 0.100 240 / 0.10)',
		infoEdge: 'oklch(0.48 0.100 240 / 0.28)',
		warning: 'oklch(0.48 0.080 35)',
		warningSoft: 'oklch(0.48 0.080 35 / 0.10)',
		warningEdge: 'oklch(0.48 0.080 35 / 0.28)',
		error: 'oklch(0.46 0.130 25)',
		errorSoft: 'oklch(0.46 0.130 25 / 0.10)',
		errorEdge: 'oklch(0.46 0.130 25 / 0.28)',
	};
}

export const themes: ThemeDef[] = [
	{
		id: 'periwinkle',
		label: 'Periwinkle',
		dark: darkPalette({ hue: 280, accent: 'oklch(0.69 0.140 285)' }),
		light: lightPalette({ bgHue: 285, accent: 'oklch(0.55 0.130 285)' }),
	},
	{
		id: 'sage',
		label: 'Sage',
		dark: darkPalette({ hue: 145, accent: 'oklch(0.65 0.060 145)', textHue: 145 }),
		light: lightPalette({ bgHue: 110, bgLightness: 0.96, accent: 'oklch(0.46 0.070 145)', textHue: 145 }),
	},
	{
		id: 'slate',
		label: 'Slate',
		dark: darkPalette({ hue: 245, accent: 'oklch(0.62 0.075 245)' }),
		light: lightPalette({ bgHue: 230, accent: 'oklch(0.50 0.090 230)' }),
	},
	{
		id: 'plum',
		label: 'Plum',
		dark: darkPalette({ hue: 340, accent: 'oklch(0.60 0.090 340)' }),
		light: lightPalette({ bgHue: 20, accent: 'oklch(0.52 0.090 20)', textHue: 20 }),
	},
	{
		id: 'charcoal',
		label: 'Charcoal',
		dark: darkPalette({ hue: 35, accent: 'oklch(0.60 0.100 35)' }),
		light: lightPalette({ bgHue: 75, bgLightness: 0.94, accent: 'oklch(0.46 0.030 75)', textHue: 75 }),
	},
];

export function tokensFor(theme: ThemeDef, mode: ThemeMode): PaletteVars {
	return theme[mode];
}
