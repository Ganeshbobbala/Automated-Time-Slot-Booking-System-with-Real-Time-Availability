require("dotenv").config();
const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testInsert() {
    const booking = {
        id: "123456", // let's try integer 123456 instead of string later if this fails
        customerName: "Test",
        phone: "1234",
        rationCard: "123456789012",
        date: "2026-03-12",
        time: "8-9 AM",
        predictedCardType: "BPL (White)",
        isPriority: false,
        family_members: 4,
        status: "booked",
        items_taken: "rice",
        hash: "dummyhash123"
    };

    const res1 = await supabase.from('Booking').insert([{ ...booking, id: 123456 }]).select().single();
    if (res1.error) console.log("Booking INSERT ERROR:", res1.error);
    else console.log("Booking INSERT SUCCESS");

    const res2 = await supabase.from('Booking').select('*').order('created_at', { ascending: false });
    if (res2.error) console.log("Booking SELECT ERROR:", res2.error);
    else console.log("Booking SELECT SUCCESS");
}
testInsert();
