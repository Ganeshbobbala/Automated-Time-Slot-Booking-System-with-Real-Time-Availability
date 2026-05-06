require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("❌ Missing SUPABASE_URL or SUPABASE_KEY in .env");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function verify() {
    console.log("Hyperspeed verification starting...");
    const { data, error } = await supabase.from('User').select('count', { count: 'exact', head: true });
    
    if (error) {
        console.error("❌ Supabase connection failed:", error.message);
    } else {
        console.log("✅ Supabase is WORKING!");
        console.log("Connected to project:", supabaseUrl);
    }
}

verify();
