import { GitHub } from "arctic";
import { GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, REDIRECT_URL } from "$env/static/private";

// TODO: Update redirect URI
export const github = new GitHub(GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, REDIRECT_URL);
