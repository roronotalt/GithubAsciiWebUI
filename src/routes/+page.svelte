<script lang="ts">
	// Bitmap matrix taken and modified from https://github.com/wangzhaoming/Font-to-Pixel/blob/a3a7efa801453be6f0442023b454944199e872ac/bundle.js
	import type { PageData } from "./$types";
	import { enhance } from "$app/forms";
	import { onMount } from "svelte";
	import { writable, get, type Writable } from "svelte/store";
	import MonthLabels from "./MonthLabels.svelte";

	export let data: PageData;
	let mutliplier = 1;

	async function createRepo() {
		const userRequest = new Request("https://api.github.com/user/repos", {
			method: "POST",
			body: JSON.stringify({
				name: "GitcommitMessage",
				description: "A repo for your git commit activity message made by @roronotalt on X",
				auto_init: true,
				private: false,
				is_template: false
			})
		});
		userRequest.headers.set("Authorization", `Bearer ${data.user.github_access_token}`);
		await fetch(userRequest);
	}

	async function checkRepo() {
		const userRequest = new Request("https://api.github.com/user/repos", {
			method: "GET"
		});
		userRequest.headers.set("Authorization", `Bearer ${data.user.github_access_token}`);
		const userResponse = await fetch(userRequest);
		const userResult: any = await userResponse.json();
		let constainsRepo = userResult.find((repo: any) => repo.name === "GitcommitMessage");
		return constainsRepo;
	}

	let name = "";
	async function getUserName() {
		if (name === "") {
			const userRequest = new Request("https://api.github.com/user", {
				method: "GET"
			});
			userRequest.headers.set("Authorization", `Bearer ${data.user.github_access_token}`);
			const userResponse = await (await fetch(userRequest)).json();
			name = userResponse.name;
			return userResponse.name;
		}
		return name;
	}

	let treeIndex = 0;
	let tree: String[] = [];
	async function flipFlopTree() {
		while (tree.length < 2) {
			// Create blob object, low chance for stale changes
			let number = Math.random() * 100000;
			const blobRequest = new Request(`https://api.github.com/repos/${data.user.username}/GitcommitMessage/git/blobs`, {
				method: "POST",
				body: JSON.stringify({
					content: "this is a automated commit to show a messge in the users profile. Random ID: " + number.toString(),
					encoding: "utf-8"
				})
			});
			blobRequest.headers.set("Authorization", `Bearer ${data.user.github_access_token}`);

			const blobResponse = await (await fetch(blobRequest)).json();
			const treeRequest = new Request(`https://api.github.com/repos/${data.user.username}/GitcommitMessage/git/trees`, {
				method: "POST",
				body: JSON.stringify({
					tree: [
						{
							path: "README.md",
							mode: "100644",
							type: "blob",
							sha: blobResponse.sha
						}
					]
				})
			});
			treeRequest.headers.set("Authorization", `Bearer ${data.user.github_access_token}`);
			const treeResponse = await (await fetch(treeRequest)).json();
			tree.push(treeResponse.sha);
		}
		treeIndex = treeIndex == 0 ? 1 : 0;
		return tree[treeIndex];
	}

	function getStartDate() {
		// Get today's date
		const today = new Date();

		// Create a date one year ago today at 12:00 noon
		let date = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate(), 12, 0, 0);

		// Get the day of the week (0 = Sunday, 6 = Saturday)
		let weekday = date.getDay();

		// Loop until the day is Sunday
		while (weekday !== 0) {
			// Subtract one day to move to the previous day
			date.setDate(date.getDate() - 1);
			// Update the weekday after changing the date
			weekday = date.getDay();
		}

		return date;
	}

	function getOffsetDate(startDate: Date, offsetDays = 0) {
		// Check if offsetDays is a number
		if (typeof offsetDays !== "number" || !Number.isInteger(offsetDays)) {
			throw new TypeError("offsetDays must be an integer.");
		}

		// Clone the startDate to avoid mutating the original date
		const newDate = new Date(startDate.getTime());

		// Apply the offset
		newDate.setDate(newDate.getDate() + offsetDays);

		return newDate;
	}

	async function commit(date: Date) {
		const commitRequest = new Request(
			`https://api.github.com/repos/${data.user.username}/GitcommitMessage/git/commits`,
			{
				method: "POST",
				body: JSON.stringify({
					message: "Automatic commit create by GithubMessage",
					author: {
						name: await getUserName(),
						email: data.user.email,
						date: date.toISOString()
					},
					tree: await flipFlopTree()
				})
			}
		);
		commitRequest.headers.set("Authorization", `Bearer ${data.user.github_access_token}`);
		const commitResponse = await (await fetch(commitRequest)).json();
		console.log(commitResponse);

		// Update the reference to point to the new commit
		const updateRefRequest = new Request(
			`https://api.github.com/repos/${data.user.username}/GitcommitMessage/git/refs/heads/main`,
			{
				method: "PATCH",
				body: JSON.stringify({
					sha: commitResponse.sha,
					force: true
				})
			}
		);
		updateRefRequest.headers.set("Authorization", `Bearer ${data.user.github_access_token}`);
		const updateRefResponse = await (await fetch(updateRefRequest)).json();

		console.log(updateRefResponse);
	}

	async function deleteRepo() {
		if (confirm("WARNING: this will delete the GithubcommitMessage repo on your account")) {
			const userRequest = new Request(`https://api.github.com/repos/${data.user.username}/GitcommitMessage`, {
				method: "DELETE"
			});
			userRequest.headers.set("Authorization", `Bearer ${data.user.github_access_token}`);
			await fetch(userRequest);
			alert("Successfully deleted repo, it may take a few minutes for the changes to be reflected.");
		}
	}

	onMount(async () => {
		document.fonts.load(`12px pixel`).catch((e) => {
			console.error(e);
		});
	});

	async function getCommits() {
		const contributions = await fetch(`/contributions?username=${data.user.username}`);
		return (await contributions.json()).maxContribution;
	}

	// Create writable stores for input text and bitmap matrix
	const textValue = writable<string>("");
	// have bitmap that is 7 rows and 53 columns
	const bitmapMatrix = writable<number[][]>(Array(7).fill(Array(53).fill(0)));

	// Constants, no changing these for now - maybe in the future
	const MATRIX_HEIGHT = 7;
	let FONT_SIZE = 8;
	const MATRIX_ON = 4;
	const MATRIX_OFF = 1;

	// Image URL
	const image = `https://avatars.githubusercontent.com/u/${data.user.github_id}`;

	// Function to create the bitmap matrix
	let changedBefore = false;
	async function createBitMapMatrix() {
		const currentText = get(textValue).trim();

		if (!changedBefore && !currentText) {
			return;
		}
		changedBefore = true;

		// Create an off-screen canvas
		const canvas = document.createElement("canvas");
		const ctx = canvas.getContext("2d");

		if (!ctx) {
			alert("Unable to get canvas context.");
			return;
		}

		// Clear the canvas
		ctx.clearRect(0, 0, canvas.width, canvas.height);

		let len = 0;
		for (let i = 0; i < currentText.length; i++) {
			const code = currentText.charCodeAt(i);
			if (code < 256) {
				// ascii
				if (FONT_SIZE === 8) {
					len += 1;
				} else {
					len += 0.5;
				}
			} else {
				len++;
			}
		}

		let colPixels = Math.max(Math.ceil(len * FONT_SIZE), 1);
		let rowPixels = MATRIX_HEIGHT;
		let textToDraw = [currentText];

		canvas.width = colPixels;
		canvas.height = rowPixels;

		const containerWidth = canvas.parentElement?.offsetWidth ?? 0;
		canvas.style.height = canvas.height * 3 + "px";
		canvas.style.width = canvas.width * 3 + "px";
		if (canvas.width * 3 > containerWidth) {
			canvas.style.width = containerWidth + "px";
			canvas.style.height = (canvas.height / canvas.width) * containerWidth + "px";
		}

		ctx.fillStyle = "rgb(0, 0, 0)";
		ctx.fillRect(0, 0, colPixels, rowPixels);

		// Re-set font after resizing canvas (font settings can reset after resizing)
		ctx.font = `${FONT_SIZE}px pixel`;
		ctx.lineWidth = 5;
		ctx.textBaseline = "top";
		ctx.fillStyle = "rgb(255, 255, 255)";

		for (let i = 0; i < textToDraw.length; i++) {
			ctx.fillText(textToDraw[i], 0, i * FONT_SIZE);
		}

		const imageData = ctx.getImageData(0, 0, colPixels, rowPixels);
		const matrix: number[][] = [];
		for (let i = 0; i < rowPixels; i++) {
			const row: number[] = [];
			for (let j = 0; j < colPixels; j++) {
				const n = i * colPixels * 4 + j * 4;
				row.push(imageData.data[n] > 100 ? MATRIX_ON : MATRIX_OFF);
			}
			matrix.push(row);
		}

		let i = 0;
		let cols: Boolean[] = [];
		while (matrix[0].length > i) {
			let colEmpty = true;
			for (let j = 0; j < matrix.length; j++) {
				if (matrix[j][i] == MATRIX_ON) {
					colEmpty = false;
					break;
				}
			}
			cols.push(colEmpty);
			if (colEmpty && i == 0) {
				for (let j = 0; j < matrix.length; j++) {
					matrix[j].splice(0, 1);
				}
			} else if (colEmpty && i == matrix[0].length - 1) {
				let emtyEndCols = 0;
				for (let j = cols.length - 1; j >= 0; j--) {
					if (cols[j] == false) {
						break;
					}
					emtyEndCols++;
				}
				for (let j = 0; j < matrix.length; j++) {
					matrix[j].splice(matrix[j].length - emtyEndCols, emtyEndCols);
				}
				i++;
			} else {
				i++;
			}
		}

		// Sliding window
		i = 0;
		while (cols.length > i + 4) {
			if (cols[i] && cols[i + 1] && cols[i + 2] && cols[i + 3]) {
				for (let j = 0; j < matrix.length; j++) {
					matrix[j].splice(i, 4);
				}
				cols.splice(i, 4);
				i++;
			}

			if (cols[i] && cols[i + 1]) {
				for (let j = 0; j < matrix.length; j++) {
					matrix[j].splice(i, 1);
				}
				cols.splice(i, 1);
			}
			i++;
		}

		// Ofnter the bitmap based on SliderValue
		for (let i = 0; i < matrix.length; i++) {
			for (let j = 0; j < Math.abs($sliderValue); j++) {
				if ($sliderValue > 0) {
					matrix[i].unshift(0);
				} else {
					matrix[i].push(0);
				}
			}
		}

		// Center the bitmap if autoCenter is enabled, knowing that the width is 53 colums and the height is 7 rows
		if ($isChecked) {
			let startingPoint = Math.floor(26.5 - matrix[0].length / 2);
			for (let i = 0; i < matrix.length; i++) {
				for (let j = 0; j < startingPoint; j++) {
					matrix[i].unshift(0);
				}
			}
		}

		// Update the store
		bitmapMatrix.set(matrix);
		console.log(matrix);
	}

	// Store the writable values
	let sliderValue: Writable<number> = writable(0);
	let isChecked: Writable<boolean> = writable(true);

	textValue.subscribe((_) => {
		createBitMapMatrix();
	});

	sliderValue.subscribe((_) => {
		createBitMapMatrix();
	});

	isChecked.subscribe((_) => {
		createBitMapMatrix();
	});

	let loading = false;
	let progress = "";

	async function save() {
		if (loading) {
			return;
		}
		loading = true;

		let bitmap = get(bitmapMatrix);
		if (bitmap == null || bitmap.length == 0) {
			alert("No bitmap matrix to save");
			return;
		}

		if (!(await checkRepo())) {
			await createRepo();
		}

		// Generate commit dates
		let commitDates: Date[] = [];
		let offset = 0;
		let startDate = getStartDate();
		console.log(bitmap);
		for (let j = 0; j < bitmap[0].length; j++) {
			for (let i = 0; i < bitmap.length; i++) {
				if (bitmap[i][j] == MATRIX_ON) {
					console.log(i, j, offset);
					commitDates.push(getOffsetDate(startDate, offset));
				}
				offset++;
			}
		}

		let commitMultiplier = await getCommits();
		// Commit to github
		for (let i = 0; i < commitDates.length; i++) {
			progress = `Committing ${i + 1} of ${commitDates.length} - KEEP THIS WINDOW OPEN`;
			for (let j = 0; j < commitMultiplier * mutliplier; j++) {
				await commit(commitDates[i]);
			}
		}
		loading = false;
		alert("Done! might take a few minutes for the changes to be reflected.");
	}
	// drag functionality
	type Position = {
		i: number;
		j: number;
	};
	// Store for tracking mouse state
	const isDragging: Writable<boolean> = writable(false);

	function handleMouseDown(position: Position | null): void {
		isDragging.set(true);
		if (position !== null) {
			updateCell(position);
		}
	}

	function handleMouseUp(): void {
		isDragging.set(false);
	}

	function handleMouseEnter(position: Position): void {
		let dragging: boolean = false;
		isDragging.subscribe((value) => {
			dragging = value;
		})();

		if (dragging) {
			updateCell(position);
		}
	}

	function updateCell(position: Position): void {
		const { i, j } = position;
		bitmapMatrix.update((matrix) => {
			const newMatrix = [...matrix];
			newMatrix[i] = [...newMatrix[i]];
			if (newMatrix[i][j] == undefined) {
				newMatrix[i][j] = 4;
			} else {
				newMatrix[i][j] = newMatrix[i][j] == 0 ? 4 : 0;
			}
			return newMatrix;
		});
	}

	let menuOpen = false; // For toggling the profile dropdown menu
	// Close the menu when clicking outside
	onMount(() => {
		const handleClickOutside = (event: any) => {
			if (!event.target.closest(".profile")) {
				menuOpen = false;
			}
		};
		window.addEventListener("click", handleClickOutside);
		return () => {
			window.removeEventListener("click", handleClickOutside);
		};
	});

	const handleCheckboxClick = (evt: any) => {
		isChecked.set(!evt.target.checked);
	};
