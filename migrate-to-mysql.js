const Database = require('better-sqlite3');
const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config();

// Configuration
const sqlitePath = path.join(__dirname, 'luckydraw.db');
const mysqlConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'user',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_NAME || 'luckydraw',
};

async function migrate() {
  console.log('🚀 Starting Data Migration: SQLite -> MySQL');

  let sqliteDb;
  let mysqlConn;

  try {
    // Connect to SQLite
    sqliteDb = new Database(sqlitePath);
    console.log('✅ Connected to SQLite');

    // Connect to MySQL
    mysqlConn = await mysql.createConnection(mysqlConfig);
    console.log('✅ Connected to MySQL');

    // 0. Create Tables in MySQL if they don't exist
    console.log('📝 Ensuring MySQL tables exist...');
    await mysqlConn.execute(`
      CREATE TABLE IF NOT EXISTS participants (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        nim VARCHAR(255) NOT NULL,
        is_winner TINYINT(1) DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await mysqlConn.execute(`
      CREATE TABLE IF NOT EXISTS prizes (
        id VARCHAR(255) PRIMARY KEY,
        prize_name VARCHAR(255) NOT NULL UNIQUE,
        initial_quota INT NOT NULL,
        current_quota INT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await mysqlConn.execute(`
      CREATE TABLE IF NOT EXISTS winners (
        id VARCHAR(255) PRIMARY KEY,
        participant_id VARCHAR(255) NOT NULL,
        prize_id VARCHAR(255) NOT NULL,
        won_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ MySQL tables ready');

    // 1. Migrate Participants
    console.log('📦 Migrating Participants...');
    const participants = sqliteDb.prepare('SELECT * FROM participants').all();
    for (const p of participants) {
      await mysqlConn.execute(
        'INSERT INTO participants (id, name, nim, is_winner, created_at) VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE name=VALUES(name)',
        [p.id, p.name, p.nim, p.is_winner, p.created_at]
      );
    }
    console.log(`✅ Migrated ${participants.length} participants`);

    // 2. Migrate Prizes
    console.log('🎁 Migrating Prizes...');
    const prizes = sqliteDb.prepare('SELECT * FROM prizes').all();
    for (const p of prizes) {
      await mysqlConn.execute(
        'INSERT INTO prizes (id, prize_name, initial_quota, current_quota, created_at) VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE prize_name=VALUES(prize_name)',
        [p.id, p.prize_name, p.initial_quota, p.current_quota, p.created_at]
      );
    }
    console.log(`✅ Migrated ${prizes.length} prizes`);

    // 3. Migrate Winners
    console.log('🏆 Migrating Winners...');
    const winners = sqliteDb.prepare('SELECT * FROM winners').all();
    for (const w of winners) {
      await mysqlConn.execute(
        'INSERT INTO winners (id, participant_id, prize_id, won_at) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE id=id',
        [w.id, w.participant_id, w.prize_id, w.won_at]
      );
    }
    console.log(`✅ Migrated ${winners.length} winners`);

    console.log('\n🎉 Data migration completed successfully!');

  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    if (sqliteDb) sqliteDb.close();
    if (mysqlConn) await mysqlConn.end();
  }
}

migrate();
