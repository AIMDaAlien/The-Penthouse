#!/usr/bin/env node
/**
 * Build a standalone, self-contained logo-gallery.html
 *
 * Pulls variants from src/lib/prototypes/logo/variants.js — the same source
 * the live /prototypes/logo route uses, so the static export can never drift.
 *
 * Outputs:
 *   apps/web/static/logo-gallery.html   — served at /logo-gallery.html
 *   docs/logo-gallery.html              — easy attach-and-send copy
 *
 * Usage:  node apps/web/scripts/build-logo-gallery.mjs
 */

import { writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { variants, familyLabels } from '../src/lib/prototypes/logo/variants.js';

const here = dirname(fileURLToPath(import.meta.url));
const webRoot = resolve(here, '..');
const repoRoot = resolve(webRoot, '../..');
const outStatic = resolve(webRoot, 'static/logo-gallery.html');
const outDocs = resolve(repoRoot, 'docs/logo-gallery.html');

const ACCENT_DARK = 'oklch(0.72 0.150 285)';
const ACCENT_LIGHT = 'oklch(0.52 0.135 285)';

const BG = {
	dark: {
		fill: 'oklch(0.16 0.020 280)',
		ink: 'oklch(0.95 0.012 280)',
		accent: ACCENT_DARK,
		label: 'Periwinkle · dark',
		note: 'default app theme'
	},
	light: {
		fill: 'oklch(0.96 0.020 285)',
		ink: 'oklch(0.20 0.020 285)',
		accent: ACCENT_LIGHT,
		label: 'Periwinkle · light',
		note: 'inverted theme'
	},
	neutral: {
		fill: 'oklch(0.99 0.002 285)',
		ink: 'oklch(0.18 0.012 285)',
		accent: ACCENT_LIGHT,
		label: 'Neutral white',
		note: 'iOS lock screen worst case'
	}
};

const bgKeys = ['dark', 'light', 'neutral'];
const filterKeys = ['all', 'grid', 'wordmark', 'interlock', 'experimental'];

// Pre-render every variant at every size for every background.
// This trades file size for a fully offline-capable HTML — no JS rendering
// needed beyond toggling visibility.

function renderCard(v) {
	const sizes = { hero: 168, h192: 64, h60: 40, h16: 16 };
	const cells = {};
	for (const key of bgKeys) {
		const { ink, accent } = BG[key];
		cells[key] = {
			hero: v.svg(sizes.hero, ink, accent),
			heroZoom: v.svg(256, ink, accent),
			h192: v.svg(sizes.h192, ink, accent),
			h60: v.svg(sizes.h60, ink, accent),
			h16: v.svg(sizes.h16, ink, accent)
		};
	}

	const variantInks = Object.entries(cells)
		.map(
			([bg, group]) => `
				<div class="canvas" data-bg="${bg}" style="background:${BG[bg].fill}">
					<div class="hero-default">${group.hero}</div>
					<div class="hero-zoom">${group.heroZoom}</div>
				</div>`
		)
		.join('');

	const scaleRow = (bg) => `
		<div class="scale-row" data-bg="${bg}">
			<div class="scale-cell"><div class="scale-bg" style="background:${BG[bg].fill}">${cells[bg].h192}</div><span>192</span></div>
			<div class="scale-cell"><div class="scale-bg" style="background:${BG[bg].fill}">${cells[bg].h60}</div><span>60</span></div>
			<div class="scale-cell"><div class="scale-bg" style="background:${BG[bg].fill}">${cells[bg].h16}</div><span>16</span></div>
		</div>
	`;

	return `
		<article class="card" data-family="${v.family}" data-id="${v.id}">
			<button class="hit" type="button" aria-label="Toggle ${escapeAttr(v.name)} details">
				${variantInks}
			</button>
			<div class="meta">
				<div class="line1">
					<span class="vnum">${v.number}</span>
					<span class="vname">${escapeHtml(v.name)}</span>
					<span class="vfam">${familyLabels[v.family]}</span>
				</div>
				<p class="blurb">${escapeHtml(v.blurb)}</p>
				${bgKeys.map(scaleRow).join('')}
			</div>
		</article>
	`;
}

function escapeHtml(s) {
	return String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]);
}
function escapeAttr(s) {
	return escapeHtml(s).replace(/"/g, '&quot;');
}

const cards = variants.map(renderCard).join('\n');

const bgSeg = bgKeys
	.map((k, i) => `<button data-bg="${k}"${i === 0 ? ' class="on"' : ''}>${BG[k].label}</button>`)
	.join('');

const familySeg = filterKeys
	.map(
		(k, i) =>
			`<button data-filter="${k}"${i === 0 ? ' class="on"' : ''}>${k === 'all' ? 'All' : familyLabels[k]}</button>`
	)
	.join('');

const noteMap = JSON.stringify(Object.fromEntries(bgKeys.map((k) => [k, BG[k].note])));

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Logo mockups · The Penthouse</title>
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;0,800;0,900;1,400;1,500;1,600&family=Ubuntu:ital,wght@0,300;0,400;0,500;0,700;1,400&family=JetBrains+Mono:wght@400;500&display=swap" />
<style>
	:root {
		--p-bg: ${BG.dark.fill};
		--p-ink: ${BG.dark.ink};
		--p-accent: ${BG.dark.accent};
	}
	* { box-sizing: border-box; }
	html, body { margin: 0; padding: 0; }
	body {
		min-height: 100vh;
		background: var(--p-bg);
		color: var(--p-ink);
		font-family: 'Ubuntu', system-ui, sans-serif;
		transition: background 320ms cubic-bezier(0.16, 1, 0.3, 1), color 320ms cubic-bezier(0.16, 1, 0.3, 1);
		padding: 40px 64px 96px;
	}
	@media (max-width: 720px) { body { padding: 24px 16px 64px; } }

	.topbar { display: flex; align-items: baseline; justify-content: space-between; padding-bottom: 22px; border-bottom: 1px solid color-mix(in oklch, var(--p-ink) 14%, transparent); margin-bottom: 40px; flex-wrap: wrap; gap: 14px; }
	.brand { display: flex; align-items: baseline; gap: 10px; flex-wrap: wrap; }
	.num { font-family: 'JetBrains Mono', monospace; font-size: 11px; letter-spacing: 0.14em; text-transform: uppercase; color: color-mix(in oklch, var(--p-ink) 60%, transparent); }
	.dot { color: color-mix(in oklch, var(--p-ink) 35%, transparent); }
	.title { font-family: 'Playfair Display', serif; font-style: italic; font-weight: 500; font-size: 22px; }
	.count { margin-left: 8px; padding: 2px 10px; border-radius: 999px; font-family: 'JetBrains Mono', monospace; font-size: 11px; letter-spacing: 0.06em; background: color-mix(in oklch, var(--p-accent) 14%, transparent); color: var(--p-accent); }
	.tag { font-family: 'JetBrains Mono', monospace; font-size: 11px; color: color-mix(in oklch, var(--p-ink) 55%, transparent); }

	.controls { display: flex; flex-wrap: wrap; gap: 22px 40px; margin-bottom: 40px; }
	.control-group { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; }
	.label { font-family: 'JetBrains Mono', monospace; font-size: 11px; text-transform: uppercase; letter-spacing: 0.14em; color: color-mix(in oklch, var(--p-ink) 55%, transparent); }
	.note { font-size: 12px; font-style: italic; color: color-mix(in oklch, var(--p-ink) 55%, transparent); }
	.seg { display: flex; gap: 4px; padding: 4px; border-radius: 999px; background: color-mix(in oklch, var(--p-ink) 6%, transparent); border: 1px solid color-mix(in oklch, var(--p-ink) 10%, transparent); }
	.seg button { appearance: none; border: 0; background: transparent; color: color-mix(in oklch, var(--p-ink) 70%, transparent); font: inherit; font-size: 12px; padding: 6px 14px; border-radius: 999px; cursor: pointer; transition: background 180ms cubic-bezier(0.16, 1, 0.3, 1), color 180ms cubic-bezier(0.16, 1, 0.3, 1); }
	.seg button:hover { color: var(--p-ink); }
	.seg button.on { background: var(--p-ink); color: var(--p-bg); }

	.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 22px; }

	.card { display: flex; flex-direction: column; border: 1px solid color-mix(in oklch, var(--p-ink) 12%, transparent); border-radius: 14px; overflow: hidden; background: color-mix(in oklch, var(--p-ink) 3%, transparent); transition: transform 320ms cubic-bezier(0.16, 1, 0.3, 1), border-color 180ms; }
	.card.zoomed { grid-column: span 2; border-color: var(--p-accent); }
	@media (max-width: 720px) { .card.zoomed { grid-column: span 1; } }
	.card.hidden { display: none; }

	.hit { appearance: none; border: 0; background: transparent; padding: 0; cursor: pointer; display: block; width: 100%; position: relative; }
	.canvas { aspect-ratio: 1.6 / 1; display: none; align-items: center; justify-content: center; transition: aspect-ratio 320ms cubic-bezier(0.16, 1, 0.3, 1); }
	.canvas.on { display: flex; }
	.card.zoomed .canvas.on { aspect-ratio: 1 / 1; }
	.hero-zoom { display: none; }
	.hero-default { display: block; }
	.card.zoomed .hero-default { display: none; }
	.card.zoomed .hero-zoom { display: block; }

	.meta { padding: 18px 18px 22px; display: flex; flex-direction: column; gap: 10px; border-top: 1px solid color-mix(in oklch, var(--p-ink) 10%, transparent); }
	.line1 { display: flex; align-items: baseline; gap: 10px; flex-wrap: wrap; }
	.vnum { font-family: 'JetBrains Mono', monospace; font-size: 11px; color: var(--p-accent); letter-spacing: 0.06em; }
	.vname { font-family: 'Playfair Display', serif; font-weight: 600; font-size: 17px; }
	.vfam { margin-left: auto; font-size: 10px; text-transform: uppercase; letter-spacing: 0.14em; color: color-mix(in oklch, var(--p-ink) 50%, transparent); font-family: 'JetBrains Mono', monospace; }
	.blurb { font-size: 13px; line-height: 1.55; margin: 0; color: color-mix(in oklch, var(--p-ink) 80%, transparent); max-width: 60ch; }

	.scale-row { display: none; align-items: flex-end; gap: 10px; margin-top: 8px; }
	.scale-row.on { display: flex; }
	.scale-cell { display: flex; flex-direction: column; align-items: center; gap: 4px; }
	.scale-bg { display: flex; align-items: center; justify-content: center; padding: 6px; border-radius: 8px; border: 1px solid color-mix(in oklch, var(--p-ink) 10%, transparent); }
	.scale-cell span { font-family: 'JetBrains Mono', monospace; font-size: 10px; color: color-mix(in oklch, var(--p-ink) 50%, transparent); letter-spacing: 0.08em; }

	.foot { margin-top: 64px; padding-top: 22px; border-top: 1px solid color-mix(in oklch, var(--p-ink) 10%, transparent); max-width: 70ch; color: color-mix(in oklch, var(--p-ink) 70%, transparent); font-size: 13px; line-height: 1.55; }
	.foot p { margin: 0 0 8px; }
	.foot .fine { font-size: 12px; font-style: italic; color: color-mix(in oklch, var(--p-ink) 55%, transparent); }
