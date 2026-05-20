<!--
  Showcase for the 10 V7 auth-screen prototypes.
  All variants share the same five baseline effects:
    drop cap pulse · caret bloom · floating labels · sweep underline · key turn.
  Each adds one or two further animations on top.
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import V01 from '$lib/prototypes/auth-screen/AuthScreen-V7-01-Aurora.svelte';
	import V02 from '$lib/prototypes/auth-screen/AuthScreen-V7-02-Cascade.svelte';
	import V03 from '$lib/prototypes/auth-screen/AuthScreen-V7-03-Breath.svelte';
	import V04 from '$lib/prototypes/auth-screen/AuthScreen-V7-04-Speckle.svelte';
	import V05 from '$lib/prototypes/auth-screen/AuthScreen-V7-05-Cipher.svelte';
	import V06 from '$lib/prototypes/auth-screen/AuthScreen-V7-06-Tug.svelte';
	import V07 from '$lib/prototypes/auth-screen/AuthScreen-V7-07-Ripple.svelte';
	import V08 from '$lib/prototypes/auth-screen/AuthScreen-V7-08-Strength.svelte';
	import V09 from '$lib/prototypes/auth-screen/AuthScreen-V7-09-Threshold.svelte';
	import V10 from '$lib/prototypes/auth-screen/AuthScreen-V7-10-Vellum.svelte';

	const variants: { id: string; num: string; name: string; addition: string; component: any }[] = [
		{ id: '01', num: '01', name: 'Aurora',    addition: 'orbital aurora',           component: V01 },
		{ id: '02', num: '02', name: 'Cascade',   addition: 'letter cascade headline',   component: V02 },
		{ id: '03', num: '03', name: 'Breath',    addition: 'italics + aurora breathe',  component: V03 },
		{ id: '04', num: '04', name: 'Speckle',   addition: 'drifting dust',             component: V04 },
		{ id: '05', num: '05', name: 'Cipher',    addition: 'headline scramble',         component: V05 },
		{ id: '06', num: '06', name: 'Tug',       addition: 'magnetic key',              component: V06 },
		{ id: '07', num: '07', name: 'Ripple',    addition: 'keystroke ripples',         component: V07 },
		{ id: '08', num: '08', name: 'Strength',  addition: 'password glow ring',        component: V08 },
		{ id: '09', num: '09', name: 'Threshold', addition: 'form fold on submit',       component: V09 },
		{ id: '10', num: '10', name: 'Vellum',    addition: 'grain + load sequence',     component: V10 }
	];

	let activeId = $state(variants[0].id);
	let scroller: HTMLElement;

	onMount(() => {
		const sections = scroller.querySelectorAll<HTMLElement>('section[data-variant]');
		const io = new IntersectionObserver(
			(entries) => {
				let best: { id: string; ratio: number } | null = null;
				for (const e of entries) {
					if (!e.isIntersecting) continue;
					const id = e.target.getAttribute('data-variant') ?? '';
					if (!best || e.intersectionRatio > best.ratio) best = { id, ratio: e.intersectionRatio };
				}
				if (best && best.id !== activeId) {
					activeId = best.id;
					if (history.replaceState) history.replaceState(null, '', `#${best.id}`);
				}
			},
			{ root: scroller, threshold: [0.5, 0.75, 0.95] }
		);
		sections.forEach((s) => io.observe(s));

		const initial = window.location.hash.replace('#', '');
		if (initial && variants.some((v) => v.id === initial)) {
			scroller.querySelector<HTMLElement>(`section[data-variant="${initial}"]`)?.scrollIntoView({ behavior: 'auto', block: 'start' });
		}

		const onHashChange = () => {
			const id = window.location.hash.replace('#', '');
			scroller.querySelector<HTMLElement>(`section[data-variant="${id}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
		};
		window.addEventListener('hashchange', onHashChange);
		return () => { io.disconnect(); window.removeEventListener('hashchange', onHashChange); };
	});

	function jumpTo(id: string) {
		scroller.querySelector<HTMLElement>(`section[data-variant="${id}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
	}

	const activeVariant = $derived(variants.find((v) => v.id === activeId) ?? variants[0]);
</script>

<svelte:head>
	<title>Auth Prototypes V7 &middot; The Penthouse</title>
</svelte:head>

<header class="masthead">
	<span class="m-left">The Penthouse</span>
	<span class="m-dot"></span>
	<span class="m-mid">Auth Prototypes &middot; V7 &middot; <em>five effects, plus</em></span>
	<span class="m-spacer"></span>
	<span class="m-active">
		<span class="ma-num">{activeVariant.num}</span>
		<span class="ma-name">{activeVariant.name}</span>
		<span class="ma-effect"><em>{activeVariant.addition}</em></span>
	</span>
</header>

<nav class="rail">
	<ol>
		{#each variants as v (v.id)}
			<li>
				<button class="rail-item" class:active={v.id === activeId} onclick={() => jumpTo(v.id)} type="button">
					<span class="ri-num">{v.num}</span>
					<span class="ri-name">{v.name}</span>
					<span class="ri-effect"><em>{v.addition}</em></span>
				</button>
			</li>
		{/each}
	</ol>
	<div class="rail-foot">
		<span><em>10 of 10</em></span>
	</div>
</nav>

<div class="scroller" bind:this={scroller}>
	{#each variants as v (v.id)}
		<section data-variant={v.id} id={v.id} aria-label="Variant {v.num} {v.name}">
			<v.component />
		</section>
	{/each}
</div>

<style>
	:global(html), :global(body) { overflow: hidden; }

	.masthead { position: fixed; top: 0; left: 0; right: 0; z-index: 20; display: flex; align-items: center; gap: 14px; padding: 10px 24px; background: oklch(from var(--p-bg) l c h / 0.82); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); border-bottom: 1px solid var(--p-accent-edge); font-family: var(--font-body); font-size: 0.82rem; font-weight: 500; color: var(--p-text-2); }
	.m-left { color: var(--p-text); }
	.m-mid { color: var(--p-muted); font-family: var(--font-display); font-size: 0.9rem; }
	.m-mid em { font-style: italic; color: var(--p-accent); }
	.m-spacer { flex: 1; }
	.m-dot { width: 3px; height: 3px; border-radius: 50%; background: var(--p-line-2); }
	.m-active { display: inline-flex; align-items: baseline; gap: 10px; }
	.ma-num { color: var(--p-accent); }
	.ma-name { color: var(--p-text); font-family: var(--font-display); font-style: italic; font-weight: 400; font-size: 0.98rem; }
	.ma-effect { color: var(--p-muted); font-family: var(--font-display); font-size: 0.85rem; }
	.ma-effect em { font-style: italic; }

	.rail { position: fixed; top: 0; bottom: 0; right: 0; z-index: 15; width: 252px; padding: 56px 14px 14px 12px; background: oklch(from var(--p-bg) l c h / 0.82); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); border-left: 1px solid var(--p-line); display: flex; flex-direction: column; font-family: var(--font-body); overflow-y: auto; }
	.rail ol { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 2px; }
	.rail-item { display: grid; grid-template-columns: 28px 1fr; grid-template-rows: auto auto; grid-template-areas: 'num name' '. eff'; column-gap: 10px; row-gap: 2px; width: 100%; padding: 10px 10px; background: none; border: none; border-radius: 0; text-align: left; cursor: pointer; border-bottom: 1px solid var(--p-line); color: var(--p-text-2); transition: color 180ms cubic-bezier(0.16, 1, 0.3, 1), background 180ms cubic-bezier(0.16, 1, 0.3, 1); }
	.ri-num { grid-area: num; font-family: var(--font-display); font-style: italic; font-size: 0.95rem; color: var(--p-muted); padding-top: 2px; }
	.ri-name { grid-area: name; font-family: var(--font-display); font-style: italic; font-weight: 400; font-size: 1rem; color: var(--p-text-2); line-height: 1.1; }
	.ri-effect { grid-area: eff; font-family: var(--font-display); font-size: 0.82rem; color: var(--p-muted); }
	.ri-effect em { font-style: italic; }
	.rail-item:hover { background: oklch(1 0 0 / 0.025); color: var(--p-text); }
	.rail-item.active { background: var(--p-accent-soft); }
	.rail-item.active .ri-num, .rail-item.active .ri-name, .rail-item.active .ri-effect { color: var(--p-accent); }

	.rail-foot { margin-top: auto; padding-top: 14px; display: flex; justify-content: center; font-family: var(--font-display); font-size: 0.85rem; color: var(--p-muted); border-top: 1px solid var(--p-line); }
	.rail-foot em { font-style: italic; }

	.scroller { position: fixed; inset: 0; padding-right: 252px; overflow-y: auto; overflow-x: hidden; scroll-snap-type: y mandatory; scroll-behavior: smooth; }
	.scroller section { min-height: 100dvh; scroll-snap-align: start; scroll-snap-stop: always; position: relative; display: block; border-bottom: 1px solid var(--p-line); }
	.scroller section:last-child { border-bottom: none; }

	@media (max-width: 900px) {
		.rail { display: none; }
		.scroller { padding-right: 0; }
		.masthead { padding: 8px 16px; gap: 8px; }
		.m-mid { display: none; }
		.ma-name { font-size: 0.85rem; }
		.ma-effect { display: none; }
	}
	@media (prefers-reduced-motion: reduce) { .rail-item { transition: none !important; } .scroller { scroll-behavior: auto; } }
</style>
