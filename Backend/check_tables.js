require("dotenv").config();
const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTables() {
    const tables = ['Booking', 'booking', 'Bookings', 'bookings', 'User', 'Users', 'users', 'Stock', 'Stocks', 'stocks'];
    for (const t of tables) {
        const { error } = await supabase.from(t).select('*').limit(1);
        if (!error) console.log(`TABLE VALID: ${t}`);
    }
}
checkTables();
