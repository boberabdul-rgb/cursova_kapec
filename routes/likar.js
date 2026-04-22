import express from 'express';
const router = express.Router();
import db from '../db/connector.js';

function isAuthenticated(req, res, next) {
    if (req.session.userId) return next();
    res.redirect('/likar/login');
} 

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
        res.status(500).render('error', { message: err.message });
    }
});

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
        res.status(500).render('error', { message: "Помилка авторизації" });
    }
});

router.get('/register/new', (req, res) => {
    if (req.session.userId) return res.redirect('/likar');
    res.render('forms/register_form');
});

router.post('/register/new', async (req, res) => {
    const { owner_name, pet_name, phone, password } = req.body;
    try {
        const result = await db.query(
            'INSERT INTO clients (owner_name, pet_name, phone, password) VALUES ($1, $2, $3, $4) RETURNING id, owner_name',
            [owner_name, pet_name, phone, password]
        );
        req.session.userId = result.rows[0].id;
        req.session.userNickname = result.rows[0].owner_name;
        res.redirect('/likar');
    } catch (err) {
        res.status(500).render('error', { message: "Помилка реєстрації" });
    }
});

router.get('/edit/:id', isAuthenticated, async (req, res) => {
    try {
        const result = await db.query(
            "SELECT id, TO_CHAR(appointment_date, 'YYYY-MM-DD') as date, start_time FROM appointments WHERE id = $1",
            [req.params.id]
        );
        if (result.rows.length > 0) {
            res.render('forms/likar_form', { item: result.rows[0], isUpdate: true });
        } else {
            res.status(404).render('error', { message: "Запис не знайдено" });
        }
    } catch (err) {
        res.status(500).render('error', { message: err.message });
    }
});

router.post('/edit/:id', isAuthenticated, async (req, res) => {
    const { date, start_time } = req.body;
    try {
        const [h, m] = start_time.split(':').map(Number);
        const end = new Date(new Date().setHours(h, m + 30));
        const end_time = `${end.getHours().toString().padStart(2, '0')}:${end.getMinutes().toString().padStart(2, '0')}`;

        await db.query(
            "UPDATE appointments SET appointment_date = $1, start_time = $2, end_time = $3 WHERE id = $4",
            [date, start_time, end_time, req.params.id]
        );
        res.redirect('/likar');
    } catch (err) {
        res.status(500).render('error', { message: "Не вдалося оновити запис" });
    }
});

router.get('/create', isAuthenticated, (req, res) => {
    res.render('forms/likar_form', { item: {}, isUpdate: false });
});

router.post('/create', isAuthenticated, async (req, res) => {
    const { date, start_time } = req.body;
    try {
        const [h, m] = start_time.split(':').map(Number);
        const end = new Date(new Date().setHours(h, m + 30));
        const end_time = `${end.getHours().toString().padStart(2, '0')}:${end.getMinutes().toString().padStart(2, '0')}`;

        await db.query(
            'INSERT INTO appointments (client_id, appointment_date, start_time, end_time) VALUES ($1, $2, $3, $4)',
            [req.session.userId, date, start_time, end_time]
        );
        res.redirect('/likar');
    } catch (err) {
        res.status(500).render('error', { message: "Цей час уже зайнятий!" });
    }
});

router.get('/delete/:id', isAuthenticated, async (req, res) => {
    await db.query('DELETE FROM appointments WHERE id = $1', [req.params.id]);
    res.redirect('/likar');
});

router.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

export default router;