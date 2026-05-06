require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

app.use(cors());
app.use(express.json());

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

function calculateHash(data) {
    return crypto.createHash('sha256').update(JSON.stringify({
        id: data.id,
        customerName: data.customerName,
        phone: data.phone,
        rationCard: data.rationCard,
        date: data.date,
        time: data.time
    })).digest('hex');
}

// Predict dummy wrapper
async function getPredictedCard(family_members) {
    return family_members >= 4 ? "BPL (White)" : "APL (Pink)";
}

app.post('/api/bookings', async (req, res) => {
    try {
        const data = req.body;
        console.log("📥 Received booking request for:", data.customerName || data.name);

        const predictedCard = await getPredictedCard(data.family_members);
        const isSenior = data.age >= 60;

        const booking = {
            id: data.id || Date.now(),
            customerName: data.customerName || data.name || "Unknown",
            phone: data.phone || "0000000000",
            rationCard: data.rationCard,
            date: data.date,
            time: data.time,
            predictedCardType: predictedCard,
            isPriority: isSenior || data.isPriority || false,
            family_members: data.family_members || 3,
            status: "booked",
            hash: ""
        };

        const items_taken = data.selectedItems && data.selectedItems.length > 0
            ? data.selectedItems.join(', ')
            : (data.items_taken || 'none');

        booking.items_taken = items_taken;
        booking.hash = calculateHash(booking);

        console.log("🚀 Attempting Supabase insert for ID:", booking.id);

        let { data: newBooking, error: insertError } = await supabase
            .from('Booking')
            .insert([booking])
            .select()
            .single();

        if (insertError) {
            console.error("❌ Primary Insertion Failed:", insertError.message);

            // Handle missing columns or schema mismatch
            if (insertError.message.includes('items_taken') || insertError.code === '42703') {
                console.log("⚠️ Schema mismatch detected. Retrying without 'items_taken'...");
                const { items_taken: _, ...bookingMinimal } = booking;
                const { data: retryData, error: retryError } = await supabase
                    .from('Booking')
                    .insert([bookingMinimal])
                    .select()
                    .single();

                if (retryError) {
                    console.error("❌ Retry failed:", retryError.message);
                    return res.status(500).json({ error: "Database insertion failed", details: retryError });
                }
                newBooking = retryData;
                newBooking.items_taken = items_taken; // Add back for frontend
            } else {
                return res.status(500).json({ error: "Database error", details: insertError });
            }
        }

        if (newBooking) {
            console.log("✅ Booking successfully saved to Supabase:", newBooking.id);
            io.emit('new-booking', newBooking);
            return res.status(201).json(newBooking);
        }

        res.status(500).json({ error: "Failed to create booking record" });
    } catch (err) {
        console.error("🔥 Server Error:", err);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

app.post('/api/update-status', async (req, res) => {
    try {
        const { id, status } = req.body;

        const { data: updatedBooking, error } = await supabase
            .from('Booking')
            .update({ status })
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error(error);
            return res.status(500).json({ error: "Failed to update status" });
        }

        io.emit('status-changed', { id, status });
        res.status(200).json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// Mock Initial data state
io.on('connection', async (socket) => {
    console.log('Client connected:', socket.id);

    // Fetch initial data from Supabase
    try {
        const { data: bookings, error } = await supabase.from('Booking').select('*').order('created_at', { ascending: false });
        // Emit init-data
        if (!error) {
            socket.emit('init-data', {
                bookings: bookings,
                stock: { rice: 5000, wheat: 2000, sugar: 500, oil: 1000, dal: 500, salt: 500, soap: 1000 },
                dailyLimit: 200,
                tokens: [] // whatever initial tokens
            });
        }
    } catch (e) {
        console.error("Error fetching bookings for init-data:", e);
    }
});

const PORT = 5000;
server.listen(PORT, () => {
    console.log(`✅ Supabase Client Initialized`);
    console.log(`Server running on port ${PORT}`);
});
