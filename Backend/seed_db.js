require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = process.env.SUPABASE_URL || 'YOUR_SUPABASE_URL';
const supabaseKey = process.env.SUPABASE_KEY || 'YOUR_SUPABASE_ANON_KEY';
const supabase = createClient(supabaseUrl, supabaseKey);

async function seed() {
    const sampleUsers = [
        { rationCard: "231234567890", name: "Ganesh", family_members: 4, district: "Vijayawada", monthly_income: 4500, category: "BPL (White)", age: 42 },
        { rationCard: "214785236985", name: "Srinu", family_members: 5, district: "Guntur", monthly_income: 3800, category: "BPL (White)", age: 38 },
        { rationCard: "258741369258", name: "Kiran", family_members: 3, district: "Ongole", monthly_income: 52000, category: "APL (RED)", age: 55 },
        { rationCard: "241478529632", name: "Vamsi", family_members: 4, district: "Addanki", monthly_income: 4000, category: "BPL (White)", age: 30 },
        { rationCard: "269631478965", name: "Bhanu", family_members: 4, district: "Komminenivaripalem", monthly_income: 45000, category: "APL (RED)", age: 47 },
        { rationCard: "314159265358", name: "Ramesh", family_members: 2, district: "Tirupati", monthly_income: 60000, category: "APL (RED)", age: 60 },
        { rationCard: "271828182845", name: "Lakshmi", family_members: 6, district: "Kurnool", monthly_income: 3000, category: "AAY (Blue)", age: 35 }
    ];
    await supabase.from('User').insert(sampleUsers);
    await supabase.from('Stock').insert([{ rice: 5000, wheat: 3000, sugar: 1000, oil: 500, dal: 500, salt: 500, soap: 500 }]);
    console.log('Seeded User and Stock tables successfully!');
}
seed();