</script>

<div class="profile-container">
	<div class="profile">
		<button
			class="profile-button"
			on:click={() => (menuOpen = !menuOpen)}
			aria-haspopup="true"
			aria-expanded={menuOpen}
		>
			<img src={image} height="50" width="50" alt="profile" class="profile-image" />
		</button>
		{#if menuOpen}
			<div class="dropdown-menu" role="menu">
				<form method="post" use:enhance>
					<button class="dropdown-item">Sign Out</button>
				</form>
			</div>
		{/if}
	</div>
</div>

<div class="main-container">
	<div class="content">
		<div class="input-group">
			<h1>GithubMessage</h1>
			<h3>WARNING: any settings changes will reset your drawing</h3>
			<input type="text" bind:value={$textValue} placeholder="Enter text" class="custom-input" />

			<div class="slider-container">
				<span class="slider-value">offset</span>
				<input type="range" bind:value={$sliderValue} min="-40" max="40" class="custom-slider" />
				<span class="slider-value">{$sliderValue}px </span>
			</div>

			<label class="checkbox-container">
				<input type="checkbox" on:click={handleCheckboxClick} bind:checked={$isChecked} />
				<span class="checkmark">
					{$isChecked ? "✓" : "x"}
				</span>
				AutoCenter
			</label>
			<span class="progress-text">{progress}</span>
			<div>
				<span class="progress-text">Commit multiplier</span>
				<input class="custom-input-mul" width="5ch" type="number" bind:value={mutliplier} />
			</div>
		</div>

		<div class="button-group">
			<button class="custom-button primary" on:click={save}>Save message</button>
			<button class="custom-button secondary" on:click={deleteRepo}>Clear commits</button>
		</div>
		<div class="scrolling">
			<div class="activity-container">
				<MonthLabels startDate={getStartDate()} />
				<div class="grid-wrapper">
					<div
						class="bitmap-grid"
						on:mouseup={handleMouseUp}
						on:mouseleave={handleMouseUp}
						on:mousedown={() => handleMouseDown(null)}
						aria-label="Grid"
					>
						{#each { length: 53 } as _, j}
							{#each { length: 7 } as _, i}
								<div
									class="bitmap-cell"
									class:level-0={$bitmapMatrix[i][j] === 0}
									class:level-4={$bitmapMatrix[i][j] === 4}
									on:mousedown={() => handleMouseDown({ i, j })}
									on:mouseenter={() => handleMouseEnter({ i, j })}
									aria-label={`Cell ${i},${j}`}
								/>
							{/each}
						{/each}
					</div>
				</div>
			</div>
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
	* {
		font-family: "pixel";
		margin: 0;
	}

	img {
		border-radius: 50%;
	}

	input {
		padding: 8px;
		margin-right: 8px;
		font-size: 14px;
	}

	button {
		padding: 8px 12px;
		margin-right: 4px;
		font-size: 14px;
		cursor: pointer;
	}

	.scrolling {
		width: 100%;
		overflow-x: auto;
		overflow-y: hidden;
		padding-bottom: 1rem; /* Add space for scrollbar */
		-webkit-overflow-scrolling: touch; /* Smooth scrolling on iOS */
	}

	/* Bitmap Matrix Grid Styling */
	.bitmap-grid {
		display: grid;
		gap: 2px;
		/* Adjust the grid template based on the matrix dimensions */
		grid-auto-flow: column;
	}

	.bitmap-cell {
		width: 10px;
		height: 10px;
		background-color: #ebedf0; /* Default color for 'off' pixels */
		border-radius: 3px;
		transition: background-color 0.3s;
	}

	.level-4 {
		background-color: #196127;
	}

	.activity-container {
		width: 760px;
		margin: 0 auto;
		padding: 0.5rem;
		box-sizing: border-box;
	}

	.grid-wrapper {
		display: flex;
		gap: 4px;
		align-items: start;
	}

	.bitmap-grid {
		display: grid;
		grid-template-columns: repeat(53, 1ch);
		grid-template-rows: repeat(7, 1ch);
		gap: 2px;
		width: 100%;
		padding: 4px;
		background: rgba(0, 0, 0, 0.02);
		border-radius: 6px;
	}

	.bitmap-cell {
		aspect-ratio: 1;
		border-radius: 2px;
		transition: all 0.2s ease;
	}

	.bitmap-cell:hover {
		transform: scale(1.2);
		z-index: 1;
	}

	.content {
		flex: 1;
		margin-right: 2rem;
	}

	.input-group {
		flex-direction: column;
		display: flex;
		align-items: center;
		gap: 1rem;
		margin-bottom: 1rem;
	}

	.custom-input {
		flex: 1;
		padding: 0.75rem 1rem;
		border: 2px solid #e2e8f0;
		border-radius: 0.5rem;
		font-size: 0.875rem;
		transition: all 0.2s;
	}

	.custom-input:focus {
		outline: none;
		border-color: #3b82f6;
		box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
	}

	.slider-container {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.custom-slider {
		-webkit-appearance: none;
		width: 150px;
		height: 6px;
		background: #e2e8f0;
		border-radius: 3px;
		outline: none;
	}

	.custom-slider::-webkit-slider-thumb {
		-webkit-appearance: none;
		width: 18px;
		height: 18px;
		background: #3b82f6;
		border-radius: 50%;
		cursor: pointer;
		transition: all 0.2s;
	}

	.custom-slider::-webkit-slider-thumb:hover {
		transform: scale(1.1);
	}

	.slider-value {
		min-width: 3rem;
		font-size: 0.875rem;
		color: #64748b;
	}

	.checkbox-container {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		cursor: pointer;
		font-size: 0.875rem;
		position: relative;
		padding-left: 28px;
		color: #64748b;
	}

	.button-group {
		display: flex;
		gap: 0.75rem;
	}

	.custom-button {
		padding: 0.625rem 1.25rem;
		border: none;
		border-radius: 0.5rem;
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s;
	}

	.custom-button:hover {
		transform: translateY(-1px);
	}

	.primary {
		background-color: #3b82f6;
		color: white;
	}

	.primary:hover {
		background-color: #2563eb;
		box-shadow: 0 4px 6px -1px rgba(59, 130, 246, 0.1);
	}

	.secondary {
		background-color: #f1f5f9;
		color: #475569;
	}

	.secondary:hover {
		background-color: #e2e8f0;
	}

	.profile {
		position: relative;
	}

	.profile-button {
		background: none;
		border: none;
		padding: 0;
		cursor: pointer;
		transition: transform 0.2s;
	}

	.profile-button:hover {
		transform: scale(1.05);
	}

	.profile-image {
		border-radius: 50%;
		border: 2px solid #e2e8f0;
		transition: all 0.2s;
	}

	.profile-button:hover .profile-image {
		border-color: #3b82f6;
		background: none;
	}

	body {
		margin: 0;
		font-family: sans-serif;
		background-color: #f9fafb;
	}

	/* Profile Container */
	.profile-container {
		position: fixed;
		top: 1rem;
		right: 1rem;
		z-index: 1000;
	}

	/* Dropdown Menu */
	.dropdown-menu {
		position: absolute;
		top: 60px;
		right: 0;
		background-color: white;
		border: 1px solid #e2e8f0;
		border-radius: 0.5rem;
		box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
		min-width: 120px;
		z-index: 1000;
	}

	.dropdown-item {
		width: 100%;
		padding: 0.5rem 1rem;
		background: none;
		border: none;
		text-align: left;
		cursor: pointer;
		font-size: 0.875rem;
		color: #475569;
	}

	.dropdown-item:hover {
		background-color: #f3f4f6;
	}

	/* Main Container */
	.main-container {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 2rem;
		padding-top: 4rem;
		min-height: 100vh;
		box-sizing: border-box;
	}

	.content {
		background-color: white;
		padding: 2rem;
		border-radius: 0.75rem;
		box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
		max-width: 800px;
		width: 100%;
		margin-bottom: 2rem;
	}

	.input-group {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 1rem;
		margin-bottom: 1.5rem;
	}

	.custom-input-mul {
		flex: 2;
		padding: 0.75rem 1rem;
		border: 2px solid #e2e8f0;
		border-radius: 0.5rem;
		font-size: 1rem;
		transition: all 0.2s;
		width: 5ch;
	}

	.custom-input-mul:focus {
		outline: none;
		border-color: #3b82f6;
		box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
	}

	.custom-input {
		flex: 2;
		padding: 0.75rem 1rem;
		border: 2px solid #e2e8f0;
		border-radius: 0.5rem;
		font-size: 1rem;
		transition: all 0.2s;
		width: 80%;
	}

	.custom-input:focus {
		outline: none;
		border-color: #3b82f6;
		box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
	}

	.slider-container {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		flex: 1;
		min-width: 200px;
	}

	.slider-value {
		min-width: 3rem;
		font-size: 0.875rem;
		color: #64748b;
		text-align: center;
	}

	.checkbox-container {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		cursor: pointer;
		font-size: 0.875rem;
		position: relative;
		padding-left: 28px;
		color: #64748b;
		user-select: none;
	}

	.checkbox-container input {
		position: absolute;
		opacity: 0;
		cursor: pointer;
		height: 0;
		width: 0;
	}

	.button-group {
		display: flex;
		gap: 0.75rem;
		flex-wrap: wrap;
	}

	.custom-button {
		padding: 0.625rem 1.25rem;
		border: none;
		border-radius: 0.5rem;
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s;
		flex: 1;
		min-width: 100px;
	}

	.custom-button:hover {
		transform: translateY(-1px);
	}

	.primary {
		background-color: #3b82f6;
		color: white;
	}

	.primary:hover {
		background-color: #2563eb;
	}

	.secondary {
		background-color: #f1f5f9;
		color: #475569;
	}

	.secondary:hover {
		background-color: #e2e8f0;
	}
</style>
