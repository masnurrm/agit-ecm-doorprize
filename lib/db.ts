import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

// Create a connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'user',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_NAME || 'luckydraw',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Initialize database schema
export async function initDatabase() {
  const connection = await pool.getConnection();
  try {
    // Create participants table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS participants (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        nim VARCHAR(255) NOT NULL,
        category VARCHAR(100) DEFAULT 'Staff',
        employment_type VARCHAR(100) DEFAULT 'AGIT',
        is_winner TINYINT(1) DEFAULT 0,
        checked_in TINYINT(1) DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Add columns if they don't exist (primitive migration)
    try {
      await connection.query('ALTER TABLE participants ADD COLUMN category VARCHAR(100) DEFAULT "Staff"');
    } catch (e) { }
    try {
      await connection.query('ALTER TABLE participants ADD COLUMN employment_type VARCHAR(100) DEFAULT "AGIT"');
    } catch (e) { }
    try {
      await connection.query('ALTER TABLE participants ADD COLUMN checked_in TINYINT(1) DEFAULT 0');
    } catch (e) { }

    // Create prizes table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS prizes (
        id VARCHAR(255) PRIMARY KEY,
        prize_name VARCHAR(255) NOT NULL UNIQUE,
        initial_quota INT NOT NULL,
        current_quota INT NOT NULL,
        image_url VARCHAR(255),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Add columns if they don't exist (primitive migration)
    try {
      await connection.query('ALTER TABLE participants ADD COLUMN category VARCHAR(100) DEFAULT "Staff"');
    } catch (e) { }
    try {
      await connection.query('ALTER TABLE participants ADD COLUMN employment_type VARCHAR(100) DEFAULT "AGIT"');
    } catch (e) { }
    try {
      await connection.query('ALTER TABLE participants ADD COLUMN checked_in TINYINT(1) DEFAULT 0');
    } catch (e) { }
    try {
      await connection.query('ALTER TABLE prizes ADD COLUMN image_url VARCHAR(255)');
    } catch (e) { }

    // Create winners table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS winners (
        id VARCHAR(255) PRIMARY KEY,
        participant_id VARCHAR(255) NOT NULL,
        prize_id VARCHAR(255) NOT NULL,
        won_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX (participant_id),
        INDEX (prize_id)
      )
    `);

    console.log('Database initialized successfully!');
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  } finally {
    connection.release();
  }
}

// Participant operations
export const participantsDb = {
  getAll: async () => {
    const [rows] = await pool.query('SELECT * FROM participants ORDER BY name');
    return rows as any[];
  },

  getEligible: async () => {
    const [rows] = await pool.query('SELECT * FROM participants WHERE is_winner = 0 AND checked_in = 1 ORDER BY name');
    return rows as any[];
  },

  getByNim: async (nim: string) => {
    const [rows]: any = await pool.query('SELECT * FROM participants WHERE nim = ?', [nim]);
    return rows[0];
  },

  create: async (id: string, name: string, nim: string, category: string = 'Staff', employmentType: string = 'AGIT', isWinner: number = 0, checkedIn: number = 0) => {
    return pool.query('INSERT INTO participants (id, name, nim, category, employment_type, is_winner, checked_in) VALUES (?, ?, ?, ?, ?, ?, ?)', [id, name, nim, category, employmentType, isWinner, checkedIn]);
  },

  update: async (id: string, name: string, nim: string, category: string, employmentType: string, isWinner: number, checkedIn: number) => {
    return pool.query('UPDATE participants SET name = ?, nim = ?, category = ?, employment_type = ?, is_winner = ?, checked_in = ? WHERE id = ?', [name, nim, category, employmentType, isWinner, checkedIn, id]);
  },

  delete: async (id: string) => {
    return pool.query('DELETE FROM participants WHERE id = ?', [id]);
  },

  markAsWinner: async (id: string) => {
    return pool.query('UPDATE participants SET is_winner = 1 WHERE id = ?', [id]);
  },

  markAsNotWinner: async (id: string) => {
    return pool.query('UPDATE participants SET is_winner = 0 WHERE id = ?', [id]);
  },

  markAsCheckedIn: async (id: string) => {
    return pool.query('UPDATE participants SET checked_in = 1 WHERE id = ?', [id]);
  },

  resetAll: async () => {
    return pool.query('UPDATE participants SET is_winner = 0, checked_in = 0');
  },

  deleteAll: async () => {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      await connection.query('DELETE FROM winners');
      await connection.query('DELETE FROM participants');
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },

  bulkCreate: async (participants: { id: string, name: string, nim: string, category?: string, employment_type?: string, checked_in?: number }[]) => {
    const values = participants.map(p => [p.id, p.name, p.nim, p.category || 'Staff', p.employment_type || 'AGIT', p.checked_in || 0]);
    return pool.query('INSERT INTO participants (id, name, nim, category, employment_type, checked_in) VALUES ?', [values]);
  },

  deleteMany: async (ids: string[]) => {
    return pool.query('DELETE FROM participants WHERE id IN (?)', [ids]);
  },
};

// Prize operations
export const prizesDb = {
  getAll: async () => {
    const [rows] = await pool.query('SELECT * FROM prizes ORDER BY prize_name');
    return rows as any[];
  },

  getAvailable: async () => {
    const [rows] = await pool.query('SELECT * FROM prizes WHERE current_quota > 0 ORDER BY prize_name');
    return rows as any[];
  },

  getById: async (id: string) => {
    const [rows]: any = await pool.query('SELECT * FROM prizes WHERE id = ?', [id]);
    return rows[0];
  },

  create: async (id: string, prizeName: string, quota: number, imageUrl?: string) => {
    return pool.query('INSERT INTO prizes (id, prize_name, initial_quota, current_quota, image_url) VALUES (?, ?, ?, ?, ?)', [id, prizeName, quota, quota, imageUrl || null]);
  },

  update: async (id: string, prizeName: string, initialQuota: number, currentQuota?: number, imageUrl?: string) => {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // If currentQuota is provided, we update it directly (Admin override)
      // If NOT provided, we calculate based on diff (Legacy behavior / strict initial quota change)

      let newCurrentQuota = currentQuota;

      if (currentQuota === undefined) {
        const [rows]: any = await connection.query('SELECT initial_quota, current_quota FROM prizes WHERE id = ?', [id]);
        const current = rows[0];
        if (!current) throw new Error('Prize not found');

        const diff = initialQuota - current.initial_quota;
        newCurrentQuota = current.current_quota + diff;
      }

      await connection.query('UPDATE prizes SET prize_name = ?, initial_quota = ?, current_quota = ?, image_url = ? WHERE id = ?',
        [prizeName, initialQuota, newCurrentQuota, imageUrl || null, id]);

      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },

  updateQuota: async (id: string, newQuota: number) => {
    return pool.query('UPDATE prizes SET current_quota = ? WHERE id = ?', [newQuota, id]);
  },

  delete: async (id: string) => {
    return pool.query('DELETE FROM prizes WHERE id = ?', [id]);
  },

  resetQuotas: async () => {
    return pool.query('UPDATE prizes SET current_quota = initial_quota');
  },

  deleteAll: async () => {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      await connection.query('DELETE FROM winners');
      await connection.query('DELETE FROM prizes');
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },

  deleteMany: async (ids: string[]) => {
    return pool.query('DELETE FROM prizes WHERE id IN (?)', [ids]);
  },
};

// Winner operations
export const winnersDb = {
  getAll: async () => {
    const [rows] = await pool.query(`
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
    `);
    return rows as any[];
  },

  getById: async (id: string) => {
    const [rows]: any = await pool.query('SELECT * FROM winners WHERE id = ?', [id]);
    return rows[0];
  },

  create: async (id: string, participantId: string, prizeId: string) => {
    return pool.query('INSERT INTO winners (id, participant_id, prize_id) VALUES (?, ?, ?)', [id, participantId, prizeId]);
  },

  delete: async (id: string) => {
    return pool.query('DELETE FROM winners WHERE id = ?', [id]);
  },

  deleteAll: async () => {
    return pool.query('DELETE FROM winners');
  },

  deleteMany: async (ids: string[]) => {
    return pool.query('DELETE FROM winners WHERE id IN (?)', [ids]);
  },
};

// Transaction for confirming winners
export async function confirmWinners(participantIds: string[], prizeId: string) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // Get current prize quota
    const [prizeRows]: any = await connection.query('SELECT * FROM prizes WHERE id = ? FOR UPDATE', [prizeId]);
    const prize = prizeRows[0];

    if (!prize) {
      throw new Error('Prize not found');
    }

    if (prize.current_quota < participantIds.length) {
      throw new Error('Not enough quota for this prize');
    }

    // Mark participants as winners and create winner records
    for (const participantId of participantIds) {
      const winnerId = `winner_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      await connection.query('UPDATE participants SET is_winner = 1 WHERE id = ?', [participantId]);
      await connection.query('INSERT INTO winners (id, participant_id, prize_id) VALUES (?, ?, ?)', [winnerId, participantId, prizeId]);
    }

    // Reduce prize quota
    const newQuota = prize.current_quota - participantIds.length;
    await connection.query('UPDATE prizes SET current_quota = ? WHERE id = ?', [newQuota, prizeId]);

    await connection.commit();
    return { success: true, remainingQuota: newQuota };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

