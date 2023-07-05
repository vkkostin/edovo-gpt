import 'dotenv/config'
import { createReadStream, } from 'fs';
import { parse } from 'fast-csv';

const upload = async (req, res) => {
  try {
    if (req.file == undefined) {
      return res.status(400).send("Please upload a CSV file!");
    }

    let employees = [];
    let path = "./resources/static/assets/uploads/" + req.file.filename;

    createReadStream(path)
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
  const {prompt} = req.body;

  res.sendStatus(200);
}

export default {
  upload,
  getAPIKey,
  submit,
}