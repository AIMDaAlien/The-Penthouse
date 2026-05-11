<script lang="ts">
	// ChatPane-10-MuseumExhibit
	const messages = [
		{ id: 1, sender: 'Alice', text: 'This belongs in a gallery.', time: '1901', isMine: false },
		{ id: 2, sender: 'Me', text: 'Framed and preserved.', time: '1902', isMine: true }
	];
</script>

<div class="chat-container">
	<div class="gallery-wall">
		<header class="gallery-plaque top-plaque">
			<h1>EXHIBIT A: ALICE</h1>
			<p class="curator-note">CURRENTLY ON DISPLAY</p>
		</header>

		<div class="exhibit-space">
			{#each messages as msg (msg.id)}
				<div class="artifact-container {msg.isMine ? 'mine' : 'theirs'}">
					<div class="frame">
						<div class="matting">
							<div class="canvas">
								<p class="artifact-text">"{msg.text}"</p>
							</div>
						</div>
					</div>
					<div class="plaque">
						<span class="plaque-title">{msg.sender}</span>
						<span class="plaque-desc">Circa {msg.time}</span>
					</div>
				</div>
			{/each}
		</div>

		<div class="gallery-plaque bottom-plaque">
			<div class="donation-box">
				<span class="box-label">CONTRIBUTE:</span>
				<input type="text" placeholder="Engrave your thoughts..." class="museum-input" />
				<button class="museum-btn">SUBMIT</button>
			</div>
		</div>
	</div>
</div>

<style>
	:global(*) {
		box-sizing: border-box;
	}
	.chat-container {
		display: flex;
		height: 760px;
		max-width: 860px;
		width: 100%;
		background: #12121C;
		font-family: 'Ubuntu', sans-serif;
		padding: 24px;
	}

	.gallery-wall {
		flex: 1;
		background: #1e1e2d;
		border: 1px solid #567dd4;
		box-shadow: inset 0 0 100px rgba(18, 18, 28, 0.8);
		display: flex;
		flex-direction: column;
		position: relative;
	}
	.gallery-wall::before {
		content: '';
		position: absolute;
		top: 0; left: 0; right: 0; bottom: 0;
		background: repeating-linear-gradient(
			0deg,
			transparent,
			transparent 2px,
			rgba(112, 112, 218, 0.05) 2px,
			rgba(112, 112, 218, 0.05) 4px
		);
		pointer-events: none;
	}

	.gallery-plaque {
		padding: 24px;
		text-align: center;
		background: #12121C;
		border-bottom: 1px solid #7070da;
		position: relative;
		z-index: 1;
	}
	.top-plaque {
		border-bottom: 2px solid #567dd4;
	}
	.bottom-plaque {
		border-top: 2px solid #567dd4;
		border-bottom: none;
		padding: 32px 24px;
	}

	h1 {
		margin: 0;
		color: #E2E2EC;
		font-size: 1.2rem;
		letter-spacing: 6px;
		font-weight: 300;
	}
	.curator-note {
		margin: 8px 0 0 0;
		color: #8282c3;
		font-size: 0.8rem;
		letter-spacing: 2px;
	}

	.exhibit-space {
		flex: 1;
		padding: 48px;
		display: flex;
		flex-direction: column;
		gap: 64px;
		overflow-y: auto;
		position: relative;
		z-index: 1;
	}

	.artifact-container {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 24px;
		max-width: 80%;
	}
	.artifact-container.mine {
		align-self: flex-end;
	}
	.artifact-container.theirs {
		align-self: flex-start;
	}

	.frame {
		background: linear-gradient(135deg, #567dd4, #12121C);
		padding: 8px;
		box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
		transition: transform 0.4s ease;
	}
	.frame:hover {
		transform: scale(1.02);
	}
	.matting {
		background: #E2E2EC;
		padding: 32px;
	}
	.canvas {
		background: #1e1e2d;
		padding: 24px;
		border: 1px solid rgba(112, 112, 218, 0.2);
	}
	.artifact-text {
		margin: 0;
		color: #E2E2EC;
		font-size: 1.2rem;
		line-height: 1.6;
		font-weight: 300;
		text-align: center;
		font-style: italic;
	}

	.plaque {
		background: #12121C;
		border: 1px solid #7070da;
		padding: 8px 16px;
		text-align: center;
		display: flex;
		flex-direction: column;
		gap: 4px;
		box-shadow: 0 4px 10px rgba(0, 0, 0, 0.3);
	}
	.plaque-title {
		color: #E2E2EC;
		font-size: 0.9rem;
		letter-spacing: 2px;
		text-transform: uppercase;
	}
	.plaque-desc {
		color: #8282c3;
		font-size: 0.7rem;
	}

	.donation-box {
		display: flex;
		align-items: center;
		gap: 16px;
		max-width: 600px;
		margin: 0 auto;
		background: #1e1e2d;
		border: 1px solid #567dd4;
		padding: 8px;
	}
	.box-label {
		color: #8282c3;
		font-size: 0.8rem;
		letter-spacing: 2px;
		padding-left: 16px;
	}
	.museum-input {
		flex: 1;
		background: transparent;
		border: none;
		color: #E2E2EC;
		font-family: inherit;
		font-size: 1rem;
		outline: none;
	}
	.museum-input::placeholder {
		color: #567dd4;
		font-style: italic;
	}
	.museum-btn {
		background: #12121C;
		color: #7070da;
		border: 1px solid #7070da;
		padding: 12px 24px;
		letter-spacing: 2px;
		cursor: pointer;
		transition: all 0.2s;
	}
	.museum-btn:hover {
		background: #7070da;
		color: #12121C;
	}
</style>