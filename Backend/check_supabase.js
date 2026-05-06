require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL || 'YOUR_SUPABASE_URL';
const supabaseKey = process.env.SUPABASE_KEY || 'YOUR_SUPABASE_ANON_KEY';

console.log('Connecting to:', supabaseUrl);

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    console.log("Checking Stock table...");
    const { data: stock, error: stockErr } = await supabase.from('Stock').select('*').limit(1);
    if (stockErr) {
        console.error("❌ Stock Table error:", stockErr);
    } else {
        console.log("✅ Stock Table connected:", stock);
    }

    console.log("Checking User table...");
    const { data: users, error: userErr } = await supabase.from('User').select('*').limit(1);
    if (userErr) {
        console.error("❌ User Table error:", userErr);
    } else {
        console.log("✅ User Table connected:", users);
    }

    console.log("Checking Booking table...");
    const { data: bookings, error: bookingErr } = await supabase.from('Booking').select('*').limit(1);
    if (bookingErr) {
        console.error("❌ Booking Table error:", bookingErr);
    } else {
        console.log("✅ Booking Table connected:", bookings);
    }
}

check();
