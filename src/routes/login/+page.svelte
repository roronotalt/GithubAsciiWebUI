<script lang="ts">
	import githubIcon from "../assets/github.svg";
</script>

<div class="login-container">
	<div class="login-box">
		<div class="pixel-border">
			<h1>Sign in</h1>
			<p class="subtitle">GitHub Activity Builder</p>

			<button class="github-button" on:click={() => (window.location.href = "/login/github")}>
				<img src={githubIcon} alt="GitHub Icon" />
				<span>Continue with GitHub</span>
			</button>
		</div>
	</div>
</div>

<style>
	@font-face {
		font-family: "pixel";
		src: url("/slkscr.ttf");
		font-weight: normal;
		font-style: normal;
	}

	.login-container {
		display: flex;
		justify-content: center;
		align-items: center;
		min-height: 100vh;
		background-color: #0d1117;
		padding: 1rem;
	}

	.login-box {
		background-color: #161b22;
		border-radius: 8px;
		padding: 2px;
		position: relative;
		width: 100%;
		max-width: 400px;
		box-shadow: 0 0 20px rgba(0, 0, 0, 0.3);
	}

	.pixel-border {
		border: 2px solid #30363d;
		border-radius: 6px;
		padding: 2rem;
		text-align: center;
	}

	h1 {
		color: #c9d1d9;
		font-size: 2rem;
		margin: 0 0 0.5rem 0;
		font-family: "pixel", monospace;
		text-transform: uppercase;
	}

	.subtitle {
		color: #8b949e;
		margin-bottom: 2rem;
		font-family: "pixel", monospace;
		font-size: 0.9rem;
	}

	.github-button {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.8rem;
		width: 100%;
		padding: 0.8rem;
		background-color: #238636;
		border: none;
		border-radius: 6px;
		color: white;
		font-family: "pixel", monospace;
		font-size: 1rem;
		cursor: pointer;
		transition: background-color 0.2s;
	}

	.github-button:hover {
		background-color: #2ea043;
	}

	.github-button img {
		width: 24px;
		height: 24px;
	}

	@media (max-width: 480px) {
		.login-box {
			margin: 1rem;
		}
	}
</style>
