<script lang="ts">
	import QuizCard from './QuizCard.svelte';
	import { pageState, favorites } from './global.svelte';

	function shuffleArray<T>(array: T[]): T[] {
		const arr = array.slice();
		for (let i = arr.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[arr[i], arr[j]] = [arr[j], arr[i]];
		}
		return arr;
	}

	/* Store shuffled answers and mapping for each question index */
	let shuffledAnswers = $state<{ [idx: number]: { answer_text: string }[] }>({});
	let shuffledIndices = $state<{ [idx: number]: number[] }>({});

	function getAnswers(idx: number): { answer_text: string }[] {
		return shuffledAnswers[idx] ?? [];
	}

	function getOriginalIndex(idx: number, shuffledIdx: number): number {
		return shuffledIndices[idx]?.[shuffledIdx] ?? shuffledIdx;
	}

	$effect(() => {
		const idx = pageState.current;
		const answers = Array.isArray(pageState.quizData[idx]?.answers)
			? pageState.quizData[idx].answers.map((a: string | { answer_text: string }) =>
					typeof a === 'object' && a !== null ? a : { answer_text: String(a) }
				)
			: [];
		const indices = answers.map((_, i) => i);
		const shuffled = shuffleArray(indices);
		shuffledAnswers[idx] = shuffled.map((i) => answers[i]);
		shuffledIndices[idx] = shuffled;
	});

	function handleSwipeUp(idx: number) {
		const cardEl = document.querySelectorAll('.quiz-card')[idx - (pageState.current - 1)];
		if (cardEl && cardEl.scrollTop + cardEl.clientHeight >= cardEl.scrollHeight - 2) {
			if (idx === pageState.current && pageState.current < pageState.quizData.length - 1) {
				pageState.current += 1;
				pageState.selectedAnswers = [];
				pageState.questionLocked = false;
				setTimeout(() => {
					const nextCard = document.querySelectorAll('.quiz-card')[2];
					if (nextCard) nextCard.scrollTop = 0;
				}, 0);
			}
		}
	}

	function handleSwipeDown(idx: number) {
		const cardEl = document.querySelectorAll('.quiz-card')[idx - (pageState.current - 1)];
		if (cardEl && cardEl.scrollTop <= 2) {
			if (idx === pageState.current && pageState.current > 0) {
				pageState.current -= 1;
				pageState.selectedAnswers = [];
				pageState.questionLocked = false;
				setTimeout(() => {
					const prevCard = document.querySelectorAll('.quiz-card')[0];
					if (prevCard) prevCard.scrollTop = 0;
				}, 0);
			}
		}
	}

	function handleToggleFavorite(idx: number) {
		if (!pageState.quizData[idx]) return;
		const qid = pageState.quizData[idx].question_id;
		if (favorites.has(qid)) {
			favorites.delete(qid);
			// If in favorites view, remove the question from quizData and update current index
			if (typeof window !== 'undefined' && localStorage.getItem('currentView') === 'favorites') {
				pageState.quizData = pageState.quizData.filter((q) => favorites.has(q.question_id));
				// Clamp current index to valid range
				pageState.current = Math.max(0, Math.min(pageState.current, pageState.quizData.length - 1));
			}
		} else {
			favorites.add(qid);
		}
	}

	function handleAnswerClick(idx: number, questionType: string) {
		if (pageState.questionLocked) return;
		if (questionType === 'multiple_answer_question') {
			if (pageState.selectedAnswers.includes(idx)) {
				pageState.selectedAnswers = pageState.selectedAnswers.filter((i) => i !== idx);
			} else {
				pageState.selectedAnswers = [...pageState.selectedAnswers, idx];
			}
		} else {
			pageState.selectedAnswers = [idx];
			checkAnswers();
		}
	}

	function checkAnswers() {
		pageState.questionLocked = true;
	}
</script>

<!-- Carousel Component -->
{#if pageState.quizData.length > 0}
	<div
		class="carousel-vertical flex flex-col items-center justify-center w-full h-full relative md:items-start md:justify-center"
	>
		{#each [pageState.current - 1, pageState.current, pageState.current + 1] as idx (idx)}
			{#if idx >= 0 && idx < pageState.quizData.length}
				<div
					class="carousel-card flex justify-center md:items-start md:justify-center"
					style="width:95vw; height:90%; position: absolute; left:50%; top:50%; transform: translate(-50%, calc(-50% + {(idx -
						pageState.current) *
						110}%)); transition: transform 0.3s cubic-bezier(0.4,0,0.2,1);"
				>
					<QuizCard
						currentQuestion={pageState.quizData[idx]}
						current={idx}
						quizData={pageState.quizData}
						selectedAnswers={idx === pageState.current ? pageState.selectedAnswers : []}
						questionLocked={idx === pageState.current ? pageState.questionLocked : false}
						{checkAnswers}
						{handleAnswerClick}
						{favorites}
						toggleFavorite={(idx: number) => handleToggleFavorite(idx)}
						answers={getAnswers(idx)}
						originalIndices={shuffledIndices[idx]}
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
