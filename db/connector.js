import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config();
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DB_URL,
  ssl: { rejectUnauthorized: false }
});

const initDB = async () => {
  const createTablesQuery = `
    CREATE TABLE IF NOT EXISTS clients (
      id SERIAL PRIMARY KEY,
      owner_name VARCHAR(100) NOT NULL,
      pet_name VARCHAR(100) NOT NULL,
      phone VARCHAR(20) NOT NULL,
      password VARCHAR(255) -- Додано поле для пароля
    );

    CREATE TABLE IF NOT EXISTS appointments (
      id SERIAL PRIMARY KEY,
      client_id INT REFERENCES clients(id) ON DELETE CASCADE,
      appointment_date DATE NOT NULL,
      start_time TIME NOT NULL,
      end_time TIME NOT NULL,
      CONSTRAINT unique_appointment UNIQUE(appointment_date, start_time)
    );
  `;

  try {
    const client = await pool.connect();
    await client.query(createTablesQuery);
    console.log("✅ База даних готова до роботи (з підтримкою паролів)");
    client.release();
  } catch (err) {
    console.error("❌ Помилка БД:", err.message);
  }
};

initDB();
export default pool;