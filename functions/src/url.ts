/** Helpers for safe URL handling & origin normalization */
export const isValidUrl = (u?: string | null) => {
try { new URL(String(u)); return true; } catch { return false; }
};

/**
* Normalize origin. Forces https for any non-localhost hostnames.
*/
export const normalizeOrigin = (raw: string | undefined, fallback: string) => {
const url = new URL(isValidUrl(raw) ? String(raw) : fallback);
if (!/^localhost|127\.0\.0\.1$/i.test(url.hostname)) url.protocol = "https:";
return `${url.protocol}//${url.host}`;
};

export const buildUrl = (origin: string, path: string) => new URL(path, origin).toString();