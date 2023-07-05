import { Router } from 'express';
import csvController from '../controllers/csv.controller.js';
import uploadFile from '../middleware/upload.js';

const router = Router();

let routes = (app) => {
  // CSV
  router.post('/csv/upload', csvController.deleteFiles, uploadFile.single('file'), csvController.upload);

  router.delete('/csv/delete', csvController.deleteFiles);

  router.get('/api_key', csvController.getAPIKey);

  app.use("/api", router);
};

export default routes;
