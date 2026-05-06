require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function inspectBookingTable() {
    console.log("Fetching one row from Booking to see columns...");
    const { data, error } = await supabase.from('Booking').select('*').limit(1);
    if (error) {
        console.error("Error fetching Booking:", error);
    } else {
        if (data.length > 0) {
            console.log("Columns found:", Object.keys(data[0]));
        } else {
            console.log("No data in Booking table. Trying to get column names via RPC if available...");
            // Fallback: try to insert an empty object to trigger a specific error? No.
            // Let's just try to select some common columns.
        }
    }
}
inspectBookingTable();
