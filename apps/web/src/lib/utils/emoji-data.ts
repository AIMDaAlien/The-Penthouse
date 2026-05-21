export type { NativeEmoji } from './emoji-data-common';

export { NATIVE_EMOJI_COMMON, searchNativeEmojiCommon } from './emoji-data-common';
export { NATIVE_EMOJI_FULL, searchNativeEmojiFull } from './emoji-data-full';

import { NATIVE_EMOJI_COMMON } from './emoji-data-common';
import { NATIVE_EMOJI_FULL } from './emoji-data-full';
import type { NativeEmoji } from './emoji-data-common';

/** Re-export of the common subset for components that only need display (e.g. picker). */
export const NATIVE_EMOJI: NativeEmoji[] = NATIVE_EMOJI_COMMON;

/** Searches both common and full emoji datasets (up to 50 results). */
export function searchNativeEmoji(query: string): NativeEmoji[] {
	const q = query.toLowerCase();
	const combined = [...NATIVE_EMOJI_COMMON, ...NATIVE_EMOJI_FULL];
	return combined
		.filter(
			(e) => e.name.includes(q) || e.keywords.some((k) => k.includes(q))
		)
		.slice(0, 50);
}
