require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function testBookingInsert() {
    const todayStr = new Date().toISOString().split('T')[0];
    const booking = {
        id: Date.now(),
        customerName: "Srinu (Test Admin)",
        phone: "+918247087380",
        rationCard: "TEST123456",
        date: todayStr,
        time: "10–11 AM",
        predictedCardType: "BPL (White)",
        isPriority: true,
        family_members: 4,
        status: "booked",
        items_taken: "rice, wheat, sugar, oil"
    };

    console.log("Inserting test booking for today:", todayStr);
    const { data, error } = await supabase.from('Booking').insert([booking]).select();
    if (error) {
        console.error("Error:", error);
    } else {
        console.log("Insert success!");
    }
}
testBookingInsert();
