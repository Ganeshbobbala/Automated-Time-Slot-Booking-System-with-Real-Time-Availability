const mongoose = require('mongoose');
require('dotenv').config();
mongoose.connect(process.env.MONGODB_URI).then(async () => {
    await mongoose.connection.collection('users').drop().catch(console.log);
    console.log("Users dropped");
    process.exit();
});
