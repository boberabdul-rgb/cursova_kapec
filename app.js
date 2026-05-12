import dotenv from 'dotenv';
dotenv.config();

import 'express-async-errors';
import createError from 'http-errors';
import express from 'express';
import path from 'path';
import cookieParser from 'cookie-parser';
import logger from 'morgan';
import hbs from 'hbs';
import session from 'express-session';
import { fileURLToPath } from 'url';


import likarRouter from './routes/likar.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();


app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');


hbs.registerHelper('eq', function (a, b) {
  return a === b;
});

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));


app.use(session({
  secret: 'ivan-vet-secret-2026',
  resave: false,
  saveUninitialized: true,
  cookie: { maxAge: 24 * 60 * 60000 }
}));


app.use((req, res, next) => {
  res.locals.userNickname = req.session.userNickname;
  next();
});


app.use('/likar', likarRouter);

app.get('/', (req, res) => {
  res.render('index'); 
});


app.use(function (req, res, next) {
  next(createError(404));
});


app.use(function (err, req, res, next) {
  console.error('Помилка сервера:', err.message);
  
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};
  
  res.status(err.status || 500);
  res.render('error'); 
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Сервер ветеринарної клініки працює на http://localhost:${PORT}`);
    console.log(`Головна сторінка: http://localhost:${PORT}`);
}); 

export default app;