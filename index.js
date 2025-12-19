// require('dotenv').config();
import dotenv from "dotenv";
import express from 'express';
import cors from 'cors';
import mongoose from "mongoose";
import colors from "colors"

import conectarDB from './config/db.js'
import rutapp from './routes/auth.routes.js';

import morgan from 'morgan'


const app = express();
app.use(cors());
app.use(express.json());

app.use('/api', rutapp);


//Morgan
app.use(morgan("dev"));


// Captura los valores del archivo .env
dotenv.config();

console.log(process.env.MONGO_URL)

const port = process.env.PORT || 4000

// Conectando a la BD y Activando el server
///conectarDB();
mongoose.connect(process.env.MONGO_URL)
  .then(() => app.listen(port, () =>
    console.log(colors.cyan.bold(`Servidor corriendo en puerto http://localhost:${port}`)))
  )
  .catch(err => console.error(colors.red.bold('❌ Error de conexión:', err)));


// const port = 4000
// app.listen(port, () => {
//      console.log( colors.cyan.bold( `REST API funcionando en el puerto ${port}` ))
// })
