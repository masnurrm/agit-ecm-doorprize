import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'luckydraw.db');
const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Initialize database schema
export function initDatabase() {
  // Create participants table
  db.exec(`
    CREATE TABLE IF NOT EXISTS participants (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      nim TEXT NOT NULL,
      is_winner INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create prizes table
  db.exec(`
    CREATE TABLE IF NOT EXISTS prizes (
      id TEXT PRIMARY KEY,
      prize_name TEXT NOT NULL UNIQUE,
      initial_quota INTEGER NOT NULL,
      current_quota INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create winners table (log history)
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

  console.log('Database initialized successfully!');
}

// Participant operations
export const participantsDb = {
  getAll: () => {
    return db.prepare('SELECT * FROM participants ORDER BY name').all();
  },

  getEligible: () => {
    return db.prepare('SELECT * FROM participants WHERE is_winner = 0 ORDER BY name').all();
  },

  create: (id: string, name: string, nim: string) => {
    return db.prepare('INSERT INTO participants (id, name, nim) VALUES (?, ?, ?)').run(id, name, nim);
  },

  update: (id: string, name: string, nim: string) => {
    return db.prepare('UPDATE participants SET name = ?, nim = ? WHERE id = ?').run(name, nim, id);
  },

  delete: (id: string) => {
    return db.prepare('DELETE FROM participants WHERE id = ?').run(id);
  },

  markAsWinner: (id: string) => {
    return db.prepare('UPDATE participants SET is_winner = 1 WHERE id = ?').run(id);
  },

  markAsNotWinner: (id: string) => {
    return db.prepare('UPDATE participants SET is_winner = 0 WHERE id = ?').run(id);
  },

  resetAll: () => {
    return db.prepare('UPDATE participants SET is_winner = 0').run();
  },

  deleteAll: () => {
    return db.prepare('DELETE FROM participants').run();
  },

  bulkCreate: (participants: { id: string, name: string, nim: string }[]) => {
    const insert = db.prepare('INSERT INTO participants (id, name, nim) VALUES (?, ?, ?)');
    const insertMany = db.transaction((list) => {
      for (const p of list) insert.run(p.id, p.name, p.nim);
    });
    return insertMany(participants);
  },
};

// Prize operations
export const prizesDb = {
  getAll: () => {
    return db.prepare('SELECT * FROM prizes ORDER BY prize_name').all();
  },

  getAvailable: () => {
    return db.prepare('SELECT * FROM prizes WHERE current_quota > 0 ORDER BY prize_name').all();
  },

  getById: (id: string) => {
    return db.prepare('SELECT * FROM prizes WHERE id = ?').get(id);
  },

  create: (id: string, prizeName: string, quota: number) => {
    return db.prepare('INSERT INTO prizes (id, prize_name, initial_quota, current_quota) VALUES (?, ?, ?, ?)').run(id, prizeName, quota, quota);
  },

  update: (id: string, prizeName: string, initialQuota: number) => {
    // When updating initial_quota, we need to decide how to handle current_quota.
    // Strategy: Calculate the difference and apply it to current_quota.
    const current = db.prepare('SELECT initial_quota, current_quota FROM prizes WHERE id = ?').get(id) as any;
    if (!current) throw new Error('Prize not found');

    const diff = initialQuota - current.initial_quota;
    const newCurrentQuota = current.current_quota + diff;

    // Ensure current quota doesn't drop below 0 (unless we strictly want to allow it, but for physical items this implies logic error)
    // However, if we simply update the definition, let's respect the math. 
    // If user reduces quota below what's already given, current_quota could go negative. 
    // Let's allow negative for now to indicate "oversubscribed" or just clamp to 0? 
    // Better: Allow math to happen.

    return db.prepare('UPDATE prizes SET prize_name = ?, initial_quota = ?, current_quota = ? WHERE id = ?')
      .run(prizeName, initialQuota, newCurrentQuota, id);
  },

  updateQuota: (id: string, newQuota: number) => {
    return db.prepare('UPDATE prizes SET current_quota = ? WHERE id = ?').run(newQuota, id);
  },

  delete: (id: string) => {
    return db.prepare('DELETE FROM prizes WHERE id = ?').run(id);
  },

  resetQuotas: () => {
    return db.prepare('UPDATE prizes SET current_quota = initial_quota').run();
  },

  deleteAll: () => {
    return db.prepare('DELETE FROM prizes').run();
  },
};

// Winner operations
export const winnersDb = {
  getAll: () => {
    return db.prepare(`
      SELECT 
        w.id,
        w.won_at,
        w.participant_id,
        w.prize_id,
        p.name,
        p.nim,
        pr.prize_name
      FROM winners w
      JOIN participants p ON w.participant_id = p.id
      JOIN prizes pr ON w.prize_id = pr.id
      ORDER BY w.won_at DESC
    `).all();
  },

  getById: (id: string) => {
    return db.prepare('SELECT * FROM winners WHERE id = ?').get(id);
  },

  create: (id: string, participantId: string, prizeId: string) => {
    return db.prepare('INSERT INTO winners (id, participant_id, prize_id) VALUES (?, ?, ?)').run(id, participantId, prizeId);
  },

  delete: (id: string) => {
    return db.prepare('DELETE FROM winners WHERE id = ?').run(id);
  },

  deleteAll: () => {
    return db.prepare('DELETE FROM winners').run();
  },
};

// Transaction for confirming winners
export function confirmWinners(participantIds: string[], prizeId: string) {
  const transaction = db.transaction(() => {
    // Get current prize quota
    const prize: any = prizesDb.getById(prizeId);
    if (!prize) {
      throw new Error('Prize not found');
    }

    if (prize.current_quota < participantIds.length) {
      throw new Error('Not enough quota for this prize');
    }

    // Mark participants as winners and create winner records
    participantIds.forEach((participantId) => {
      const winnerId = `winner_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      participantsDb.markAsWinner(participantId);
      winnersDb.create(winnerId, participantId, prizeId);
    });

    // Reduce prize quota
    const newQuota = prize.current_quota - participantIds.length;
    prizesDb.updateQuota(prizeId, newQuota);

    return { success: true, remainingQuota: newQuota };
  });

  return transaction();
}

// Transaction for removing a winner (and restoring quota)
export function removeWinner(winnerId: string) {
  const transaction = db.transaction(() => {
    // Get winner record to find participant and prize
    const winner: any = winnersDb.getById(winnerId);
    if (!winner) {
      throw new Error('Winner record not found');
    }

    // Remove winner record
    winnersDb.delete(winnerId);

    // Reset participant status
    participantsDb.markAsNotWinner(winner.participant_id);

    // Increment prize quota
    const prize: any = prizesDb.getById(winner.prize_id);
    if (prize) {
      const newQuota = prize.current_quota + 1;
      prizesDb.updateQuota(winner.prize_id, newQuota);
    }

    return { success: true };
  });

  return transaction();
}

export default db;
