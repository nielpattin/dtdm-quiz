<script lang="ts">
	import Sidebar from './Sidebar.svelte';
	import TopBar from './TopBar.svelte';
	import Carousel from './Carousel.svelte';
	import FavoritesModal from './FavoritesModal.svelte';
	import {
		DEFAULT_FAVORITES_LOCAL,
		FAVORITES_LOCAL_KEY,
		CURRENT_VIEW_KEY,
		FAVORITE_QUESTIONS_KEY,
		APPSTATE_ALL_KEY
	} from '../lib/localKeys';
	import { modules } from '../lib/modules';
	import type { Quiz } from './global.svelte';
	import {
		pageState,
		moduleQuizCache,
		favorites,
		appState,
		uiState,
		getFavIdList
	} from './global.svelte';

	let isInitialLoad = $state(true);

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
				pageState.moduleId = DEFAULT_FAVORITES_LOCAL.module;
				pageState.quizData = [];
				pageState.current = 0;
			} else {
				loadAppState('favorites');
				if (!appState.favorites.module || appState.favorites.module === '') {
					appState.favorites.module = 'all';
					pageState.moduleId = 'all';
				} else {
					pageState.moduleId = appState.favorites.module;
				}
				const restoredIndex =
					typeof appState.favorites.questionIndex === 'number'
						? appState.favorites.questionIndex
						: 0;
				pageState.isLoading = true;
				const res = await fetch('/api/module', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ ids: favIdsArr })
				});
				const data = await res.json();
				let loadedQuizzes: Quiz[] = Array.isArray(data.quizzes)
					? data.quizzes.filter((q: Quiz) => q.status !== 'all_false')
					: [];
				if (pageState.moduleId !== 'all') {
					loadedQuizzes = loadedQuizzes.filter(
						(q) => q.quiz_number === `module_${pageState.moduleId}`
					);
				}
				pageState.quizData = loadedQuizzes;
				pageState.isLoading = false;
				pageState.current = restoredIndex;
			}
		}
	}

	function onBackToAll() {
		if (typeof window !== 'undefined') {
			localStorage.setItem(CURRENT_VIEW_KEY, 'all');
			appState.currentView = 'all';
			loadAppState('all');
			pageState.moduleId = appState.all.module;
			loadQuizForModule(appState.all.module, appState.all.questionIndex);
		}
	}

	function onClearFavorites() {
		favorites.clear();
		if (typeof window !== 'undefined') {
			localStorage.setItem(FAVORITE_QUESTIONS_KEY, '[]');
		}
		if (appState.currentView === 'favorites') {
			appState.currentView = 'all';
			pageState.moduleId = appState.all.module;
			loadQuizForModule(appState.all.module, appState.all.questionIndex);
		}
	}

	async function setModuleId(id: string) {
		pageState.moduleId = id;
		appState.all.questionIndex = 0;
		pageState.current = 0;
		pageState.selectedAnswers = [];
		pageState.questionLocked = false;
		await loadQuizForModule(id, 0);
	}

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

	// Restore favorites and view state from localStorage on browser load
	if (typeof window !== 'undefined') {
		const favArr = JSON.parse(localStorage.getItem(FAVORITE_QUESTIONS_KEY) || '[]');
		favorites.clear();
		for (const id of favArr) favorites.add(id);
		const currentView = (localStorage.getItem(CURRENT_VIEW_KEY) as 'all' | 'favorites') || 'all';
		appState.currentView = currentView;
		loadAppState(currentView);
	}

	// Quiz loading logic
	async function loadQuizForModule(moduleId: string, startAt = 0) {
		// If in favorites view and no favorites, skip loading bar
		if (appState.currentView === 'favorites') {
			const favIdsArr = Array.from(favorites);
			if (favIdsArr.length === 0) {
				pageState.isLoading = false;
				pageState.quizData = [];
				pageState.current = 0;
				return;
			}
			pageState.isLoading = true;
			const res = await fetch('/api/module', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ ids: favIdsArr })
			});
			const data = await res.json();
			let loadedQuizzes: Quiz[] = Array.isArray(data.quizzes)
				? data.quizzes.filter((q: Quiz) => q.status !== 'all_false')
				: [];
			if (pageState.moduleId !== 'all') {
				loadedQuizzes = loadedQuizzes.filter(
					(q) => q.quiz_number === `module_${pageState.moduleId}`
				);
			}
			pageState.quizData = loadedQuizzes;
			pageState.isLoading = false;
			pageState.current =
				typeof startAt === 'number' ? Math.max(0, Math.min(startAt, loadedQuizzes.length - 1)) : 0;
			pageState.selectedAnswers = [];
			pageState.questionLocked = false;
			return;
		}
		pageState.isLoading = true;
		if (!pageState.moduleId) {
			pageState.quizData = [];
			pageState.current = 0;
			pageState.isLoading = false;
			return;
		}
		let loadedQuizzes: Quiz[] = [];
		if (moduleQuizCache.has(pageState.moduleId)) {
			loadedQuizzes = moduleQuizCache.get(pageState.moduleId) ?? [];
		} else {
			let url = `/api/module?id=${pageState.moduleId}`;
			const res = await fetch(url);
			const data = await res.json();
			loadedQuizzes = Array.isArray(data.quizzes)
				? data.quizzes.filter((q: Quiz) => q.status !== 'all_false')
				: [];
			moduleQuizCache.set(pageState.moduleId, loadedQuizzes);
		}
		pageState.quizData = loadedQuizzes;
		pageState.isLoading = false;
		pageState.current =
			typeof startAt === 'number' ? Math.max(0, Math.min(startAt, loadedQuizzes.length - 1)) : 0;
		pageState.selectedAnswers = [];
		pageState.questionLocked = false;
	}

	function handleKeyNavigation(e: KeyboardEvent) {
		if (
			document.activeElement &&
			['INPUT', 'SELECT', 'TEXTAREA'].includes((document.activeElement as HTMLElement).tagName)
		)
			return;
		if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
			if (pageState.current < pageState.quizData.length - 1) {
				pageState.current += 1;
				pageState.selectedAnswers = [];
				pageState.questionLocked = false;
			}
			// Do nothing when at the end of questions
		} else if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
			if (pageState.current > 0) {
				pageState.current -= 1;
				pageState.selectedAnswers = [];
				pageState.questionLocked = false;
			}
			// Do nothing when at the start of questions
		}
	}

	$effect(() => {
		window.addEventListener('keydown', handleKeyNavigation);
		if (isInitialLoad) {
			if (appState.currentView === 'favorites') {
				pageState.moduleId = appState.favorites.module || 'all';
				showFavorites();
			} else {
				// Ensure first valid module is selected by default if none is set
				const firstValidModule = modules.find((m) => m.value !== '')?.value || '';
				if (!appState.all.module && firstValidModule) {
					appState.all.module = firstValidModule;
				}
				const initialModule = appState.all.module || firstValidModule || '';
				pageState.moduleId = initialModule;
				loadQuizForModule(pageState.moduleId, appState.all.questionIndex);
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
		if (
			typeof window !== 'undefined' &&
			pageState.moduleId !== undefined &&
			appState.currentView === 'all'
		) {
			appState.all.module = pageState.moduleId;
			appState.all.questionIndex = pageState.current;
			localStorage.setItem(APPSTATE_ALL_KEY, JSON.stringify(appState.all));
		}
		if (typeof window !== 'undefined' && appState.currentView === 'favorites') {
			appState.favorites.module = pageState.moduleId;
			appState.favorites.questionIndex = pageState.current;
			localStorage.setItem(FAVORITES_LOCAL_KEY, JSON.stringify(appState.favorites));
		}
	});
</script>

<!-- Main Layout -->
<div class="flex min-h-screen min-w-screen w-screen bg-[#1D1B2C] text-[#CECDE0] font-sans">
	<!-- Sidebar (only rendered if open on mobile, always on desktop) -->
	{#if uiState.sidebarOpen || (typeof window !== 'undefined' && window.innerWidth >= 768)}
		<div
			class="fixed top-0 left-0 h-full z-40 bg-[#29273F] transition-transform duration-200 ease-in-out
							md:static md:translate-x-0 md:min-w-[200px] md:w-[250px]"
		>
			<Sidebar />
		</div>
	{/if}

	<!-- Backdrop for mobile (only rendered if sidebar is open) -->
	{#if uiState.sidebarOpen && typeof window !== 'undefined' && window.innerWidth < 768}
		<button
			type="button"
			class="fixed inset-0 bg-black/50 z-30"
			onclick={() => (uiState.sidebarOpen = false)}
			aria-label="Close sidebar"
		></button>
	{/if}

	<!-- Main Content Wrapper -->
	<div id="main-content-wrapper" class="flex-1 flex flex-col min-h-0 min-w-0">
		<!-- Top Bar -->
		<div class="w-full relative z-10 flex-shrink-0">
			{#if typeof window !== 'undefined'}
				<TopBar {setModuleId} {showFavorites} {onBackToAll} {onClearFavorites} />
			{/if}
		</div>
		<!-- Main Content -->
		<div id="main-content" class="flex-1 flex flex-col items-center justify-start relative">
			{#if pageState.isLoading && !(isInitialLoad && pageState.quizData.length > 0)}
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
				<Carousel />
			</div>
		</div>
	</div>
	<!-- Floating Favorites ID Button and Modal -->
	<button
		id="fav-id-fab"
		class="cursor-pointer fav-id-fab fixed bottom-6 right-6 z-[1000] bg-[#6c63ff] text-white rounded-full w-14 h-14 shadow-lg text-2xl flex items-center justify-center hover:bg-[#574fd6]"
		onclick={() => (uiState.showFavModal = true)}
	>
		★
	</button>
	<FavoritesModal />
</div>
