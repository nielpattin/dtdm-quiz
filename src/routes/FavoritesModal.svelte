<script lang="ts">
	import { uiState, getFavIdList, favorites } from './global.svelte';

	let copied = $state(false);

	function handleCopy() {
		navigator.clipboard.writeText(getFavIdList());
		copied = true;
		setTimeout(() => (copied = false), 1200);
	}
</script>

{#if uiState.showFavModal}
	<div
		class="fav-id-modal-backdrop fixed inset-0 z-[1001] bg-black/50 backdrop-opacity-60 flex items-center justify-center"
	>
		<div
			class="fav-id-modal bg-white p-6 rounded-xl min-w-[320px] max-w-[95vw] shadow-xl border border-[#e0e0f0] text-[#23223a]"
		>
			<h3 class="text-[#574fd6] text-lg font-semibold mb-3">Favorite Questions</h3>
			<textarea
				id="fav-id-list"
				class="w-full h-32 resize-none text-base mb-3 rounded-lg border border-[#d3d3e7] bg-[#f7f7fb] text-[#23223a] p-2"
				readonly
				value={getFavIdList()}
			></textarea>
			<div class="fav-id-modal-btn-row flex gap-2 mb-2">
				<button
					class="flex-1 text-base py-2 rounded-lg bg-[#f0f0ff] text-[#574fd6] font-medium hover:bg-[#e3e3fa] cursor-pointer"
					onclick={handleCopy}
				>
					{copied ? 'Copied!' : 'Copy'}
				</button>
				<button
					class="flex-1 text-base py-2 rounded-lg bg-[#f0f0ff] text-[#574fd6] font-medium hover:bg-[#e3e3fa] cursor-pointer"
					onclick={async () => {
						const text = await navigator.clipboard.readText();
						const newIds = text
							.split(',')
							.map((id) => id.trim())
							.filter(Boolean);
						for (const id of newIds) favorites.add(id);
						uiState.showFavModal = false;
					}}>Paste & Import</button
				>
				<button
					class="flex-1 text-base py-2 rounded-lg bg-[#f0f0ff] text-[#574fd6] font-medium hover:bg-[#e3e3fa] cursor-pointer"
					onclick={() => (uiState.showFavModal = false)}>Close</button
				>
			</div>
			<small class="text-[#888] text-sm">Copy/paste to share favorites between devices.</small>
		</div>
	</div>
{/if}
