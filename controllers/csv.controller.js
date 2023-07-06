require('dotenv').config();
const fs = require('fs');
const {parse} = require('fast-csv');
const {parseResponses} = require('../openai/single.js');
const path = require('path');

// import { createReadStream, } from 'fs';
// import { parse } from 'fast-csv';
// import { parseResponses } from '../openai/single.js';


const upload = async (req, res) => {
  try {
    if (req.file == undefined) {
      return res.status(400).send("Please upload a CSV file!");
    }

    let employees = [];
    let path = "./resources/static/assets/uploads/gpt.csv";

    fs.createReadStream(path)
      .pipe(parse({ headers: true }))
      .on("error", (error) => {
        throw error.message;
      })
      .on("data", (row) => {
        employees.push(row);
      })
      .on("end", () => {
        res.status(200).send({
            message: "The file: "
             + req.file.originalname
             + " got uploaded successfully!!",
          });
      });
  } catch (error) {
    console.log(error);
    res.status(500).send({
      message: "Failed to upload the file: " + req.file.originalname,
    });
  }
};

const getAPIKey = async (req, res) => {
  res.status(200).send({
    api_key: process.env.OPENAI_API_KEY,
  });
};

const submit = async (req, res) => {
  const {prompt, followUpPrompt, followUpPromptCondition, systemMessage, temperature} = req.body;

  if (process.env.IS_PROCESSING_DATA === 'true') {
    res.status(429).send({
      currentItem: process.env.CURRENT_ITEM,
      totalItems: process.env.TOTAL_ITEMS,
    });

    return
  }

  parseResponses(prompt, followUpPrompt, followUpPromptCondition, systemMessage, temperature);

  res.sendStatus(200);
}

const download = async (req, res) => {
  if (process.env.IS_PROCESSING_DATA === 'true') {
    res.status(429).send({
      currentItem: process.env.CURRENT_ITEM,
      totalItems: process.env.TOTAL_ITEMS,
    });

    return
  }

  const filePath = path.join(__dirname, '../resources/static/assets/uploads/output.csv');

  // Check if the file exists
  fs.access(filePath, fs.constants.F_OK, (err) => {
    if (err) {
      console.error('File not found:', err);
      res.status(404).send('File not found');
      return;
    }

    // Set the appropriate headers for the file download
    res.setHeader('Content-Disposition', 'attachment; filename="file.csv"');
    res.setHeader('Content-Type', 'text/csv');

    // Stream the file to the response
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  });
}

const progress = async (req, res) => {
  res.status(200).send({
    currentItem: process.env.CURRENT_ITEM,
    totalItems: process.env.TOTAL_ITEMS,
  });
}

module.exports = {
  upload,
  getAPIKey,
  submit,
  download,
  progress,
}

// export default {
//   upload,
//   getAPIKey,
//   submit,
// }