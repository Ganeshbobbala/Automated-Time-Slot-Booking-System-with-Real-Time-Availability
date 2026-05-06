require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = process.env.SUPABASE_URL || 'YOUR_SUPABASE_URL';
const supabaseKey = process.env.SUPABASE_KEY || 'YOUR_SUPABASE_ANON_KEY';
const supabase = createClient(supabaseUrl, supabaseKey);

async function testBookingInsert() {
    const booking = {
        id: Date.now(),
        name: "Srinu",
        phone: "+918247087380",
        rationCard: "test-card-123",
        date: "2026-02-25",
        time: "10-11 AM",
        predictedCardType: "BPL (White)",
        isPriority: false,
        family_members: 4,
        status: "booked"
    };

    console.log("Inserting with field: name");
    const { data, error } = await supabase.from('Booking').insert([booking]).select().single();
    if (error) {
        fs.writeFileSync('error_dump2.json', JSON.stringify(error, null, 2));
        console.log("Error saved to error_dump2.json");
    } else {
        console.log("Insert success!");
        fs.writeFileSync('error_dump2.json', JSON.stringify({ success: true, data }, null, 2));
    }
}
testBookingInsert();
