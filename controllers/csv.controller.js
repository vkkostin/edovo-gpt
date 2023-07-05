import 'dotenv/config'
import { createReadStream, readdir, unlink } from 'fs';
import { parse } from 'fast-csv';
import path from "node:path";

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

const deleteFiles = async (req, res) => {
  const directory = "./resources/static/assets/uploads";

  try {
    readdir(directory, (err, files) => {
      if (err) throw err;
    
      for (const file of files) {
        unlink(path.join(directory, file), (err) => {
          if (err) throw err;
        });
      }
    });

    res.status(200).send({
      message: "Deleted files successfully"
    });
  } catch (e) {
    res.status(500).send({
      message: "Failed to upload the file: " + e,
    });
  }
}

const getAPIKey = async (req, res) => {
  res.status(200).send({
    api_key: process.env.API_KEY,
  });
}

export default {
  upload,
  deleteFiles,
  getAPIKey,
}