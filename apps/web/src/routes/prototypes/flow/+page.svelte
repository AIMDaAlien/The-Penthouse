<script lang="ts">
	import { flowState, themes, profileStyles, type ThemeMode } from '$lib/prototypes/_state.svelte';

	type Screen = 'auth' | 'home' | 'chat' | 'people' | 'profile' | 'settings';
	let screen = $state<Screen>('home');

	const screens: { id: Screen; label: string; icon: string }[] = [
		{ id: 'auth',     label: 'Auth',     icon: '◐' },
		{ id: 'home',     label: 'Home',     icon: '✉' },
		{ id: 'chat',     label: 'Chat',     icon: '◇' },
		{ id: 'people',   label: 'People',   icon: '◯' },
		{ id: 'profile',  label: 'Profile',  icon: '★' },
		{ id: 'settings', label: 'Settings', icon: '⚙' },
	];
	const inAppScreens = screens.filter(s => s.id !== 'auth' && s.id !== 'profile');

	// ── Mock data ──
	interface Msg { id: string; from: 'me' | 'them'; content: string; time: string; reactions?: { emoji: string; count: number }[] }
	const them = { name: 'Amelie', handle: 'amelie.v', avatar: 'https://i.pravatar.cc/150?u=amelie' };
	const messages: Msg[] = [
		{ id: '1', from: 'them', content: 'the rooms that hold their light', time: '09:41' },
		{ id: '2', from: 'them', content: 'even when no one is there to see it', time: '09:41' },
		{ id: '3', from: 'me',   content: 'yes — that', time: '09:42', reactions: [{ emoji: '✨', count: 1 }] },
		{ id: '4', from: 'me',   content: "i've been thinking about how spaces remember the people who move through them", time: '09:43' },
		{ id: '5', from: 'them', content: 'like residue? or something gentler?', time: '09:44' },
		{ id: '6', from: 'me',   content: 'gentler. like a warmth that lingers.', time: '09:45' },
		{ id: '7', from: 'them', content: 'the penthouse has that, i think. even in the quiet hours.', time: '09:46' },
		{ id: '8', from: 'me',   content: 'especially then', time: '09:46', reactions: [{ emoji: '◆', count: 1 }] },
	];

	const chatList = [
		{ id: 'amelie',  name: 'Amelie',  avatar: 'https://i.pravatar.cc/150?u=amelie',  last: 'the penthouse has that, i think.',          time: '09:46', unread: 2, status: 'online' as const },
		{ id: 'jonas',   name: 'Jonas',   avatar: 'https://i.pravatar.cc/150?u=jonas',   last: 'bring the notebook with the soft cover.',  time: '07:19', unread: 0, status: 'away'   as const },
		{ id: 'suki',    name: 'Suki',    avatar: 'https://i.pravatar.cc/150?u=suki',    last: 'sleep on it. send in the morning.',        time: 'Wed',   unread: 0, status: 'online' as const },
		{ id: 'marcus',  name: 'Marcus',  avatar: 'https://i.pravatar.cc/150?u=marcus',  last: 'photographed the silence',                 time: 'Tue',   unread: 0, status: 'offline' as const },
		{ id: 'mira',    name: 'Mira',    avatar: 'https://i.pravatar.cc/150?u=mira',    last: 'morning. the light in the kitchen is soft.', time: 'Mon', unread: 5, status: 'online' as const },
	];

	const roster = [
		{ id: '1', name: 'Amelie Voss',  role: 'Editor',    location: 'Berlin',     bio: 'Curating the spaces between words.',  avatar: 'https://i.pravatar.cc/300?u=amelie',  banner: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&q=80', status: 'online'  as const },
		{ id: '2', name: 'Jonas Hale',   role: 'Architect', location: 'Copenhagen', bio: 'Concrete and light.',                 avatar: 'https://i.pravatar.cc/300?u=jonas',   banner: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=1200&q=80', status: 'away'    as const },
		{ id: '3', name: 'Suki Tanaka',  role: 'Engineer',  location: 'Tokyo',      bio: 'Making the invisible visible.',       avatar: 'https://i.pravatar.cc/300?u=suki',    banner: 'https://images.unsplash.com/photo-1493246507139-91e8fad9978e?w=1200&q=80', status: 'online'  as const },
		{ id: '4', name: 'Marcus Reid',  role: 'Producer',  location: 'London',     bio: 'Sound and silence in equal measure.', avatar: 'https://i.pravatar.cc/300?u=marcus',  banner: 'https://images.unsplash.com/photo-1518173946687-a1f8a54d877a?w=1200&q=80', status: 'offline' as const },
	];

	let focusPersonId = $state('1');
	const focusPerson = $derived(roster.find(p => p.id === focusPersonId) ?? roster[0]);

	// Chat clustering
	function isLastInCluster(i: number) {
		if (i === messages.length - 1) return true;
		return messages[i + 1].from !== messages[i].from;
	}
	function isFirstInCluster(i: number) {
		if (i === 0) return true;
		return messages[i - 1].from !== messages[i].from;
	}
	function isShort(t: string) { return t.length < 40 && !t.includes('\n'); }

	const k = $derived(flowState.tokens);

	// Mobile-internal nav state (for showing chat-list vs chat-detail on mobile)
	let mobileSubView = $state<'list' | 'detail'>('list');
</script>

<svelte:head>
	<title>App Flow · The Penthouse</title>
</svelte:head>

<div
	class="shell"
	class:is-light={flowState.mode === 'light'}
	style:--p-accent={k.accent}
	style:--p-accent-soft={k.accentSoft}
	style:--p-accent-edge={k.accentEdge}
	style:--p-bg={k.bg}
	style:--p-surface={k.surface}
	style:--p-surface-2={k.surface2}
	style:--p-text={k.text}
	style:--p-text-2={k.text2}
	style:--p-muted={k.muted}
	style:--p-secondary={k.secondary}
	style:--p-line={k.line}
	style:--p-line-2={k.line2}
	style:--p-success={k.success}
	style:--p-warning={k.warning}
>
	<!-- ─── Control bar ─── -->
	<header class="control-bar">
		<div class="ctrl-inner">
			<div class="brand">
				<span class="brand-eyebrow">N° 04 / FLOW</span>
				<span class="brand-name">The Penthouse</span>
			</div>

			<div class="ctrl-groups">
				<div class="ctrl-group">
					<span class="ctrl-label">Theme</span>
					<div class="swatch-row">
						{#each themes as t}
							<button
								class="swatch"
								class:active={flowState.themeId === t.id}
								style:background={t[flowState.mode].accent}
								onclick={() => flowState.themeId = t.id}
								title={t.label}
								aria-label="Theme: {t.label}"
							></button>
						{/each}
					</div>
				</div>

				<div class="ctrl-group">
					<span class="ctrl-label">Mode</span>
					<div class="mode-toggle">
						<button
							class="mode-btn"
							class:active={flowState.mode === 'dark'}
							onclick={() => flowState.mode = 'dark'}
						>● Dark</button>
						<button
							class="mode-btn"
							class:active={flowState.mode === 'light'}
							onclick={() => flowState.mode = 'light'}
						>○ Light</button>
					</div>
				</div>

				<div class="ctrl-group">
					<span class="ctrl-label">Profile style</span>
					<div class="text-chip-row">
						{#each profileStyles as ps}
							<button
								class="text-chip"
								class:active={flowState.profileStyle === ps.id}
								onclick={() => flowState.profileStyle = ps.id}
							>{ps.label}</button>
						{/each}
					</div>
				</div>
			</div>
		</div>

		<nav class="screen-tabs">
			{#each screens as s}
				<button
					class="screen-tab"
					class:active={screen === s.id}
					onclick={() => { screen = s.id; mobileSubView = 'list'; }}
				>{s.label}</button>
			{/each}
		</nav>
	</header>

	<!-- ─── Side-by-side frames ─── -->
	<main class="frames">

		<!-- Desktop frame -->
		<section class="frame desktop-frame">
			<div class="frame-caption">
				<span class="cap-eyebrow">DESKTOP</span>
				<span class="cap-dim">1100 × 720</span>
			</div>
			<div class="frame-body desktop-body">
				{#if screen === 'auth'}
					<div class="auth-screen">
						<div class="auth-card">
							<div class="wordmark"><span class="wm-the">The</span><span class="wm-pent">Penthouse</span></div>
							<p class="auth-lede">A quieter room for the people you talk to.</p>
							<label class="auth-field">
								<span class="auth-label">Handle</span>
								<input value="kimi.eve" class="auth-input" />
							</label>
							<label class="auth-field">
								<span class="auth-label">Password</span>
								<input type="password" value="••••••••" class="auth-input" />
							</label>
							<button class="btn-primary auth-submit">Sign in</button>
							<span class="auth-foot">N° 04 / V5 — sign in or <button class="link-btn">create an account</button></span>
						</div>
					</div>

				{:else if screen === 'home'}
					<div class="home-screen split">
						<aside class="chat-list">
							<header class="list-head">
								<span class="eyebrow">N° 04 / CHATS</span>
								<h1 class="display">Messages</h1>
							</header>
							<div class="list-body">
								{#each chatList as c}
									<button class="chat-item" class:active={c.id === 'amelie'}>
										<div class="ci-avatar">
											<img src={c.avatar} alt="" />
											<span class="status-dot {c.status}"></span>
										</div>
										<div class="ci-meta">
											<div class="ci-line"><span class="ci-name">{c.name}</span><span class="ci-time">{c.time}</span></div>
											<div class="ci-line"><span class="ci-last">{c.last}</span>{#if c.unread > 0}<span class="ci-unread">{c.unread}</span>{/if}</div>
										</div>
									</button>
								{/each}
							</div>
						</aside>
						<div class="empty-pane">
							<span class="empty-eyebrow">N° 04 / RILKE</span>
							<p class="empty-quote">Be patient toward all that is unsolved in your heart and try to love the questions themselves.</p>
							<button class="btn-primary" onclick={() => screen = 'chat'}>Open Amelie</button>
						</div>
					</div>

				{:else if screen === 'chat'}
					{@render chatView('desktop')}

				{:else if screen === 'people'}
					<div class="people-screen split">
						<aside class="roster">
							<header class="list-head">
								<span class="eyebrow">N° 04 / DIRECTORY</span>
								<h1 class="display">People</h1>
							</header>
							<div class="list-body">
								{#each roster as p}
									<button
										class="chat-item"
										class:active={focusPersonId === p.id}
										onclick={() => focusPersonId = p.id}
									>
										<div class="ci-avatar">
											<img src={p.avatar} alt="" />
											<span class="status-dot {p.status}"></span>
										</div>
										<div class="ci-meta">
											<span class="ci-name">{p.name}</span>
											<span class="ci-role">{p.role}</span>
										</div>
									</button>
								{/each}
							</div>
						</aside>
						<div class="focus">
							{@render personCard(focusPerson, flowState.profileStyle)}
						</div>
					</div>

				{:else if screen === 'profile'}
					<div class="profile-screen">
						<header class="profile-head">
							<span class="eyebrow">N° 04 / PROFILE PREVIEW</span>
							<h1 class="display">As others see you.</h1>
							<p class="profile-sub">Switch <em>Profile style</em> above to change how your card renders for everyone else.</p>
						</header>
						<div class="profile-stage">
							{@render myCard(flowState.profileStyle)}
						</div>
					</div>

				{:else if screen === 'settings'}
					{@render settings('desktop')}
				{/if}
			</div>
		</section>

		<!-- Mobile frame -->
		<section class="frame mobile-frame">
			<div class="frame-caption">
				<span class="cap-eyebrow">MOBILE</span>
				<span class="cap-dim">390 × 760</span>
			</div>
			<div class="frame-body mobile-body">
				{#if screen === 'auth'}
					<div class="auth-screen mobile">
						<div class="auth-card">
							<div class="wordmark"><span class="wm-the">The</span><span class="wm-pent">Penthouse</span></div>
							<p class="auth-lede">A quieter room for the people you talk to.</p>
							<label class="auth-field">
								<span class="auth-label">Handle</span>
								<input value="kimi.eve" class="auth-input" />
							</label>
							<label class="auth-field">
								<span class="auth-label">Password</span>
								<input type="password" value="••••••••" class="auth-input" />
							</label>
							<button class="btn-primary auth-submit">Sign in</button>
							<span class="auth-foot">create an account</span>
						</div>
					</div>

				{:else if screen === 'home'}
					<div class="home-screen mobile">
						{#if mobileSubView === 'list'}
							<header class="list-head mobile-head">
								<span class="eyebrow">N° 04 / CHATS</span>
								<h1 class="display sm">Messages</h1>
							</header>
							<div class="list-body">
								{#each chatList as c}
									<button class="chat-item" onclick={() => { mobileSubView = 'detail'; screen = 'chat'; }}>
										<div class="ci-avatar">
											<img src={c.avatar} alt="" />
											<span class="status-dot {c.status}"></span>
										</div>
										<div class="ci-meta">
											<div class="ci-line"><span class="ci-name">{c.name}</span><span class="ci-time">{c.time}</span></div>
											<div class="ci-line"><span class="ci-last">{c.last}</span>{#if c.unread > 0}<span class="ci-unread">{c.unread}</span>{/if}</div>
										</div>
									</button>
								{/each}
							</div>
						{/if}
					</div>

				{:else if screen === 'chat'}
					{@render chatView('mobile')}

				{:else if screen === 'people'}
					<div class="people-screen mobile">
						<header class="list-head mobile-head">
							<span class="eyebrow">N° 04 / DIRECTORY</span>
							<h1 class="display sm">People</h1>
						</header>
						<div class="list-body">
							{#each roster as p}
								<button class="chat-item" onclick={() => focusPersonId = p.id}>
									<div class="ci-avatar">
										<img src={p.avatar} alt="" />
										<span class="status-dot {p.status}"></span>
									</div>
									<div class="ci-meta">
										<span class="ci-name">{p.name}</span>
										<span class="ci-role">{p.role} · {p.location}</span>
									</div>
								</button>
							{/each}
						</div>
					</div>

				{:else if screen === 'profile'}
					<div class="profile-screen mobile">
						<header class="profile-head mobile-head">
							<span class="eyebrow">N° 04 / PROFILE</span>
							<h1 class="display sm">As others see you</h1>
						</header>
						<div class="profile-stage">
							{@render myCard(flowState.profileStyle)}
						</div>
					</div>

				{:else if screen === 'settings'}
					{@render settings('mobile')}
				{/if}
			</div>

			<!-- Mobile bottom nav (in-app navigation) -->
			{#if screen !== 'auth'}
				<nav class="bottom-nav">
					{#each inAppScreens as s}
						<button
							class="bn-item"
							class:active={screen === s.id}
							onclick={() => { screen = s.id; mobileSubView = 'list'; }}
						>
							<span class="bn-icon">{s.icon}</span>
							<span class="bn-label">{s.label}</span>
						</button>
					{/each}
				</nav>
			{/if}
		</section>
	</main>
</div>

<!-- ─── Reusable snippets ─── -->
{#snippet chatView(variant: 'desktop' | 'mobile')}
	<div class="chat-screen" class:mobile={variant === 'mobile'}>
		<header class="chat-head">
			{#if variant === 'mobile'}
				<button class="chat-back" onclick={() => screen = 'home'} aria-label="Back">←</button>
			{/if}
			<div class="ch-avatar">
				<img src={them.avatar} alt="" />
				<span class="status-dot online"></span>
			</div>
			<div class="ch-meta">
				<span class="ch-name">{them.name}</span>
				<span class="ch-eyebrow">N° 04 / ONLINE</span>
			</div>
		</header>

		<div class="chat-messages">
			<div class="day-divider">
				<span class="day-line"></span>
				<span class="day-label">TODAY</span>
				<span class="day-line"></span>
			</div>

			{#each messages as msg, i (msg.id)}
				{@const own = msg.from === 'me'}
				{@const short = isShort(msg.content)}
				{@const showAvatar = isLastInCluster(i)}
				{@const firstInCluster = isFirstInCluster(i)}
				<div class="msg" class:own class:msg-cluster-gap={firstInCluster && i !== 0} class:msg-with-time={showAvatar}>
					<div class="row" class:own>
						<div class="avatar-col">
							{#if showAvatar}
								<div class="avatar-wrap">
									<img src={own ? flowState.avatar : them.avatar} alt="" />
								</div>
								<span class="time">{msg.time}</span>
							{:else}
								<div class="avatar-spacer"></div>
							{/if}
						</div>
						<div class="bub" class:short>
							<p>{msg.content}</p>
						</div>
					</div>
					{#if msg.reactions}
						<div class="reactions-row" class:own>
							<div class="reactions">
								{#each msg.reactions as r}
									<span class="reaction">{r.emoji}<span class="reaction-n">{r.count}</span></span>
								{/each}
							</div>
						</div>
					{/if}
				</div>
			{/each}
		</div>

		<div class="composer-wrap">
			<div class="composer">
				<span class="composer-placeholder">Write something...</span>
				<button class="composer-send" aria-label="Send">↑</button>
			</div>
		</div>
	</div>
{/snippet}

{#snippet personCard(person: typeof roster[number], style: typeof flowState.profileStyle)}
	{#if style === 'editorial'}
		<div class="pc pc-editorial">
			<div class="pc-banner-wrap">
				<img src={person.banner} alt="" />
			</div>
			<div class="pc-body">
				<div class="pc-pfp-wrap">
					<img src={person.avatar} alt="" class="pc-pfp" />
					<span class="status-dot lg {person.status}"></span>
				</div>
				<span class="pc-name">{person.name}</span>
				<span class="pc-handle">@{person.name.toLowerCase().replace(/\s/g, '.')}</span>
				<div class="pc-meta">
					<span>{person.role}</span><span class="dot-sep">·</span><span>{person.location}</span>
				</div>
				<p class="pc-bio">{person.bio}</p>
				<div class="pc-actions">
					<button class="btn-primary">Message</button>
					<button class="btn-ghost">View portfolio</button>
				</div>
			</div>
		</div>
	{:else if style === 'vogue'}
		<div class="pc pc-vogue">
			<div class="pc-banner-wrap big">
				<img src={person.banner} alt="" />
				<div class="pc-shade"></div>
				<div class="pc-overlay">
					<span class="pc-overlay-eyebrow">N° 0{person.id}</span>
					<h2 class="pc-display-name">{person.name.split(' ')[0]}<br/>{person.name.split(' ')[1] ?? ''}</h2>
				</div>
			</div>
			<div class="pc-body pc-body-vogue">
				<div class="pc-pfp-wrap big">
					<img src={person.avatar} alt="" class="pc-pfp" />
					<span class="status-dot lg {person.status}"></span>
				</div>
				<div class="pc-meta-line">
					<span>{person.role}</span><span class="dot-sep">/</span><span>{person.location.toUpperCase()}</span>
				</div>
				<p class="pc-bio">{person.bio}</p>
				<div class="pc-actions">
					<button class="btn-primary">Message</button>
					<button class="btn-ghost">Portfolio</button>
				</div>
			</div>
		</div>
	{:else}
		<div class="pc pc-wallpaper">
			<img src={person.banner} alt="" class="pc-bg" />
			<div class="pc-bg-shade"></div>
			<div class="pc-floating">
				<div class="pcf-head">
					<div class="pc-pfp-wrap">
						<img src={person.avatar} alt="" class="pc-pfp" />
						<span class="status-dot lg {person.status}"></span>
					</div>
					<div class="pcf-id">
						<span class="pc-name light">{person.name}</span>
						<span class="pc-handle light">@{person.name.toLowerCase().replace(/\s/g, '.')}</span>
					</div>
				</div>
				<div class="pcf-grid">
					<div><span class="pcf-label">Role</span><span class="pcf-value">{person.role}</span></div>
					<div><span class="pcf-label">Location</span><span class="pcf-value">{person.location}</span></div>
					<div><span class="pcf-label">Status</span><span class="pcf-value">{person.status}</span></div>
				</div>
				<p class="pc-bio light">{person.bio}</p>
				<div class="pc-actions">
					<button class="btn-primary on-dark">Message</button>
					<button class="btn-ghost on-dark">Portfolio</button>
				</div>
			</div>
		</div>
	{/if}
{/snippet}

{#snippet myCard(style: typeof flowState.profileStyle)}
	{@const mePerson = {
		id: '0',
		name: flowState.displayName,
		role: 'Designer',
		location: 'The Penthouse',
		bio: flowState.bio,
		avatar: flowState.avatar,
		banner: flowState.banner,
		status: flowState.presence
	}}
	{@render personCard(mePerson, style)}
{/snippet}

{#snippet settings(variant: 'desktop' | 'mobile')}
	<div class="settings-screen" class:mobile={variant === 'mobile'}>
		<header class="settings-head">
			<span class="eyebrow">N° 04 / SETTINGS</span>
			<h1 class="display" class:sm={variant === 'mobile'}>Preferences</h1>
		</header>

		<div class="settings-body">
			<section class="set-hero">
				<div class="hero-pfp-wrap">
					<img src={flowState.avatar} alt="" class="hero-pfp" />
					<span class="status-dot lg {flowState.presence}"></span>
				</div>
				<div class="hero-id">
					<span class="hero-name">{flowState.displayName}</span>
					<span class="hero-handle">@{flowState.handle}</span>
				</div>
			</section>

			<section class="set-card">
				<span class="card-eyebrow">N° 01 / IDENTITY</span>
				<label class="field-stack">
					<span class="field-name">Display name</span>
					<input class="set-input" bind:value={flowState.displayName} />
				</label>
			</section>

			<section class="set-card">
				<span class="card-eyebrow">N° 02 / PRESENCE</span>
				<div class="presence-picker">
					{#each ['online', 'away', 'offline'] as p}
						<button
							class="presence-btn"
							class:active={flowState.presence === p}
							onclick={() => flowState.presence = p as typeof flowState.presence}
						>
							<span class="status-dot {p}"></span>
							<span class="presence-label">{p}</span>
						</button>
					{/each}
				</div>
			</section>

			<section class="set-card">
				<span class="card-eyebrow">N° 03 / APPEARANCE</span>
				<span class="card-sub">Theme & mode apply globally across the app.</span>
				<div class="appearance-row">
					<div class="appearance-col">
						<span class="col-label">Theme</span>
						<div class="theme-grid">
							{#each themes as t}
								<button
									class="theme-btn"
									class:active={flowState.themeId === t.id}
									onclick={() => flowState.themeId = t.id}
								>
									<span class="theme-swatch" style:background={t[flowState.mode].accent}></span>
									<span class="theme-label">{t.label}</span>
								</button>
							{/each}
						</div>
					</div>
					<div class="appearance-col">
						<span class="col-label">Mode</span>
						<div class="mode-grid">
							<button
								class="mode-card"
								class:active={flowState.mode === 'dark'}
								onclick={() => flowState.mode = 'dark'}
							>
								<span class="mode-glyph">●</span>
								<span class="mode-card-label">Dark</span>
							</button>
							<button
								class="mode-card"
								class:active={flowState.mode === 'light'}
								onclick={() => flowState.mode = 'light'}
							>
								<span class="mode-glyph">○</span>
								<span class="mode-card-label">Light</span>
							</button>
						</div>
					</div>
				</div>
			</section>

			<section class="set-card">
				<span class="card-eyebrow">N° 04 / PROFILE STYLE</span>
				<span class="card-sub">How other users see you in the directory.</span>
				<div class="profile-style-list">
					{#each profileStyles as ps}
						<button
							class="profile-style-btn"
							class:active={flowState.profileStyle === ps.id}
							onclick={() => flowState.profileStyle = ps.id}
						>
							<span class="psb-label">{ps.label}</span>
							<span class="psb-desc">{ps.description}</span>
						</button>
					{/each}
				</div>
			</section>

			<button class="btn-warning signout">Sign out</button>
		</div>
	</div>
{/snippet}

<style>
	:global(html, body) { margin: 0; padding: 0; }
	:global(body) { background: #0c0c11; }

	.shell {
		--sp-1: 4px; --sp-2: 8px; --sp-3: 14px; --sp-4: 22px; --sp-5: 40px; --sp-6: 64px;
		--r-pill: 999px; --r-lg: 22px; --r-md: 14px; --r-sm: 8px;
		--ease-out: cubic-bezier(0.16, 1, 0.3, 1);
		--font-sans: 'Ubuntu', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
		--font-mono: 'JetBrains Mono', 'SF Mono', 'Fira Code', monospace;

		min-height: 100dvh;
		background: var(--p-bg);
		color: var(--p-text);
		font-family: var(--font-sans);
		transition: background 280ms var(--ease-out), color 280ms var(--ease-out);
	}

	/* ─── Control bar ─── */
	.control-bar {
		position: sticky; top: 0; z-index: 50;
		background: color-mix(in oklch, var(--p-bg) 90%, transparent);
		backdrop-filter: blur(20px);
		-webkit-backdrop-filter: blur(20px);
		border-bottom: 1px solid var(--p-line);
	}
	.ctrl-inner {
		display: flex; align-items: flex-start; justify-content: space-between;
		gap: 32px;
		max-width: 1600px;
		margin: 0 auto;
		padding: var(--sp-4) var(--sp-5) var(--sp-3);
	}
	.brand { display: flex; flex-direction: column; gap: 2px; flex-shrink: 0; }
	.brand-eyebrow {
		font-family: var(--font-mono);
		font-size: 0.6rem; letter-spacing: 2px; text-transform: uppercase;
		color: var(--p-secondary);
	}
	.brand-name {
		font-size: 1rem; font-weight: 500;
		color: var(--p-text); letter-spacing: -0.3px;
	}

	.ctrl-groups {
		display: flex; gap: var(--sp-5);
		align-items: flex-end; flex-wrap: wrap;
	}
	.ctrl-group { display: flex; flex-direction: column; gap: 6px; }
	.ctrl-label {
		font-family: var(--font-mono);
		font-size: 0.58rem; letter-spacing: 1.8px; text-transform: uppercase;
		color: var(--p-muted);
	}

	.swatch-row { display: flex; gap: 6px; }
	.swatch {
		width: 22px; height: 22px;
		border-radius: 50%;
		background: var(--c);
		border: 1.5px solid var(--p-line-2);
		cursor: pointer;
		padding: 0;
		transition: border-color 0.15s, transform 0.15s;
	}
	.swatch:hover { transform: scale(1.1); }
	.swatch.active {
		border-color: var(--p-text);
		box-shadow: 0 0 0 3px var(--p-accent-soft);
	}

	.mode-toggle {
		display: inline-flex;
		background: var(--p-surface);
		border: 1px solid var(--p-line);
		border-radius: var(--r-pill);
		padding: 3px;
		gap: 2px;
	}
	.mode-btn {
		padding: 5px 12px;
		background: transparent;
		border: none;
		border-radius: var(--r-pill);
		color: var(--p-muted);
		font-family: var(--font-mono);
		font-size: 0.62rem; letter-spacing: 1.2px; text-transform: uppercase;
		cursor: pointer;
		transition: background 0.15s, color 0.15s;
	}
	.mode-btn.active {
		background: var(--p-accent-soft);
		color: var(--p-text);
	}

	.text-chip-row { display: flex; gap: 6px; }
	.text-chip {
		padding: 6px 12px;
		background: transparent;
		border: 1px solid var(--p-line-2);
		border-radius: var(--r-pill);
		color: var(--p-muted);
		font-family: var(--font-mono);
		font-size: 0.62rem; letter-spacing: 1.2px; text-transform: uppercase;
		cursor: pointer;
		transition: border-color 0.15s, background 0.15s, color 0.15s;
	}
	.text-chip.active {
		border-color: var(--p-accent);
		background: var(--p-accent-soft);
		color: var(--p-text);
	}

	.screen-tabs {
		display: flex; gap: 4px;
		max-width: 1600px; margin: 0 auto;
		padding: 0 var(--sp-5) var(--sp-2);
		flex-wrap: wrap;
	}
	.screen-tab {
		padding: 8px 14px;
		background: transparent;
		border: none;
		border-bottom: 2px solid transparent;
		color: var(--p-muted);
		font-family: var(--font-mono);
		font-size: 0.66rem; letter-spacing: 1.5px; text-transform: uppercase;
		cursor: pointer;
		transition: color 0.15s, border-color 0.15s;
	}
	.screen-tab:hover { color: var(--p-text); }
	.screen-tab.active { color: var(--p-text); border-bottom-color: var(--p-accent); }

	/* ─── Frames ─── */
	.frames {
		display: flex;
		flex-direction: row;
		gap: var(--sp-5);
		justify-content: center;
		align-items: flex-start;
		padding: var(--sp-5) var(--sp-4) var(--sp-6);
		flex-wrap: wrap;
	}
	.frame {
		display: flex; flex-direction: column;
		gap: 10px;
	}
	.frame-caption {
		display: flex; align-items: baseline; justify-content: space-between;
		font-family: var(--font-mono);
		font-size: 0.62rem; letter-spacing: 2px; text-transform: uppercase;
		color: var(--p-muted);
	}
	.cap-eyebrow { color: var(--p-secondary); }
	.cap-dim { color: var(--p-muted); }

	.frame-body {
		background: var(--p-surface);
		border: 1px solid var(--p-line);
		border-radius: var(--r-lg);
		overflow: hidden;
		position: relative;
		container-type: inline-size;
		container-name: appframe;
	}
	.desktop-body { width: 1100px; height: 720px; }
	.mobile-body  { width: 390px;  height: 760px; }
	.shell.is-light .frame-body {
		border-color: var(--p-line-2);
	}

	@media (max-width: 1600px) {
		.desktop-body { width: 920px; }
	}
	@media (max-width: 1380px) {
		.desktop-body { width: 760px; height: 600px; }
		.mobile-body { width: 360px; height: 700px; }
	}

	/* ─── Shared utilities ─── */
	.eyebrow {
		font-family: var(--font-mono);
		font-size: 0.7rem; letter-spacing: 2px; text-transform: uppercase;
		color: var(--p-secondary);
		display: block;
	}
	.display {
		font-size: 2.2rem; font-weight: 700;
		letter-spacing: -1.5px; line-height: 0.95;
		color: var(--p-text);
		margin: 0;
	}
	.display.sm {
		font-size: 1.5rem;
		letter-spacing: -0.8px;
	}

	.link-btn {
		background: transparent; border: none; padding: 0;
		color: var(--p-accent);
		font-family: inherit; font-size: inherit; letter-spacing: inherit;
		cursor: pointer; text-transform: inherit;
	}
	.link-btn:hover { text-decoration: underline; }

	.btn-primary {
		padding: 11px 22px;
		background: var(--p-accent);
		color: oklch(1 0 0 / 0.98);
		border: 1px solid var(--p-accent);
		border-radius: var(--r-pill);
		font-family: var(--font-mono);
		font-size: 0.7rem; letter-spacing: 1.5px; text-transform: uppercase;
		cursor: pointer;
		transition: opacity 0.15s, transform 0.15s;
	}
	.btn-primary:hover { opacity: 0.9; transform: translateY(-1px); }
	.shell.is-light .btn-primary { color: oklch(1 0 0 / 0.98); }
	.btn-primary.on-dark { color: oklch(1 0 0 / 0.98); }

	.btn-ghost {
		padding: 11px 22px;
		background: transparent;
		color: var(--p-text-2);
		border: 1px solid var(--p-line-2);
		border-radius: var(--r-pill);
		font-family: var(--font-mono);
		font-size: 0.7rem; letter-spacing: 1.5px; text-transform: uppercase;
		cursor: pointer;
		transition: border-color 0.15s, background 0.15s;
	}
	.btn-ghost:hover { border-color: var(--p-accent-edge); background: var(--p-accent-soft); }
	.btn-ghost.on-dark { color: oklch(1 0 0 / 0.85); border-color: oklch(1 0 0 / 0.25); }
	.btn-ghost.on-dark:hover { background: oklch(1 0 0 / 0.08); }

	.btn-warning {
		padding: 11px 26px;
		background: transparent;
		color: var(--p-warning);
		border: 1px solid color-mix(in oklch, var(--p-warning) 36%, transparent);
		border-radius: var(--r-pill);
		font-family: var(--font-mono);
		font-size: 0.7rem; letter-spacing: 1.5px; text-transform: uppercase;
		cursor: pointer;
		transition: background 0.15s;
	}
	.btn-warning:hover { background: color-mix(in oklch, var(--p-warning) 14%, transparent); }

	/* Status dots */
	.status-dot {
		display: inline-block;
		width: 10px; height: 10px;
		border-radius: 50%;
		border: 2px solid var(--p-surface);
	}
	.status-dot.lg { width: 16px; height: 16px; border-width: 3px; }
	.status-dot.online  { background: var(--p-success); }
	.status-dot.away    { background: var(--p-warning); }
	.status-dot.offline { background: var(--p-muted); }

	/* ─── AUTH ─── */
	.auth-screen {
		display: flex; align-items: center; justify-content: center;
		height: 100%;
		padding: var(--sp-5);
	}
	.auth-screen.mobile { padding: var(--sp-4); }
	.auth-card {
		width: 100%; max-width: 380px;
		display: flex; flex-direction: column;
		gap: var(--sp-3);
	}
	.wordmark {
		display: flex; flex-direction: column;
		line-height: 0.9;
		margin-bottom: var(--sp-2);
	}
	.wm-the {
		font-family: var(--font-mono);
		font-size: 0.78rem; letter-spacing: 4px; text-transform: uppercase;
		color: var(--p-secondary);
	}
	.wm-pent {
		font-size: 3rem; font-weight: 700;
		letter-spacing: -2.2px;
		color: var(--p-text);
		margin-top: 6px;
	}
	.auth-screen.mobile .wm-pent { font-size: 2.4rem; }
	.auth-lede {
		font-style: italic;
		color: var(--p-text-2);
		margin: 8px 0 var(--sp-3);
		font-size: 0.95rem;
	}
	.auth-field { display: flex; flex-direction: column; gap: 6px; }
	.auth-label {
		font-family: var(--font-mono);
		font-size: 0.62rem; letter-spacing: 2px; text-transform: uppercase;
		color: var(--p-muted);
	}
	.auth-input {
		background: transparent;
		border: none;
		border-bottom: 1px solid var(--p-line-2);
		padding: 10px 0;
		color: var(--p-text);
		font-family: var(--font-sans);
		font-size: 1.05rem;
	}
	.auth-input:focus { outline: none; border-bottom-color: var(--p-accent); }
	.auth-submit { margin-top: 10px; }
	.auth-foot {
		margin-top: 4px;
		font-family: var(--font-mono);
		font-size: 0.62rem; letter-spacing: 1.5px;
		color: var(--p-muted);
		text-align: center;
	}

	/* ─── HOME / LIST PANES (shared) ─── */
	.home-screen.split, .people-screen.split {
		display: flex; height: 100%;
	}
	.chat-list, .roster {
		width: 300px; flex-shrink: 0;
		display: flex; flex-direction: column;
		border-right: 1px solid var(--p-line);
		background: var(--p-bg);
	}
	@container appframe (max-width: 760px) {
		.chat-list, .roster { width: 260px; }
	}

	.list-head {
		padding: var(--sp-4) var(--sp-4) var(--sp-3);
		border-bottom: 1px solid var(--p-line);
	}
	.list-head .eyebrow { margin-bottom: 8px; }
	.mobile-head { padding: var(--sp-4) var(--sp-4) var(--sp-3); border-bottom: 1px solid var(--p-line); }

	.list-body {
		flex: 1; overflow-y: auto;
		padding: 8px 10px;
		display: flex; flex-direction: column;
		gap: 2px;
	}

	.chat-item {
		display: flex; align-items: center; gap: 12px;
		padding: 10px 12px;
		background: transparent;
		border: none;
		border-radius: var(--r-sm);
		cursor: pointer;
		width: 100%; text-align: left; color: inherit;
		transition: background 0.15s;
	}
	.chat-item:hover { background: var(--p-surface-2); }
	.chat-item.active { background: var(--p-accent-soft); }
	.ci-avatar { position: relative; width: 38px; height: 38px; flex-shrink: 0; }
	.ci-avatar img { width: 100%; height: 100%; border-radius: 50%; object-fit: cover; }
	.ci-avatar .status-dot {
		position: absolute; bottom: 0; right: 0;
		border-color: var(--p-bg);
	}
	.ci-meta { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
	.ci-line { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
	.ci-name { font-size: 0.92rem; font-weight: 500; color: var(--p-text); }
	.ci-time {
		font-family: var(--font-mono);
		font-size: 0.6rem; letter-spacing: 1px;
		color: var(--p-muted);
	}
	.ci-last {
		font-size: 0.82rem; color: var(--p-text-2);
		white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
		flex: 1;
	}
	.ci-role {
		font-family: var(--font-mono);
		font-size: 0.62rem; letter-spacing: 1.2px; text-transform: uppercase;
		color: var(--p-muted);
	}
	.ci-unread {
		font-family: var(--font-mono);
		font-size: 0.6rem; font-weight: 500;
		background: var(--p-accent); color: oklch(1 0 0 / 0.95);
		padding: 2px 7px;
		border-radius: var(--r-pill);
	}

	.empty-pane {
		flex: 1;
		display: flex; flex-direction: column;
		align-items: center; justify-content: center;
		padding: var(--sp-5);
		gap: var(--sp-4);
		text-align: center;
	}
	.empty-eyebrow {
		font-family: var(--font-mono);
		font-size: 0.65rem; letter-spacing: 2px; text-transform: uppercase;
		color: var(--p-muted);
	}
	.empty-quote {
		font-size: 1.2rem;
		font-style: italic;
		font-weight: 300;
		line-height: 1.5;
		color: var(--p-text-2);
		max-width: 460px;
		margin: 0;
	}

	/* ─── CHAT ─── */
	.chat-screen { display: flex; flex-direction: column; height: 100%; }
	.chat-head {
		display: flex; align-items: center; gap: 14px;
		padding: var(--sp-3) var(--sp-4);
		border-bottom: 1px solid var(--p-line);
	}
	.chat-back {
		width: 30px; height: 30px;
		background: transparent;
		border: 1px solid var(--p-line-2);
		border-radius: var(--r-pill);
		color: var(--p-text);
		font-size: 0.9rem;
		cursor: pointer;
		display: flex; align-items: center; justify-content: center;
		padding: 0;
	}
	.ch-avatar { position: relative; width: 38px; height: 38px; }
	.ch-avatar img { width: 100%; height: 100%; border-radius: 50%; object-fit: cover; }
	.ch-avatar .status-dot { position: absolute; bottom: 0; right: 0; border-color: var(--p-surface); }
	.ch-meta { display: flex; flex-direction: column; gap: 2px; }
	.ch-name { font-size: 1rem; font-weight: 500; letter-spacing: -0.3px; color: var(--p-text); }
	.ch-eyebrow {
		font-family: var(--font-mono);
		font-size: 0.6rem; letter-spacing: 1.8px; text-transform: uppercase;
		color: var(--p-secondary);
	}

	.chat-messages {
		flex: 1; overflow-y: auto;
		padding: var(--sp-4) var(--sp-4) var(--sp-3);
		display: flex; flex-direction: column; gap: 4px;
	}
	.day-divider { display: flex; align-items: center; gap: 14px; margin: 4px 0 var(--sp-4); }
	.day-line { flex: 1; height: 1px; background: var(--p-line); }
	.day-label {
		font-family: var(--font-mono);
		font-size: 0.6rem; letter-spacing: 2px; text-transform: uppercase;
		color: var(--p-muted);
	}

	.msg { display: flex; flex-direction: column; }
	.msg.msg-cluster-gap { margin-top: 12px; }
	.msg.msg-with-time { margin-bottom: 18px; }
	.row { display: flex; align-items: flex-end; gap: 10px; max-width: 100%; }
	.row.own { flex-direction: row-reverse; }
	.avatar-col { position: relative; width: 32px; flex-shrink: 0; }
	.avatar-spacer { width: 32px; height: 0; }
	.avatar-wrap { width: 32px; height: 32px; }
	.avatar-wrap img { width: 100%; height: 100%; border-radius: 50%; object-fit: cover; }
	.time {
		position: absolute; top: 100%; left: 50%; transform: translateX(-50%);
		margin-top: 5px;
		font-family: var(--font-mono);
		font-size: 0.56rem; letter-spacing: 1px;
		color: var(--p-muted);
		white-space: nowrap;
	}
	.bub {
		padding: 11px 16px;
		background: var(--p-surface-2);
		border: 1px solid var(--p-line);
		border-radius: var(--r-lg);
		max-width: 72%;
	}
	.bub.short { border-radius: var(--r-pill); padding: 9px 18px; }
	.row.own .bub {
		background: var(--p-accent-soft);
		border-color: var(--p-accent-edge);
	}
	.bub p {
		margin: 0; font-size: 0.92rem; line-height: 1.5;
		color: var(--p-text); word-wrap: break-word;
	}
	.reactions-row {
		display: flex; justify-content: flex-start;
		padding-left: 42px; margin-top: 4px;
	}
	.reactions-row.own { justify-content: flex-end; padding-left: 0; padding-right: 42px; }
	.reactions { display: flex; gap: 6px; }
	.reaction {
		display: inline-flex; align-items: center; gap: 4px;
		padding: 2px 9px;
		border-radius: var(--r-pill);
		background: var(--p-surface-2);
		border: 1px solid var(--p-line);
		font-size: 0.8rem;
		color: var(--p-text);
	}
	.reaction-n {
		font-family: var(--font-mono);
		font-size: 0.62rem; color: var(--p-muted);
	}

	.composer-wrap { padding: var(--sp-3) var(--sp-4) var(--sp-4); }
	.composer {
		display: flex; align-items: center; gap: 8px;
		background: var(--p-surface-2);
		border: 1px solid var(--p-line-2);
		border-radius: var(--r-pill);
		padding: 5px 5px 5px 18px;
	}
	.composer-placeholder { flex: 1; font-size: 0.88rem; color: var(--p-muted); }
	.composer-send {
		width: 34px; height: 34px; border-radius: 50%;
		background: var(--p-accent); color: oklch(1 0 0 / 0.98);
		border: none; font-size: 1.05rem; cursor: pointer;
		display: flex; align-items: center; justify-content: center;
	}

	/* ─── PEOPLE ─── */
	.focus {
		flex: 1;
		display: flex;
		justify-content: center;
		align-items: flex-start;
		padding: var(--sp-4);
		overflow-y: auto;
		background: var(--p-bg);
	}

	/* Person card variants */
	.pc {
		width: 100%; max-width: 540px;
		background: var(--p-surface);
		border: 1px solid var(--p-line);
		border-radius: var(--r-lg);
		overflow: hidden;
	}
	.pc-banner-wrap { width: 100%; height: 150px; overflow: hidden; }
	.pc-banner-wrap.big { height: 240px; position: relative; }
	.pc-banner-wrap img { width: 100%; height: 100%; object-fit: cover; }
	.pc-vogue .pc-banner-wrap.big img { filter: brightness(0.6); }
	.pc-shade {
		position: absolute; inset: 0;
		background: linear-gradient(180deg, oklch(0 0 0 / 0.3) 0%, transparent 35%, var(--p-surface) 100%);
	}
	.pc-overlay {
		position: absolute; left: var(--sp-4); bottom: 56px;
	}
	.pc-overlay-eyebrow {
		font-family: var(--font-mono);
		font-size: 0.66rem; letter-spacing: 3px; text-transform: uppercase;
		color: oklch(1 0 0 / 0.85);
		display: block; margin-bottom: 8px;
	}
	.pc-display-name {
		font-size: 3rem; font-weight: 700;
		letter-spacing: -2px; line-height: 0.86;
		color: oklch(1 0 0 / 0.98);
		margin: 0;
		text-transform: uppercase;
	}

	.pc-body { padding: 0 var(--sp-4) var(--sp-4); }
	.pc-body-vogue { margin-top: -36px; }
	.pc-pfp-wrap {
		position: relative;
		width: 96px; height: 96px;
		margin-top: -48px; margin-bottom: var(--sp-3);
	}
	.pc-pfp-wrap.big { width: 108px; height: 108px; margin-top: 0; }
	.pc-pfp {
		width: 100%; height: 100%;
		border-radius: 50%; object-fit: cover;
		border: 4px solid var(--p-surface);
	}
	.pc-pfp-wrap .status-dot {
		position: absolute; bottom: 4px; right: 4px;
		border-color: var(--p-surface);
	}
	.pc-name {
		display: block;
		font-size: 1.5rem; font-weight: 700;
		letter-spacing: -0.5px;
		color: var(--p-text);
	}
	.pc-handle {
		display: block;
		font-family: var(--font-mono);
		font-size: 0.78rem; letter-spacing: 1px;
		color: var(--p-accent);
		margin-top: 2px;
	}
	.pc-meta {
		display: flex; align-items: center; gap: 10px;
		margin-top: 8px;
		font-family: var(--font-mono);
		font-size: 0.7rem; letter-spacing: 1.2px; text-transform: uppercase;
		color: var(--p-muted);
	}
	.dot-sep { color: var(--p-line-2); }
	.pc-meta-line {
		display: flex; align-items: center; gap: 10px;
		margin-top: var(--sp-2); margin-bottom: var(--sp-3);
		font-family: var(--font-mono);
		font-size: 0.7rem; letter-spacing: 1.2px; text-transform: uppercase;
		color: var(--p-secondary);
	}
	.pc-bio {
		font-size: 0.96rem; line-height: 1.6;
		color: var(--p-text-2);
		margin: var(--sp-3) 0 var(--sp-4);
	}
	.pc-actions { display: flex; gap: 10px; flex-wrap: wrap; }

	/* Wallpaper variant */
	.pc-wallpaper { position: relative; height: 440px; padding: 0; }
	.pc-wallpaper .pc-bg {
		position: absolute; inset: 0;
		width: 100%; height: 100%; object-fit: cover;
		filter: brightness(0.7);
	}
	.pc-wallpaper .pc-bg-shade {
		position: absolute; inset: 0;
		background:
			linear-gradient(135deg, oklch(0 0 0 / 0.32) 0%, transparent 50%),
			linear-gradient(0deg, oklch(0 0 0 / 0.50) 0%, transparent 50%);
	}
	.pc-floating {
		position: absolute;
		left: var(--sp-4); right: var(--sp-4);
		top: 50%;
		transform: translateY(-50%);
		padding: var(--sp-4);
		background: oklch(0.16 0.020 280 / 0.78);
		backdrop-filter: blur(20px);
		-webkit-backdrop-filter: blur(20px);
		border: 1px solid oklch(1 0 0 / 0.14);
		border-radius: var(--r-lg);
	}
	.pcf-head { display: flex; align-items: center; gap: 14px; margin-bottom: var(--sp-3); }
	.pcf-head .pc-pfp-wrap { width: 64px; height: 64px; margin: 0; }
	.pcf-head .pc-pfp { border: 3px solid oklch(1 0 0 / 0.22); }
	.pcf-head .status-dot { border-color: oklch(0.16 0.020 280); }
	.pcf-id { display: flex; flex-direction: column; gap: 4px; }
	.pc-name.light { font-size: 1.35rem; color: oklch(1 0 0 / 0.98); }
	.pc-handle.light { color: oklch(1 0 0 / 0.65); }
	.pc-bio.light { color: oklch(1 0 0 / 0.85); margin-bottom: var(--sp-3); }
	.pcf-grid {
		display: grid; grid-template-columns: repeat(3, 1fr);
		gap: var(--sp-3);
		padding: 10px 0;
		border-top: 1px solid oklch(1 0 0 / 0.14);
		border-bottom: 1px solid oklch(1 0 0 / 0.14);
		margin-bottom: var(--sp-3);
	}
	.pcf-grid > div { display: flex; flex-direction: column; gap: 3px; }
	.pcf-label {
		font-family: var(--font-mono);
		font-size: 0.56rem; letter-spacing: 1.6px; text-transform: uppercase;
		color: oklch(1 0 0 / 0.55);
	}
	.pcf-value {
		font-family: var(--font-mono);
		font-size: 0.74rem; letter-spacing: 0.8px;
		color: oklch(1 0 0 / 0.92);
		text-transform: capitalize;
	}

	/* ─── PROFILE PREVIEW SCREEN ─── */
	.profile-screen {
		display: flex; flex-direction: column;
		padding: var(--sp-5);
		height: 100%;
		overflow-y: auto;
	}
	.profile-screen.mobile { padding: var(--sp-3); padding-bottom: 70px; }
	.profile-head { margin-bottom: var(--sp-4); text-align: center; }
	.profile-head.mobile-head { text-align: left; margin-bottom: var(--sp-3); padding: 0; border-bottom: none; }
	.profile-sub {
		font-family: var(--font-mono);
		font-size: 0.7rem; letter-spacing: 1.2px; text-transform: uppercase;
		color: var(--p-muted);
		margin: 10px 0 0;
	}
	.profile-sub em { color: var(--p-accent); font-style: normal; }
	.profile-stage {
		flex: 1;
		display: flex; justify-content: center;
		align-items: flex-start;
	}

	/* ─── SETTINGS ─── */
	.settings-screen {
		display: flex; flex-direction: column;
		height: 100%;
		overflow-y: auto;
	}
	.settings-head {
		padding: var(--sp-4) var(--sp-5) var(--sp-3);
		border-bottom: 1px solid var(--p-line);
	}
	.settings-head .eyebrow { margin-bottom: 8px; }
	.settings-screen.mobile .settings-head { padding: var(--sp-3) var(--sp-4); }

	.settings-body {
		padding: var(--sp-4) var(--sp-5) var(--sp-5);
		display: flex; flex-direction: column;
		gap: var(--sp-3);
		max-width: 760px;
		width: 100%;
		margin: 0 auto;
	}
	.settings-screen.mobile .settings-body {
		padding: var(--sp-3) var(--sp-3) calc(70px + var(--sp-3));
		max-width: none;
		gap: var(--sp-3);
	}

	.set-hero {
		display: flex; align-items: center; gap: var(--sp-3);
		padding: 6px 0 var(--sp-3);
	}
	.hero-pfp-wrap { position: relative; width: 60px; height: 60px; }
	.hero-pfp { width: 100%; height: 100%; border-radius: 50%; object-fit: cover; }
	.hero-pfp-wrap .status-dot {
		position: absolute; bottom: 2px; right: 2px;
		border-color: var(--p-bg);
	}
	.hero-id { display: flex; flex-direction: column; gap: 2px; }
	.hero-name { font-size: 1.15rem; font-weight: 600; color: var(--p-text); }
	.hero-handle {
		font-family: var(--font-mono);
		font-size: 0.76rem; letter-spacing: 1px;
		color: var(--p-muted);
	}

	.set-card {
		display: flex; flex-direction: column;
		gap: 10px;
		padding: var(--sp-3) var(--sp-4);
		background: var(--p-surface);
		border: 1px solid var(--p-line);
		border-radius: var(--r-md);
	}
	.shell.is-light .set-card { border-color: var(--p-line-2); }
	.card-eyebrow {
		font-family: var(--font-mono);
		font-size: 0.6rem; letter-spacing: 2px; text-transform: uppercase;
		color: var(--p-secondary);
	}
	.card-sub {
		font-family: var(--font-mono);
		font-size: 0.66rem; letter-spacing: 1.2px;
		color: var(--p-muted);
		margin-top: -4px;
	}

	.field-stack { display: flex; flex-direction: column; gap: 6px; }
	.field-name { font-size: 0.92rem; font-weight: 500; color: var(--p-text); }
	.set-input {
		background: var(--p-bg);
		border: 1px solid var(--p-line-2);
		border-radius: var(--r-sm);
		padding: 10px 12px;
		color: var(--p-text);
		font-family: var(--font-mono);
		font-size: 0.86rem;
		transition: border-color 280ms var(--ease-out);
	}
	.set-input:focus { outline: none; border-color: var(--p-accent); }

	.presence-picker { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; }
	.presence-btn {
		display: flex; align-items: center; gap: 8px;
		padding: 9px 12px;
		background: transparent;
		border: 1px solid var(--p-line-2);
		border-radius: var(--r-pill);
		color: var(--p-text-2);
		cursor: pointer;
	}
	.presence-btn.active {
		border-color: var(--p-accent);
		background: var(--p-accent-soft);
		color: var(--p-text);
	}
	.presence-label {
		font-family: var(--font-mono);
		font-size: 0.6rem; letter-spacing: 1.2px; text-transform: uppercase;
	}

	.appearance-row {
		display: grid; grid-template-columns: 1fr;
		gap: var(--sp-3);
	}
	@container appframe (min-width: 600px) {
		.appearance-row { grid-template-columns: 1fr 200px; }
	}
	.appearance-col { display: flex; flex-direction: column; gap: 8px; }
	.col-label {
		font-family: var(--font-mono);
		font-size: 0.58rem; letter-spacing: 1.8px; text-transform: uppercase;
		color: var(--p-muted);
	}

	.theme-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 6px; }
	.theme-btn {
		display: flex; flex-direction: column; align-items: center; gap: 6px;
		padding: 10px 4px;
		background: transparent;
		border: 1px solid var(--p-line-2);
		border-radius: var(--r-sm);
		color: var(--p-text-2);
		cursor: pointer;
		transition: border-color 0.15s, background 0.15s;
	}
	.theme-btn.active { border-color: var(--p-accent); background: var(--p-accent-soft); }
	.theme-swatch {
		width: 26px; height: 26px;
		border-radius: 50%;
		border: 1px solid var(--p-line-2);
	}
	.theme-btn.active .theme-swatch { box-shadow: 0 0 0 2px var(--p-accent-soft); }
	.theme-label {
		font-family: var(--font-mono);
		font-size: 0.54rem; letter-spacing: 1px; text-transform: uppercase;
	}

	.mode-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
	.mode-card {
		display: flex; flex-direction: column; align-items: center; gap: 6px;
		padding: 14px 6px;
		background: transparent;
		border: 1px solid var(--p-line-2);
		border-radius: var(--r-sm);
		color: var(--p-text-2);
		cursor: pointer;
		transition: border-color 0.15s, background 0.15s;
	}
	.mode-card.active { border-color: var(--p-accent); background: var(--p-accent-soft); color: var(--p-text); }
	.mode-glyph { font-size: 1rem; }
	.mode-card-label {
		font-family: var(--font-mono);
		font-size: 0.62rem; letter-spacing: 1.5px; text-transform: uppercase;
	}

	.profile-style-list { display: flex; flex-direction: column; gap: 6px; }
	.profile-style-btn {
		display: flex; flex-direction: column;
		align-items: flex-start; gap: 3px;
		padding: 10px 14px;
		background: transparent;
		border: 1px solid var(--p-line-2);
		border-radius: var(--r-md);
		color: var(--p-text-2);
		text-align: left;
		cursor: pointer;
		transition: border-color 0.15s, background 0.15s;
	}
	.profile-style-btn.active {
		border-color: var(--p-accent);
		background: var(--p-accent-soft);
		color: var(--p-text);
	}
	.psb-label { font-size: 0.92rem; font-weight: 500; color: var(--p-text); }
	.psb-desc {
		font-family: var(--font-mono);
		font-size: 0.6rem; letter-spacing: 1px;
		color: var(--p-muted);
	}

	.signout {
		align-self: flex-start;
		margin-top: var(--sp-3);
	}

	/* ─── Mobile-specific overrides ─── */
	.home-screen.mobile, .people-screen.mobile, .profile-screen.mobile {
		display: flex; flex-direction: column;
		height: 100%; overflow-y: auto;
		padding-bottom: 70px;
	}
	.chat-screen.mobile {
		padding-bottom: 70px;
	}
	.chat-screen.mobile .chat-head { padding: var(--sp-3); }
	.chat-screen.mobile .chat-messages { padding: var(--sp-3) var(--sp-3); }
	.chat-screen.mobile .composer-wrap { padding: var(--sp-3); }
	.chat-screen.mobile .bub { max-width: 80%; }

	/* ─── Bottom nav (mobile only) ─── */
	.bottom-nav {
		position: absolute;
		left: 0; right: 0; bottom: 0;
		display: flex;
		background: color-mix(in oklch, var(--p-bg) 90%, transparent);
		backdrop-filter: blur(18px);
		border-top: 1px solid var(--p-line);
		padding: 6px 6px env(safe-area-inset-bottom);
	}
	.bn-item {
		flex: 1;
		display: flex; flex-direction: column; align-items: center;
		gap: 2px;
		padding: 10px 4px;
		background: transparent;
		border: none;
		border-radius: var(--r-sm);
		color: var(--p-muted);
		cursor: pointer;
		transition: color 0.15s, background 0.15s;
	}
	.bn-item.active {
		color: var(--p-accent);
		background: var(--p-accent-soft);
	}
	.bn-icon { font-size: 1rem; line-height: 1; }
	.bn-label {
		font-family: var(--font-mono);
		font-size: 0.56rem; letter-spacing: 1.2px; text-transform: uppercase;
	}
</style>
