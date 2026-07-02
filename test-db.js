import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config({ override: true });

async function run() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || '118.139.167.81',
      port: parseInt(process.env.DB_PORT || '3306', 10),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
    });

    // Attempting query with undefined
    await connection.execute(
      'SELECT * FROM invoices WHERE id = ?',
      [undefined]
    );

    await connection.end();
  } catch (error) {
    console.error('Query with undefined failed:', error);
  }
}

run();
