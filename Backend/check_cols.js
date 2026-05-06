require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function checkCols() {
    const { data, error } = await supabase.from('Booking').select('*').limit(1);
    console.log(data);
}
checkCols();
