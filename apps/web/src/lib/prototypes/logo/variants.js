/**
 * Logo variant library — single source of truth for /prototypes/logo
 * and the standalone logo-gallery.html.
 *
 * Each variant returns an SVG string that takes:
 *   - size:   number   (width and height in px)
 *   - ink:    string   (primary fill, theme-derived)
 *   - accent: string   (accent color, periwinkle)
 *
 * IDs inside <defs> are suffixed with the variant id + size so the
 * same variant can render at multiple sizes in the same DOM without
 * mask/clip-path collisions.
 *
 * Plain ESM .js so both the Svelte route and a node build script
 * can import it directly with no TS toolchain.
 *
 * Direction (this revision):
 *   - The PENT 2x2 grid is the lead direction. Ten variants explore the
 *     grid as a system: dividers vs. no-dividers, filled vs. cut-out,
 *     square cells vs. discs, ink-on-color vs. color-on-ink, even vs.
 *     hierarchical, registered vs. off-register. Each names a distinct
 *     aesthetic reference so the set has range without converging.
 *   - Non-grid PENT kept as a secondary set for spectrum.
 *   - PH interlock kept as a tertiary set (Gemini-direction notification
 *     reading lives there).
 *   - Editorial experimental closes (wax seal, banknote engraving,
 *     Hoefler specimen, optical aperture).
 *
 * Legal posture:
 *   - Typeface shapes are not copyrightable in the US (Eltra v. Ringer
 *     1978, 37 CFR 202.1(e)). Playfair Display is SIL OFL.
 *   - Trade-dress dodges: no Tiffany diamond frame, no Cartier hairline
 *     monogram ring, no Tom Ford initial-medallion, no Penthouse-magazine
 *     key motif.
 */

const SERIF = "'Playfair Display', 'Times New Roman', serif";
const SANS = "'Ubuntu', system-ui, sans-serif";

/** @typedef {'grid'|'wordmark'|'interlock'|'experimental'} Family */

/**
 * @typedef {Object} Variant
 * @property {string} id
 * @property {Family} family
 * @property {string} number
 * @property {string} name
 * @property {string} blurb
 * @property {(size:number, ink:string, accent:string) => string} svg
 */

/** @param {number} size @param {string} body */
const wrap = (size, body) =>
	`<svg viewBox="0 0 100 100" width="${size}" height="${size}" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">${body}</svg>`;