</style>
</head>
<body data-bg="dark">
	<header class="topbar">
		<div class="brand">
			<span class="num">N° 05</span>
			<span class="dot">·</span>
			<span class="title">Logo mockups</span>
			<span class="count">${variants.length} variants</span>
			<span class="tag">The Penthouse</span>
		</div>
	</header>

	<section class="controls">
		<div class="control-group">
			<span class="label">Background</span>
			<div class="seg" id="bg-seg">${bgSeg}</div>
			<span class="note" id="bg-note">${BG.dark.note}</span>
		</div>
		<div class="control-group">
			<span class="label">Family</span>
			<div class="seg" id="family-seg">${familySeg}</div>
		</div>
	</section>

	<section class="grid" id="grid">
${cards}
	</section>

	<footer class="foot">
		<p>
			${variants.length} icon directions. The PENT 2x2 grid family leads,
			non-grid PENT follows, PH interlock and experimental round out.
			Each tile shows the hero at 168 px, plus a scale row at PWA-install (192), Apple touch (60), and favicon (16).
			Tap a tile to enlarge.
		</p>
		<p class="fine">
			Wordmark stays separate. None of these replace it. They are compressed marks meant to survive at
			16 px where the wordmark's hairline serifs would not. Generated from the same SVG source as the
			live prototype at /prototypes/logo.
		</p>
	</footer>

