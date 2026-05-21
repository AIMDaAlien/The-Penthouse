// Shared prototype state for the /prototypes/flow integration view.
// NOTE: not a production import — only the flow page consumes this. Standalone
// pane prototypes still hold their own local state.
//
// THEME SYSTEM CONTRACT
// ─────────────────────
// Each theme is a hand-tuned pair of palettes (dark + light). To add a theme:
//   1. Add an entry to `themes` below with both palettes filled in.
//   2. That's it — type-checking and UI rendering pick it up automatically.
//
// We don't derive light-from-dark by OKLCH math because pastel palettes are
// aesthetic choices, not algorithmic outputs. Hue and chroma are picked per
// theme; the helpers below just remove duplicated boilerplate.

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
	warning: string;
}

export interface ThemeDef {
	id: string;
	label: string;
	dark: PaletteVars;
	light: PaletteVars;
}

export type ThemeMode = 'dark' | 'light';

// ── Helpers (boilerplate-reducing constructors) ──────────────────────
// Each helper takes the few values that vary across themes and emits a
// full PaletteVars. Override individual properties at call site if needed.

function dark(opts: {
	hue: number;            // background hue
	accent: string;          // full oklch(...) accent literal
	accentHue?: number;      // hue used for accent-soft alpha (defaults to opts.hue)
	textHue?: number;
}): PaletteVars {
	const { hue, accent, accentHue = hue, textHue = hue } = opts;
	return {
		accent,
		accentSoft: accent.replace(')', ' / 0.18)'),
		accentEdge: accent.replace(')', ' / 0.38)'),
		bg:        `oklch(0.16 0.020 ${hue})`,
		surface:   `oklch(0.21 0.026 ${hue})`,
		surface2:  `oklch(0.26 0.032 ${hue})`,
		text:      `oklch(0.93 0.012 ${textHue})`,
		text2:     `oklch(0.80 0.025 ${textHue})`,
		muted:     `oklch(0.65 0.050 ${textHue})`,
		secondary: `oklch(0.78 0.080 ${textHue})`,
		line:      `oklch(0.78 0.080 ${textHue} / 0.14)`,
		line2:     `oklch(0.78 0.080 ${textHue} / 0.26)`,
		success:   'oklch(0.68 0.140 145)',
		warning:   'oklch(0.62 0.070 35)',
	};
}

function light(opts: {
	bgHue: number;            // background tint hue (the pastel mood)
	bgLightness?: number;     // default 0.96
	accent: string;            // full oklch(...) accent literal
	textHue?: number;          // text hue (defaults to bgHue)
}): PaletteVars {
	const { bgHue, bgLightness = 0.96, accent, textHue = bgHue } = opts;
	return {
		accent,
		accentSoft: accent.replace(')', ' / 0.14)'),
		accentEdge: accent.replace(')', ' / 0.32)'),
		// surfaces step DARKER than bg so cards are visibly distinct on light
		bg:        `oklch(${bgLightness.toFixed(2)} 0.020 ${bgHue})`,
		surface:   `oklch(${(bgLightness - 0.05).toFixed(2)} 0.024 ${bgHue})`,
		surface2:  `oklch(${(bgLightness - 0.10).toFixed(2)} 0.028 ${bgHue})`,
		text:      `oklch(0.22 0.020 ${textHue})`,
		text2:     `oklch(0.40 0.025 ${textHue})`,
		muted:     `oklch(0.55 0.030 ${textHue})`,
		secondary: `oklch(0.40 0.030 ${textHue})`,
		// solid border on light mode (no alpha tricks — alpha disappears on light bg)
		line:      `oklch(0.40 0.030 ${textHue} / 0.18)`,
		line2:     `oklch(0.40 0.030 ${textHue} / 0.32)`,
		success:   'oklch(0.50 0.130 145)',
		warning:   'oklch(0.48 0.080 35)',
	};
}

// ── Themes ───────────────────────────────────────────────────────────

export const themes: ThemeDef[] = [
	{
		id: 'periwinkle',
		label: 'Periwinkle',
		dark:  dark({  hue: 280, accent: 'oklch(0.69 0.140 285)' }),
		light: light({ bgHue: 285, accent: 'oklch(0.55 0.130 285)' }),
	},
	{
		id: 'sage',
		label: 'Sage',
		dark:  dark({  hue: 145, accent: 'oklch(0.65 0.060 145)', textHue: 145 }),
		light: light({ bgHue: 110, bgLightness: 0.96, accent: 'oklch(0.46 0.070 145)', textHue: 145 }),
	},
	{
		id: 'slate',
		label: 'Slate',
		dark:  dark({  hue: 245, accent: 'oklch(0.62 0.075 245)' }),
		light: light({ bgHue: 230, accent: 'oklch(0.50 0.090 230)' }),
	},
	{
		id: 'plum',
		label: 'Plum',
		dark:  dark({  hue: 340, accent: 'oklch(0.60 0.090 340)' }),
		light: light({ bgHue: 20,  accent: 'oklch(0.52 0.090 20)', textHue: 20 }),
	},
	{
		id: 'charcoal',
		label: 'Charcoal',
		dark:  dark({  hue: 35,  accent: 'oklch(0.60 0.100 35)' }),
		light: light({ bgHue: 75,  bgLightness: 0.94, accent: 'oklch(0.46 0.030 75)', textHue: 75 }),
	},
];

export interface PProfileStyleDef {
	id: 'editorial' | 'vogue' | 'wallpaper';
	label: string;
	description: string;
}

export const profileStyles: PProfileStyleDef[] = [
	{ id: 'editorial', label: 'Editorial', description: 'Banner above, roster + focus pane.' },
	{ id: 'vogue',     label: 'Vogue',     description: 'Display-name hero, large pfp overlap.' },
	{ id: 'wallpaper', label: 'Wallpaper', description: 'Banner fills the space, floating identity card.' },
];

class FlowState {
	themeId    = $state('periwinkle');
	mode       = $state<ThemeMode>('dark');
	profileStyle = $state<PProfileStyleDef['id']>('editorial');
	presence   = $state<'online' | 'away' | 'offline'>('online');
	displayName = $state('Nova Lee');
	handle      = $state('nova.lee');
	bio         = $state('Designing quiet spaces for loud thoughts.');
	avatar      = $state('https://i.pravatar.cc/300?u=nova-lee');
	banner      = $state('https://images.unsplash.com/photo-1519681393784-d120267933ba?w=1400&q=80');

	theme  = $derived(themes.find(t => t.id === this.themeId) ?? themes[0]);
	tokens = $derived(this.theme[this.mode]);
	activeProfileStyle = $derived(profileStyles.find(p => p.id === this.profileStyle) ?? profileStyles[0]);
}

export const flowState = new FlowState();
