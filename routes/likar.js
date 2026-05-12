import express from 'express';
const router = express.Router();
import db from '../db/connector.js';

// КЛАС ПОМИЛОК
class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = "ValidationError";
  }
}

// КЛАСИ ВАЛІДАЦІЇ 
class Client {
  constructor({ owner_name, pet_name, phone, password }) {
    if (!owner_name?.trim()) throw new ValidationError("Ім'я власника обов'язкове");
    if (!pet_name?.trim()) throw new ValidationError("Кличка тварини обов'язкова");
    if (!phone?.trim() || phone.length < 10) throw new ValidationError("Некоректний номер телефону");
    if (!password || password.length < 4) throw new ValidationError("Пароль має бути мін. 4 символи");

    this.owner_name = owner_name.trim();
    this.pet_name = pet_name.trim();
    this.phone = phone.trim();
    this.password = password;
  }
}

class Appointment {
  constructor({ date, start_time }) {
    if (!date) throw new ValidationError("Оберіть дату візиту");
    if (!start_time) throw new ValidationError("Оберіть час візиту");

    const [h, m] = start_time.split(':').map(Number);
    const end = new Date(new Date().setHours(h, m + 30));
    const end_time = `${end.getHours().toString().padStart(2, '0')}:${end.getMinutes().toString().padStart(2, '0')}`;

    this.appointment_date = date;
    this.start_time = start_time;
    this.end_time = end_time;
  }
}

// MIDDLEWARE
function isAuthenticated(req, res, next) {
  if (req.session.userId) return next();
  res.redirect('/likar/login');
}


// Головна сторінка
router.get('/', isAuthenticated, async (req, res) => {
  try {
    const query = `
      SELECT a.id, c.owner_name, c.pet_name, c.phone, 
             TO_CHAR(a.appointment_date, 'YYYY-MM-DD') as appointment_date, 
             a.start_time, a.end_time 
      FROM appointments a 
      JOIN clients c ON a.client_id = c.id 
      ORDER BY a.appointment_date DESC, a.start_time ASC
    `;
    const result = await db.query(query);
    res.render('likar', { 
      appointments: result.rows, 
      user: req.session.userNickname 
    });
  } catch (err) {
    res.status(500).send(err.message);
  }
});

// Авторизація
router.get('/login', (req, res) => {
  if (req.session.userId) return res.redirect('/likar');
  res.render('forms/logiin_form');
});

router.post('/login', async (req, res) => {
  const { phone, password } = req.body;
  try {
    const result = await db.query('SELECT * FROM clients WHERE phone = $1 AND password = $2', [phone, password]);
    if (result.rows.length > 0) {
      req.session.userId = result.rows[0].id;
      req.session.userNickname = result.rows[0].owner_name;
      res.redirect('/likar');
    } else {
      res.status(401).render('forms/auth_error');
    }
  } catch (err) {
    res.status(500).send("Помилка авторизації");
  }
});

// Реєстрація
router.get('/register/new', (req, res) => {
  if (req.session.userId) return res.redirect('/likar');
  res.render('forms/register_form');
});

router.post('/register/new', async (req, res) => {
  try {
    const c = new Client(req.body);
    const result = await db.query(
      'INSERT INTO clients (owner_name, pet_name, phone, password) VALUES ($1, $2, $3, $4) RETURNING id, owner_name',
      [c.owner_name, c.pet_name, c.phone, c.password]
    );
    req.session.userId = result.rows[0].id;
    req.session.userNickname = result.rows[0].owner_name;
    res.redirect('/likar');
  } catch (err) {
    res.status(400).send(err.message);
  }
});

// Форма створення запису
router.get('/create', isAuthenticated, (req, res) => {
  res.render('forms/likar_form', { 
    title: 'НОВИЙ ЗАПИС',
    item: {}, 
    isUpdate: false,
    action: '/likar/create'
  });
});

router.post('/create', isAuthenticated, async (req, res) => {
  try {
    const a = new Appointment(req.body);
    await db.query(
      'INSERT INTO appointments (client_id, appointment_date, start_time, end_time) VALUES ($1, $2, $3, $4)',
      [req.session.userId, a.appointment_date, a.start_time, a.end_time]
    );
    res.redirect('/likar');
  } catch (err) {
    res.status(400).send(err.message);
  }
});

// Форма редагування запису
router.get('/update/:id', isAuthenticated, async (req, res) => {
  try {
    const result = await db.query(
      "SELECT id, TO_CHAR(appointment_date, 'YYYY-MM-DD') as date, start_time FROM appointments WHERE id = $1",
      [req.params.id]
    );
    const item = result.rows[0];
    if (!item) return res.status(404).send("Запис не знайдено");

    res.render('forms/likar_form', { 
      title: 'РЕДАГУВАТИ ЗАПИС',
      item, 
      isUpdate: true,
      action: `/likar/update/${item.id}`
    });
  } catch (err) {
    res.status(500).send(err.message);
  }
});

router.post('/update/:id', isAuthenticated, async (req, res) => {
  try {
    const a = new Appointment(req.body);
    await db.query(
      "UPDATE appointments SET appointment_date = $1, start_time = $2, end_time = $3 WHERE id = $4",
      [a.appointment_date, a.start_time, a.end_time, req.params.id]
    );
    res.redirect('/likar');
  } catch (err) {
    res.status(400).send(err.message);
  }
});

// Видалення
router.get('/delete/:id', isAuthenticated, async (req, res) => {
  try {
    await db.query('DELETE FROM appointments WHERE id = $1', [req.params.id]);
    res.redirect('/likar');
  } catch (err) {
    res.status(500).send(err.message);
  }
});

// Вихід
router.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/');
});

export default router;