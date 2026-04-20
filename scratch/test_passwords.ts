
import { Client } from 'pg';

const passwords = [
    '%3+Y#c%gt6!*U6v',
    'ctH&jEuu3ntsBLH'
];

const host = 'db.nolvjgquuckburmtqzqn.supabase.co';

async function testPasswords() {
    for (const pw of passwords) {
        console.log(`Testing password: ${pw}`);
        const client = new Client({
            host: host,
            port: 5432,
            user: 'postgres',
            password: pw,
            database: 'postgres',
            ssl: { rejectUnauthorized: false },
            connectionTimeoutMillis: 10000,
        });

        try {
            await client.connect();
            console.log(`SUCCESS: Password "${pw}" works!`);
            await client.end();
            return pw;
        } catch (err) {
            console.error(`FAILED: ${err.message}`);
        }
    }
    return null;
}

testPasswords().then(res => {
    if (res) {
        process.exit(0);
    } else {
        process.exit(1);
    }
});
