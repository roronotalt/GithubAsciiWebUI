# GitHub OAuth example in SvelteKit

Uses SQLite. Rate limiting is implemented using JavaScript `Map`.

## Initialize project

Create a GitHub OAuth app with the redirect URI pointed to `/login/github/callback`.

```
http://localhost:5173/login/github/callback
```

Paste the client ID and secret to a `.env` file.

```bash
GITHUB_CLIENT_ID=""
GITHUB_CLIENT_SECRET="
```

Create `sqlite.db` and run `setup.sql`.

```
sqlite3 sqlite.db
```

Run the application:

```
pnpm dev
```

## Notes

- TODO: Update redirect URI


export let data: PageData;

	async function createRepo() {
		const userRequest = new Request("https://api.github.com/user/repos", {
			method: "POST",
			body: JSON.stringify({
				name: "GitcommitMessage",
				description: "A repo for your git commit activity message",
				private: false,
				is_template: false
			})
		});
		userRequest.headers.set("Authorization", `Bearer ${data.user.githubAccessToken}`);
		const userResponse = await fetch(userRequest);
		const userResult: any = await userResponse.json();
		for (const repo of userResult) {
			console.log(repo.name);
		}
		console.log(userResult);
	}

	async function checkRepo() {
		const userRequest = new Request("https://api.github.com/user/repos", {
			method: "GET"
		});
		userRequest.headers.set("Authorization", `Bearer ${data.user.githubAccessToken}`);
		const userResponse = await fetch(userRequest);
		const userResult: any = await userResponse.json();
		let constainsRepo = userResult.some((repo: any) => repo.name === "GitcommitMessage");
		return constainsRepo;
	}

	async function getCommits() {
		const contributions = await fetch(`/contributions?username=${data.user.username}`);
		return (await contributions.json()).maxContribution;
	}

	// Image URL
	const image = `https://avatars.githubusercontent.com/u/${data.user.githubId}`;
