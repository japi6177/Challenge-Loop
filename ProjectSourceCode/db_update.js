const pgp = require('pg-promise')();
const dbConfig = {
    host: 'localhost',
    port: 5432,
    database: 'postgres',
    user: 'postgres',
    password: 'pwd'
};
const db = pgp(dbConfig);
db.connect()
    .then(async obj => {
        obj.done();
        await db.none('CREATE TABLE IF NOT EXISTS revoked_tokens (token TEXT PRIMARY KEY, revoked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);');
        console.log('Table created!');
        process.exit(0);
    })
    .catch(err => {
        console.error(err);
        process.exit(1);
    });
