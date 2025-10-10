/** Split a full name into first_name / last_name */
export function splitName(displayName?: string) {
if (!displayName) return { first_name: undefined, last_name: undefined } as const;
const parts = displayName.trim().split(/\s+/);
return parts.length === 1
? { first_name: parts[0], last_name: undefined } as const
: { first_name: parts.slice(0, -1).join(" "), last_name: parts.at(-1) } as const;
}
