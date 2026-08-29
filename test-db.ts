import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config({ path: './.env', override: true });

async function run() {
  console.log('Connecting to database with env:', {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT
  });
  
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306', 10),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
    });
    console.log('Successfully connected to database!');
    
    // Check tables
    const [tables] = await connection.query('SHOW TABLES');
    console.log('Tables:', tables);
    
    await connection.end();
  } catch (error: any) {
    console.error('Database connection / query failed:', error);
  }
}

run();
