require("dotenv").config();
const { createClient } = require("@supabase/supabase-js");
const fs = require('fs');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function dump() {
    const { data } = await supabase.from('Booking').select('*').limit(1);
    fs.writeFileSync('schema_dump.json', JSON.stringify(Object.keys(data[0] || {}), null, 2));
}
dump();
