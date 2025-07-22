<script lang="ts">
	import { onMount } from 'svelte';
	import { Star } from '@lucide/svelte';
	interface Answer {
		answer_text?: string;
		[key: string]: unknown;
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
		toggleFavorite: (idx: number) => void;
		answers: Answer[];
		originalIndices?: number[];
		onSwipeLeft?: () => void;
		onSwipeRight?: () => void;
		onSwipeUp?: (idx: number) => void;
		onSwipeDown?: (idx: number) => void;
	}

	let {
		currentQuestion,
		current,
		quizData,
		selectedAnswers,
		questionLocked,
		checkAnswers,
		handleAnswerClick,
		answers,
		originalIndices,
		toggleFavorite,
		onSwipeUp,
		onSwipeDown,
		favorites
	}: Props = $props();

	// Use reactive favorite state from props, not store
	function isFavorited(id: string) {
		return favorites.has(id);
	}

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
				const isScrolling = Math.abs(deltaY) < Math.abs(currentX - startX);
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
						onSwipeUp?.(current);
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
						onSwipeDown?.(current);
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
	class="quiz-card main-scrollbar bg-[#29273F] text-[#CECDE0] rounded-2xl shadow-lg w-[95vw] h-[95%] md:w-[90%] md:h-[500px] px-4 pt-6 relative flex flex-col gap-2 touch-pan-y overflow-y-auto scrollbar-thin scrollbar-thumb-[#8582B0] scrollbar-track-[#29273F]"
	ontouchstart={handleTouchStart}
	ontouchend={handleTouchEnd}
	style="transform: translateY({isTouching && scrollAtEdgeOnce === true
		? translateY
		: 0}px); transition: {animating || animationDirection
		? 'transform 0.2s cubic-bezier(0.4,0,0.2,1)'
		: 'none'};"
	ontouchmove={(e) => handleTouchMove(e)}
>
	<!-- Question number and Favorite Button row -->
	<div class="flex items-center justify-between mb-2">
		<span class="text-[#8582B0] text-base flex items-center gap-3">
			{#if quizData.length}
				Question {current + 1} / {quizData.length}
				{#if currentQuestion?.module}
					<span
						class="inline-block px-2 py-0.5 rounded bg-[#35325A] text-[#C294FF] text-xs font-medium border border-[#C294FF] ml-2"
					>
						Module: {currentQuestion.module}
					</span>
				{/if}
				{#if currentQuestion?.question_id}
					<span
						class="inline-block px-2 py-0.5 rounded bg-[#35325A] text-[#FFD700] text-xs font-medium border border-[#FFD700] ml-2"
					>
						ID: {currentQuestion.question_id}
					</span>
				{/if}
			{/if}
		</span>
		<!-- This is the favorite button -->
		<button
			aria-label="Toggle favorite"
			class="cursor-pointer w-10 h-10 bg-transparent border-none p-0 flex items-center justify-center"
			onclick={() => toggleFavorite(current)}
		>
			{#if isFavorited(currentQuestion?.question_id)}
				<Star fill="#FFD700" color="#FFD700" size={32} />
			{:else}
				<Star color="#CECDE0" size={32} />
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
			{#each answers as ans, idx}
				<button
					type="button"
					class="answer px-5 py-3 rounded-lg border-2 border-[#33314E] bg-[#302E4A] text-lg text-[#CECDE0] cursor-pointer transition-colors text-left
					       {selectedAnswers.includes(idx) ? 'border-[#C294FF]' : ''}
					       {questionLocked && currentQuestion.answers[originalIndices?.[idx] ?? idx]?.is_correct
						? 'border-green-400 text-green-300'
						: ''}
					       {questionLocked &&
					selectedAnswers.includes(idx) &&
					!currentQuestion.answers[originalIndices?.[idx] ?? idx]?.is_correct
						? 'border-[#FF4747] text-[#FF4747]'
						: ''}"
					onclick={() => handleAnswerClick(idx, currentQuestion.question_type)}
					aria-pressed={selectedAnswers.includes(idx)}
					aria-label={'Answer ' + (idx + 1)}
					onkeydown={(e) => {
						if (e.key === 'Enter' || e.key === ' ')
							handleAnswerClick(idx, currentQuestion.question_type);
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
