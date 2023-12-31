const express = require('express');
const path = require('path');
const cors = require('cors');
const initRoutes = require('./routes/index.js');

// import express from 'express';
// import path from 'path';
// import cors from 'cors';
// import initRoutes from './routes/index.js';

global.__basedir = path.resolve() + "/..";

const app = express();

app.use(cors());

// parse requests of content-type - application/json
app.use(express.json());

// parse requests of content-type - application/x-www-form-urlencoded
app.use(express.urlencoded({ extended: true }));

initRoutes(app);

// set port, listen for requests
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}.`);
});
