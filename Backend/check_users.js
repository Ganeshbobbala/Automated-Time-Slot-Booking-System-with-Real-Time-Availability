require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = process.env.SUPABASE_URL || 'YOUR_SUPABASE_URL';
const supabaseKey = process.env.SUPABASE_KEY || 'YOUR_SUPABASE_ANON_KEY';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    const { data: users, error: userErr } = await supabase.from('User').select('*');
    if (userErr) {
        console.error("error:", userErr);
    } else {
        console.log("Users in table:", users.length);
        console.log("First user:", users[0]);
    }
}
check();
