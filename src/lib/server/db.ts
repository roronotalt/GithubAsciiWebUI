import Database from "better-sqlite3";
import { env } from "$env/dynamic/private";

// Default to a file in the project root; can be overridden via SQLITE_PATH env var.
const dbPath = env.SQLITE_PATH ?? "data.db";

export const db = new Database(dbPath);

// Better defaults for a long-running server.
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

// Auto-create the schema on first run. Mirrors setup.sql.
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
