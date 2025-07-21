<script lang="ts">
	interface Answer {
		answer_text?: string;
		[key: string]: unknown;
	}
	interface AnswerWithIdx extends Answer {
		__originalIdx: number;
	}
	interface Props {
		currentQuestion: any;
		current: number;
		quizData: any[];
		selectedAnswers: number[];
		questionLocked: boolean;
		checkAnswers: () => void;
		handleAnswerClick: (idx: number, questionType: string) => void;
		favorites: Set<string>;
		toggleFavorite: () => void;
		answers: Answer[];
		onSwipeLeft?: () => void;
		onSwipeRight?: () => void;
		onSwipeUp?: () => void;
		onSwipeDown?: () => void;
	}

	let {
		currentQuestion,
		current,
		quizData,
		selectedAnswers,
		questionLocked,
		checkAnswers,
		handleAnswerClick,
		favorites,
		toggleFavorite,
		answers,
		onSwipeUp,
		onSwipeDown
	}: Props = $props();

	// Shuffle answers for each question load
	import { onMount } from 'svelte';
	let shuffledAnswers = $state<AnswerWithIdx[]>([]);
	$effect(() => {
		if (currentQuestion && answers) {
			const arr: AnswerWithIdx[] = answers.map((a, i) => ({ ...a, __originalIdx: i }));
			for (let i = arr.length - 1; i > 0; i--) {
				const j = Math.floor(Math.random() * (i + 1));
				[arr[i], arr[j]] = [arr[j], arr[i]];
			}
			shuffledAnswers = arr;
		}
	});

	onMount(() => {
		const cardEls = document.querySelectorAll('.quiz-card');
		const touchMoveHandler = (e: Event) => handleTouchMove(e as TouchEvent);
		cardEls.forEach((cardEl) => {
			cardEl.addEventListener('touchmove', touchMoveHandler, { passive: false });
		});
		return () => {
			cardEls.forEach((cardEl) => {
				cardEl.removeEventListener('touchmove', touchMoveHandler);
			});
		};
	});

	let startX = 0;
	let startY = 0;
	let currentX = 0;
	let currentY = 0;
	let translateY = $state(0);
	let isTouching = $state(false);
	let scrollAtEdgeOnce = $state<false | true | 'wait'>(false);
	let animating = $state(false);
	let animationDirection = $state<'up' | 'down' | null>(null);
	let isVerticalSwipe = false;

	function handleTouchStart(e: TouchEvent) {
		if (animating) return;
		if (e.touches.length !== 1) return;
		startX = e.touches[0].clientX;
		startY = e.touches[0].clientY;
		currentX = startX;
		currentY = startY;
		isVerticalSwipe = false;
		isTouching = true;
		scrollAtEdgeOnce = false;
	}

	function handleTouchMove(e: TouchEvent) {
		if (animating) return;
		if (e.touches.length !== 1) return;
		currentX = e.touches[0].clientX;
		currentY = e.touches[0].clientY;

		if (isTouching && window.innerWidth < 768) {
			const cardEl = e.currentTarget as HTMLElement;
			const atBottom = cardEl.scrollTop + cardEl.clientHeight >= cardEl.scrollHeight - 2;
			const atTop = cardEl.scrollTop <= 2;

			if (atBottom || atTop) {
				if (scrollAtEdgeOnce === false || scrollAtEdgeOnce === 'wait') {
					// First time reaching edge, set flag but don't move card yet
					scrollAtEdgeOnce = true;
				} else if (scrollAtEdgeOnce === true) {
					// Only move card if we started the touch at the edge
					if (
						startY <= cardEl.getBoundingClientRect().top + 2 ||
						startY >= cardEl.getBoundingClientRect().bottom - 2
					) {
						console.log('[handleTouchMove] Card should follow finger', {
							scrollAtEdgeOnce,
							startY,
							currentY,
							atTop,
							atBottom
						});
						// Only allow card to follow finger if not animating and not already at navigation threshold
						if (!animating) {
							translateY = currentY - startY;
							console.log(
								'[handleTouchMove] translateY updated:',
								translateY,
								'isTouching:',
								isTouching,
								'scrollAtEdgeOnce:',
								scrollAtEdgeOnce
							);
						}
					}
				}
			} else {
				scrollAtEdgeOnce = false;
			}
		}

		const deltaY = currentY - startY;

		// Determine swipe direction and prevent interference with horizontal scrolling
		if (!isVerticalSwipe && Math.abs(deltaY) > Math.abs(currentX - startX)) {
			isVerticalSwipe = true;
		}

		// Only block scroll if swipe threshold is passed and at boundary
		if (window.innerWidth < 768 && isVerticalSwipe) {
			const cardEl = e.currentTarget as HTMLElement;
			const isScrollable = cardEl.scrollHeight > cardEl.clientHeight;
			const atBottom = cardEl.scrollTop + cardEl.clientHeight >= cardEl.scrollHeight - 2;
			const atTop = cardEl.scrollTop <= 2;
			const threshold = 15;

			// Only preventDefault if we are at the boundary AND swiping past threshold
			if (isScrollable) {
				// Only block scroll if swipe is strictly vertical and threshold is passed
				// FIX: Only block if swipe is strictly vertical AND at boundary AND threshold passed AND NOT scrolling
				// If user is actively scrolling, do NOT block
				const isScrolling = Math.abs(deltaY) < Math.abs(currentX - startX);
				// Only block scroll if swipe is strictly vertical, threshold is passed, and at boundary, AND not scrolling
				// FIX: Only block scroll if swipe starts near the edge of the card (top/bottom 40px)
				const touchY = e.touches[0].clientY;
				const bounding = cardEl.getBoundingClientRect();
				const nearTop = touchY - bounding.top < 40;
				const nearBottom = bounding.bottom - touchY < 40;

				if (
					!isScrolling &&
					((deltaY < -threshold && atBottom && nearBottom) ||
						(deltaY > threshold && atTop && nearTop))
				) {
					if (e.cancelable) {
						e.preventDefault();
					}
				}
			}
		}
	}

	function handleTouchEnd() {
		if (animating) return;
		const deltaY = currentY - startY;
		const threshold = 15; // px

		if (window.innerWidth < 768 && isVerticalSwipe) {
			const cardEl = document.querySelector('.quiz-card');
			const atBottom = cardEl && cardEl.scrollTop + cardEl.clientHeight >= cardEl.scrollHeight - 2;
			const atTop = cardEl && cardEl.scrollTop <= 2;

			console.log('[handleTouchEnd]', {
				scrollAtEdgeOnce,
				atTop,
				atBottom,
				deltaY,
				threshold,
				animating,
				isVerticalSwipe
			});

			if (scrollAtEdgeOnce === true) {
				console.log('NAVIGATE: allowed');
				// Only allow navigation if the previous touch ended at the edge
				if (deltaY < -threshold && atBottom) {
					console.log('NAVIGATE: up');
					animationDirection = 'up';
					translateY = -window.innerHeight * 0.7;
					animating = true;
					setTimeout(() => {
						onSwipeUp?.();
						translateY = 0;
						animationDirection = null;
						animating = false;
					}, 200);
				} else if (deltaY > threshold && atTop) {
					console.log('NAVIGATE: down');
					animationDirection = 'down';
					translateY = window.innerHeight * 0.7;
					animating = true;
					setTimeout(() => {
						onSwipeDown?.();
						translateY = 0;
						animationDirection = null;
						animating = false;
					}, 200);
				} else {
					console.log('NAVIGATE: snap back');
					translateY = 0;
				}
				// Reset so next navigation requires another edge touch
				scrollAtEdgeOnce = false;
			} else if (scrollAtEdgeOnce === 'wait') {
				console.log('NAVIGATE: blocked, waiting for another edge touch');
			} else {
				console.log('NAVIGATE: blocked, first edge touch');
			}
		}
		isVerticalSwipe = false;
		isTouching = false;
		scrollAtEdgeOnce = false;
	}
