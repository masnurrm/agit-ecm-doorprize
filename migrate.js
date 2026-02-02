const Database = require('better-sqlite3');
const path = require('path');
const { randomUUID } = require('crypto');

const dbPath = path.join(__dirname, 'luckydraw.db');
const db = new Database(dbPath);

db.pragma('foreign_keys = ON');

console.log('🚀 Initializing database...');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS participants (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    nim TEXT NOT NULL,
    is_winner INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS prizes (
    id TEXT PRIMARY KEY,
    prize_name TEXT NOT NULL UNIQUE,
    initial_quota INTEGER NOT NULL,
    current_quota INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS winners (
    id TEXT PRIMARY KEY,
    participant_id TEXT NOT NULL,
    prize_id TEXT NOT NULL,
    won_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (participant_id) REFERENCES participants(id),
    FOREIGN KEY (prize_id) REFERENCES prizes(id)
  )
`);

console.log('✅ Tables created successfully!');

// Check if data already exists
const participantCount = db.prepare('SELECT COUNT(*) as count FROM participants').get();
const prizeCount = db.prepare('SELECT COUNT(*) as count FROM prizes').get();

if (participantCount.count === 0) {
  console.log('📝 Inserting sample participants...');

  const participants = [
    { name: 'Nur Muhammad', nim: '176781231' },
    { name: 'Siti Aisyah', nim: '176781232' },
    { name: 'Budi Santoso', nim: '176781233' },
    { name: 'Dewi Lestari', nim: '176781234' },
    { name: 'Ahmad Fauzi', nim: '176781235' },
    { name: 'Rina Kartika', nim: '176781236' },
    { name: 'Hendra Wijaya', nim: '176781237' },
    { name: 'Fitri Handayani', nim: '176781238' },
    { name: 'Rizki Ramadhan', nim: '176781239' },
    { name: 'Maya Sari', nim: '176781240' },
    { name: 'Doni Pratama', nim: '176781241' },
    { name: 'Lina Marlina', nim: '176781242' },
    { name: 'Eko Prasetyo', nim: '176781243' },
    { name: 'Indah Permata', nim: '176781244' },
    { name: 'Yanto Suryanto', nim: '176781245' },
    { name: 'Ratna Sari', nim: '176781246' },
    { name: 'Agus Setiawan', nim: '176781247' },
    { name: 'Dian Sastro', nim: '176781248' },
    { name: 'Bambang Susilo', nim: '176781249' },
    { name: 'Putri Utami', nim: '176781250' },
    { name: 'Joko Widodo', nim: '176781251' },
    { name: 'Sri Mulyani', nim: '176781252' },
    { name: 'Andi Wijaya', nim: '176781253' },
    { name: 'Mega Wati', nim: '176781254' },
    { name: 'Tono Sutopo', nim: '176781255' },
  ];

  const insertParticipant = db.prepare('INSERT INTO participants (id, name, nim) VALUES (?, ?, ?)');

  participants.forEach(p => {
    insertParticipant.run(randomUUID(), p.name, p.nim);
  });

  console.log(`✅ Inserted ${participants.length} participants!`);
}

if (prizeCount.count === 0) {
  console.log('🎁 Inserting sample prizes...');

  const prizes = [
    { name: 'Chopper/Blender', quota: 2 },
    { name: 'Voucher Belanja', quota: 50 },
    { name: 'TWS', quota: 15 },
    { name: 'Sepeda Listrik', quota: 1 },
    { name: 'Smart Watch', quota: 5 },
    { name: 'Magic Com', quota: 1 },
    { name: 'Setrika Uap', quota: 1 },
  ];

  const insertPrize = db.prepare('INSERT INTO prizes (id, prize_name, initial_quota, current_quota) VALUES (?, ?, ?, ?)');

  prizes.forEach(p => {
    insertPrize.run(randomUUID(), p.name, p.quota, p.quota);
  });

  console.log(`✅ Inserted ${prizes.length} prizes!`);
}

console.log('\n🎉 Database setup complete!');
console.log('Run "npm run dev" to start the application.\n');

db.close();
