<script lang="ts">
	import Sidebar from './Sidebar.svelte';
	import TopBar from './TopBar.svelte';
	import QuizCard from './QuizCard.svelte';
	import FavoritesModal from './FavoritesModal.svelte';
	import {
		DEFAULT_FAVORITES_LOCAL,
		FAVORITES_LOCAL_KEY,
		CURRENT_VIEW_KEY,
		FAVORITE_QUESTIONS_KEY,
		APPSTATE_ALL_KEY
	} from '../lib/localKeys';

	type Quiz = {
		question_id: string;
		answers: string[];
		[key: string]: unknown;
	};
	let quizData = $state<Quiz[]>([]);
	let current = $state<number>(0);
	let selectedAnswers = $state<number[]>([]);
	let questionLocked = $state(false);
	let isLoading = $state(false);
	function handleSwipeUp(idx: number) {
		const cardEl = document.querySelectorAll('.quiz-card')[idx - (current - 1)];
		if (cardEl && cardEl.scrollTop + cardEl.clientHeight >= cardEl.scrollHeight - 2) {
			if (idx === current && current < quizData.length - 1) {
				current++;
				selectedAnswers = [];
				questionLocked = false;
				setTimeout(() => {
					const nextCard = document.querySelectorAll('.quiz-card')[2];
					if (nextCard) nextCard.scrollTop = 0;
				}, 0);
			}
		}
	}

	function handleSwipeDown(idx: number) {
		const cardEl = document.querySelectorAll('.quiz-card')[idx - (current - 1)];
		if (cardEl && cardEl.scrollTop <= 2) {
			if (idx === current && current > 0) {
				current--;
				selectedAnswers = [];
				questionLocked = false;
				setTimeout(() => {
					const prevCard = document.querySelectorAll('.quiz-card')[0];
					if (prevCard) prevCard.scrollTop = 0;
				}, 0);
			}
		}
	}
	function handleToggleFavorite(idx: number) {
		if (!quizData[idx]) return;
		const qid = quizData[idx].question_id;
		if (favorites.has(qid)) {
			favorites.delete(qid);
			favorites = new Set(favorites);
			if (appState.currentView === 'favorites') {
				quizData = [...quizData.filter((q) => favorites.has(q.question_id))];
				current = Math.max(0, Math.min(current, quizData.length - 1));
			}
		} else {
			favorites.add(qid);
			favorites = new Set(favorites);
		}
	}

	async function showFavorites() {
		if (typeof window !== 'undefined') {
			localStorage.setItem(CURRENT_VIEW_KEY, 'favorites');
			appState.currentView = 'favorites';
			const favStateRaw = localStorage.getItem(FAVORITES_LOCAL_KEY);
			const favQuestionsRaw = localStorage.getItem(FAVORITE_QUESTIONS_KEY);
			const favIdsArr = favQuestionsRaw ? JSON.parse(favQuestionsRaw) : [];
			if (
				!favStateRaw ||
				favStateRaw === '""' ||
				favStateRaw === '{}' ||
				favStateRaw.trim() === '' ||
				!favQuestionsRaw ||
				!Array.isArray(favIdsArr) ||
				favIdsArr.length === 0
			) {
				// Default to 'all' if favorites state is empty
				appState.favorites = { ...DEFAULT_FAVORITES_LOCAL };
				moduleId = DEFAULT_FAVORITES_LOCAL.module;
				quizData = [];
				current = 0;
			} else {
				loadAppState('favorites');
				if (!appState.favorites.module || appState.favorites.module === '') {
					appState.favorites.module = 'all';
					moduleId = 'all';
				} else {
					moduleId = appState.favorites.module;
				}
				const restoredIndex =
					typeof appState.favorites.questionIndex === 'number'
						? appState.favorites.questionIndex
						: 0;
				isLoading = true;
				const res = await fetch('/api/module', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ ids: favIdsArr })
				});
				const data = await res.json();
				let loadedQuizzes: Quiz[] = Array.isArray(data.quizzes)
					? data.quizzes.filter((q: Quiz) => q.status !== 'all_false')
					: [];
				if (moduleId !== 'all') {
					loadedQuizzes = loadedQuizzes.filter((q) => q.quiz_number === `module_${moduleId}`);
				}
				quizData = loadedQuizzes;
				isLoading = false;
				current = restoredIndex;
			}
		}
	}
	function onBackToAll() {
		if (typeof window !== 'undefined') {
			localStorage.setItem(CURRENT_VIEW_KEY, 'all');
			appState.currentView = 'all';
			loadAppState('all');
			moduleId = appState.all.module;
			loadQuizForModule(moduleId, appState.all.questionIndex);
		}
	}
	function onClearFavorites() {
		favorites = new Set();
		if (typeof window !== 'undefined') {
			localStorage.setItem(FAVORITE_QUESTIONS_KEY, '[]');
		}
		if (appState.currentView === 'favorites') {
			appState.currentView = 'all';
			moduleId = appState.all.module;
			loadQuizForModule(moduleId, appState.all.questionIndex);
		}
	}
	async function setModuleId(id: string) {
		moduleQuizCache.clear(); // Clear cache to ensure fresh data
		moduleId = id;
		appState.all.questionIndex = 0;
		current = 0;
		selectedAnswers = [];
		questionLocked = false;
		await loadQuizForModule(id, 0);
	}

	let currentQuestion = $derived(quizData[current]);
	let answers = $derived(
		currentQuestion && Array.isArray(currentQuestion.answers)
			? currentQuestion.answers.map((a) =>
					typeof a === 'object' && a !== null ? a : { answer_text: String(a) }
				)
			: []
	);

	let moduleQuizCache = new Map();
	let favorites = $state(new Set<string>());
	type AppState = {
		currentView: 'all' | 'favorites';
		all: { module: string; questionIndex: number };
		favorites: { module: string; questionIndex: number };
	};
	let appState = $state<AppState>({
		currentView: 'all',
		all: { module: '', questionIndex: 0 },
		favorites: { ...DEFAULT_FAVORITES_LOCAL }
	});

	function loadAppState(view: 'all' | 'favorites') {
		const key = view === 'all' ? APPSTATE_ALL_KEY : FAVORITES_LOCAL_KEY;
		const loaded = JSON.parse(localStorage.getItem(key) || '{}') || {};
		if (view === 'all') {
			if (!loaded.module) loaded.module = '';
			if (typeof loaded.questionIndex !== 'number') loaded.questionIndex = 0;
			appState.all = { module: loaded.module, questionIndex: loaded.questionIndex };
		} else {
			if (!loaded.module) loaded.module = DEFAULT_FAVORITES_LOCAL.module;
			if (typeof loaded.questionIndex !== 'number')
				loaded.questionIndex = DEFAULT_FAVORITES_LOCAL.questionIndex;
			appState.favorites = { module: loaded.module, questionIndex: loaded.questionIndex };
		}
	}

	if (typeof window !== 'undefined') {
		favorites = new Set<string>(JSON.parse(localStorage.getItem(FAVORITE_QUESTIONS_KEY) || '[]'));
		const currentView = (localStorage.getItem(CURRENT_VIEW_KEY) as 'all' | 'favorites') || 'all';
		appState.currentView = currentView;
		loadAppState(currentView);
	}

	(() => {
		if (!appState.all) appState.all = { module: '', questionIndex: 0 };
		if (!appState.favorites) appState.favorites = { module: '', questionIndex: 0 };
		if (
			!appState.currentView ||
			(appState.currentView !== 'all' && appState.currentView !== 'favorites')
		)
			appState.currentView = 'all';
	})();

	let moduleId = $state('');
	import { modules } from '../lib/modules';

	// Sidebar open state
	let sidebarOpen = $state(false);

	// Favorites modal
	let showFavModal = $state(false);
	let favIdList = $derived(Array.from(favorites).join(', '));

	// Quiz loading logic
	async function loadQuizForModule(moduleId: string, startAt = 0) {
		// If in favorites view and no favorites, skip loading bar
		if (appState.currentView === 'favorites') {
			const favIdsArr = Array.from(favorites);
			if (favIdsArr.length === 0) {
				isLoading = false;
				quizData = [];
				current = 0;
				return;
			}
			isLoading = true;
			const res = await fetch('/api/module', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ ids: favIdsArr })
			});
			const data = await res.json();
			let loadedQuizzes: Quiz[] = Array.isArray(data.quizzes)
				? data.quizzes.filter((q: Quiz) => q.status !== 'all_false')
				: [];
			if (moduleId !== 'all') {
				loadedQuizzes = loadedQuizzes.filter((q) => q.quiz_number === `module_${moduleId}`);
			}
			quizData = loadedQuizzes;
			isLoading = false;
			current =
				typeof startAt === 'number' ? Math.max(0, Math.min(startAt, quizData.length - 1)) : 0;
			selectedAnswers = [];
			questionLocked = false;
			return;
		}
		isLoading = true;
		if (!moduleId) {
			quizData = [];
			current = 0;
			isLoading = false;
			return;
		}
		let loadedQuizzes: Quiz[] = [];
		if (moduleQuizCache.has(moduleId)) {
			loadedQuizzes = moduleQuizCache.get(moduleId);
		} else {
			let url = `/api/module?id=${moduleId}`;
			const res = await fetch(url);
			const data = await res.json();
			loadedQuizzes = Array.isArray(data.quizzes)
				? data.quizzes.filter((q: Quiz) => q.status !== 'all_false')
				: [];
			moduleQuizCache.set(moduleId, loadedQuizzes);
		}
		quizData = loadedQuizzes;
		isLoading = false;
		current = typeof startAt === 'number' ? Math.max(0, Math.min(startAt, quizData.length - 1)) : 0;
		selectedAnswers = [];
		questionLocked = false;
	}

	function handleAnswerClick(idx: number, questionType: string) {
		if (questionLocked) return;
		if (questionType === 'multiple_answer_question') {
			if (selectedAnswers.includes(idx)) {
				selectedAnswers = selectedAnswers.filter((i) => i !== idx);
			} else {
				selectedAnswers = [...selectedAnswers, idx];
			}
		} else {
			selectedAnswers = [idx];
			checkAnswers();
		}
	}

	function checkAnswers() {
		if (!currentQuestion) return;
		questionLocked = true;
	}

	function handleKeyNavigation(e: KeyboardEvent) {
		if (
			document.activeElement &&
			['INPUT', 'SELECT', 'TEXTAREA'].includes((document.activeElement as HTMLElement).tagName)
		)
			return;
		if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
			if (current < quizData.length - 1) {
				current++;
				selectedAnswers = [];
				questionLocked = false;
			}
			// Do nothing when at the end of questions
		} else if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
			if (current > 0) {
				current--;
				selectedAnswers = [];
				questionLocked = false;
			}
			// Do nothing when at the start of questions
		}
	}

	let isInitialLoad = $state(true);
	$effect(() => {
		window.addEventListener('keydown', handleKeyNavigation);
		if (isInitialLoad) {
			if (appState.currentView === 'favorites') {
				moduleId = appState.favorites.module || 'all';
				showFavorites();
			} else {
				// Ensure first valid module is selected by default if none is set
				const firstValidModule = modules.find((m) => m.value !== '')?.value || '';
				if (!appState.all.module && firstValidModule) {
					appState.all.module = firstValidModule;
				}
				const initialModule = appState.all.module || firstValidModule || '';
				moduleId = initialModule;
				loadQuizForModule(moduleId, appState.all.questionIndex);
			}
			isInitialLoad = false;
		}
		return () => window.removeEventListener('keydown', handleKeyNavigation);
	});

	// Auto-save favorites to localStorage when they change
	$effect(() => {
		if (typeof window !== 'undefined') {
			localStorage.setItem(FAVORITE_QUESTIONS_KEY, JSON.stringify(Array.from(favorites)));
		}
	});

	// Auto-save appState to localStorage when it changes
	$effect(() => {
		if (typeof window !== 'undefined') {
			const key = appState.currentView === 'all' ? APPSTATE_ALL_KEY : FAVORITES_LOCAL_KEY;
			if (appState.currentView === 'all') {
				localStorage.setItem(key, JSON.stringify(appState.all));
			} else {
				localStorage.setItem(key, JSON.stringify(appState.favorites));
			}
		}
	});
	// Auto-save current module and question index to appState
	$effect(() => {
		if (typeof window !== 'undefined' && moduleId !== undefined && appState.currentView === 'all') {
			appState.all.module = moduleId;
			appState.all.questionIndex = current;
			localStorage.setItem(APPSTATE_ALL_KEY, JSON.stringify(appState.all));
		}
		if (typeof window !== 'undefined' && appState.currentView === 'favorites') {
			appState.favorites.module = moduleId;
			appState.favorites.questionIndex = current;
			localStorage.setItem(FAVORITES_LOCAL_KEY, JSON.stringify(appState.favorites));
		}
	});
