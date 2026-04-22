import express from 'express';
const router = express.Router();
import db from '../db/connector.js';

// 1. Головна сторінка — Список усіх записів
router.get('/', async (req, res) => {
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
        
        // ВАЖЛИВО: Тут я змінив 'likar_index' на 'likar', 
        // бо твій файл на скріншоті називається likar.hbs
        res.render('likar', { appointments: result.rows });
    } catch (err) {
        res.status(500).send("Database Error: " + err.message);
    }
});

// 2. Форма створення запису
router.get('/create', (req, res) => {
    // Вказуємо шлях до форми всередині папки forms
    res.render('forms/likar_form', { item: {}, isUpdate: false });
});

// 3. Обробка створення
router.post('/create', async (req, res) => {
    const { owner_name, pet_name, phone, date, start_time } = req.body;

    const appointmentDate = new Date(date);
    const dayOfWeek = appointmentDate.getDay(); 
    if (dayOfWeek === 0 || dayOfWeek === 6) {
        return res.status(400).send("❌ Помилка: Клініка не працює у вихідні!");
    }

    const [hours, minutes] = start_time.split(':').map(Number);
    const start = new Date();
    start.setHours(hours, minutes, 0);
    const end = new Date(start.getTime() + 30 * 60000);
    const end_time = `${end.getHours().toString().padStart(2, '0')}:${end.getMinutes().toString().padStart(2, '0')}`;

    try {
        const clientRes = await db.query(
            'INSERT INTO clients (owner_name, pet_name, phone) VALUES ($1, $2, $3) RETURNING id',
            [owner_name, pet_name, phone]
        );
        const clientId = clientRes.rows[0].id;

        await db.query(
            'INSERT INTO appointments (client_id, appointment_date, start_time, end_time) VALUES ($1, $2, $3, $4)',
            [clientId, date, start_time, end_time]
        );
        
        res.redirect('/likar');
    } catch (err) {
        if (err.code === '23505') {
            return res.status(400).send("❌ Цей час уже зайнятий!");
        }
        res.status(500).send("SQL Error: " + err.message);
    }
});

// 4. Видалення запису
router.get('/delete/:id', async (req, res) => {
    try {
        await db.query('DELETE FROM appointments WHERE id = $1', [req.params.id]);
        res.redirect('/likar');
    } catch (err) {
        res.status(500).send(err.message);
    }
});

export default router;