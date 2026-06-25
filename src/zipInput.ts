/** Split user ZIP input on commas, spaces, or both. */
export function parseZipInputSegments(raw: string): string[] {
  return raw
    .split(/[,\s]+/)
    .map((segment) => segment.trim())
    .filter(Boolean);
}
