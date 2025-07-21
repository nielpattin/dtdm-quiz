// merge_vi_quiz.js
import fs from 'fs';
import path from 'path';

const inputDir = 'vi_json';
const outputDir = 'vi_json_merged';

if (!fs.existsSync(outputDir)) {
	fs.mkdirSync(outputDir);
}

const files = fs
	.readdirSync(inputDir)
	.filter((f) => f.endsWith('.json') && f.startsWith('quiz-'))
	.sort((a, b) => {
		const getNum = (f) => parseInt(f.match(/quiz-(\d+)/)[1], 10);
		return getNum(a) - getNum(b);
	});

const groups = [];
for (let i = 0; i < files.length; ) {
	if (i >= files.length - 3) {
		groups.push(files.slice(i));
		break;
	} else {
		groups.push([files[i], files[i + 1]]);
		i += 2;
	}
}

groups.forEach((group, idx) => {
	let merged = [];
	group.forEach((file) => {
		const data = JSON.parse(fs.readFileSync(path.join(inputDir, file), 'utf8'));
		merged = merged.concat(data);
	});
	const outName = `merged-quiz-${idx + 1}.json`;
	fs.writeFileSync(path.join(outputDir, outName), JSON.stringify(merged, null, 2), 'utf8');
	console.log(`Created ${outName} from: ${group.join(', ')}`);
});
