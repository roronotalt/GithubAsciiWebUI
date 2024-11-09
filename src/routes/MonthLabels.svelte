<script lang="ts">
	export let startDate: Date;

	const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

	function getMonthLabels(): { label: string; offset: number }[] {
		const labels: { label: string; offset: number }[] = [];
		const currentDate = new Date(startDate);
		let currentWeek = 0;

		while (currentWeek < 53) {
			if (currentDate.getDate() <= 7) {
				labels.push({
					label: months[currentDate.getMonth()],
					offset: currentWeek
				});
			}
			// Move to next week
			currentDate.setDate(currentDate.getDate() + 7);
			currentWeek++;
		}

		return labels;
	}

	$: monthLabels = getMonthLabels();
</script>

<div class="month-labels">
	{#each monthLabels as { label, offset }}
		<span class="month-label">
			{label}
		</span>
	{/each}
</div>

<style>
	.month-labels {
		position: relative;
		width: 100%;
		margin-bottom: 4px;
		box-sizing: border-box;
		font-family: "pixel";
		/* Add display: flex to create a flexible container */
		display: flex;
		/* Justify content to space items evenly */
		justify-content: space-between;
		/* Optional: add some padding to prevent text from touching edges */
		padding: 0 10px;
	}

	.month-label {
		font-size: 12px;
		color: #666;
		/* Remove transform since we're using flexbox */
		white-space: nowrap;
		/* Optional: add text-align center to center each label */
		text-align: center;
	}
</style>