// Transaction for removing a winner
export async function removeWinner(winnerId: string) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [winnerRows]: any = await connection.query('SELECT * FROM winners WHERE id = ?', [winnerId]);
    const winner = winnerRows[0];
    if (!winner) throw new Error('Winner record not found');

    await connection.query('DELETE FROM winners WHERE id = ?', [winnerId]);
    await connection.query('UPDATE participants SET is_winner = 0 WHERE id = ?', [winner.participant_id]);

    const [prizeRows]: any = await connection.query('SELECT current_quota FROM prizes WHERE id = ?', [winner.prize_id]);
    const prize = prizeRows[0];
    if (prize) {
      await connection.query('UPDATE prizes SET current_quota = current_quota + 1 WHERE id = ?', [winner.prize_id]);
    }

    await connection.commit();
    return { success: true };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function removeWinnersBulk(winnerIds: string[]) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    for (const winnerId of winnerIds) {
      const [winnerRows]: any = await connection.query('SELECT * FROM winners WHERE id = ?', [winnerId]);
      const winner = winnerRows[0];
      if (!winner) continue;

      await connection.query('DELETE FROM winners WHERE id = ?', [winnerId]);
      await connection.query('UPDATE participants SET is_winner = 0 WHERE id = ?', [winner.participant_id]);
      await connection.query('UPDATE prizes SET current_quota = current_quota + 1 WHERE id = ?', [winner.prize_id]);
    }

    await connection.commit();
    return { success: true };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export default pool;

