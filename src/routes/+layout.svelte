<script lang="ts">
	import { dev } from '$app/environment';
	import '@fontsource-variable/noto-sans';
	import { injectAnalytics } from '@vercel/analytics/sveltekit';
	import '../app.css';
	import { APP_VERSION } from '../lib/config';
	import NewVersionModal from './NewVersionModal.svelte';

	injectAnalytics({ mode: dev ? 'development' : 'production' });

	let { children } = $props();

	let showVersionModal = $state(false);

	// Only run on client
	import { APP_VERSION_KEY } from '../lib/localKeys';

	if (typeof window !== 'undefined') {
		const storedVersion = localStorage.getItem(APP_VERSION_KEY);
		if (!storedVersion || storedVersion !== APP_VERSION) {
			showVersionModal = true;
		}
	}

	// This function should be called when the user confirms the modal (to be implemented in a later subtask)
	function confirmVersionUpdate() {
		localStorage.clear();
		localStorage.setItem(APP_VERSION_KEY, APP_VERSION);
		showVersionModal = false;
		location.reload();
	}
</script>

{#if showVersionModal}
	<NewVersionModal onReload={confirmVersionUpdate} />
{/if}
{@render children()}
