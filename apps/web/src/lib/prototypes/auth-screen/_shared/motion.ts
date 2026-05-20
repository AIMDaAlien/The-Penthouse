// Motion utilities for the V6 auth prototypes.
// Each variant uses one or two of these for its signature interaction.
// All respect prefers-reduced-motion.

const prefersReduced = () =>
	typeof window !== 'undefined' &&
	window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

// --- type-reveal: fade + lift on first paint -------------------------------
export function typeReveal(node: HTMLElement, opts: { delay?: number; distance?: number } = {}) {
	const delay = opts.delay ?? 0;
	const distance = opts.distance ?? 10;
	if (prefersReduced()) {
		node.style.opacity = '1';
		return {};
	}
	node.style.opacity = '0';
	node.style.transform = `translateY(${distance}px)`;
	node.style.willChange = 'opacity, transform';
	const id = window.setTimeout(() => {
		node.style.transition = 'opacity 420ms cubic-bezier(0.22, 1, 0.36, 1), transform 420ms cubic-bezier(0.22, 1, 0.36, 1)';
		node.style.opacity = '1';
		node.style.transform = 'translateY(0)';
		window.setTimeout(() => { node.style.willChange = ''; }, 500);
	}, delay);
	return { destroy() { window.clearTimeout(id); } };
}

export const stagger = (index: number, step = 80) => index * step;

// --- letter-cascade: split text into letters, reveal each with delay -------
export function letterCascade(node: HTMLElement, opts: { delay?: number; perLetter?: number } = {}) {
	if (prefersReduced()) return {};
	const baseDelay = opts.delay ?? 0;
	const per = opts.perLetter ?? 28;

	const text = node.textContent ?? '';
	const html = text.split('').map((c) => {
		if (c === ' ') return '<span class="lc-sp">&nbsp;</span>';
		return `<span class="lc-c">${c}</span>`;
	}).join('');
	node.innerHTML = html;

	const cs = node.querySelectorAll<HTMLElement>('.lc-c, .lc-sp');
	cs.forEach((el, i) => {
		el.style.display = 'inline-block';
		el.style.opacity = '0';
		el.style.transform = 'translateY(0.5em)';
		el.style.transition = 'opacity 380ms cubic-bezier(0.22, 1, 0.36, 1), transform 380ms cubic-bezier(0.22, 1, 0.36, 1)';
		window.setTimeout(() => {
			el.style.opacity = '1';
			el.style.transform = 'translateY(0)';
		}, baseDelay + i * per);
	});

	return {};
}

// --- scramble: cycle through random glyphs before settling ------------------
const SCRAMBLE_GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
export function scrambleText(node: HTMLElement, opts: { delay?: number; duration?: number } = {}) {
	if (prefersReduced()) return {};
	const startDelay = opts.delay ?? 0;
	const dur = opts.duration ?? 900;
	const final = node.textContent ?? '';
	const chars = final.split('');
	const start = performance.now() + startDelay;
	let raf = 0;

	const tick = (t: number) => {
		const elapsed = t - start;
		if (elapsed < 0) {
			node.textContent = chars.map((c) => c === ' ' || c === '\n' ? c : ' ').join('');
			raf = requestAnimationFrame(tick);
			return;
		}
		const ratio = Math.min(1, elapsed / dur);
		const settled = Math.floor(ratio * chars.length);
		const out = chars.map((c, i) => {
			if (c === ' ' || c === '\n') return c;
			if (i < settled) return c;
			return SCRAMBLE_GLYPHS[(Math.random() * SCRAMBLE_GLYPHS.length) | 0];
		}).join('');
		node.textContent = out;
		if (ratio < 1) raf = requestAnimationFrame(tick);
		else node.textContent = final;
	};
	raf = requestAnimationFrame(tick);
	return { destroy() { cancelAnimationFrame(raf); node.textContent = final; } };
}

// --- magnetic: button pulls toward cursor when hovered ----------------------
export function magnetic(node: HTMLElement, opts: { strength?: number; radius?: number } = {}) {
	if (prefersReduced()) return {};
	const s = opts.strength ?? 0.25;
	const r = opts.radius ?? 80;
	node.style.transition = 'transform 320ms cubic-bezier(0.22, 1, 0.36, 1)';

	const onMove = (e: MouseEvent) => {
		const rect = node.getBoundingClientRect();
		const cx = rect.left + rect.width / 2;
		const cy = rect.top + rect.height / 2;
		const dx = e.clientX - cx;
		const dy = e.clientY - cy;
		const dist = Math.hypot(dx, dy);
		if (dist > r) {
			node.style.transform = 'translate(0, 0)';
			return;
		}
		const f = (1 - dist / r) * s;
		node.style.transform = `translate(${dx * f}px, ${dy * f}px)`;
	};
	const onLeave = () => { node.style.transform = 'translate(0, 0)'; };
	window.addEventListener('mousemove', onMove);
	node.addEventListener('mouseleave', onLeave);
	return {
		destroy() {
			window.removeEventListener('mousemove', onMove);
			node.removeEventListener('mouseleave', onLeave);
		}
	};
}