</script>

<!-- Main Layout -->
<div class="flex min-h-screen min-w-screen w-screen bg-[#1D1B2C] text-[#CECDE0] font-sans">
	<!-- Sidebar (only rendered if open on mobile, always on desktop) -->
	{#if sidebarOpen || (typeof window !== 'undefined' && window.innerWidth >= 768)}
		<div
			class="fixed top-0 left-0 h-full z-40 bg-[#29273F] transition-transform duration-200 ease-in-out
							md:static md:translate-x-0 md:min-w-[200px] md:w-[250px]"
		>
			<Sidebar
				{quizData}
				{current}
				{favorites}
				setCurrent={(idx: number) => {
					current = idx;
					selectedAnswers = [];
					questionLocked = false;
					if (typeof window !== 'undefined' && window.innerWidth < 768) {
						sidebarOpen = false;
					}
				}}
				setSidebarOpen={(open: boolean) => (sidebarOpen = open)}
			/>
		</div>
	{/if}

	<!-- Backdrop for mobile (only rendered if sidebar is open) -->
	{#if sidebarOpen && typeof window !== 'undefined' && window.innerWidth < 768}
		<button
			type="button"
			class="fixed inset-0 bg-black/50 z-30"
			onclick={() => (sidebarOpen = false)}
			aria-label="Close sidebar"
		></button>
	{/if}

	<!-- Main Content Wrapper -->
	<div id="main-content-wrapper" class="flex-1 flex flex-col min-h-0 min-w-0">
		<!-- Top Bar -->
		<div class="w-full relative z-10 flex-shrink-0">
			{#if typeof window !== 'undefined'}
				<TopBar
					{modules}
					{moduleId}
					{setModuleId}
					{showFavorites}
					{onBackToAll}
					{onClearFavorites}
					{sidebarOpen}
					setSidebarOpen={(open: boolean) => (sidebarOpen = open)}
					currentView={appState.currentView}
				/>
			{/if}
		</div>
		<!-- Main Content -->
		<div id="main-content" class="flex-1 flex flex-col items-center justify-start relative">
			{#if isLoading && !(isInitialLoad && quizData.length > 0)}
				<!-- Loading Overlay -->
				<div
					class="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black/60 pointer-events-auto select-none"
				>
					<svg
						class="animate-spin h-16 w-16 text-[#C294FF]"
						xmlns="http://www.w3.org/2000/svg"
						fill="none"
						viewBox="0 0 24 24"
					>
						<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"
						></circle>
						<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
						></path>
					</svg>
					<div class="mt-4 text-lg text-[#CECDE0] font-medium tracking-wide">
						Loading bunch of data?
					</div>
				</div>
			{/if}
			<div
				class="relative w-full h-full flex flex-col items-center justify-center overflow-hidden md:items-start md:justify-center"
			>
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
										toggleFavorite={handleToggleFavorite}
										answers={Array.isArray(quizData[idx]?.answers)
											? quizData[idx].answers.map((a) =>
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
				{:else if appState.currentView === 'favorites'}
					<div class="w-full h-full flex flex-col items-center justify-center">
						<div class="text-lg text-[#CECDE0] font-medium tracking-wide">
							No favorite questions
						</div>
					</div>
				{/if}
			</div>
		</div>
	</div>
	<!-- Floating Favorites ID Button and Modal -->
	<button
		id="fav-id-fab"
		class="cursor-pointer fav-id-fab fixed bottom-6 right-6 z-[1000] bg-[#6c63ff] text-white rounded-full w-14 h-14 shadow-lg text-2xl flex items-center justify-center hover:bg-[#574fd6]"
		onclick={() => (showFavModal = true)}
	>
		★
	</button>
	<FavoritesModal
		{showFavModal}
		{favIdList}
		closeModal={() => (showFavModal = false)}
		importFavorites={(ids: string) => {
			const newIds = ids
				.split(',')
				.map((id) => id.trim())
				.filter(Boolean);
			favorites = new Set([...Array.from(favorites), ...newIds]);
		}}
	/>
</div>
