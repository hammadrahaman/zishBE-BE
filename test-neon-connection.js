require('dotenv').config();
const { Client } = require('pg');

const client = new Client({
  host: 'ep-steep-resonance-a13uhpzv-pooler.ap-southeast-1.aws.neon.tech',
  database: 'neondb',
  user: 'neondb_owner',
  password: 'npg_G52VKTncfssF',
  port: 5432,
  ssl: {
    require: true,
    rejectUnauthorized: false
  }
});

async function testConnection() {
  try {
    console.log('Attempting to connect...');
    await client.connect();
    console.log('Connected successfully!');
    
    const result = await client.query('SELECT NOW()');
    console.log('Current time from DB:', result.rows[0]);
    
    await client.end();
  } catch (err) {
    console.error('Connection error:', err.message);
  }
}

testConnection();