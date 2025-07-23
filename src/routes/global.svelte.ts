// Centralized main page state for Sidebar, TopBar, QuizCard, FavoritesModal

import { DEFAULT_FAVORITES_LOCAL } from '../lib/localKeys';
import { SvelteSet, SvelteMap } from 'svelte/reactivity';

export type Question = { question_id: string; [key: string]: unknown };

export const favoritesStore = $state<Record<string, Question>>({});

export type Quiz = {
	question_id: string;
	answers: string[];
	[key: string]: unknown;
};

export type AppState = {
	currentView: 'all' | 'favorites';
	all: { module: string; questionIndex: number };
	favorites: { module: string; questionIndex: number };
};

export type PageState = {
	quizData: Quiz[];
	current: number;
	selectedAnswers: number[];
	questionLocked: boolean;
	isLoading: boolean;
	moduleId: string; // Current module ID for the quiz
};

export const pageState = $state<PageState>({
	quizData: [],
	current: 0,
	selectedAnswers: [],
	questionLocked: false,
	isLoading: false,
	moduleId: ''
});

export const favorites = new SvelteSet<string>();
export const appState = $state<AppState>({
	currentView: 'all',
	all: { module: '', questionIndex: 0 },
	favorites: { ...DEFAULT_FAVORITES_LOCAL }
});

export const uiState = $state<{ sidebarOpen: boolean; showFavModal: boolean }>({
	sidebarOpen: false,
	showFavModal: false
});

export function getFavIdList() {
	return Array.from(favorites).join(', ');
}

export const isInitialLoad = $state<boolean>(true);

export const moduleQuizCache = new SvelteMap<string, Quiz[]>();
export function getCurrentQuestion(): Quiz | undefined {
	return pageState.quizData[pageState.current];
}
export function getAnswers(): { answer_text: string }[] {
	const q = getCurrentQuestion();
	return q && Array.isArray(q.answers)
		? q.answers.map((a) => (typeof a === 'object' && a !== null ? a : { answer_text: String(a) }))
		: [];
}
