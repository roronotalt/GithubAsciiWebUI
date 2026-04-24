import Database from "better-sqlite3";
import { env } from "$env/dynamic/private";

// Default to in-memory so this works on serverless platforms (Vercel, etc.)
// where the filesystem is read-only and the function container is ephemeral.
// On a real Node host with persistent disk, set SQLITE_PATH=./data.db (or any
// writable path) to keep data across restarts.
const dbPath = env.SQLITE_PATH ?? ":memory:";

export const db = new Database(dbPath);

// Pragmas that make sense for any backend.
if (dbPath !== ":memory:") {
	db.pragma("journal_mode = WAL");
}
db.pragma("foreign_keys = ON");

// Auto-create the schema on first connect. Mirrors setup.sql. Required for
// :memory: backends since each new container starts with an empty DB.
db.exec(`
    CREATE TABLE IF NOT EXISTS user (
        id INTEGER NOT NULL PRIMARY KEY,
        github_id INTEGER NOT NULL UNIQUE,
        email TEXT NOT NULL UNIQUE,
        username TEXT NOT NULL,
        github_access_token TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS github_id_index ON user(github_id);

    CREATE TABLE IF NOT EXISTS session (
        id TEXT NOT NULL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES user(id),
        expires_at INTEGER NOT NULL
    );
`);

console.log("SQLite database ready at " + dbPath);
