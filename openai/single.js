
require('dotenv').config();
const { Configuration, OpenAIApi } = require('openai');
const fs = require('fs');
const { parse } = require('csv-parse');
const { stringify } = require('csv-stringify');
const { backOff } = require('exponential-backoff');

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

let responses = [];
let evaluations = [];
let promptTemplate = '';

function buildPrompt(question, answer) {
	let prompt = promptTemplate;
	
	if (prompt.includes('{{question}}')) {
		prompt = prompt.replace(/{{question}}/g, `"${question}"`);
	}


	if (prompt.includes('{{answer}}')) {
		prompt = prompt.replace(/{{answer}}/g, `"${answer}"`);
	}

	return prompt;
}

async function getResponse(content, index) {
	try {
		process.env.CURRENT_ITEM = index;
		console.log(`--- Processing Prompt ${index + 1} / ${responses.length} ---`);
		console.log(content);
		const response = await backOff(() => {
			return openai.createChatCompletion({
				model: 'gpt-3.5-turbo-0613',
				messages: [{role: 'user', content}],
				temperature: 0.7,
			});
		})
		console.log('--- Finished Processing Prompt ---');
		console.log('\n');

		return processChatCompletionData(response.data);
	} catch (e) {
		console.error(e);
		generateOutput();
	}
}

async function processChatCompletionData(data) {
	const { prompt_tokens, completion_tokens, total_tokens} = data.usage;

	let score = parseInt(data.choices[0].message.content, 10);

	if (isNaN(score)) {
		score = data.choices[0].message.content;
	}

	return [
		score,
		prompt_tokens,
		completion_tokens,
		total_tokens,
	];
}

async function processData() {
	const [headers] = responses;
	const lessonNameIndex = headers.indexOf('lesson_name');
	const questionIndex = headers.indexOf('question');
	const answerIndex = headers.indexOf('answer');

	process.env.TOTAL_ITEMS = responses.length;

	const itemCount = responses.length;
	// const itemCount = 10;

	for (let i = 1; i < itemCount; i++) {
		const item = responses[i];
		const lessonName = item[lessonNameIndex];
		const { stripHtml } = await import('string-strip-html');
		const question = stripHtml(item[questionIndex]).result;
		const answer = item[answerIndex];
		const prompt = buildPrompt(question, answer);
		const start = Date.now();
		const assessment = await getResponse(prompt, i);
		const end = Date.now();
		const latency = Math.round((end - start) / 1000);

		console.log('Assessment: ', assessment);

		evaluations.push([
			lessonName,
			question,
			answer,
			...assessment,
			latency,
			prompt,
		]);

	}

	console.log('100% Complete');

	process.env.IS_PROCESSING_DATA = 'false';

	generateOutput();
}

function generateOutput() {
    const path = './resources/static/assets/uploads/output.csv';

	const writableStream = fs.createWriteStream(path);

	const columns = [
		'lesson_name',
		'question',
		'answer',
		'score',
		'prompt_tokens',
		'completion_tokens',
		'total_tokens',
		'latency',
		'prompt',
	];

	const stringifier = stringify({ header: true, columns: columns });
	evaluations.forEach(row => stringifier.write(row));
	stringifier.pipe(writableStream);

	console.log('DONE!');
}

function processRow(row) {
	responses.push(row)
}

const parseResponses = (newPrompt) => {
	process.env.IS_PROCESSING_DATA = 'true';
	responses = [];
	evaluations = [];
	promptTemplate = newPrompt;

    const path = './resources/static/assets/uploads/gpt.csv';

	fs.createReadStream(path)
		.pipe(parse({ delimiter: "," }))
		.on('data', processRow)
		.on('close', processData);
}

module.exports = {parseResponses}
