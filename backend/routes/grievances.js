const express = require('express');
const router = express.Router();
const Grievance = require('../models/Grievance');
const { authenticateToken, checkRole } = require('../middleware/auth');
const { analyzeComplaint } = require('../services/aiPipelineClient');
const { notifyComplainantGrievanceSubmitted } = require('../services/notificationService');
const { getSystemSettingsSnapshot } = require('../utils/systemSettings');
const { attemptAutoAssignment } = require('../utils/grievanceRoutingUtils');

const ALLOWED_PRIORITY = ['low', 'medium', 'high', 'critical'];

const makeReferenceNumber = () => {
  const year = new Date().getFullYear();
  const random = Math.floor(100000 + Math.random() * 900000);
  return `GRV-${year}-${random}`;
};

const makeTrackingId = () => {
  const year = new Date().getFullYear();
  const random = Math.floor(100000 + Math.random() * 900000);
  return `TRK-${year}-${random}`;
};

const makeGrievanceId = () => {
  const year = new Date().getFullYear();
  const random = Math.floor(100000 + Math.random() * 900000);
  return `GID-${year}-${random}`;
};

const sanitizeAttachments = (attachments) => {
  if (!Array.isArray(attachments)) {
    return [];
  }

  return attachments
    .filter((attachment) => attachment && attachment.url)
    .map((attachment) => ({
      url: String(attachment.url).trim(),
      publicId: attachment.publicId ? String(attachment.publicId).trim() : null,
      fileName: attachment.originalName ? String(attachment.originalName).trim() : null,
      fileType: attachment.format ? String(attachment.format).trim() : null,
      size: Number.isFinite(attachment.size) ? attachment.size : null,
    }));
};

const mapPriorityFromAi = (aiAnalysis) => {
  const label = aiAnalysis?.urgency?.label;
  return ALLOWED_PRIORITY.includes(label) ? label : 'medium';
};

router.post('/', authenticateToken, checkRole('complainant', 'admin'), async (req, res) => {
  try {
    const {
      subject,
      description,
      personInvolved = '',
      category,
      office = null,
      department = null,
      incidentDate = '',
      priority,
      isAnonymous = false,
      attachments = [],
    } = req.body;

    if (!subject || !description) {
      return res.status(400).json({ success: false, message: 'Subject and description are required' });
    }

    if (req.user.role === 'complainant') {
      const settings = await getSystemSettingsSnapshot();
      const maxActiveGrievances = Number(settings.maxGrievancesPerUser) || 5;
      const activeGrievanceCount = await Grievance.countDocuments({
        complainantId: req.user._id,
        archived: { $ne: true },
        status: { $in: ['pending', 'under_review', 'in_progress', 'escalated'] },
      });

      if (activeGrievanceCount >= maxActiveGrievances) {
        return res.status(400).json({
          success: false,
          code: 'MAX_ACTIVE_GRIEVANCES_REACHED',
          message: `You have reached the maximum of ${maxActiveGrievances} active grievances. Please wait for an existing case to be resolved before submitting another.`,
        });
      }
    }

    const normalizedSubject = String(subject).trim();
    const normalizedDescription = String(description).trim();
    const normalizedPersonInvolved = String(personInvolved || '').trim();
    const normalizedIncidentDate = String(incidentDate || '').trim();
    const combinedText = [normalizedSubject, normalizedDescription, normalizedPersonInvolved, normalizedIncidentDate].filter(Boolean).join('\n');

    let aiAnalysis = null;
    // AI analysis disabled - models not available
    // Using fallback defaults instead
    /* try {
      // Use a timeout for AI analysis - don't block submission if it hangs
      const aiPromise = analyzeComplaint(combinedText);
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('AI analysis timeout')), 5000)
      );
      aiAnalysis = await Promise.race([aiPromise, timeoutPromise]);
    } catch (error) {
      console.error('AI analysis failed/timeout:', error.message);
      // Continue without AI analysis rather than blocking the submission
    } */

    let referenceNumber = makeReferenceNumber();
    while (await Grievance.exists({ referenceNumber })) {
      referenceNumber = makeReferenceNumber();
    }

    let trackingId = makeTrackingId();
    while (await Grievance.exists({ trackingId })) {
      trackingId = makeTrackingId();
    }

    let grievanceId = makeGrievanceId();
    while (await Grievance.exists({ grievanceId })) {
      grievanceId = makeGrievanceId();
    }

    const resolvedPriority = ALLOWED_PRIORITY.includes(priority) ? priority : mapPriorityFromAi(aiAnalysis);
    const resolvedCategory = String(category || aiAnalysis?.category?.label || 'general').trim();
    
    // Fallback sentiment analysis (simple heuristic since AI model not available)
    const fallbackSentiment = normalizedDescription.toLowerCase().includes('urgent') || 
                              normalizedDescription.toLowerCase().includes('serious') ||
                              normalizedDescription.toLowerCase().includes('critical') ? 'negative' : 'neutral';

    const grievance = await Grievance.create({
      grievanceId,
      trackingId,
      referenceNumber,
      subject: normalizedSubject,
      description: normalizedDescription,
      category: resolvedCategory,
      office: office ? String(office).trim() : null,
      department: department ? String(department).trim() : null,
      incidentDate: normalizedIncidentDate || null,
      personInvolved: normalizedPersonInvolved || null,
      priority: resolvedPriority,
      complainantId: req.user._id,
      complainantName: isAnonymous ? null : req.user.name,
      complainantEmail: isAnonymous ? null : req.user.email,
      complainantType: isAnonymous ? null : (req.user.complainantType || null),
      isAnonymous: !!isAnonymous,
      attachments: sanitizeAttachments(attachments),
      aiAnalysis: aiAnalysis || { sentiment: { label: fallbackSentiment } },
      lastUpdatedBy: req.user._id,
    });

    await notifyComplainantGrievanceSubmitted({
      grievance,
      actor: req.user,
    });

    // Attempt auto-assignment to appropriate office handler
    console.log(`📮 Attempting auto-assignment for grievance ${grievance.referenceNumber} (office: ${grievance.office})`);
    const autoAssignedGrievance = await attemptAutoAssignment(grievance, Grievance);
    const responseGrievance = autoAssignedGrievance || grievance;
    const autoAssignmentStatus = autoAssignedGrievance ? 'auto-assigned' : 'pending-assignment';

    return res.status(201).json({
      success: true,
      message: `Grievance created successfully (${autoAssignmentStatus})`,
      data: responseGrievance,
      autoAssigned: !!autoAssignedGrievance,
      assignmentStatus: autoAssignmentStatus,
      aiAnalysis,
    });
  } catch (error) {
    console.error('Create grievance error:', error);
    return res.status(500).json({ success: false, message: 'Error creating grievance' });
  }
});

