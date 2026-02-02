const { participantsDb, prizesDb } = require('./lib/db');
console.log('Participants count:', participantsDb.getAll().length);
console.log('Prizes:', prizesDb.getAll());
