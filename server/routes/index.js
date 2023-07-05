import { Router } from 'express';
import csvController from '../controllers/csv.controller.js';
import uploadFile from '../middleware/upload.js';

const router = Router();

let routes = (app) => {
  // CSV
  router.post('/csv/upload', uploadFile.single('file'), csvController.upload);

  app.use("/api", router);
};

export default routes;
