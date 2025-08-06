require('dotenv').config();
const { Client } = require('pg');

const connectionString = 'postgresql://neondb_owner:npg_G52VKTncfOHF@ep-steep-resonance-a13uhpzv-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

const client = new Client({
  connectionString,
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
    console.error('Full error:', err);
  }
}

testConnection();
