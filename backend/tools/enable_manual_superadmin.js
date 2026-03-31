const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
require('dotenv').config({ path: __dirname + '/../.env' });

async function run() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });

    const email = 'superadmin@bukSU.edu.ph';
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      console.log('NOT_FOUND', email);
      await mongoose.disconnect();
      return;
    }

    // Set a secure hashed password and remove Google linkage safely by setting a unique placeholder
    const newPassword = 'SecureAdminPass2026!';
    const hashed = await bcrypt.hash(newPassword, 10);

    user.password = hashed;
    user.googleId = `manual_${Date.now()}_${Math.floor(Math.random()*10000)}`;
    user.isVerified = true;
    await user.save();

    console.log('MANUAL_ENABLED', email, 'id:', user._id.toString());
    await mongoose.disconnect();
  } catch (err) {
    console.error('ERR', err.message);
    process.exit(1);
  }
}

run();
