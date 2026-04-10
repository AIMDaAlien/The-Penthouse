/**
 * App settings store — persists user preferences to localStorage.
 * OWNED BY: Claude (apps/web)
 */
import { browser } from '$app/environment';

type Density = 'spacious' | 'compact';

function createSettingsStore() {
	const stored = browser ? (localStorage.getItem('pth_density') as Density | null) : null;
	let density = $state<Density>(stored ?? 'spacious');

	$effect.root(() => {
		$effect(() => {
			if (browser) {
				localStorage.setItem('pth_density', density);
				document.documentElement.setAttribute('data-density', density);
			}
		});
	});

	// Apply on initial load
	if (browser) {
		document.documentElement.setAttribute('data-density', density);
	}

	return {
		get density() {
			return density;
		},
		setDensity(value: Density) {
			density = value;
		}
	};
}

export const settingsStore = createSettingsStore();
