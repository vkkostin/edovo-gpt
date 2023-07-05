
require('dotenv').config();
const { Configuration, OpenAIApi } = require('openai');
const fs = require('fs');
const { parse } = require('csv-parse');
const { stringify } = require('csv-stringify');
// const { stripHtml } = require('string-strip-html');
const { backOff } = require('exponential-backoff');

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

const responses = [];
const evaluations = [];

function buildPrompt(question, answer) {
	return `How complete is the answer below with regard to the associated question? Use the following rubric: 2 - Completely answers all parts of the question, 1 - Partially answers the question, 0 - Does not answer question. Your response should just be the number that is your score. Do not provide additional information.\nQuestion: "${question}"\nAnswer: "${answer}"`;
}

async function getResponse(content, index) {
	try {
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

	const score = parseInt(data.choices[0].message.content, 10);

	console.log('Score: ', score);

	return [
		score,
		prompt_tokens,
		completion_tokens,
		total_tokens,
	];
}

async function processData() {
	const headers = responses.shift();
	const lessonNameIndex = headers.indexOf('lesson_name');
	const questionIndex = headers.indexOf('question');
	const answerIdIndex = headers.indexOf('answer_id');
	const answerIndex = headers.indexOf('student_answer');

	// const itemCount = responses.length;
	const itemCount = 5;

	for (let i = 0; i < itemCount; i++) {
		const item = responses[i];
		const lessonName = item[lessonNameIndex];

		const { stripHtml } = await import('string-strip-html');

		const question = stripHtml(item[questionIndex]).result;
		const answerId = item[answerIdIndex];
		const answer = item[answerIndex];
		const prompt = buildPrompt(lessonName, question, answer);
		const start = Date.now();
		const assessment = await getResponse(prompt, i);
		const end = Date.now();
		const latency = Math.round((end - start) / 1000);

		console.log('Assessment: ', assessment);

		evaluations.push([
			lessonName,
			question,
			answerId,
			answer,
			latency,
			...assessment,
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
		'answer_id',
		'student_answer',
		'latency',
		'score',
		'prompt_tokens',
		'completion_tokens',
		'total_tokens',
	];

	const stringifier = stringify({ header: true, columns: columns });
	evaluations.forEach(row => stringifier.write(row));
	stringifier.pipe(writableStream);

	console.log('DONE!');
}

function processRow(row) {
	responses.push(row)
}

const parseResponses = (prompt) => {
    const path = './resources/static/assets/uploads/gpt.csv';

	fs.createReadStream(path)
		.pipe(parse({ delimiter: "," }))
		.on('data', processRow)
		.on('close', processData);
}

module.exports = {parseResponses}

// export {parseResponses}