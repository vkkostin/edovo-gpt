const { Router } = require('express');
const csvController = require('../controllers/csv.controller.js');
const uploadFile = require('../middleware/upload.js');

// import { Router } from 'express';
// import csvController from '../controllers/csv.controller.js';
// import uploadFile from '../middleware/upload.js';

const router = Router();

let routes = (app) => {
  // CSV
  router.post('/csv/upload', uploadFile.single('file'), csvController.upload);

  router.get('/api_key', csvController.getAPIKey);

  router.post('/submit', csvController.submit);

  router.get('/download', csvController.download);

  router.get('/progress', csvController.progress);

  router.get('/models', csvController.models);

  app.use("/api", router);
};

module.exports = routes;

// export default routes;
