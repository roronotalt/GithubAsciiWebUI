import { db } from "./db";
import { encodeBase32, encodeHexLowerCase } from "@oslojs/encoding";
import { sha256 } from "@oslojs/crypto/sha2";
import type { User } from "./user";

import type { RequestEvent } from "@sveltejs/kit";
import { ObjectId } from "mongodb";

export async function validateSessionToken(token: string): Promise<SessionValidationResult> {
	const sessionId = encodeHexLowerCase(sha256(new TextEncoder().encode(token)));
	const sessionRow = await db.collection("sessions").findOne({ id: sessionId });
	const userRow = await db.collection("users").findOne({ _id: new ObjectId(sessionRow?.user_id) });

	if (sessionRow === null || userRow === null) {
		return { session: null, user: null };
	}
	const session: Session = {
		id: sessionRow.id,
		user_id: sessionRow.user_id,
		expiresAt: new Date(sessionRow.expiresAt * 1000)
	};
	const user: User = {
		id: userRow._id.toString(),
		github_id: userRow.github_id,
		email: userRow.email,
		username: userRow.username,
		github_access_token: userRow.github_access_token
	};

	if (Date.now() >= session.expiresAt.getTime()) {
		await db.collection("sessions").deleteOne({ id: session.id });
		return { session: null, user: null };
	}
	if (Date.now() >= session.expiresAt.getTime() - 1000 * 60 * 60 * 24 * 15) {
		session.expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30);
		if (user.github_access_token !== null) {
			await db
				.collection("sessions")
				.updateOne({ id: session.id }, { $set: { expiresAt: Math.floor(session.expiresAt.getTime() / 1000) } });
		}
	}

	return { session, user };
}

export async function invalidateSession(sessionId: string): Promise<void> {
	await db.collection("sesions").deleteOne({ id: sessionId });
}

export async function invalidateUserSessions(userId: number): Promise<void> {
	await db.collection("sessions").deleteMany({ user_id: userId });
}

export function setSessionTokenCookie(event: RequestEvent, token: string, expiresAt: Date): void {
	event.cookies.set("session", token, {
		httpOnly: true,
		path: "/",
		secure: import.meta.env.PROD,
		sameSite: "lax",
		expires: expiresAt
	});
}

export function deleteSessionTokenCookie(event: RequestEvent): void {
	event.cookies.set("session", "", {
		httpOnly: true,
		path: "/",
		secure: import.meta.env.PROD,
		sameSite: "lax",
		maxAge: 0
	});
}

export function generateSessionToken(): string {
	const tokenBytes = new Uint8Array(20);
	crypto.getRandomValues(tokenBytes);
	const token = encodeBase32(tokenBytes).toLowerCase();
	return token;
}

export async function createSession(token: string, userId: ObjectId): Promise<Session> {
	const sessionId = encodeHexLowerCase(sha256(new TextEncoder().encode(token)));
	const session: Session = {
		id: sessionId,
		user_id: userId.toString(),
		expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30)
	};
	await db.collection("sessions").insertOne(session);
	return session;
}

export interface Session {
	id: string;
	expiresAt: Date;
	user_id: string;
}

type SessionValidationResult = { session: Session; user: User } | { session: null; user: null };
