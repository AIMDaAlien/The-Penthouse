// Shared form state factory for the 10 editorial auth prototypes.
// Each variant calls createAuthForm() to get its own isolated reactive state.
// Submit is mocked; real auth wiring is out of scope for prototypes.

export type AuthMode = 'login' | 'register';

const PASSWORD_MIN = 10;
const PASSWORD_MAX = 128;

export function createAuthForm() {
	let mode = $state<AuthMode>('login');
	let username = $state('');
	let password = $state('');
	let confirmPassword = $state('');
	let displayName = $state('');
	let inviteCode = $state('');
	let acceptedNotice = $state(false);
	let loading = $state(false);
	let error = $state('');
	let submittedAt = $state<number | null>(null);

	const strength = $derived({
		minMet: password.length >= PASSWORD_MIN,
		maxOk: password.length <= PASSWORD_MAX,
		noSpace: password === password.trim() || password.length === 0,
		count: password.length
	});

	const canSubmit = $derived(
		username.trim().length > 0 &&
		password.length > 0 &&
		(mode === 'login' || (
			strength.minMet && strength.maxOk && strength.noSpace &&
			inviteCode.trim().length > 0 &&
			password === confirmPassword &&
			acceptedNotice
		))
	);

	function setMode(next: AuthMode) {
		if (next === mode) return;
		mode = next;
		error = '';
	}

	function reset() {
		username = '';
		password = '';
		confirmPassword = '';
		displayName = '';
		inviteCode = '';
		acceptedNotice = false;
		error = '';
		submittedAt = null;
	}

	async function submit(e?: Event) {
		e?.preventDefault();
		if (!canSubmit) {
			error = mode === 'login' ? 'Username and password are required.' : 'Complete every field.';
			return;
		}
		error = '';
		loading = true;
		// Prototype: simulate latency, then mark submitted. Never log entered credentials.
		await new Promise((r) => setTimeout(r, 720));
		loading = false;
		submittedAt = Date.now();
	}

	return {
		get mode() { return mode; },
		setMode,
		get username() { return username; },
		set username(v: string) { username = v; },
		get password() { return password; },
		set password(v: string) { password = v; },
		get confirmPassword() { return confirmPassword; },
		set confirmPassword(v: string) { confirmPassword = v; },
		get displayName() { return displayName; },
		set displayName(v: string) { displayName = v; },
		get inviteCode() { return inviteCode; },
		set inviteCode(v: string) { inviteCode = v; },
		get acceptedNotice() { return acceptedNotice; },
		set acceptedNotice(v: boolean) { acceptedNotice = v; },
		get loading() { return loading; },
		get error() { return error; },
		get submittedAt() { return submittedAt; },
		get strength() { return strength; },
		get canSubmit() { return canSubmit; },
		reset,
		submit,
		PASSWORD_MIN,
		PASSWORD_MAX
	};
}

export type AuthForm = ReturnType<typeof createAuthForm>;
