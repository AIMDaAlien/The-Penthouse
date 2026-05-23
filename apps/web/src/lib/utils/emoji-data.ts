export type { NativeEmoji } from './emoji-data-full';

export { NATIVE_EMOJI_FULL as NATIVE_EMOJI } from './emoji-data-full';

import { NATIVE_EMOJI_FULL } from './emoji-data-full';
import type { NativeEmoji } from './emoji-data-full';

/** Searches the full emoji dataset (up to 50 results). */
export function searchNativeEmoji(query: string): NativeEmoji[] {
	const q = query.toLowerCase();
	return NATIVE_EMOJI_FULL.filter(
		(e) => e.name.includes(q) || e.keywords.some((k) => k.includes(q))
	).slice(0, 50);
}
