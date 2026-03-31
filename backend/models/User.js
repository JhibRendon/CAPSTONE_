const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    googleId: {
      type: String,
      required: false,
      unique: true,
      sparse: true, // Allows multiple null values
      default: null,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },
    name: {
      type: String,
      required: true,
    },
    profilePicture: {
      type: String,
      default: null,
    },
    // Extended Google profile information
    givenName: {
      type: String,
      default: null,
    },
    familyName: {
      type: String,
      default: null,
    },
    locale: {
      type: String,
      default: null,
    },
    verifiedEmail: {
      type: Boolean,
      default: false,
    },
    hd: {
      type: String, // Hosted domain (for G Suite accounts)
      default: null,
    },
    password: {
      type: String,
      default: null,
    },
    role: {
      type: String,
      enum: ['admin', 'superadmin', 'complainant', 'office_handler'],
      required: true,
    },
    office: {
      type: String,
      default: null,
    },
    complainantType: {
      type: String,
      enum: {
        values: [null, 'student', 'parents', 'staff'],
        message: 'Complainant type must be student, parents, or staff',
      },
      default: null,
      validate: {
        validator: function(value) {
          // If role is 'complainant', complainantType is required
          if (this.role === 'complainant') {
            return value !== null && value !== undefined;
          }
          // For other roles, null is allowed
          return true;
        },
        message: 'Complainant type is required for complainant users',
      },
    },
    contact: {
      type: String,
      default: null,
      trim: true,
    },
    phone: {
      type: String,
      default: null,
      trim: true,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    lastLogin: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'blocked'],
      default: 'active',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
