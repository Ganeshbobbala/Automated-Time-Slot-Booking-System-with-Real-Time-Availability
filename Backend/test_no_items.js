require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function testBookingInsertNoItems() {
    const todayStr = new Date().toISOString().split('T')[0];
    const booking = {
        id: Date.now(),
        customerName: "Srinu (Partial Test)",
        phone: "+918247087380",
        rationCard: "PARTIAL123",
        date: todayStr,
        time: "11–12 AM",
        predictedCardType: "BPL (White)",
        isPriority: false,
        family_members: 3,
        status: "booked",
        hash: "dummyhash"
        // items_taken: "omitted"
    };

    console.log("Inserting test booking WITHOUT items_taken...");
    const { data, error } = await supabase.from('Booking').insert([booking]).select();
    if (error) {
        console.error("Error:", error);
    } else {
        console.log("Insert success!", data);
    }
}
testBookingInsertNoItems();
