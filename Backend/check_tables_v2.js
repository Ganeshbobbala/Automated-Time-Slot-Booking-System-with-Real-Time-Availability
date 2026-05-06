require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTables() {
    const tables = ['Stock', 'User', 'Booking'];
    for (const table of tables) {
        const { data, error } = await supabase.from(table).select('*').limit(3);
        if (error) {
            console.log(`❌ Table ${table}:`, error.message);
        } else {
            console.log(`✅ Table ${table}: FOUND (${data.length} rows)`);
            if (data.length > 0) {
                console.log(JSON.stringify(data[0], null, 2));
            }
        }
    }
}

checkTables();
