import dotenv from 'dotenv';
dotenv.config();

import 'express-async-errors';
import createError from 'http-errors';
import express from 'express';
import path from 'path';
import cookieParser from 'cookie-parser';
import logger from 'morgan';
import hbs from 'hbs';
import { fileURLToPath } from 'url';

// Імпорт твого роута для ветеринарної клініки
import likarRouter from './routes/likar.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Налаштування двигуна шаблонів (Handlebars - hbs)
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');

// Реєстрація хелпера 'eq' (як у твоєму прикладі)
hbs.registerHelper('eq', function (a, b) {
  return a === b;
});

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Головний роут для твоєї курсової
app.use('/likar', likarRouter);

// Перенаправлення з головної сторінки одразу на список записів
app.get('/', (req, res) => {
  res.redirect('/likar');
});

// Глобальний обробник помилок (Global error handler)
app.use((err, req, res, next) => {
  console.error('Global error caught:', err || 'Unknown error');
  res.status(500).render('error', { 
    message: 'Щось пішло не так у ветеринарній базі',
    error: process.env.NODE_ENV === 'development' ? err : {} 
  });
});

// Перехоплення 404 (сторінка не знайдена)
app.use(function (req, res, next) {
  next(createError(404));
});

// Фінальний обробник помилок для рендеру сторінки error.hbs
app.use(function (err, req, res, next) {
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};
  res.status(err.status || 500);
  res.render('error');
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`🚀 Сервер ветеринарної клініки працює на http://localhost:${PORT}`);
}); 

export default app;
