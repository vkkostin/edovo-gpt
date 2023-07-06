
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
let followUpPromptTemplate = '';
let followUpPromptCondition = '';
let hasFollowUpPrompt = false;

function buildPrompt(template, question, answer) {
	let prompt = template;
	
	if (prompt.includes('{{question}}')) {
		prompt = prompt.replace(/{{question}}/g, `"${question}"`);
	}


	if (prompt.includes('{{answer}}')) {
		prompt = prompt.replace(/{{answer}}/g, `"${answer}"`);
	}

	return prompt;
}

async function getResponse(prompt, index, question, answer) {
	try {
		process.env.CURRENT_ITEM = index;
		console.log(`--- Processing Prompt ${index + 1} / ${responses.length} ---`);
		console.log(prompt);
		const response = await backOff(() => {
			return openai.createChatCompletion({
				model: 'gpt-3.5-turbo-0613',
				messages: [{role: 'user', content: prompt}],
				temperature: 0.7,
			});
		})
		console.log('--- Finished Processing Prompt ---');
		console.log('\n');

		return processChatCompletionData(response.data, prompt, question, answer);
	} catch (e) {
		console.error(e);
		generateOutput();
	}
}

async function processChatCompletionData(data, firstPrompt, question, answer) {
	const { prompt_tokens, completion_tokens, total_tokens} = data.usage;

	let score = data.choices[0].message.content;
	let followUpScore = '';
	let followUpPrompt = '';

	if (hasFollowUpPrompt && score === followUpPromptCondition) {
		followUpPrompt = buildPrompt(followUpPromptTemplate, question, answer);

		const response = await backOff(() => {
			return openai.createChatCompletion({
				model: 'gpt-3.5-turbo-0613',
				messages: [
					{role: 'user', content: firstPrompt},
					{role: 'assistant', content: data.choices[0].message.content},
					{role: 'user', content: followUpPrompt}
				],
				temperature: 0.7,
			});
		});

		followUpScore = response.data.choices[0].message.content;
	}

	return [
		score,
		...(hasFollowUpPrompt ? [followUpScore] : []),
		firstPrompt,
		...(hasFollowUpPrompt ? [followUpPrompt] : []),
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

	const itemCount = responses.length - 1;
	// const itemCount = 11;

	for (let i = 1; i < itemCount; i++) {
		const item = responses[i];
		const lessonName = item[lessonNameIndex];
		const { stripHtml } = await import('string-strip-html');
		const question = stripHtml(item[questionIndex]).result;
		const answer = item[answerIndex];
		const prompt = buildPrompt(promptTemplate, question, answer);
		const start = Date.now();
		const assessment = await getResponse(prompt, i, question, answer);
		const end = Date.now();
		const latency = Math.round((end - start) / 1000);

		console.log('Assessment: ', assessment);

		evaluations.push([
			lessonName,
			question,
			answer,
			...assessment,
			latency,
		]);

	}

	console.log('100% Complete');

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
		...(hasFollowUpPrompt ? ['followup_score'] : []),
		'prompt',
		...(hasFollowUpPrompt ? ['followup_prompt'] : []),
		'prompt_tokens',
		'completion_tokens',
		'total_tokens',
		'latency',
	];

	const stringifier = stringify({ header: true, columns: columns });
	evaluations.forEach(row => stringifier.write(row));
	stringifier.pipe(writableStream);

	reset();

	console.log('DONE!');
}

function processRow(row) {
	responses.push(row)
}

function reset() {
	process.env.IS_PROCESSING_DATA = 'false';
	process.env.TOTAL_ITEMS = 0;
	process.env.CURRENT_ITEM = 0;

	hasFollowUpPrompt = false;
	responses = [];
	evaluations = [];
}

const parseResponses = (newPrompt, newFollowUpPrompt, newFollowUpPromptCondition) => {
	process.env.IS_PROCESSING_DATA = 'true';
	promptTemplate = newPrompt;

	if (newFollowUpPrompt && newFollowUpPromptCondition) {
		hasFollowUpPrompt = true;
		followUpPromptTemplate = newFollowUpPrompt;
		followUpPromptCondition = newFollowUpPromptCondition;
	}

    const path = './resources/static/assets/uploads/gpt.csv';

	fs.createReadStream(path)
		.pipe(parse({ delimiter: "," }))
		.on('data', processRow)
		.on('close', processData);
}

module.exports = {parseResponses}
