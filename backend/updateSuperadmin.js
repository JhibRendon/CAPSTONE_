const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
require('dotenv').config();

// Database connection
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => {
  console.log('Connected to MongoDB');
}).catch((error) => {
  console.error('MongoDB connection error:', error);
  process.exit(1);
});

async function updateSuperAdmin() {
  try {
    const email = 'superadmin@buksu.edu.ph';
    const password = 'SecureAdminPass2026!';
    const role = 'superadmin';
    
    console.log('Updating superadmin account...');
    console.log('Email:', email);
    console.log('Role:', role);
    
    // Hash the password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    console.log('Password hashed successfully');
    
    // Check if user exists
    let user = await User.findOne({ email: email.toLowerCase() });
    
    if (user) {
      console.log('User exists, updating role and password...');
      
      // Update existing user
      user.role = role;
      user.password = hashedPassword;
      user.isVerified = true; // Ensure the account is verified
      user.status = 'active'; // Ensure the account is active
      
      await user.save();
      console.log('✅ Existing user updated successfully');
    } else {
      console.log('User does not exist, creating new superadmin account...');
      
      // Create new user
      user = new User({
        email: email.toLowerCase(),
        password: hashedPassword,
        role: role,
        name: 'Super Administrator',
        isVerified: true,
        status: 'active',
        profilePicture: null,
        office: null,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      await user.save();
      console.log('✅ New superadmin account created successfully');
    }
    
    // Verify the user was created/updated correctly
    const verifyUser = await User.findOne({ email: email.toLowerCase() });
    console.log('\n📋 Account Verification:');
    console.log('Email:', verifyUser.email);
    console.log('Role:', verifyUser.role);
    console.log('Name:', verifyUser.name);
    console.log('Is Verified:', verifyUser.isVerified);
    console.log('Status:', verifyUser.status);
    console.log('Has Password:', !!verifyUser.password);
    console.log('Password Hash Length:', verifyUser.password ? verifyUser.password.length : 0);
    
    // Test password verification
    const isPasswordValid = await bcrypt.compare(password, verifyUser.password);
    console.log('Password Verification Test:', isPasswordValid ? '✅ PASSED' : '❌ FAILED');
    
    console.log('\n🎉 Superadmin account setup complete!');
    console.log('🔐 Login Credentials:');
    console.log('   Email:', email);
    console.log('   Password:', password);
    console.log('   Role:', role);
    console.log('   Login URL: http://localhost:5173/auth?role=admin');
    
  } catch (error) {
    console.error('❌ Error updating superadmin account:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Database connection closed');
    process.exit(0);
  }
}

// Run the update function
updateSuperAdmin();
