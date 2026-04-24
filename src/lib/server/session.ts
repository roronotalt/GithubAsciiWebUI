import { db } from "./db";
import { encodeBase32, encodeHexLowerCase } from "@oslojs/encoding";
import { sha256 } from "@oslojs/crypto/sha2";
import type { User } from "./user";

import type { RequestEvent } from "@sveltejs/kit";

interface SessionRow {
	id: string;
	user_id: number;
	expires_at: number;
}

interface UserRow {
	id: number;
	github_id: number;
	email: string;
	username: string;
	github_access_token: string;
}

export async function validateSessionToken(token: string): Promise<SessionValidationResult> {
	const sessionId = encodeHexLowerCase(sha256(new TextEncoder().encode(token)));

	const sessionRow = db
		.prepare("SELECT id, user_id, expires_at FROM session WHERE id = ?")
		.get(sessionId) as SessionRow | undefined;
	if (!sessionRow) {
		return { session: null, user: null };
	}

	const userRow = db
		.prepare("SELECT id, github_id, email, username, github_access_token FROM user WHERE id = ?")
		.get(sessionRow.user_id) as UserRow | undefined;
	if (!userRow) {
		return { session: null, user: null };
	}

	const session: Session = {
		id: sessionRow.id,
		user_id: sessionRow.user_id,
		expiresAt: new Date(sessionRow.expires_at * 1000)
	};
	const user: User = {
		id: userRow.id,
		github_id: userRow.github_id,
		email: userRow.email,
		username: userRow.username,
		github_access_token: userRow.github_access_token
	};

	if (Date.now() >= session.expiresAt.getTime()) {
		db.prepare("DELETE FROM session WHERE id = ?").run(session.id);
		return { session: null, user: null };
	}

	// Sliding expiration: extend if within 15 days of expiring.
	if (Date.now() >= session.expiresAt.getTime() - 1000 * 60 * 60 * 24 * 15) {
		session.expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30);
		db.prepare("UPDATE session SET expires_at = ? WHERE id = ?").run(
			Math.floor(session.expiresAt.getTime() / 1000),
			session.id
		);
	}

	return { session, user };
}

export async function invalidateSession(sessionId: string): Promise<void> {
	db.prepare("DELETE FROM session WHERE id = ?").run(sessionId);
}

export async function invalidateUserSessions(userId: number): Promise<void> {
	db.prepare("DELETE FROM session WHERE user_id = ?").run(userId);
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

export async function createSession(token: string, userId: number): Promise<Session> {
	const sessionId = encodeHexLowerCase(sha256(new TextEncoder().encode(token)));
	const session: Session = {
		id: sessionId,
		user_id: userId,
		expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30)
	};
	db.prepare("INSERT INTO session (id, user_id, expires_at) VALUES (?, ?, ?)").run(
		session.id,
		session.user_id,
		Math.floor(session.expiresAt.getTime() / 1000)
	);
	return session;
}

export interface Session {
	id: string;
	expiresAt: Date;
	user_id: number;
}

type SessionValidationResult = { session: Session; user: User } | { session: null; user: null };
