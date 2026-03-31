const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

async function checkSuperAdmin() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
    
    const user = await User.findOne({ email: 'superadmin@buksu.edu.ph' });
    
    if (!user) {
      console.log('NOT FOUND - superadmin@buksu.edu.ph is not registered');
    } else {
      console.log('✅ FOUND - Account Details:');
      console.log('Email:', user.email);
      console.log('Role:', user.role);
      console.log('Name:', user.name);
      console.log('Created:', user.createdAt);
      console.log('Verified:', user.verifiedEmail);
    }
    
    await mongoose.disconnect();
  } catch(err) {
    console.error('ERROR:', err.message);
    process.exit(1);
  }
}

checkSuperAdmin();