/** @type {Variant[]} */
export const variants = [
	// ── 01 · PENT 2x2 grid ───────────────────────────────────────────────
	// The grid is the system. Each variant treats one axis differently:
	// the dividers (hairline / heavy / absent), the cells (filled / outlined
	// / discrete / round), the color logic (mono / committed / alternating),
	// or the registration (clean / offset).
	{
		id: 'pent-grid', family: 'grid', number: '01a', name: 'Hairline crosshair',
		blurb: 'PENT in a 2x2 with a single periwinkle crosshair. The quietest grid: hairlines that fall away at favicon scale but anchor the set at hero scale.',
		svg: (s, i, a) => wrap(s, `
			<g font-family="${SERIF}" font-weight="900" fill="${i}" letter-spacing="-1">
				<text x="30" y="32" text-anchor="middle" dominant-baseline="central" font-size="32">P</text>
				<text x="70" y="32" text-anchor="middle" dominant-baseline="central" font-size="32">E</text>
				<text x="30" y="72" text-anchor="middle" dominant-baseline="central" font-size="32">N</text>
				<text x="70" y="72" text-anchor="middle" dominant-baseline="central" font-size="32">T</text>
			</g>
			<line x1="50" y1="14" x2="50" y2="86" stroke="${a}" stroke-width="0.8"/>
			<line x1="14" y1="50" x2="86" y2="50" stroke="${a}" stroke-width="0.8"/>
		`)
	},
	{
		id: 'pent-negative', family: 'grid', number: '01b', name: 'Negative tile',
		blurb: 'A single periwinkle plate with PENT cut out of it. The strongest icon at 16 px: a colored square with four ink holes in a grid.',
		svg: (s, _i, a) => wrap(s, `
			<defs><mask id="pent-neg-${s}"><rect width="100" height="100" fill="white"/>
				<text x="30" y="32" text-anchor="middle" dominant-baseline="central" font-family="${SERIF}" font-weight="900" font-size="32" fill="black" letter-spacing="-1">P</text>
				<text x="70" y="32" text-anchor="middle" dominant-baseline="central" font-family="${SERIF}" font-weight="900" font-size="32" fill="black" letter-spacing="-1">E</text>
				<text x="30" y="72" text-anchor="middle" dominant-baseline="central" font-family="${SERIF}" font-weight="900" font-size="32" fill="black" letter-spacing="-1">N</text>
				<text x="70" y="72" text-anchor="middle" dominant-baseline="central" font-family="${SERIF}" font-weight="900" font-size="32" fill="black" letter-spacing="-1">T</text>
			</mask></defs>
			<rect x="6" y="6" width="88" height="88" rx="14" fill="${a}" mask="url(#pent-neg-${s})"/>
		`)
	},
	{
		id: 'pent-plate', family: 'grid', number: '01c', name: 'Positive plate',
		blurb: 'The inverse: solid periwinkle plate, ink PENT laid on top. Klim solid-block aesthetic, the most committed color reading.',
		svg: (s, i, a) => wrap(s, `
			<rect x="6" y="6" width="88" height="88" rx="14" fill="${a}"/>
			<g font-family="${SERIF}" font-weight="900" fill="${i}" letter-spacing="-1">
				<text x="30" y="32" text-anchor="middle" dominant-baseline="central" font-size="32">P</text>
				<text x="70" y="32" text-anchor="middle" dominant-baseline="central" font-size="32">E</text>
				<text x="30" y="72" text-anchor="middle" dominant-baseline="central" font-size="32">N</text>
				<text x="70" y="72" text-anchor="middle" dominant-baseline="central" font-size="32">T</text>
			</g>
		`)
	},
	{
		id: 'pent-quad', family: 'grid', number: '01d', name: 'Quad tiles',
		blurb: 'Four separate periwinkle squares, each with one PENT letter cut out. Stamps from a sheet: each cell is its own surface.',
		svg: (s, _i, a) => wrap(s, `
			<defs><mask id="quad-cut-${s}"><rect width="100" height="100" fill="white"/>
				<text x="28" y="30" text-anchor="middle" dominant-baseline="central" font-family="${SERIF}" font-weight="900" font-size="26" fill="black" letter-spacing="-1">P</text>
				<text x="72" y="30" text-anchor="middle" dominant-baseline="central" font-family="${SERIF}" font-weight="900" font-size="26" fill="black" letter-spacing="-1">E</text>
				<text x="28" y="70" text-anchor="middle" dominant-baseline="central" font-family="${SERIF}" font-weight="900" font-size="26" fill="black" letter-spacing="-1">N</text>
				<text x="72" y="70" text-anchor="middle" dominant-baseline="central" font-family="${SERIF}" font-weight="900" font-size="26" fill="black" letter-spacing="-1">T</text>
			</mask></defs>
			<g fill="${a}" mask="url(#quad-cut-${s})">
				<rect x="10" y="12" width="36" height="36" rx="4"/>
				<rect x="54" y="12" width="36" height="36" rx="4"/>
				<rect x="10" y="52" width="36" height="36" rx="4"/>
				<rect x="54" y="52" width="36" height="36" rx="4"/>
			</g>
		`)
	},
	{
		id: 'pent-roundels', family: 'grid', number: '01e', name: 'Roundels',
		blurb: 'Four periwinkle discs in a 2x2 with PENT cut out of each. Coin-collection arrangement: circles read at any size, even where serifs blur.',
		svg: (s, _i, a) => wrap(s, `
			<defs><mask id="round-cut-${s}"><rect width="100" height="100" fill="white"/>
				<text x="28" y="30" text-anchor="middle" dominant-baseline="central" font-family="${SERIF}" font-weight="900" font-size="22" fill="black" letter-spacing="-1">P</text>
				<text x="72" y="30" text-anchor="middle" dominant-baseline="central" font-family="${SERIF}" font-weight="900" font-size="22" fill="black" letter-spacing="-1">E</text>
				<text x="28" y="70" text-anchor="middle" dominant-baseline="central" font-family="${SERIF}" font-weight="900" font-size="22" fill="black" letter-spacing="-1">N</text>
				<text x="72" y="70" text-anchor="middle" dominant-baseline="central" font-family="${SERIF}" font-weight="900" font-size="22" fill="black" letter-spacing="-1">T</text>
			</mask></defs>
			<g fill="${a}" mask="url(#round-cut-${s})">
				<circle cx="28" cy="30" r="18"/>
				<circle cx="72" cy="30" r="18"/>
				<circle cx="28" cy="70" r="18"/>
				<circle cx="72" cy="70" r="18"/>
			</g>
		`)
	},
	{
		id: 'pent-outlined', family: 'grid', number: '01f', name: 'Outlined cells',
		blurb: 'Four hairline cell borders in periwinkle, PENT letters inside. Müller-Brockmann grid drawing. The borders are the structure; the letters are the content.',
		svg: (s, i, a) => wrap(s, `
			<g fill="none" stroke="${a}" stroke-width="0.9">
				<rect x="10" y="10" width="38" height="38"/>
				<rect x="52" y="10" width="38" height="38"/>
				<rect x="10" y="52" width="38" height="38"/>
				<rect x="52" y="52" width="38" height="38"/>
			</g>
			<g font-family="${SERIF}" font-weight="900" fill="${i}" letter-spacing="-1">
				<text x="29" y="29" text-anchor="middle" dominant-baseline="central" font-size="26">P</text>
				<text x="71" y="29" text-anchor="middle" dominant-baseline="central" font-size="26">E</text>
				<text x="29" y="71" text-anchor="middle" dominant-baseline="central" font-size="26">N</text>
				<text x="71" y="71" text-anchor="middle" dominant-baseline="central" font-size="26">T</text>
			</g>
		`)
	},
	{
		id: 'pent-checker', family: 'grid', number: '01g', name: 'Diagonal checker',
		blurb: 'P and T held in ink, E and N held in periwinkle. Color alternates across the diagonal. Bauhaus chromatic logic. No cells, no rules — the color is the grid.',
		svg: (s, i, a) => wrap(s, `
			<g font-family="${SERIF}" font-weight="900" letter-spacing="-1">
				<text x="30" y="32" text-anchor="middle" dominant-baseline="central" font-size="34" fill="${i}">P</text>
				<text x="70" y="32" text-anchor="middle" dominant-baseline="central" font-size="34" fill="${a}">E</text>
				<text x="30" y="72" text-anchor="middle" dominant-baseline="central" font-size="34" fill="${a}">N</text>
				<text x="70" y="72" text-anchor="middle" dominant-baseline="central" font-size="34" fill="${i}">T</text>
			</g>
		`)
	},
	{
		id: 'pent-thick', family: 'grid', number: '01h', name: 'Thick cross',
		blurb: 'A heavy periwinkle crosshair divides the canvas into four ink quadrants. Constructivist signage: the dividers carry equal weight to the letters.',
		svg: (s, i, a) => wrap(s, `
			<g font-family="${SERIF}" font-weight="900" fill="${i}" letter-spacing="-1">
				<text x="26" y="28" text-anchor="middle" dominant-baseline="central" font-size="34">P</text>
				<text x="74" y="28" text-anchor="middle" dominant-baseline="central" font-size="34">E</text>
				<text x="26" y="72" text-anchor="middle" dominant-baseline="central" font-size="34">N</text>
				<text x="74" y="72" text-anchor="middle" dominant-baseline="central" font-size="34">T</text>
			</g>
			<rect x="48" y="10" width="4" height="80" fill="${a}"/>
			<rect x="10" y="48" width="80" height="4" fill="${a}"/>
		`)
	},
	{
		id: 'pent-corners', family: 'grid', number: '01i', name: 'Corners with punctum',
		blurb: 'Four letters anchored to the canvas corners, open negative space pulled to a periwinkle punctum at the center. The grid is implied, not drawn.',
		svg: (s, i, a) => wrap(s, `
			<g font-family="${SERIF}" font-weight="900" fill="${i}" letter-spacing="-1">
				<text x="22" y="22" text-anchor="middle" dominant-baseline="central" font-size="30">P</text>
				<text x="78" y="22" text-anchor="middle" dominant-baseline="central" font-size="30">E</text>
				<text x="22" y="78" text-anchor="middle" dominant-baseline="central" font-size="30">N</text>
				<text x="78" y="78" text-anchor="middle" dominant-baseline="central" font-size="30">T</text>
			</g>
			<circle cx="50" cy="50" r="3.6" fill="${a}"/>
		`)
	},
	{
		id: 'pent-overprint', family: 'grid', number: '01j', name: 'Risograph overprint',
		blurb: 'Two passes off-register. Periwinkle plate shifted 2 px from the ink plate. Each letter rendered twice. Risograph print-shop energy.',
		svg: (s, i, a) => wrap(s, `
			<g font-family="${SERIF}" font-weight="900" letter-spacing="-1" opacity="0.78">
				<text x="32" y="34" text-anchor="middle" dominant-baseline="central" font-size="32" fill="${a}">P</text>
				<text x="72" y="34" text-anchor="middle" dominant-baseline="central" font-size="32" fill="${a}">E</text>
				<text x="32" y="74" text-anchor="middle" dominant-baseline="central" font-size="32" fill="${a}">N</text>
				<text x="72" y="74" text-anchor="middle" dominant-baseline="central" font-size="32" fill="${a}">T</text>
			</g>
			<g font-family="${SERIF}" font-weight="900" fill="${i}" letter-spacing="-1">
				<text x="30" y="32" text-anchor="middle" dominant-baseline="central" font-size="32">P</text>
				<text x="70" y="32" text-anchor="middle" dominant-baseline="central" font-size="32">E</text>
				<text x="30" y="72" text-anchor="middle" dominant-baseline="central" font-size="32">N</text>
				<text x="70" y="72" text-anchor="middle" dominant-baseline="central" font-size="32">T</text>
			</g>
		`)
	},

	// ── 02 · PENT non-grid ───────────────────────────────────────────────
	// Held as a secondary set for typographic spectrum.
	{
		id: 'pent-block', family: 'wordmark', number: '02a', name: 'PENT block',
		blurb: 'Single line of PENT in heavy Didone. The base case for the non-grid family.',
		svg: (s, i) => wrap(s, `
			<text x="50" y="52" text-anchor="middle" dominant-baseline="central" font-family="${SERIF}" font-weight="900" font-size="40" fill="${i}" letter-spacing="-1">PENT</text>
		`)
	},
	{
		id: 'pent-pe-nt', family: 'wordmark', number: '02b', name: 'PE / NT stacked',
		blurb: 'PE over NT, separated by a thin periwinkle rule. Two-line silhouette.',
		svg: (s, i, a) => wrap(s, `
			<text x="50" y="34" text-anchor="middle" dominant-baseline="central" font-family="${SERIF}" font-weight="900" font-size="42" fill="${i}" letter-spacing="-2">PE</text>
			<line x1="32" y1="50" x2="68" y2="50" stroke="${a}" stroke-width="1.4"/>
			<text x="50" y="68" text-anchor="middle" dominant-baseline="central" font-family="${SERIF}" font-weight="900" font-size="42" fill="${i}" letter-spacing="-2">NT</text>
		`)
	},
	{
		id: 'pent-thread', family: 'wordmark', number: '02c', name: 'PENT threaded',
		blurb: 'PENT with a periwinkle rule through the x-height. Banner word with a bright stripe.',
		svg: (s, i, a) => wrap(s, `
			<text x="50" y="52" text-anchor="middle" dominant-baseline="central" font-family="${SERIF}" font-weight="900" font-size="42" fill="${i}" letter-spacing="-1">PENT</text>
			<rect x="14" y="50" width="72" height="3" fill="${a}"/>
		`)
	},
	{
		id: 'pent-stencil', family: 'wordmark', number: '02d', name: 'PENT stencil',
		blurb: 'PENT with a horizontal stencil cut at the optical midline and a periwinkle bridge across the center.',
		svg: (s, i, a) => wrap(s, `
			<defs><mask id="pent-cut-${s}"><rect width="100" height="100" fill="white"/><rect x="4" y="46" width="92" height="6" fill="black"/></mask></defs>
			<g mask="url(#pent-cut-${s})">
				<text x="50" y="52" text-anchor="middle" dominant-baseline="central" font-family="${SERIF}" font-weight="900" font-size="42" fill="${i}" letter-spacing="-1">PENT</text>
			</g>
			<rect x="40" y="46" width="20" height="6" fill="${a}"/>
		`)
	},
	{
		id: 'pent-crest', family: 'wordmark', number: '02e', name: 'PENT crest',
		blurb: 'PE / NT held between two hairline rules. Editorial nameplate construction.',
		svg: (s, i, a) => wrap(s, `
			<line x1="22" y1="24" x2="78" y2="24" stroke="${a}" stroke-width="1"/>
			<text x="50" y="42" text-anchor="middle" dominant-baseline="central" font-family="${SERIF}" font-weight="900" font-size="30" fill="${i}" letter-spacing="-2">PE</text>
			<text x="50" y="64" text-anchor="middle" dominant-baseline="central" font-family="${SERIF}" font-weight="900" font-size="30" fill="${i}" letter-spacing="-2">NT</text>
			<line x1="22" y1="82" x2="78" y2="82" stroke="${a}" stroke-width="1"/>
		`)
	},
	{
		id: 'pent-house-stack', family: 'wordmark', number: '02f', name: 'PENT / HOUSE stack',
		blurb: 'The wordmark body without "The". The most literal lockup tie.',
		svg: (s, i) => wrap(s, `
			<text x="50" y="34" text-anchor="middle" dominant-baseline="central" font-family="${SERIF}" font-weight="900" font-size="30" fill="${i}" letter-spacing="-1">PENT</text>
			<text x="50" y="68" text-anchor="middle" dominant-baseline="central" font-family="${SERIF}" font-weight="900" font-size="30" fill="${i}" letter-spacing="-1">HOUSE</text>
		`)
	},
	{
		id: 'pent-bar', family: 'wordmark', number: '02g', name: 'PENT over bar',
		blurb: 'PENT above a thick periwinkle rule standing in for HOUSE. The bar IS the second word.',
		svg: (s, i, a) => wrap(s, `
			<text x="50" y="44" text-anchor="middle" dominant-baseline="central" font-family="${SERIF}" font-weight="900" font-size="36" fill="${i}" letter-spacing="-1">PENT</text>
			<rect x="14" y="62" width="72" height="6" fill="${a}"/>
		`)
	},

	// ── 03 · PH interlock ────────────────────────────────────────────────
	{
		id: 'ph-neighbour', family: 'interlock', number: '03a', name: 'PH adjacent',
		blurb: 'Classic typographic pair. P and H side by side, tight kerning.',
		svg: (s, i) => wrap(s, `
			<g font-family="${SERIF}" font-weight="900" fill="${i}">
				<text x="30" y="52" text-anchor="middle" dominant-baseline="central" font-size="76" letter-spacing="-3">P</text>
				<text x="70" y="52" text-anchor="middle" dominant-baseline="central" font-size="76" letter-spacing="-3">H</text>
			</g>
		`)
	},
	{
		id: 'ph-notification', family: 'interlock', number: '03b', name: 'PH with notification dot',
		blurb: 'PH set adjacent with a periwinkle dot inside the P bowl. The messaging signal as logo gesture.',
		svg: (s, i, a) => wrap(s, `
			<g font-family="${SERIF}" font-weight="900" fill="${i}">
				<text x="30" y="52" text-anchor="middle" dominant-baseline="central" font-size="76" letter-spacing="-3">P</text>
				<text x="70" y="52" text-anchor="middle" dominant-baseline="central" font-size="76" letter-spacing="-3">H</text>
			</g>
			<circle cx="35" cy="36" r="4" fill="${a}"/>
		`)
	},
	{
		id: 'ph-interlocked', family: 'interlock', number: '03c', name: 'PH interlocked',
		blurb: 'H steps left into the P, its left stem crossing the bowl. Periwinkle H reads as the messaging layer over the building identity.',
		svg: (s, i, a) => wrap(s, `
			<text x="34" y="52" text-anchor="middle" dominant-baseline="central" font-family="${SERIF}" font-weight="900" font-size="80" fill="${i}" letter-spacing="-3">P</text>
			<text x="58" y="52" text-anchor="middle" dominant-baseline="central" font-family="${SERIF}" font-weight="900" font-size="80" fill="${a}" letter-spacing="-3">H</text>
			<circle cx="36" cy="34" r="3.5" fill="${a}"/>
		`)
	},
	{
		id: 'ph-shared-stem', family: 'interlock', number: '03d', name: 'PH shared stem',
		blurb: 'P and H placed so the right stem of the P doubles as the left stem of the H. One continuous structure.',
		svg: (s, i) => wrap(s, `
			<text x="32" y="52" text-anchor="middle" dominant-baseline="central" font-family="${SERIF}" font-weight="900" font-size="80" fill="${i}" letter-spacing="-3">P</text>
			<text x="56" y="52" text-anchor="middle" dominant-baseline="central" font-family="${SERIF}" font-weight="900" font-size="80" fill="${i}" letter-spacing="-3">H</text>
		`)
	},
	{
		id: 'ph-crossbar', family: 'interlock', number: '03e', name: 'PH shared crossbar',
		blurb: 'The H crossbar extends in periwinkle across both letters. One continuous line under the bowl of the P.',
		svg: (s, i, a) => wrap(s, `
			<g font-family="${SERIF}" font-weight="900" fill="${i}">
				<text x="28" y="52" text-anchor="middle" dominant-baseline="central" font-size="80" letter-spacing="-3">P</text>
				<text x="72" y="52" text-anchor="middle" dominant-baseline="central" font-size="80" letter-spacing="-3">H</text>
			</g>
			<rect x="18" y="52" width="64" height="4" fill="${a}"/>
		`)
	},
	{
		id: 'ph-stencil', family: 'interlock', number: '03f', name: 'PH stencil bridge',
		blurb: 'PH horizontally split by a 6 px cut. A periwinkle bridge spans the gap.',
		svg: (s, i, a) => wrap(s, `
			<defs><mask id="ph-cut-${s}"><rect width="100" height="100" fill="white"/><rect x="6" y="44" width="88" height="6" fill="black"/></mask></defs>
			<g mask="url(#ph-cut-${s})" font-family="${SERIF}" font-weight="900" fill="${i}">
				<text x="30" y="52" text-anchor="middle" dominant-baseline="central" font-size="76" letter-spacing="-3">P</text>
				<text x="70" y="52" text-anchor="middle" dominant-baseline="central" font-size="76" letter-spacing="-3">H</text>
			</g>
			<rect x="46" y="44" width="20" height="6" fill="${a}"/>
		`)
	},
	{
		id: 'ph-italic', family: 'interlock', number: '03g', name: 'ph italic ligature',
		blurb: 'Lowercase italic ph in chancery weight. The quietest reading, with the messaging dot above the bowl.',
		svg: (s, i, a) => wrap(s, `
			<text x="50" y="52" text-anchor="middle" dominant-baseline="central" font-family="${SERIF}" font-style="italic" font-weight="600" font-size="68" fill="${i}" letter-spacing="-4">ph</text>
			<circle cx="60" cy="38" r="3" fill="${a}"/>
		`)
	},
	{
		id: 'ph-ampersand', family: 'interlock', number: '03h', name: 'P & H',
		blurb: 'Formal ampersand lockup with a swashed italic ampersand in periwinkle. Classical reading.',
		svg: (s, i, a) => wrap(s, `
			<text x="20" y="52" text-anchor="middle" dominant-baseline="central" font-family="${SERIF}" font-weight="900" font-size="56" fill="${i}" letter-spacing="-2">P</text>
			<text x="50" y="54" text-anchor="middle" dominant-baseline="central" font-family="${SERIF}" font-style="italic" font-weight="400" font-size="48" fill="${a}">&amp;</text>
			<text x="80" y="52" text-anchor="middle" dominant-baseline="central" font-family="${SERIF}" font-weight="900" font-size="56" fill="${i}" letter-spacing="-2">H</text>
		`)
	},
	{
		id: 'ph-cap-rule', family: 'interlock', number: '03i', name: 'PH nameplate',
		blurb: 'PH held between two hairline rules. Periwinkle cap rule above, ink baseline rule below.',
		svg: (s, i, a) => wrap(s, `
			<line x1="14" y1="24" x2="86" y2="24" stroke="${a}" stroke-width="1"/>
			<g font-family="${SERIF}" font-weight="900" fill="${i}" letter-spacing="-3">
				<text x="32" y="54" text-anchor="middle" dominant-baseline="central" font-size="60">P</text>
				<text x="68" y="54" text-anchor="middle" dominant-baseline="central" font-size="60">H</text>
			</g>
			<line x1="14" y1="84" x2="86" y2="84" stroke="${i}" stroke-width="2"/>
		`)
	},
	{
		id: 'ph-dropcap', family: 'interlock', number: '03j', name: 'PH drop cap',
		blurb: 'Large H as the page-opening drop cap with a smaller periwinkle P fitted inside the left counter.',
		svg: (s, i, a) => wrap(s, `
			<text x="50" y="52" text-anchor="middle" dominant-baseline="central" font-family="${SERIF}" font-weight="900" font-size="100" fill="${i}" letter-spacing="-3">H</text>
			<text x="32" y="40" text-anchor="middle" dominant-baseline="central" font-family="${SERIF}" font-weight="900" font-size="26" fill="${a}" letter-spacing="-1">P</text>
		`)
	},

	// ── 04 · Experimental editorial ──────────────────────────────────────
	{
		id: 'exp-ph-negative', family: 'experimental', number: '04a', name: 'PH negative tile',
		blurb: 'PH carved out of a periwinkle plate.',
		svg: (s, _i, a) => wrap(s, `
			<defs><mask id="neg-ph-${s}"><rect width="100" height="100" fill="white"/>
				<text x="28" y="54" text-anchor="middle" dominant-baseline="central" font-family="${SERIF}" font-weight="900" font-size="58" fill="black" letter-spacing="-2">P</text>
				<text x="72" y="54" text-anchor="middle" dominant-baseline="central" font-family="${SERIF}" font-weight="900" font-size="58" fill="black" letter-spacing="-2">H</text>
			</mask></defs>
			<rect x="6" y="6" width="88" height="88" rx="14" fill="${a}" mask="url(#neg-ph-${s})"/>
		`)
	},
	{
		id: 'exp-ph-seal', family: 'experimental', number: '04b', name: 'PH wax seal',
		blurb: 'PH carved out of a periwinkle disc with a faint inner ring. Heirloom letter-seal reference.',
		svg: (s, _i, a) => wrap(s, `
			<defs><mask id="seal-cut-${s}"><rect width="100" height="100" fill="white"/>
				<text x="30" y="56" text-anchor="middle" dominant-baseline="central" font-family="${SERIF}" font-weight="900" font-size="46" fill="black" letter-spacing="-2">P</text>
				<text x="70" y="56" text-anchor="middle" dominant-baseline="central" font-family="${SERIF}" font-weight="900" font-size="46" fill="black" letter-spacing="-2">H</text>
			</mask></defs>
			<circle cx="50" cy="52" r="40" fill="${a}" mask="url(#seal-cut-${s})"/>
			<circle cx="50" cy="52" r="36" fill="none" stroke="${a}" stroke-width="0.6" opacity="0.55"/>
		`)
	},
	{
		id: 'exp-ph-letterpress', family: 'experimental', number: '04c', name: 'PH letterpress',
		blurb: 'Two-pass print, off-register. Periwinkle plate shifted from the ink plate.',
		svg: (s, i, a) => wrap(s, `
			<g font-family="${SERIF}" font-weight="900" letter-spacing="-3" opacity="0.75">
				<text x="32" y="54" text-anchor="middle" dominant-baseline="central" font-size="76" fill="${a}">P</text>
				<text x="72" y="54" text-anchor="middle" dominant-baseline="central" font-size="76" fill="${a}">H</text>
			</g>
			<g font-family="${SERIF}" font-weight="900" letter-spacing="-3">
				<text x="30" y="50" text-anchor="middle" dominant-baseline="central" font-size="76" fill="${i}">P</text>
				<text x="70" y="50" text-anchor="middle" dominant-baseline="central" font-size="76" fill="${i}">H</text>
			</g>
		`)
	},
	{
		id: 'exp-ph-engraved', family: 'experimental', number: '04d', name: 'PH engraved',
		blurb: 'PH filled with diagonal crosshatch lines clipped to the letterform. Engraved banknote vignette.',
		svg: (s, i, a) => wrap(s, `
			<defs>
				<pattern id="engrave-${s}" patternUnits="userSpaceOnUse" width="2.2" height="2.2" patternTransform="rotate(38)">
					<line x1="0" y1="0" x2="0" y2="2.2" stroke="${i}" stroke-width="0.5"/>
				</pattern>
				<clipPath id="engrave-clip-${s}">
					<text x="30" y="54" text-anchor="middle" dominant-baseline="central" font-family="${SERIF}" font-weight="900" font-size="76" letter-spacing="-3">P</text>
					<text x="70" y="54" text-anchor="middle" dominant-baseline="central" font-family="${SERIF}" font-weight="900" font-size="76" letter-spacing="-3">H</text>
				</clipPath>
			</defs>
			<rect x="0" y="0" width="100" height="100" fill="url(#engrave-${s})" clip-path="url(#engrave-clip-${s})"/>
			<g font-family="${SERIF}" font-weight="900" fill="none" stroke="${i}" stroke-width="0.7" letter-spacing="-3">
				<text x="30" y="54" text-anchor="middle" dominant-baseline="central" font-size="76">P</text>
				<text x="70" y="54" text-anchor="middle" dominant-baseline="central" font-size="76">H</text>
			</g>
			<circle cx="38" cy="34" r="2.6" fill="${a}"/>
		`)
	},
	{
		id: 'exp-ph-specimen', family: 'experimental', number: '04e', name: 'PH type specimen',
		blurb: 'PH set as a type-foundry specimen sheet with corner registration marks. Hoefler & Co reference.',
		svg: (s, i, a) => wrap(s, `
			<g stroke="${a}" stroke-width="0.7" fill="none">
				<path d="M 6 14 L 14 14 M 14 6 L 14 14"/>
				<path d="M 86 14 L 94 14 M 86 6 L 86 14"/>
				<path d="M 6 86 L 14 86 M 14 86 L 14 94"/>
				<path d="M 86 86 L 94 86 M 86 86 L 86 94"/>
			</g>
			<g font-family="${SERIF}" font-weight="900" fill="${i}" letter-spacing="-2">
				<text x="32" y="50" text-anchor="middle" dominant-baseline="central" font-size="48">P</text>
				<text x="68" y="50" text-anchor="middle" dominant-baseline="central" font-size="48">H</text>
			</g>
			<line x1="20" y1="78" x2="80" y2="78" stroke="${i}" stroke-width="0.4" opacity="0.5"/>
			<text x="50" y="86" text-anchor="middle" dominant-baseline="central" font-family="${SANS}" font-weight="400" font-size="5" fill="${a}" letter-spacing="0.32em">SPECIMEN · 100%</text>
		`)
	},
	{
		id: 'exp-ph-aperture', family: 'experimental', number: '04f', name: 'PH aperture',
		blurb: 'P bowl rendered as an optical aperture with concentric rings and a periwinkle iris. H undisturbed beside.',
		svg: (s, i, a) => wrap(s, `
			<circle cx="34" cy="38" r="22" fill="none" stroke="${i}" stroke-width="1.4"/>
			<circle cx="34" cy="38" r="14" fill="${a}"/>
			<circle cx="34" cy="38" r="6" fill="${i}"/>
			<rect x="22" y="58" width="4" height="30" fill="${i}"/>
			<rect x="22" y="84" width="14" height="2.4" fill="${i}"/>
			<text x="74" y="52" text-anchor="middle" dominant-baseline="central" font-family="${SERIF}" font-weight="900" font-size="60" fill="${i}" letter-spacing="-2">H</text>
		`)
	}
];

/** @type {Record<Family, string>} */
export const familyLabels = {
	grid: 'PENT 2x2 grid',
	wordmark: 'PENT / wordmark',
	interlock: 'PH interlock',
	experimental: 'Experimental'
};
