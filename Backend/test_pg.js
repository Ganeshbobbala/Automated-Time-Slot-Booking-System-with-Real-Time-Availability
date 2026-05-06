const { Client } = require('pg');
async function test() {
    const client = new Client({
        connectionString: 'postgresql://postgres:Ganesh%404429@db.jgxvetczmzivvjbwnaqp.supabase.co:5432/postgres'
    });
    try {
        await client.connect();
        console.log('Connected to PG!');

        // Find triggers on Booking table
        const trig = await client.query("SELECT tgname, proname, prosrc FROM pg_trigger JOIN pg_proc ON pg_trigger.tgfoid = pg_proc.oid JOIN pg_class ON pg_class.oid = pg_trigger.tgrelid WHERE relname = 'Booking';");
        console.log('Triggers:', trig.rows);
        await client.end();
    } catch (err) {
        console.error('Failed to connect:', err.message);
    }
}
test();