</script>

<!-- Quiz Card -->
<div
	class="quiz-card main-scrollbar bg-[#29273F] text-[#CECDE0] rounded-2xl shadow-lg w-[95vw] h-[90%] md:w-[90%] px-4 pt-6 relative flex flex-col gap-2 touch-pan-y overflow-y-auto scrollbar-thin scrollbar-thumb-[#8582B0] scrollbar-track-[#29273F]"
	ontouchstart={handleTouchStart}
	ontouchend={handleTouchEnd}
	style="transform: translateY({isTouching && scrollAtEdgeOnce === true
		? translateY
		: 0}px); transition: {animating || animationDirection
		? 'transform 0.2s cubic-bezier(0.4,0,0.2,1)'
		: 'none'};"
>
	<!-- Question number and Favorite Button row -->
	<div class="flex items-center justify-between mb-2">
		<span class="text-[#8582B0] text-base">
			{#if quizData.length}
				Question {current + 1} / {quizData.length}
			{/if}
		</span>
		<!-- This is the favorite button -->
		<button
			aria-label="Toggle favorite"
			class="w-10 h-10 bg-transparent border-none p-0 flex items-center justify-center"
			onclick={toggleFavorite}
		>
			{#if favorites.has(currentQuestion?.question_id)}
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="32"
					height="32"
					viewBox="0 0 24 24"
					fill="#FFD700"
					stroke="#FFD700"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
				>
					<polygon
						points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"
					></polygon>
				</svg>
			{:else}
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="32"
					height="32"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
				>
					<polygon
						points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"
					></polygon>
				</svg>
			{/if}
		</button>
	</div>
	<!-- Question Text -->
	<div class="question-row font-semibold text-lg mb-4">
		{#if currentQuestion}
			{currentQuestion.question_text || currentQuestion.question || ''}
		{:else}
			{quizData.length === 0 ? 'Please select a module to begin.' : ''}
		{/if}
	</div>
	<!-- Answers List -->
	<div class="answers-row flex flex-col gap-4 mb-4">
		{#if currentQuestion}
			{#each shuffledAnswers as ans, idx}
				<button
					type="button"
					class="answer px-5 py-3 rounded-lg border-2 border-[#33314E] bg-[#302E4A] text-lg text-[#CECDE0] cursor-pointer transition-colors text-left
					       {selectedAnswers.includes(ans.__originalIdx) ? 'border-[#C294FF]' : ''}
					       {questionLocked && currentQuestion.answers[ans.__originalIdx]?.is_correct
						? 'border-green-400 text-green-300'
						: ''}
					       {questionLocked &&
					selectedAnswers.includes(ans.__originalIdx) &&
					!currentQuestion.answers[ans.__originalIdx]?.is_correct
						? 'border-[#FF4747] text-[#FF4747]'
						: ''}"
					onclick={() => handleAnswerClick(ans.__originalIdx, currentQuestion.question_type)}
					aria-pressed={selectedAnswers.includes(ans.__originalIdx)}
					aria-label={'Answer ' + (idx + 1)}
					onkeydown={(e) => {
						if (e.key === 'Enter' || e.key === ' ')
							handleAnswerClick(ans.__originalIdx, currentQuestion.question_type);
					}}
				>
					{ans.answer_text || ans}
				</button>
			{/each}
		{/if}
	</div>
	<!-- Check Button -->
	<div class="flex justify-center w-full">
		<button
			id="check-btn"
			class="mt-2 mb-6 px-6 py-3 rounded-lg bg-[#C294FF] text-[#1D1B2C] font-semibold text-lg"
			onclick={checkAnswers}
			style="display: {selectedAnswers.length > 0 && !questionLocked ? 'block' : 'none'}"
		>
			Check
		</button>
	</div>
</div>
