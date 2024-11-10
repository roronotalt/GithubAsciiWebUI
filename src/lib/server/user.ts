import type { ObjectId } from "mongodb";
import { db } from "./db";

export async function createUser(
	githubId: number,
	email: string,
	username: string,
	githubAccessToken: string
): Promise<User> {
	const row = await db.collection("users").insertOne({
		github_id: githubId,
		email: email,
		username: username,
		github_access_token: githubAccessToken
	});
	if (row === null) {
		throw new Error("Unexpected error");
	}
	const user: User = {
		id: row.insertedId.toString(),
		github_id: githubId,
		email,
		username,
		github_access_token: githubAccessToken
	};
	return user;
}

export async function getUserFromGitHubId(githubId: number, githubAccessToken: string): Promise<User | null> {
	await db.collection("users").updateOne({ github_id: githubId }, { $set: { github_access_token: githubAccessToken } });
	const row = await db.collection("users").findOne({ github_id: githubId });
	if (row === null) {
		return null;
	}
	const user: User = {
		id: row._id.toHexString(),
		github_id: row.github_id,
		email: row.email,
		username: row.username,
		github_access_token: row.github_access_token
	};
	return user;
}

export interface User {
	id: string;
	email: string;
	github_id: number;
	username: string;
	github_access_token: string;
}
