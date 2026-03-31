const mongoose = require('mongoose');
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

    // Force password reset by clearing password (requires reset flow to set new password)
    user.password = null;
    await user.save();
    console.log('PASSWORD_CLEARED', email, user._id.toString());

    await mongoose.disconnect();
  } catch (err) {
    console.error('ERR', err.message);
    process.exit(1);
  }
}

run();