<script>
	(function () {
		const BG_TOKENS = ${JSON.stringify(
			Object.fromEntries(
				bgKeys.map((k) => [k, { fill: BG[k].fill, ink: BG[k].ink, accent: BG[k].accent }])
			)
		)};
		const NOTES = ${noteMap};
		const root = document.documentElement;

		function setBg(key) {
			const t = BG_TOKENS[key];
			root.style.setProperty('--p-bg', t.fill);
			root.style.setProperty('--p-ink', t.ink);
			root.style.setProperty('--p-accent', t.accent);
			document.body.dataset.bg = key;
			document.getElementById('bg-note').textContent = NOTES[key];
			document.querySelectorAll('#bg-seg button').forEach(function (b) {
				b.classList.toggle('on', b.dataset.bg === key);
			});
			// toggle canvas + scale-row visibility per card
			document.querySelectorAll('.canvas').forEach(function (c) {
				c.classList.toggle('on', c.dataset.bg === key);
			});
			document.querySelectorAll('.scale-row').forEach(function (r) {
				r.classList.toggle('on', r.dataset.bg === key);
			});
		}

		function setFilter(key) {
			document.querySelectorAll('#family-seg button').forEach(function (b) {
				b.classList.toggle('on', b.dataset.filter === key);
			});
			document.querySelectorAll('.card').forEach(function (card) {
				const fam = card.dataset.family;
				card.classList.toggle('hidden', key !== 'all' && fam !== key);
			});
		}

		document.getElementById('bg-seg').addEventListener('click', function (e) {
			const btn = e.target.closest('button');
			if (btn && btn.dataset.bg) setBg(btn.dataset.bg);
		});
		document.getElementById('family-seg').addEventListener('click', function (e) {
			const btn = e.target.closest('button');
			if (btn && btn.dataset.filter) setFilter(btn.dataset.filter);
		});
		document.getElementById('grid').addEventListener('click', function (e) {
			const card = e.target.closest('.card');
			if (!card) return;
			const wasZoomed = card.classList.contains('zoomed');
			document.querySelectorAll('.card.zoomed').forEach(function (c) {
				c.classList.remove('zoomed');
			});
			if (!wasZoomed) card.classList.add('zoomed');
		});

		setBg('dark');
		setFilter('all');
	})();
</script>
</body>
</html>
`;

await mkdir(dirname(outStatic), { recursive: true });
await writeFile(outStatic, html, 'utf8');
await mkdir(dirname(outDocs), { recursive: true });
await writeFile(outDocs, html, 'utf8');

const sizeKb = (html.length / 1024).toFixed(1);
console.log(`Wrote ${outStatic} (${sizeKb} KB)`);
console.log(`Wrote ${outDocs} (${sizeKb} KB)`);
console.log(`${variants.length} variants rendered × 3 backgrounds × 4 sizes = ${variants.length * 3 * 4} SVGs inlined.`);
