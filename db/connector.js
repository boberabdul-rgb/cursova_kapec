import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config();
const { Pool } = pg;

// Підключення до Neon через DB_URL з твого .env
const pool = new Pool({
  connectionString: process.env.DB_URL,
  ssl: {
    rejectUnauthorized: false // Обов'язково для Neon
  }
});

const initDB = async () => {
  // SQL запит на створення таблиць
  const createTablesQuery = `
    -- Таблиця клієнтів
    CREATE TABLE IF NOT EXISTS clients (
      id SERIAL PRIMARY KEY,
      owner_name VARCHAR(100) NOT NULL,
      pet_name VARCHAR(100) NOT NULL,
      phone VARCHAR(20) NOT NULL
    );

    -- Таблиця записів на прийом
    CREATE TABLE IF NOT EXISTS appointments (
      id SERIAL PRIMARY KEY,
      client_id INT REFERENCES clients(id) ON DELETE CASCADE,
      appointment_date DATE NOT NULL,
      start_time TIME NOT NULL, -- Наприклад, 08:00
      end_time TIME NOT NULL,   -- Наприклад, 08:30 (автоматично +30 хв)
      
      -- Цей рядок не дасть записати двох людей на один і той самий час і дату
      CONSTRAINT unique_appointment UNIQUE(appointment_date, start_time)
    );
  `;

  try {
    const client = await pool.connect();
    await client.query(createTablesQuery);
    console.log("✅ Таблиці (clients, appointments) успішно створені в Neon");
    client.release();
  } catch (err) {
    console.error("❌ Помилка ініціалізації бази:", err.message);
  }
};

initDB();

export default pool;