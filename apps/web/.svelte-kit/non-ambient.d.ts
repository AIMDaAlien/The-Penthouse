
// this file is generated — do not edit it


declare module "svelte/elements" {
	export interface HTMLAttributes<T> {
		'data-sveltekit-keepfocus'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-noscroll'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-preload-code'?:
			| true
			| ''
			| 'eager'
			| 'viewport'
			| 'hover'
			| 'tap'
			| 'off'
			| undefined
			| null;
		'data-sveltekit-preload-data'?: true | '' | 'hover' | 'tap' | 'off' | undefined | null;
		'data-sveltekit-reload'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-replacestate'?: true | '' | 'off' | undefined | null;
	}
}

export {};


declare module "$app/types" {
	type MatcherParam<M> = M extends (param : string) => param is (infer U extends string) ? U : string;

	export interface AppTypes {
		RouteId(): "/" | "/auth" | "/chat" | "/chat/[id]" | "/settings" | "/users" | "/users/[id]";
		RouteParams(): {
			"/chat/[id]": { id: string };
			"/users/[id]": { id: string }
		};
		LayoutParams(): {
			"/": { id?: string };
			"/auth": Record<string, never>;
			"/chat": { id?: string };
			"/chat/[id]": { id: string };
			"/settings": Record<string, never>;
			"/users": { id?: string };
			"/users/[id]": { id: string }
		};
		Pathname(): "/" | "/auth" | `/chat/${string}` & {} | "/settings" | "/users" | `/users/${string}` & {};
		ResolvedPathname(): `${"" | `/${string}`}${ReturnType<AppTypes['Pathname']>}`;
		Asset(): "/robots.txt" | string & {};
	}
}