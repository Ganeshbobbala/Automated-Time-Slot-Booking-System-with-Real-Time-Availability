const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function check() {
    const { data, count, error } = await supabase.from('Booking').select('*', { count: 'exact' });
    if (error) {
        console.error(error);
    } else {
        console.log(`Total Bookings: ${count}`);
        console.log(data.slice(0, 5));
    }
}

check();
