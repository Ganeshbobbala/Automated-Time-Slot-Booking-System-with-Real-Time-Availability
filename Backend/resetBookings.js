const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI).then(async () => {
    try {
        await mongoose.connection.collection('bookings').drop();
        console.log("✅ All Bookings dropped from database.");
    } catch (err) {
        console.log("Collection might not exist or error:", err.message);
    }
    process.exit();
});
