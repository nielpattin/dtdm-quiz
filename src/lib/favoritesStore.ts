import { writable } from 'svelte/store';

export type Question = { question_id: string; [key: string]: unknown };

export const favoritesStore = writable<Record<string, Question>>({});
