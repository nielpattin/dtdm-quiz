// Node.js script to fix question_id and answer_id in moimoi JSON files

import { readdirSync, readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MOIMOI_DIR = join(__dirname, 'vi_json_merged'); // Replace with the actual directory path
const START_ID = 1;

function getJsonFiles(dir) {
	return readdirSync(dir)
		.filter((file) => file.endsWith('.json'))
		.sort((a, b) => {
			const getNum = (name) => {
				const match = name.match(/quiz-(\d+)\.json/);
				return match ? parseInt(match[1], 10) : 0;
			};
			return getNum(a) - getNum(b);
		})
		.map((file) => join(dir, file));
}

function fixIds() {
	let questionNum = START_ID;
	const files = getJsonFiles(MOIMOI_DIR);

	for (const file of files) {
		const data = JSON.parse(readFileSync(file, 'utf8'));
		if (!Array.isArray(data)) continue;

		for (const question of data) {
			question.question_id = `${questionNum}`;
			if (Array.isArray(question.answers)) {
				question.answers.forEach((answer, aIdx) => {
					answer.answer_id = `${questionNum}-${aIdx}`;
				});
			}
			questionNum++;
		}

		writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
	}
}

fixIds();
