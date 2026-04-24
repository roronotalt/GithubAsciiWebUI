import adapter from "@sveltejs/adapter-vercel";
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";

/** @type {import('@sveltejs/kit').Config} */
const config = {
	// Consult https://kit.svelte.dev/docs/integrations#preprocessors
	// for more information about preprocessors
	preprocess: vitePreprocess(),

	kit: {
		// Vercel serverless adapter. Pin a Node runtime Vercel actually
		// supports (Node 24, the new default, is not supported by SvelteKit's
		// Vercel adapter as of this writing).
		adapter: adapter({
			runtime: "nodejs20.x"
		})
	}
};

export default config;
