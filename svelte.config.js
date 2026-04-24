import adapter from "@sveltejs/adapter-node";
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";

/** @type {import('@sveltejs/kit').Config} */
const config = {
	// Consult https://kit.svelte.dev/docs/integrations#preprocessors
	// for more information about preprocessors
	preprocess: vitePreprocess(),

	kit: {
		// Node server adapter — required because we use better-sqlite3, which
		// needs a persistent filesystem and a long-lived process. Deploy to
		// Fly.io / Railway / Render / a VPS, etc. Do NOT deploy to a serverless
		// platform like Vercel or Netlify — the SQLite file won't persist.
		adapter: adapter()
	}
};

export default config;
