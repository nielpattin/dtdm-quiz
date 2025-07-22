// split-aws-quiz.js
import fs from 'fs';

const inputPath = 'raw_eng_json/moimoi-quiz.json';
const outputDir = 'moimoi';

const data = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
const chunkSize = 30;

for (let i = 0; i < data.length; i += chunkSize) {
	const chunk = data.slice(i, i + chunkSize);
	const fileIndex = Math.floor(i / chunkSize) + 1;
	const outputPath = `${outputDir}/quiz-${fileIndex}.json`;
	fs.writeFileSync(outputPath, JSON.stringify(chunk, null, 2));
	console.log(`Wrote ${outputPath}`);
}
