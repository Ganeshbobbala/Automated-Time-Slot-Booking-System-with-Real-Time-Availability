require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL || 'YOUR_SUPABASE_URL';
const supabaseKey = process.env.SUPABASE_KEY || 'YOUR_SUPABASE_ANON_KEY';
const supabase = createClient(supabaseUrl, supabaseKey);

async function testInsert() {
    const sampleUsers = [
        { rationCard: "231234567890", name: "Ganesh", family_members: 4, district: "Vijayawada", monthly_income: 4500, category: "BPL (White)", age: 42 }
    ];
    console.log("Trying to insert into User table...");
    const { data, error } = await supabase.from('User').insert(sampleUsers);
    if (error) {
        console.error("Insert error:", error);
    } else {
        console.log("Insert success:", data);
    }
}
testInsert();
