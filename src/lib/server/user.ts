import { db } from "./db";

interface UserRow {
	id: number;
	github_id: number;
	email: string;
	username: string;
	github_access_token: string;
}

export async function createUser(
	githubId: number,
	email: string,
	username: string,
	githubAccessToken: string
): Promise<User> {
	const result = db
		.prepare(
			"INSERT INTO user (github_id, email, username, github_access_token) VALUES (?, ?, ?, ?)"
		)
		.run(githubId, email, username, githubAccessToken);

	const user: User = {
		id: Number(result.lastInsertRowid),
		github_id: githubId,
		email,
		username,
		github_access_token: githubAccessToken
	};
	return user;
}

export async function getUserFromGitHubId(
	githubId: number,
	githubAccessToken: string
): Promise<User | null> {
	db.prepare("UPDATE user SET github_access_token = ? WHERE github_id = ?").run(
		githubAccessToken,
		githubId
	);

	const row = db
		.prepare(
			"SELECT id, github_id, email, username, github_access_token FROM user WHERE github_id = ?"
		)
		.get(githubId) as UserRow | undefined;
	if (!row) {
		return null;
	}

	const user: User = {
		id: row.id,
		github_id: row.github_id,
		email: row.email,
		username: row.username,
		github_access_token: row.github_access_token
	};
	return user;
}

export interface User {
	id: number;
	email: string;
	github_id: number;
	username: string;
	github_access_token: string;
}