// --- dust: slowly drifting points painted onto a canvas ---------------------
export function dustParticles(
	canvas: HTMLCanvasElement,
	opts: { count?: number; tint?: string; speed?: number } = {}
) {
	if (prefersReduced()) return {};
	const count = opts.count ?? 50;
	const tint = opts.tint ?? 'oklch(0.78 0.090 285 / 0.45)';
	const speed = opts.speed ?? 0.18;
	const ctx = canvas.getContext('2d');
	if (!ctx) return {};
	let w = 0, h = 0;
	const resize = () => {
		const dpr = window.devicePixelRatio || 1;
		w = canvas.clientWidth;
		h = canvas.clientHeight;
		canvas.width = w * dpr;
		canvas.height = h * dpr;
		ctx.scale(dpr, dpr);
	};
	resize();
	const ro = new ResizeObserver(resize);
	ro.observe(canvas);

	type P = { x: number; y: number; r: number; vy: number; vx: number; alpha: number };
	const ps: P[] = Array.from({ length: count }, () => ({
		x: Math.random() * w,
		y: Math.random() * h,
		r: Math.random() * 1.4 + 0.4,
		vy: -(Math.random() * 0.4 + 0.1) * speed,
		vx: (Math.random() - 0.5) * speed * 0.5,
		alpha: Math.random() * 0.6 + 0.2
	}));

	let raf = 0;
	const tick = () => {
		ctx.clearRect(0, 0, w, h);
		for (const p of ps) {
			p.x += p.vx;
			p.y += p.vy;
			if (p.y < -4) { p.y = h + 4; p.x = Math.random() * w; }
			if (p.x < -4) p.x = w + 4;
			if (p.x > w + 4) p.x = -4;
			ctx.beginPath();
			ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
			ctx.fillStyle = tint;
			ctx.globalAlpha = p.alpha;
			ctx.fill();
		}
		raf = requestAnimationFrame(tick);
	};
	raf = requestAnimationFrame(tick);

	return {
		destroy() {
			cancelAnimationFrame(raf);
			ro.disconnect();
		}
	};
}

// --- ripple on keystroke: spawn a fading dot near the caret -----------------
export function keystrokeRipples(input: HTMLInputElement) {
	if (prefersReduced()) return {};
	const host = input.parentElement;
	if (!host) return {};
	const cs = getComputedStyle(host);
	if (cs.position === 'static') host.style.position = 'relative';

	const onInput = (e: Event) => {
		const ie = e as InputEvent;
		if (ie.inputType && ie.inputType.startsWith('delete')) return;
		const rect = input.getBoundingClientRect();
		const hostRect = host.getBoundingClientRect();
		// rough caret x: approximate as right edge of text using a measure span
		const measureEl = document.createElement('span');
		const inputCs = getComputedStyle(input);
		measureEl.style.font = inputCs.font;
		measureEl.style.fontFamily = inputCs.fontFamily;
		measureEl.style.fontSize = inputCs.fontSize;
		measureEl.style.fontWeight = inputCs.fontWeight;
		measureEl.style.letterSpacing = inputCs.letterSpacing;
		measureEl.style.visibility = 'hidden';
		measureEl.style.position = 'absolute';
		measureEl.style.whiteSpace = 'pre';
		measureEl.textContent = input.value;
		document.body.appendChild(measureEl);
		const textW = measureEl.getBoundingClientRect().width;
		document.body.removeChild(measureEl);

		const padL = parseFloat(inputCs.paddingLeft) || 0;
		const xInInput = Math.min(padL + textW, rect.width - 12);
		const x = (rect.left - hostRect.left) + xInInput;
		const y = (rect.top - hostRect.top) + rect.height - 8;

		const dot = document.createElement('span');
		dot.style.position = 'absolute';
		dot.style.left = `${x}px`;
		dot.style.top = `${y}px`;
		dot.style.width = '6px';
		dot.style.height = '6px';
		dot.style.borderRadius = '50%';
		dot.style.background = 'var(--p-accent)';
		dot.style.pointerEvents = 'none';
		dot.style.opacity = '0.85';
		dot.style.transform = 'translate(-50%, -50%) scale(1)';
		dot.style.transition = 'opacity 640ms ease-out, transform 640ms ease-out';
		host.appendChild(dot);
		// next frame
		requestAnimationFrame(() => {
			dot.style.opacity = '0';
			dot.style.transform = 'translate(-50%, -50%) scale(3)';
		});
		window.setTimeout(() => dot.remove(), 700);
	};
	input.addEventListener('input', onInput);
	return { destroy() { input.removeEventListener('input', onInput); } };
}

// --- tab-switch fly transition params ---------------------------------------
export const tabSwitchOut = { y: -4, duration: 160, opacity: 0 };
export const tabSwitchIn = { y: 4, duration: 220, opacity: 0, delay: 80 };
