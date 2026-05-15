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
 */

const SERIF = "'Playfair Display', 'Times New Roman', serif";
const SANS = "'Ubuntu', system-ui, sans-serif";

/** @typedef {'monogram'|'wordmark'|'architectural'|'experimental'} Family */

/**
 * @typedef {Object} Variant
 * @property {string} id
 * @property {Family} family
 * @property {string} number
 * @property {string} name
 * @property {string} blurb
 * @property {(size:number, ink:string, accent:string) => string} svg
 */

const wrap = (size, body) =>
	`<svg viewBox="0 0 100 100" width="${size}" height="${size}" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">${body}</svg>`;

/** @type {Variant[]} */
export const variants = [
	// ── 01 · Monogram P ───────────────────────────────────────────────────
	{
		id: 'p-full', family: 'monogram', number: '01a', name: 'Didone P',
		blurb: 'Direct lift from the wordmark. Sharp serifs, high stroke contrast.',
		svg: (s, i) => wrap(s, `
			<text x="50" y="50" text-anchor="middle" dominant-baseline="central" font-family="${SERIF}" font-weight="900" font-size="86" fill="${i}" letter-spacing="-2">P</text>
		`)
	},
	{
		id: 'p-stencil', family: 'monogram', number: '01b', name: 'Stencil P',
		blurb: 'Didone P with a horizontal cut and a periwinkle bridge.',
		svg: (s, i, a) => wrap(s, `
			<defs><mask id="cut-${s}"><rect width="100" height="100" fill="white"/><rect x="10" y="44" width="80" height="6" fill="black"/></mask></defs>
			<g mask="url(#cut-${s})"><text x="50" y="50" text-anchor="middle" dominant-baseline="central" font-family="${SERIF}" font-weight="900" font-size="86" fill="${i}" letter-spacing="-2">P</text></g>
			<rect x="56" y="44" width="14" height="6" fill="${a}"/>
		`)
	},
	{
		id: 'p-inset', family: 'monogram', number: '01c', name: 'Inset P',
		blurb: 'P inside a rounded tile, with a notched accent corner.',
		svg: (s, i, a) => wrap(s, `
			<rect x="6" y="6" width="88" height="88" rx="14" fill="${i}"/>
			<text x="50" y="52" text-anchor="middle" dominant-baseline="central" font-family="${SERIF}" font-weight="900" font-size="60" fill="${a}" letter-spacing="-1">P</text>
			<path d="M 76 6 L 94 6 L 94 24 Z" fill="${a}"/>
		`)
	},
	{
		id: 'p-sans', family: 'monogram', number: '01d', name: 'Geometric sans P',
		blurb: 'Modern grotesque P. No serif, all weight. The opposite pole of the wordmark.',
		svg: (s, i) => wrap(s, `
			<text x="50" y="50" text-anchor="middle" dominant-baseline="central" font-family="${SANS}" font-weight="700" font-size="92" fill="${i}" letter-spacing="-4">P</text>
		`)
	},
	{
		id: 'p-outline', family: 'monogram', number: '01e', name: 'Outline P',
		blurb: 'Hairline-outlined serif P. Editorial, formal, almost a watermark.',
		svg: (s, i) => wrap(s, `
			<text x="50" y="50" text-anchor="middle" dominant-baseline="central" font-family="${SERIF}" font-weight="700" font-size="86" fill="none" stroke="${i}" stroke-width="1.6" letter-spacing="-2" paint-order="stroke fill">P</text>
		`)
	},
	{
		id: 'p-italic', family: 'monogram', number: '01f', name: 'Italic descender P',
		blurb: 'Italic serif P. The slant adds motion the upright P lacks.',
		svg: (s, i) => wrap(s, `
			<text x="50" y="50" text-anchor="middle" dominant-baseline="central" font-family="${SERIF}" font-style="italic" font-weight="800" font-size="92" fill="${i}" letter-spacing="-3">P</text>
		`)
	},
	{
		id: 'p-diamond', family: 'monogram', number: '01g', name: 'Diamond P',
		blurb: 'Didone P set in a 45° rotated frame. Medallion / signet treatment.',
		svg: (s, i, a) => wrap(s, `
			<g transform="rotate(45 50 50)"><rect x="14" y="14" width="72" height="72" fill="none" stroke="${a}" stroke-width="2.5"/></g>
			<text x="50" y="50" text-anchor="middle" dominant-baseline="central" font-family="${SERIF}" font-weight="900" font-size="48" fill="${i}" letter-spacing="-1">P</text>
		`)
	},

	// ── 02 · tP lockups ───────────────────────────────────────────────────
	{
		id: 'tp-stacked', family: 'wordmark', number: '02a', name: 'tP stacked',
		blurb: 'Italic "The" sits over the P, mirroring the wordmark lockup.',
		svg: (s, i, a) => wrap(s, `
			<text x="50" y="24" text-anchor="middle" dominant-baseline="central" font-family="${SERIF}" font-style="italic" font-weight="500" font-size="28" fill="${a}">The</text>
			<text x="50" y="64" text-anchor="middle" dominant-baseline="central" font-family="${SERIF}" font-weight="900" font-size="64" fill="${i}" letter-spacing="-2">P</text>
		`)
	},
	{
		id: 'tp-locked', family: 'wordmark', number: '02b', name: 'tP interlocked',
		blurb: 'Italic t and serif P share the optical center.',
		svg: (s, i, a) => wrap(s, `
			<text x="22" y="50" text-anchor="middle" dominant-baseline="central" font-family="${SERIF}" font-style="italic" font-weight="600" font-size="78" fill="${a}">t</text>
			<text x="62" y="50" text-anchor="middle" dominant-baseline="central" font-family="${SERIF}" font-weight="900" font-size="78" fill="${i}">P</text>
		`)
	},

	// ── 03 · PH ligatures ─────────────────────────────────────────────────
	{
		id: 'ph-shared', family: 'wordmark', number: '03a', name: 'PH shared stem',
		blurb: 'P and H sit close, reading as one connected glyph.',
		svg: (s, i) => wrap(s, `
			<g font-family="${SERIF}" font-weight="900" fill="${i}">
				<text x="30" y="50" text-anchor="middle" dominant-baseline="central" font-size="76" letter-spacing="-3">P</text>
				<text x="70" y="50" text-anchor="middle" dominant-baseline="central" font-size="76" letter-spacing="-3">H</text>
			</g>
		`)
	},
	{
		id: 'ph-doorway', family: 'wordmark', number: '03b', name: 'PH doorway',
		blurb: 'PH on a filled tile. The H frames an open doorway.',
		svg: (s, i, a) => wrap(s, `
			<rect x="6" y="6" width="88" height="88" rx="14" fill="${i}"/>
			<g font-family="${SERIF}" font-weight="900" fill="${a}">
				<text x="32" y="54" text-anchor="middle" dominant-baseline="central" font-size="56" letter-spacing="-2">P</text>
				<text x="68" y="54" text-anchor="middle" dominant-baseline="central" font-size="56" letter-spacing="-2">H</text>
			</g>
		`)
	},
	{
		id: 'ph-bridged', family: 'wordmark', number: '03c', name: 'PH bridged base',
		blurb: 'Two glyphs joined by a serif baseline rule.',
		svg: (s, i) => wrap(s, `
			<g font-family="${SERIF}" font-weight="900" fill="${i}">
				<text x="28" y="48" text-anchor="middle" dominant-baseline="central" font-size="68" letter-spacing="-2">P</text>
				<text x="70" y="48" text-anchor="middle" dominant-baseline="central" font-size="68" letter-spacing="-2">H</text>
			</g>
			<rect x="12" y="80" width="76" height="3" fill="${i}"/>
		`)
	},
	{
		id: 'ph-crossbar', family: 'wordmark', number: '03d', name: 'PH crossbar shared',
		blurb: 'The H crossbar extends across, doubling as the underline of the P.',
		svg: (s, i, a) => wrap(s, `
			<g font-family="${SERIF}" font-weight="900" fill="${i}">
				<text x="28" y="52" text-anchor="middle" dominant-baseline="central" font-size="80" letter-spacing="-3">P</text>
				<text x="72" y="52" text-anchor="middle" dominant-baseline="central" font-size="80" letter-spacing="-3">H</text>
			</g>
			<rect x="18" y="52" width="64" height="4" fill="${a}"/>
		`)
	},
	{
		id: 'th-italic', family: 'wordmark', number: '03e', name: 'th lowercase italic',
		blurb: 'Lowercase italic "th" monogram. Quiet, typographer\'s mark.',
		svg: (s, i) => wrap(s, `
			<text x="50" y="50" text-anchor="middle" dominant-baseline="central" font-family="${SERIF}" font-style="italic" font-weight="500" font-size="64" fill="${i}" letter-spacing="-3">th</text>
		`)
	},
	{
		id: 't-solo', family: 'wordmark', number: '03f', name: 'Solo Didone T',
		blurb: 'Just T. Ultra-bold serif. The most stripped-down wordmark tie.',
		svg: (s, i) => wrap(s, `
			<text x="50" y="50" text-anchor="middle" dominant-baseline="central" font-family="${SERIF}" font-weight="900" font-size="100" fill="${i}" letter-spacing="-4">T</text>
		`)
	},

	// ── 04 · Roofline & building ──────────────────────────────────────────
	{
		id: 'roof-notch', family: 'architectural', number: '04a', name: 'Skyline notch',
		blurb: 'Flat roofline with one rectangular penthouse on top.',
		svg: (s, i) => wrap(s, `
			<g fill="${i}">
				<rect x="14" y="56" width="72" height="3"/>
				<rect x="36" y="42" width="28" height="3"/>
				<rect x="36" y="42" width="3" height="14"/>
				<rect x="61" y="42" width="3" height="14"/>
			</g>
		`)
	},
	{
		id: 'roof-apex', family: 'architectural', number: '04b', name: 'Apex stroke',
		blurb: 'Single-line peak. Reads as roof and as "A".',
		svg: (s, i) => wrap(s, `
			<path d="M 18 64 L 50 36 L 82 64" fill="none" stroke="${i}" stroke-width="4" stroke-linecap="square" stroke-linejoin="miter"/>
			<line x1="18" y1="64" x2="82" y2="64" stroke="${i}" stroke-width="4" stroke-linecap="square"/>
		`)
	},
	{
		id: 'three-floor', family: 'architectural', number: '04c', name: 'Three-floor stack',
		blurb: 'A building in three blocks. The top is the penthouse — offset, accent-lit.',
		svg: (s, i, a) => wrap(s, `
			<g fill="${i}">
				<rect x="18" y="68" width="64" height="18"/>
				<rect x="22" y="48" width="56" height="16"/>
			</g>
			<rect x="32" y="28" width="36" height="16" fill="${a}"/>
		`)
	},
	{
		id: 'window-grid', family: 'architectural', number: '04d', name: 'Window grid',
		blurb: 'Apartment façade. One window lit at the top corner — the penthouse.',
		svg: (s, i, a) => wrap(s, `
			<g fill="${i}">
				<rect x="20" y="20" width="14" height="14"/>
				<rect x="42" y="20" width="14" height="14"/>
				<rect x="20" y="42" width="14" height="14"/>
				<rect x="42" y="42" width="14" height="14"/>
				<rect x="64" y="42" width="14" height="14"/>
				<rect x="20" y="64" width="14" height="14"/>
				<rect x="42" y="64" width="14" height="14"/>
				<rect x="64" y="64" width="14" height="14"/>
			</g>
			<rect x="64" y="20" width="14" height="14" fill="${a}"/>
		`)
	},
	{
		id: 'door-silhouette', family: 'architectural', number: '04e', name: 'Door silhouette',
		blurb: 'A single doorway. Rounded top, accent dot as the handle.',
		svg: (s, i, a) => wrap(s, `
			<path d="M 32 84 L 32 44 A 18 18 0 0 1 68 44 L 68 84 Z" fill="none" stroke="${i}" stroke-width="4" stroke-linejoin="miter"/>
			<circle cx="60" cy="64" r="2.5" fill="${a}"/>
		`)
	},

	// ── 05 · Aperture & threshold ─────────────────────────────────────────
	{
		id: 'ap-keyhole', family: 'architectural', number: '05a', name: 'Keyhole',
		blurb: 'Iconic of a private entry. Reads at any size.',
		svg: (s, i) => wrap(s, `
			<circle cx="50" cy="40" r="14" fill="${i}"/>
			<path d="M 42 50 L 58 50 L 54 76 L 46 76 Z" fill="${i}"/>
		`)
	},
	{
		id: 'ap-arch', family: 'architectural', number: '05b', name: 'Arched doorway',
		blurb: 'Renaissance arch silhouette. Entrance to a private floor.',
		svg: (s, i) => wrap(s, `
			<path d="M 30 78 L 30 50 A 20 20 0 0 1 70 50 L 70 78 Z" fill="none" stroke="${i}" stroke-width="5" stroke-linejoin="miter"/>
		`)
	},
	{
		id: 'roof-antenna', family: 'architectural', number: '05c', name: 'Roof + antenna',
		blurb: 'Peaked roof with a single antenna. Older buildings, top floor.',
		svg: (s, i, a) => wrap(s, `
			<path d="M 22 70 L 50 38 L 78 70" fill="none" stroke="${i}" stroke-width="4" stroke-linejoin="miter"/>
			<line x1="50" y1="38" x2="50" y2="18" stroke="${a}" stroke-width="2.5"/>
			<circle cx="50" cy="16" r="2.5" fill="${a}"/>
		`)
	},

	// ── 06 · Aperture shapes ──────────────────────────────────────────────
	{
		id: 'ap-notch', family: 'architectural', number: '06a', name: 'Notched aperture',
		blurb: 'Filled tile with a corner cut. Abstract penthouse silhouette.',
		svg: (s, _i, a) => wrap(s, `
			<path d="M 14 14 L 70 14 L 70 30 L 86 30 L 86 86 L 14 86 Z" fill="${a}"/>
		`)
	},
	{
		id: 'ap-circle', family: 'architectural', number: '06b', name: 'Inset aperture',
		blurb: 'Filled tile with an inset eye / window. Maximally simple.',
		svg: (s, i, a) => wrap(s, `
			<rect x="10" y="10" width="80" height="80" rx="18" fill="${a}"/>
			<circle cx="50" cy="50" r="18" fill="${i}"/>
		`)
	},
	{
		id: 'vertical-trio', family: 'architectural', number: '06c', name: 'Vertical trio',
		blurb: 'Three columns descending in height. Building from the front, penthouse on top.',
		svg: (s, i, a) => wrap(s, `
			<g fill="${i}">
				<rect x="22" y="48" width="14" height="38"/>
				<rect x="68" y="40" width="14" height="46"/>
			</g>
			<rect x="42" y="22" width="16" height="64" fill="${a}"/>
		`)
	},
	{
		id: 'cornerstone', family: 'architectural', number: '06d', name: 'Cornerstone',
		blurb: 'Pentagon. Square with one corner cut by a 45° line. Architectural blueprint.',
		svg: (s, _i, a) => wrap(s, `
			<path d="M 14 14 L 86 14 L 86 64 L 64 86 L 14 86 Z" fill="${a}"/>
		`)
	},

	// ── 07 · Experimental ─────────────────────────────────────────────────
	{
		id: 'exp-t-roof', family: 'experimental', number: '07', name: 'T-as-roof',
		blurb: 'The "The" T becomes a literal roof over a small block.',
		svg: (s, i, a) => wrap(s, `
			<g fill="${i}">
				<rect x="14" y="32" width="72" height="5"/>
				<rect x="48" y="32" width="5" height="22"/>
			</g>
			<rect x="32" y="56" width="36" height="28" fill="none" stroke="${i}" stroke-width="3"/>
			<rect x="46" y="68" width="8" height="16" fill="${a}"/>
		`)
	},
	{
		id: 'exp-p-dot', family: 'experimental', number: '08', name: 'P + dot',
		blurb: 'Pure typographic. The accent dot reads as "private" / aperture.',
		svg: (s, i, a) => wrap(s, `
			<text x="42" y="52" text-anchor="middle" dominant-baseline="central" font-family="${SERIF}" font-weight="900" font-size="86" fill="${i}" letter-spacing="-2">P</text>
			<circle cx="74" cy="74" r="6" fill="${a}"/>
		`)
	},
	{
		id: 'exp-plaque', family: 'experimental', number: '09', name: 'House-number plaque',
		blurb: 'Borrowing the N°01 settings language as a building plaque.',
		svg: (s, i, a) => wrap(s, `
			<path d="M 28 86 L 28 36 A 22 22 0 0 1 72 36 L 72 86 Z" fill="${i}"/>
			<text x="50" y="56" text-anchor="middle" dominant-baseline="central" font-family="${SERIF}" font-weight="500" font-style="italic" font-size="14" fill="${a}">N°</text>
			<text x="50" y="74" text-anchor="middle" dominant-baseline="central" font-family="${SERIF}" font-weight="900" font-size="22" fill="${a}">01</text>
		`)
	},
	{
		id: 'exp-neg-p', family: 'experimental', number: '10', name: 'Negative-space P',
		blurb: 'P carved out of the accent tile. Bold at every size.',
		svg: (s, _i, a) => wrap(s, `
			<defs><mask id="neg-p-${s}"><rect width="100" height="100" fill="white"/><text x="50" y="52" text-anchor="middle" dominant-baseline="central" font-family="${SERIF}" font-weight="900" font-size="76" fill="black" letter-spacing="-2">P</text></mask></defs>
			<rect x="6" y="6" width="88" height="88" rx="14" fill="${a}" mask="url(#neg-p-${s})"/>
		`)
	},
	{
		id: 'exp-neg-h', family: 'experimental', number: '11', name: 'Negative-space H',
		blurb: 'Alternate. H carved out of the tile — reads as a doorway with two pillars.',
		svg: (s, _i, a) => wrap(s, `
			<defs><mask id="neg-h-${s}"><rect width="100" height="100" fill="white"/><text x="50" y="52" text-anchor="middle" dominant-baseline="central" font-family="${SERIF}" font-weight="900" font-size="76" fill="black" letter-spacing="-2">H</text></mask></defs>
			<rect x="6" y="6" width="88" height="88" rx="14" fill="${a}" mask="url(#neg-h-${s})"/>
		`)
	},
	{
		id: 'exp-halved', family: 'experimental', number: '12', name: 'Two-tone halved P',
		blurb: 'P split vertically. Half ink, half accent. Reads as page-spread or door pair.',
		svg: (s, i, a) => wrap(s, `
			<defs>
				<clipPath id="half-l-${s}"><rect x="0" y="0" width="50" height="100"/></clipPath>
				<clipPath id="half-r-${s}"><rect x="50" y="0" width="50" height="100"/></clipPath>
			</defs>
			<g clip-path="url(#half-l-${s})"><text x="50" y="50" text-anchor="middle" dominant-baseline="central" font-family="${SERIF}" font-weight="900" font-size="86" fill="${i}" letter-spacing="-2">P</text></g>
			<g clip-path="url(#half-r-${s})"><text x="50" y="50" text-anchor="middle" dominant-baseline="central" font-family="${SERIF}" font-weight="900" font-size="86" fill="${a}" letter-spacing="-2">P</text></g>
		`)
	},
	{
		id: 'exp-iso-box', family: 'experimental', number: '13', name: 'Isometric box',
		blurb: 'Wireframe cube — the penthouse as a single room. Three visible faces.',
		svg: (s, i, a) => wrap(s, `
			<g fill="none" stroke="${i}" stroke-width="2.5" stroke-linejoin="miter">
				<path d="M 30 38 L 50 28 L 70 38 L 50 48 Z"/>
				<path d="M 30 38 L 30 70 L 50 80 L 50 48 Z"/>
				<path d="M 70 38 L 70 70 L 50 80 L 50 48 Z"/>
			</g>
			<rect x="44" y="56" width="12" height="14" fill="${a}"/>
		`)
	},
	{
		id: 'exp-medallion', family: 'experimental', number: '14', name: 'Circled P medallion',
		blurb: 'P inside a hollow circle. Accent tick at top reads as a signet stamp.',
		svg: (s, i, a) => wrap(s, `
			<circle cx="50" cy="52" r="36" fill="none" stroke="${i}" stroke-width="2.5"/>
			<text x="50" y="54" text-anchor="middle" dominant-baseline="central" font-family="${SERIF}" font-weight="900" font-size="48" fill="${i}" letter-spacing="-1">P</text>
			<rect x="48" y="12" width="4" height="6" fill="${a}"/>
		`)
	},
	{
		id: 'exp-curtain', family: 'experimental', number: '15', name: 'Curtain pull',
		blurb: 'Two angled lines forming a tent over a small block. Theatrical entry to the floor.',
		svg: (s, i, a) => wrap(s, `
			<path d="M 18 32 L 50 18 L 82 32" fill="none" stroke="${i}" stroke-width="3" stroke-linejoin="miter"/>
			<line x1="50" y1="18" x2="50" y2="32" stroke="${i}" stroke-width="3"/>
			<rect x="34" y="48" width="32" height="36" fill="none" stroke="${i}" stroke-width="3"/>
			<rect x="46" y="64" width="8" height="20" fill="${a}"/>
		`)
	}
];

/** @type {Record<Family, string>} */
export const familyLabels = {
	monogram: 'Monogram',
	wordmark: 'Wordmark-derived',
	architectural: 'Architectural',
	experimental: 'Experimental'
};
