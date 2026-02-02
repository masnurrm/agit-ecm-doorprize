const Database = require('better-sqlite3');
const db = new Database('./luckydraw.db');

console.log('\n═══════════════════════════════════════');
console.log('🎁  DAFTAR HADIAH AGIT ECM 2026');
console.log('═══════════════════════════════════════\n');

const prizes = db.prepare('SELECT prize_name, current_quota FROM prizes ORDER BY prize_name').all();

if (prizes.length === 0) {
    console.log('❌ Tidak ada hadiah dalam database!');
} else {
    let totalQuota = 0;
    prizes.forEach((p, index) => {
        console.log(`${(index + 1).toString().padStart(2, ' ')}. ${p.prize_name.padEnd(20, ' ')} : ${p.current_quota.toString().padStart(3, ' ')} unit`);
        totalQuota += p.current_quota;
    });
    console.log('\n═══════════════════════════════════════');
    console.log(`✅ Total: ${prizes.length} jenis hadiah`);
    console.log(`📦 Total unit: ${totalQuota} hadiah`);
    console.log('═══════════════════════════════════════\n');
}

db.close();
