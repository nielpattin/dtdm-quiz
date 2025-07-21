// convert_aws_csv_to_json.js
import fs from 'fs';
import { parse } from 'csv-parse/sync';

const csvPath = 'AWS.csv';
const outputPath = 'raw_eng_json/aws-quiz.json';

const csvContent = fs.readFileSync(csvPath, 'utf8');
const records = parse(csvContent, {
	columns: true,
	skip_empty_lines: true
});

// Helper to normalize keys (remove BOM, trim)
function normalizeKey(key) {
	return key.replace(/^\uFEFF/, '').trim();
}

// Find the correct key for question text
const questionTextKey = Object.keys(records[0]).find((k) => normalizeKey(k) === 'Question Text');

function cleanOption(opt) {
	return typeof opt === 'string' ? opt.trim().replace(/^"|"$/g, '') : '';
}

function getAnswers(row, question_type, idx) {
	const options = [
		cleanOption(row['Option 1']),
		cleanOption(row['Option 2']),
		cleanOption(row['Option 3']),
		cleanOption(row['Option 4']),
		cleanOption(row['Option 5'])
	].filter((opt) => opt);

	let correctIndexes = [];
	if (question_type === 'single_answer_question') {
		if (row['Correct Answer']) {
			correctIndexes = [parseInt(row['Correct Answer'], 10) - 1];
		}
	} else if (question_type === 'multiple_answer_question') {
		if (row['Correct Answer']) {
			correctIndexes = row['Correct Answer'].split(',').map((x) => parseInt(x, 10) - 1);
		}
	}

	return options.map((opt, i) => ({
		answer_id: `${idx}-${i}`,
		answer_text: opt,
		is_correct: correctIndexes.includes(i)
	}));
}

const questions = records
	.map((row, idx) => {
		let question_type = null;
		if (row['Question Type'] === 'Multiple Choice') {
			question_type = 'single_answer_question';
		} else if (row['Question Type'] === 'Checkbox') {
			question_type = 'multiple_answer_question';
		} else {
			return null;
		}

		let question_text = '';
		if (row[questionTextKey] && typeof row[questionTextKey] === 'string') {
			question_text = row[questionTextKey].replace(/^"|"$/g, '').trim();
		}

		return {
			question_id: `q-${idx + 1}`,
			question_text,
			question_type,
			answers: getAnswers(row, question_type, idx + 1)
		};
	})
	.filter(Boolean);

fs.writeFileSync(outputPath, JSON.stringify(questions, null, 2));
console.log(`Converted to JSON: ${outputPath}`);
