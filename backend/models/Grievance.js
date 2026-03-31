const mongoose = require('mongoose');

const attachmentSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    publicId: { type: String, default: null },
    fileName: { type: String, default: null },
    fileType: { type: String, default: null },
    size: { type: Number, default: null },
  },
  { _id: false }
);

const grievanceSchema = new mongoose.Schema(
  {
    grievanceId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    trackingId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    referenceNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    subject: {
      type: String,
      required: true,
      trim: true,
      maxlength: 180,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 5000,
    },
    category: {
      type: String,
      default: 'general',
      trim: true,
    },
    office: {
      type: String,
      default: null,
      trim: true,
    },
    department: {
      type: String,
      default: null,
      trim: true,
    },
    incidentDate: {
      type: String,
      default: null,
      trim: true,
    },
    personInvolved: {
      type: String,
      default: null,
      trim: true,
      maxlength: 180,
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium',
      index: true,
    },
    status: {
      type: String,
      enum: ['pending', 'under_review', 'in_progress', 'resolved', 'rejected', 'escalated'],
      default: 'pending',
      index: true,
    },
    complainantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    complainantName: {
      type: String,
      default: null,
      trim: true,
    },
    complainantEmail: {
      type: String,
      default: null,
      trim: true,
      lowercase: true,
    },
    complainantType: {
      type: String,
      enum: [null, 'student', 'parents', 'staff'],
      default: null,
    },
    isAnonymous: {
      type: Boolean,
      default: false,
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    assignedAt: {
      type: Date,
      default: null,
    },
    attachments: {
      type: [attachmentSchema],
      default: [],
    },
    aiAnalysis: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    resolutionNotes: {
      type: String,
      default: '',
      trim: true,
      maxlength: 5000,
    },
    archived: {
      type: Boolean,
      default: false,
      index: true,
    },
    archivedAt: {
      type: Date,
      default: null,
    },
    archivedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    archiveReason: {
      type: String,
      default: '',
      trim: true,
      maxlength: 5000,
    },
    archiveType: {
      type: String,
      enum: ['rejected', 'deleted', null],
      default: null,
      index: true,
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
    lastUpdatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    rootCauseAnalysis: {
      problemSummary: {
        type: String,
        default: null,
        trim: true,
        maxlength: 2000,
      },
      rootCauseCategory: {
        type: String,
        enum: [
          'academic_performance',
          'administrative_process',
          'personnel_conduct',
          'harassment_discrimination',
          'infrastructure_facilities',
          'service_quality',
          'policy_enforcement',
          'others',
          null,
        ],
        default: null,
      },
      rootCauseDescription: {
        type: String,
        default: null,
        trim: true,
        maxlength: 3000,
      },
      actionTaken: {
        type: String,
        default: null,
        trim: true,
        maxlength: 3000,
      },
      preventiveAction: {
        type: String,
        default: null,
        trim: true,
        maxlength: 3000,
      },
      responsibleOffice: {
        type: String,
        default: null,
        trim: true,
      },
      resolutionDate: {
        type: Date,
        default: null,
      },
      rcaStatus: {
        type: String,
        enum: ['in_progress', 'resolved', 'escalated', null],
        default: null,
      },
      completedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null,
      },
      completedAt: {
        type: Date,
        default: null,
      },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Grievance', grievanceSchema);
