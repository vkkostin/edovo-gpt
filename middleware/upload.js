const fs = require('fs');
const multer = require('multer');

// import fs from 'fs';
// import multer from 'multer';

const storage = multer.diskStorage({
  destination: (_req, file, cb) => {
    console.log(file.originalname);
    const dir = './resources/static/assets/uploads';
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    console.log(`Writing ${file.originalname} to gpt.csv`);
    cb(null, 'gpt.csv');
  },
});

const csvFilter = (_req, file, cb) => {
  console.log('Reading file in middleware', file.originalname);
  if (file == undefined) {
    cb('Please upload a file to proceed.', false);
  } else if (file.mimetype.includes('csv')) {
    cb(null, true);
  } else {
    cb('Please upload only csv file as only CSV is supported for now.', false);
  }
};

module.exports = multer({
  storage: storage,
  fileFilter: csvFilter
});

// export default multer({
//     storage: storage,
//     fileFilter: csvFilter
// });