<script lang="ts">
	import QuizCard from './QuizCard.svelte';
	import { SvelteSet } from 'svelte/reactivity';
	import type { Quiz } from './global.svelte';

	const {
		quizData,
		current,
		selectedAnswers,
		questionLocked,
		favorites,
		handleSwipeUp,
		handleSwipeDown,
		handleToggleFavorite,
		handleAnswerClick,
		checkAnswers
	} = $props<{
		quizData: Quiz[];
		current: number;
		selectedAnswers: number[];
		questionLocked: boolean;
		favorites: SvelteSet<string>;
		handleSwipeUp: (idx: number) => void;
		handleSwipeDown: (idx: number) => void;
		handleToggleFavorite: (idx: number) => void;
		handleAnswerClick: (idx: number, questionType: string) => void;
		checkAnswers: () => void;
	}>();
</script>

<!-- Carousel Component -->
{#if quizData.length > 0}
	<div
		class="carousel-vertical flex flex-col items-center justify-center w-full h-full relative md:items-start md:justify-center"
	>
		{#each [current - 1, current, current + 1] as idx (idx)}
			{#if idx >= 0 && idx < quizData.length}
				<div
					class="carousel-card flex justify-center md:items-start md:justify-center"
					style="width:95vw; height:90%; position: absolute; left:50%; top:50%; transform: translate(-50%, calc(-50% + {(idx -
						current) *
						110}%)); transition: transform 0.3s cubic-bezier(0.4,0,0.2,1);"
				>
					<QuizCard
						currentQuestion={quizData[idx]}
						current={idx}
						{quizData}
						selectedAnswers={idx === current ? selectedAnswers : []}
						questionLocked={idx === current ? questionLocked : false}
						{checkAnswers}
						{handleAnswerClick}
						{favorites}
						toggleFavorite={(idx: number) => handleToggleFavorite(idx)}
						answers={Array.isArray(quizData[idx]?.answers)
							? quizData[idx].answers.map((a: string | { answer_text: string }) =>
									typeof a === 'object' && a !== null ? a : { answer_text: String(a) }
								)
							: []}
						onSwipeUp={handleSwipeUp}
						onSwipeDown={handleSwipeDown}
					/>
				</div>
			{/if}
		{/each}
	</div>
{:else}
	<div class="w-full h-full flex flex-col items-center justify-center">
		<div class="text-lg text-[#CECDE0] font-medium tracking-wide">No favorite questions</div>
	</div>
{/if}