router.get('/mine/stats', authenticateToken, checkRole('complainant', 'admin'), async (req, res) => {
  try {
    const query = req.user.role === 'admin' ? {} : { complainantId: req.user._id };
    const [total, pending, inProgress, resolved, rejected] = await Promise.all([
      Grievance.countDocuments(query),
      Grievance.countDocuments({ ...query, status: { $in: ['pending', 'under_review'] } }),
      Grievance.countDocuments({ ...query, status: 'in_progress' }),
      Grievance.countDocuments({ ...query, status: 'resolved' }),
      Grievance.countDocuments({ ...query, status: 'rejected' }),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        total,
        pending,
        inProgress,
        resolved,
        rejected,
      },
    });
  } catch (error) {
    console.error('Get my grievance stats error:', error);
    return res.status(500).json({ success: false, message: 'Error fetching grievance statistics' });
  }
});

router.get('/mine', authenticateToken, checkRole('complainant', 'admin'), async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = '',
      status = '',
    } = req.query;

    const query = req.user.role === 'admin' ? {} : { complainantId: req.user._id };

    if (status) {
      query.status = status;
    }

    if (search) {
      query.$or = [
        { referenceNumber: { $regex: search, $options: 'i' } },
        { subject: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } },
        { office: { $regex: search, $options: 'i' } },
        { department: { $regex: search, $options: 'i' } },
      ];
    }

    const parsedPage = Math.max(1, parseInt(page, 10));
    const parsedLimit = Math.max(1, Math.min(100, parseInt(limit, 10)));
    const skip = (parsedPage - 1) * parsedLimit;

    const grievances = await Grievance.find(query)
      .populate('assignedTo', 'name email office')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parsedLimit);
    const total = await Grievance.countDocuments(query);

    return res.status(200).json({
      success: true,
      data: grievances,
      pagination: {
        currentPage: parsedPage,
        totalPages: Math.ceil(total / parsedLimit),
        totalItems: total,
        itemsPerPage: parsedLimit,
        hasNextPage: skip + parsedLimit < total,
        hasPreviousPage: parsedPage > 1,
      },
    });
  } catch (error) {
    console.error('Get my grievances error:', error);
    return res.status(500).json({ success: false, message: 'Error fetching grievances' });
  }
});

module.exports = router;
