<script lang="ts">
	import { Star } from '@lucide/svelte';
	import { pageState, favorites } from './global.svelte';

	$effect(() => {
		const btns = document.querySelectorAll('.sidebar-btn');
		const btn = btns[pageState.current] as HTMLElement | undefined;
		const sidebar = btn?.closest('.sidebar') as HTMLElement | null;
		if (btn && sidebar) {
			if (document.activeElement !== btn) btn.focus();
			if (document.activeElement !== btn) btn.focus();
			btn.scrollIntoView({ block: 'center', inline: 'center', behavior: 'auto' });
		}
	});
	function handleSidebarNavClick(idx: number) {
		pageState.current = idx;
		pageState.selectedAnswers = [];
		pageState.questionLocked = false;
		if (typeof window !== 'undefined' && window.innerWidth < 768) {
			import('./global.svelte').then(({ uiState }) => {
				uiState.sidebarOpen = false;
			});
		}
		setTimeout(() => {
			const btns = document.querySelectorAll('.sidebar-btn');
			const btn = btns[idx] as HTMLElement | undefined;
			const sidebar = btn?.closest('.sidebar') as HTMLElement | null;
			if (btn && sidebar) {
				btn.scrollIntoView({ block: 'center', inline: 'center', behavior: 'auto' });
			}
		}, 0);
	}
</script>

<!-- Sidebar Navigation -->
<div
	class="sidebar flex flex-col gap-2 h-screen max-h-screen overflow-y-auto overflow-x-hidden bg-[#29273F] min-w-[200px] w-[250px]"
>
	{#each pageState.quizData as q, idx}
		<button
			class="cursor-pointer sidebar-btn flex items-center justify-between px-6 py-2 rounded-lg text-base outline-none {idx ===
			pageState.current
				? 'bg-[#C294FF] text-[#222] font-bold'
				: 'hover:bg-[#6b6890]'}"
			onclick={() => handleSidebarNavClick(idx)}
			aria-label={'Go to question ' + (idx + 1)}
		>
			<span>Question {idx + 1}</span>
			{#if favorites.has(q.question_id)}
				<!-- Sidebar: Favorite Star -->
				<span class="ml-2 flex-shrink-0 flex items-center justify-end w-6">
					<Star fill="#FFD700" color="#FFD700" size={20} />
				</span>
			{/if}
		</button>
	{/each}
</div>
