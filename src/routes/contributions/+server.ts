// uses a lot of: https://github.com/Erfaniaa/text-to-commit-history/blob/master/text_to_matrix.py
import { json } from "@sveltejs/kit";
import type { RequestEvent } from "@sveltejs/kit";
import { JSDOM } from "jsdom";

export async function GET(event: RequestEvent) {
	try {
		const username = event.url.searchParams.get("username");
		// Fetch the contributions HTML page
		const response = await fetch(`https://github.com/users/${username}/contributions`, {
			headers: {
				Accept: "text/html"
			}
		});

		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`);
		}

		// Get the text content and parse it
		const html = await response.text();
		const doc = new JSDOM(html);
		// Values for all of the github contributions
		let values: String[] = [];
		doc.window.document.querySelectorAll("tool-tip").forEach((element) => values.push(element.textContent as String));

		let maxContributions = 0;
		for (const value of values) {
			const match = value.match(/(\d+) contributions?/);
			if (match) {
				const contributions = parseInt(match[1], 10);
				maxContributions = Math.max(maxContributions, contributions);
			}
		}

		// multiplier to scale the contributions
		maxContributions = Math.max(Math.ceil(maxContributions / 4), 1);

		return json({
			maxContribution: maxContributions
		});
	} catch (error) {
		console.error("Error fetching contribution data:", error);
		return null;
	}
}
