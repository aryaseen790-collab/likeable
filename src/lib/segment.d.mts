export function extract(html: string): string[];
export function apply(html: string, translated: (string | undefined)[]): { html: string; bad: number };
export function validSegment(source: string, translated: unknown): boolean;
export function hashSegments(segments: string[]): string;
