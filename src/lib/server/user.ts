import { db } from "./db";

export function createUser(githubId: number, email: string, username: string, githubAccessToken: string): User {
	const row = db.queryOne(
		"INSERT INTO user (github_id, email, username, github_access_token) VALUES (?, ?, ?, ?) RETURNING user.id",
		[githubId, email, username, githubAccessToken]
	);
	if (row === null) {
		throw new Error("Unexpected error");
	}
	const user: User = {
		id: row.number(0),
		githubId,
		email,
		username,
		githubAccessToken
	};
	return user;
}

export function getUserFromGitHubId(githubId: number, githubAccessToken: string): User | null {
	db.execute("UPDATE user SET github_access_token = ? WHERE id = ?", [githubAccessToken, githubId]);
	const row = db.queryOne("SELECT id, github_id, email, username, github_access_token FROM user WHERE github_id = ?", [
		githubId
	]);
	if (row === null) {
		return null;
	}
	const user: User = {
		id: row.number(0),
		githubId: row.number(1),
		email: row.string(2),
		username: row.string(3),
		githubAccessToken: row.string(4)
	};
	return user;
}

export interface User {
	id: number;
	email: string;
	githubId: number;
	username: string;
	githubAccessToken: string;
}
