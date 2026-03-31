const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Grievance = require('../models/Grievance');
const User = require('../models/User');
const OfficeCategory = require('../models/OfficeCategory');
const Notification = require('../models/Notification');
const { authenticateToken, checkRole } = require('../middleware/auth');
const {
  notifyComplainantGrievanceArchived,
  notifyComplainantGrievanceAssigned,
  notifyComplainantGrievanceStatusUpdated,
  notifyComplainantGrievanceSubmitted,
  notifyOfficeHandlerAssignment,
} = require('../services/notificationService');
const {
  updateWithOptimisticLock,
  executeTransaction,
  updateWithLockAndTransaction,
  formatConflictResponse,
} = require('../utils/concurrencyUtils');
const {
  notifyConflict,
  broadcastUpdateWarning,
  broadcastSuccessfulUpdate,
} = require('../utils/socketEvents');
const { attemptAutoAssignment } = require('../utils/grievanceRoutingUtils');

const ALLOWED_STATUS = ['pending', 'under_review', 'in_progress', 'resolved', 'rejected', 'escalated', 'assign_to_office'];
const ALLOWED_PRIORITY = ['low', 'medium', 'high', 'critical'];
const OPEN_STATUS = ['pending', 'under_review', 'in_progress', 'escalated'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const sanitizeAttachments = (attachments) => {
  if (!Array.isArray(attachments)) {
    return [];
  }

  return attachments
    .filter((attachment) => attachment && attachment.url)
    .map((attachment) => ({
      url: String(attachment.url).trim(),
      publicId: attachment.publicId ? String(attachment.publicId).trim() : null,
      fileName: attachment.fileName
        ? String(attachment.fileName).trim()
        : attachment.originalName
          ? String(attachment.originalName).trim()
          : null,
      fileType: attachment.fileType
        ? String(attachment.fileType).trim()
        : attachment.format
          ? String(attachment.format).trim()
          : null,
      size: Number.isFinite(attachment.size) ? attachment.size : null,
    }));
};

const escCSV = (v) => {
  if (v == null) return '';
  return `"${String(v).replace(/"/g, '""')}"`;
};

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

const adminGuard = [authenticateToken, checkRole('admin', 'superadmin')];

const startOfUtcWeek = (dateInput) => {
  const date = new Date(dateInput);
  const utcDate = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = utcDate.getUTCDay() || 7;
  utcDate.setUTCDate(utcDate.getUTCDate() - day + 1);
  utcDate.setUTCHours(0, 0, 0, 0);
  return utcDate;
};

const formatWeekLabel = (dateInput) =>
  new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(dateInput);

const buildMonthlyTrend = async (now = new Date()) => {
  const startMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 5, 1, 0, 0, 0, 0));

  const [filedRows, resolvedRows, pendingRows] = await Promise.all([
    Grievance.aggregate([
      { $match: { archived: { $ne: true }, createdAt: { $gte: startMonth } } },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]),
    Grievance.aggregate([
      {
        $match: {
          archived: { $ne: true },
          status: 'resolved',
          resolvedAt: { $gte: startMonth, $ne: null },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: '$resolvedAt' },
            month: { $month: '$resolvedAt' },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]),
    Grievance.aggregate([
      {
        $match: {
          archived: { $ne: true },
          status: { $in: OPEN_STATUS },
          createdAt: { $gte: startMonth },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]),
  ]);

  const filedMap = new Map(filedRows.map((row) => [`${row._id.year}-${row._id.month}`, row.count]));
  const resolvedMap = new Map(resolvedRows.map((row) => [`${row._id.year}-${row._id.month}`, row.count]));
  const pendingMap = new Map(pendingRows.map((row) => [`${row._id.year}-${row._id.month}`, row.count]));

  const trend = [];
  for (let i = 5; i >= 0; i -= 1) {
    const monthDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    const year = monthDate.getUTCFullYear();
    const month = monthDate.getUTCMonth() + 1;
    const key = `${year}-${month}`;

    trend.push({
      label: `${MONTHS[month - 1]} ${year}`,
      filed: filedMap.get(key) || 0,
      resolved: resolvedMap.get(key) || 0,
      pending: pendingMap.get(key) || 0,
    });
  }

  return trend;
};

const buildWeeklyTrend = async (now = new Date()) => {
  const currentWeekStart = startOfUtcWeek(now);
  const firstWeekStart = new Date(currentWeekStart);
  firstWeekStart.setUTCDate(firstWeekStart.getUTCDate() - 5 * 7);

  const [filedRows, resolvedRows] = await Promise.all([
    Grievance.aggregate([
      {
        $match: {
          archived: { $ne: true },
          createdAt: { $gte: firstWeekStart },
        },
      },
      {
        $group: {
          _id: {
            $dateTrunc: {
              date: '$createdAt',
              unit: 'week',
              startOfWeek: 'monday',
              timezone: 'UTC',
            },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    Grievance.aggregate([
      {
        $match: {
          archived: { $ne: true },
          status: 'resolved',
          resolvedAt: { $gte: firstWeekStart, $ne: null },
        },
      },
      {
        $group: {
          _id: {
            $dateTrunc: {
              date: '$resolvedAt',
              unit: 'week',
              startOfWeek: 'monday',
              timezone: 'UTC',
            },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),
  ]);

  const filedMap = new Map(filedRows.map((row) => [new Date(row._id).toISOString(), row.count]));
  const resolvedMap = new Map(resolvedRows.map((row) => [new Date(row._id).toISOString(), row.count]));

  const trend = [];
  for (let i = 0; i < 6; i += 1) {
    const weekStart = new Date(firstWeekStart);
    weekStart.setUTCDate(firstWeekStart.getUTCDate() + i * 7);
    const key = weekStart.toISOString();

    trend.push({
      label: formatWeekLabel(weekStart),
      filed: filedMap.get(key) || 0,
      resolved: resolvedMap.get(key) || 0,
    });
  }

  return trend;
};

const getAverageResolutionTimeDays = async () => {
  const [result] = await Grievance.aggregate([
    {
      $match: {
        archived: { $ne: true },
        status: 'resolved',
        resolvedAt: { $ne: null },
      },
    },
    {
      $project: {
        resolutionDays: {
          $divide: [{ $subtract: ['$resolvedAt', '$createdAt'] }, 1000 * 60 * 60 * 24],
        },
      },
    },
    {
      $group: {
        _id: null,
        average: { $avg: '$resolutionDays' },
      },
    },
  ]);

  return result?.average ? Number(result.average.toFixed(1)) : 0;
};

router.get('/grievances', ...adminGuard, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = '',
      status = '',
      priority = '',
      category = '',
      office = '',
      archived = '',
      sortBy = 'createdAt',
      sortOrder = 'desc',
      startDate = '',
      endDate = '',
    } = req.query;

    const query = {};

    if (search) {
      query.$or = [
        { referenceNumber: { $regex: search, $options: 'i' } },
        { subject: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { complainantName: { $regex: search, $options: 'i' } },
        { complainantEmail: { $regex: search, $options: 'i' } },
      ];
    }

    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (category) query.category = category;
    if (office) query.office = office;
    if (archived === 'true') {
      query.archived = true;
    } else {
      query.archived = { $ne: true };
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(`${endDate}T23:59:59.999Z`);
    }

    const parsedPage = Math.max(1, parseInt(page, 10));
    const parsedLimit = Math.max(1, Math.min(100, parseInt(limit, 10)));
    const skip = (parsedPage - 1) * parsedLimit;

    const allowedSort = ['createdAt', 'updatedAt', 'priority', 'status', 'referenceNumber', 'archivedAt'];
    const safeSortBy = allowedSort.includes(sortBy) ? sortBy : 'createdAt';
    const safeSortOrder = sortOrder === 'asc' ? 1 : -1;
    const sortOptions = { [safeSortBy]: safeSortOrder };

    const [grievances, total] = await Promise.all([
      Grievance.find(query)
        .populate('assignedTo', 'name email office')
        .populate('complainantId', 'name email contact phone complainantType')
        .populate('rootCauseAnalysis.completedBy', 'name email office')
        .sort(sortOptions)
        .skip(skip)
        .limit(parsedLimit),
      Grievance.countDocuments(query),
    ]);

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
      filters: { search, status, priority, category, office, archived, sortBy: safeSortBy, sortOrder },
    });
  } catch (error) {
    console.error('Get grievances error:', error);
    return res.status(500).json({ success: false, message: 'Error fetching grievances' });
  }
});

router.put('/grievances/:id', ...adminGuard, async (req, res) => {
  try {
    const { status, office, version } = req.body;
    const grievanceId = req.params.id;
    const isAdmin = req.user.role === 'admin';
    const isSuperadmin = req.user.role === 'superadmin';
    let existingGrievance;

    // Load existing grievance
    const existing = await Grievance.findById(grievanceId).select(
      'complainantId referenceNumber status priority __v'
    );
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Grievance not found' });
    }

    existingGrievance = existing;

    // Validate status if provided
    if (status && !ALLOWED_STATUS.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status value' });
    }

    const update = {
      lastUpdatedBy: req.user._id,
    };

    if (typeof office === 'string') {
      update.office = office.trim() || null;
    }

    if (status) {
      update.status = status;
      if (status === 'resolved') {
        update.resolvedAt = new Date();
      }
      if (status === 'rejected') {
        update.archived = true;
        update.archivedAt = new Date();
        update.archivedBy = req.user._id;
        update.archiveType = 'rejected';
        update.archiveReason = 'Marked as rejected by administrator';
      } else {
        update.archived = false;
        update.archivedAt = null;
        update.archivedBy = null;
        update.archiveType = null;
        update.archiveReason = '';
      }
    }

    // Use optimistic locking if version provided
    let grievance;
    if (version !== undefined) {
      // Use locked transaction update
      const result = await updateWithLockAndTransaction(
        Grievance,
        grievanceId,
        async (doc, session) => {
          const updated = await Grievance.findByIdAndUpdate(grievanceId, update, {
            new: true,
            session,
            runValidators: true,
          })
            .populate('assignedTo', 'name email office')
            .populate('complainantId', 'name email contact phone complainantType')
            .session(session);
          return updated;
        },
        version
      );

      if (!result.success) {
        if (result.conflict) {
          // Conflict detected
          const io = req.app.get('io');
          if (io) {
            notifyConflict(io, req.user._id, grievanceId, {
              currentVersion: result.currentVersion,
              currentState: {
                status: existingGrievance.status,
                priority: existingGrievance.priority,
                lastUpdatedBy: existingGrievance.lastUpdatedBy,
                updatedAt: existingGrievance.updatedAt,
              },
              updatedBy: existingGrievance.lastUpdatedBy,
              updatedByName: 'Another Administrator',
            });
          }

          return res.status(result.statusCode).json(
            formatConflictResponse(existingGrievance, { status, office })
          );
        }
        return res.status(result.statusCode).json({ success: false, message: result.error });
      }

      grievance = result.data;
    } else {
      // Fallback: simple update without version check
      grievance = await Grievance.findByIdAndUpdate(grievanceId, update, { new: true })
        .populate('assignedTo', 'name email office')
        .populate('complainantId', 'name email contact phone complainantType');

      if (!grievance) {
        return res.status(404).json({ success: false, message: 'Grievance not found' });
      }
    }

    // Send notification if status changed
    if (status && existingGrievance.status !== status) {
      await notifyComplainantGrievanceStatusUpdated({
        grievance,
        actor: req.user,
        previousStatus: existingGrievance.status,
        status,
        resolutionNotes: '',
      });
    }

    // Only auto-assign if SUPERADMIN changes office (not admin)
    if (isSuperadmin && update.office && existingGrievance.office !== update.office) {
      console.log(`🔄 Superadmin confirmed office change for ${grievance.referenceNumber} from "${existingGrievance.office}" to "${update.office}"`);
      console.log(`   Attempting auto-assignment to new office handlers...`);
      
      // Find the office category to get its slug
      const officeCategory = await OfficeCategory.findOne({
        name: { $regex: update.office, $options: 'i' }
      }).select('slug');

      if (officeCategory) {
        // Find available handlers in new office
        const { findAvailableHandlers } = require('../utils/grievanceRoutingUtils');
        const handlers = await findAvailableHandlers(officeCategory.slug);

        if (handlers.length > 0) {
          const selectedHandler = handlers[0];
          
          // Update grievance with new handler
          grievance = await Grievance.findByIdAndUpdate(
            grievanceId,
            {
              assignedTo: selectedHandler._id,
              assignedBy: req.user._id,
              assignedAt: new Date(),
              status: grievance.status === 'pending' ? 'in_progress' : grievance.status,
            },
            { new: true }
          )
            .populate('assignedTo', 'name email office')
            .populate('complainantId', 'name email contact phone complainantType');

          console.log(`   ✅ Auto-assigned to ${selectedHandler.name}`);

          // Notify handler
          await notifyOfficeHandlerAssignment({
            grievance,
            assignee: selectedHandler,
            actor: req.user,
          });
        } else {
          console.log(`   ⚠️  No available handlers in ${update.office}`);
        }
      }
    } else if (isAdmin && update.office && existingGrievance.office !== update.office) {
      // Admin just changed office, no auto-assignment
      console.log(`📋 Admin ${req.user.name} reassigned office to ${update.office} (awaiting handler assignment)`);
    }

    // Broadcast update
    const io = req.app.get('io');
    if (io && status) {
      broadcastSuccessfulUpdate(io, grievanceId, {
        version: grievance.__v,
        updatedByName: req.user.name,
        changes: { status, office },
        newStatus: status,
      });
    }

    let message = 'Grievance updated successfully';
    if (update.office && isAdmin) {
      message = 'Office reassigned (pending handler assignment)';
    } else if (update.office && isSuperadmin) {
      message = 'Office confirmed and grievance routed to handlers';
    }

    return res.status(200).json({
      success: true,
      message,
      data: grievance,
    });
  } catch (error) {
    console.error('Admin update grievance error:', error);
    return res.status(500).json({ success: false, message: 'Error updating grievance' });
  }
});

router.get('/grievances/stats', ...adminGuard, async (req, res) => {
  try {
    const [total, pending, inProgress, resolved, escalated, byPriority, byCategory] = await Promise.all([
      Grievance.countDocuments({ archived: { $ne: true } }),
      Grievance.countDocuments({ archived: { $ne: true }, status: { $in: ['pending', 'under_review'] } }),
      Grievance.countDocuments({ archived: { $ne: true }, status: 'in_progress' }),
      Grievance.countDocuments({ archived: { $ne: true }, status: 'resolved' }),
      Grievance.countDocuments({ archived: { $ne: true }, status: 'escalated' }),
      Grievance.aggregate([{ $match: { archived: { $ne: true } } }, { $group: { _id: '$priority', count: { $sum: 1 } } }]),
      Grievance.aggregate([{ $match: { archived: { $ne: true } } }, { $group: { _id: '$category', count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
    ]);

    const priorityCounts = {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0,
    };
    byPriority.forEach((row) => {
      if (row._id && priorityCounts[row._id] != null) {
        priorityCounts[row._id] = row.count;
      }
    });

    return res.status(200).json({
      success: true,
      data: {
        total,
        pending,
        inProgress,
        resolved,
        escalated,
        resolutionRate: total > 0 ? Number(((resolved / total) * 100).toFixed(1)) : 0,
        priorityCounts,
        categoryBreakdown: byCategory
          .filter((row) => !!row._id)
          .slice(0, 6)
          .map((row) => ({ name: row._id, count: row.count })),
      },
    });
  } catch (error) {
    console.error('Get grievance stats error:', error);
    return res.status(500).json({ success: false, message: 'Error fetching grievance statistics' });
  }
});

router.get('/analytics', ...adminGuard, async (req, res) => {
  try {
    const [totalCases, pending, inProgress, resolved, totalUsers, activeUsers, totalOffices, avgResponseTime, monthlyTrend] =
      await Promise.all([
        Grievance.countDocuments({ archived: { $ne: true } }),
        Grievance.countDocuments({ archived: { $ne: true }, status: { $in: ['pending', 'under_review'] } }),
        Grievance.countDocuments({ archived: { $ne: true }, status: 'in_progress' }),
        Grievance.countDocuments({ archived: { $ne: true }, status: 'resolved' }),
        User.countDocuments({ status: { $ne: 'blocked' } }),
        User.countDocuments({ status: 'active' }),
        OfficeCategory.countDocuments({ status: 'active' }),
        getAverageResolutionTimeDays(),
        buildMonthlyTrend(),
      ]);

    const resolutionRate = totalCases > 0 ? Number(((resolved / totalCases) * 100).toFixed(1)) : 0;

    return res.status(200).json({
      success: true,
      data: {
        summary: {
          totalCases,
          resolved,
          pending,
          inProgress,
          avgResponseTime,
          resolutionRate,
          totalUsers,
          activeUsers,
          totalOffices,
        },
        monthlyTrend,
      },
    });
  } catch (error) {
    console.error('Get analytics error:', error);
    return res.status(500).json({ success: false, message: 'Error fetching analytics data' });
  }
});

router.post('/grievances', authenticateToken, checkRole('admin', 'superadmin', 'complainant'), async (req, res) => {
  try {
    const {
      subject,
      description,
      category = 'general',
      office = null,
      department = null,
      incidentDate = null,
      priority = 'medium',
      complainantName = null,
      complainantEmail = null,
      complainantId = null,
      isAnonymous = false,
      attachments = [],
      aiAnalysis = null,
    } = req.body;

    if (!subject || !description) {
      return res.status(400).json({ success: false, message: 'Subject and description are required' });
    }

    if (!ALLOWED_PRIORITY.includes(priority)) {
      return res.status(400).json({ success: false, message: 'Invalid priority value' });
    }

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

    // Get complainant type from authenticated user if they're a complainant
    let complainantType = null;
    if (req.user.role === 'complainant') {
      complainantType = req.user.complainantType || null;
    }

    // Auto-populate complainant info from authenticated user if they're submitting themselves
    let finalComplainantId = complainantId || (req.user.role === 'complainant' && !isAnonymous ? req.user._id : null);
    let finalComplainantName = complainantName || (req.user.role === 'complainant' && !isAnonymous ? req.user.name : null);
    let finalComplainantEmail = complainantEmail || (req.user.role === 'complainant' && !isAnonymous ? req.user.email : null);

    const grievance = await Grievance.create({
      grievanceId,
      trackingId,
      referenceNumber,
      subject: String(subject).trim(),
      description: String(description).trim(),
      category: String(category).trim() || 'general',
      office: office ? String(office).trim() : null,
      department: department ? String(department).trim() : null,
      incidentDate: incidentDate ? String(incidentDate).trim() : null,
      priority,
      complainantId: finalComplainantId,
      complainantName: finalComplainantName ? String(finalComplainantName).trim() : null,
      complainantEmail: finalComplainantEmail ? String(finalComplainantEmail).trim().toLowerCase() : null,
      complainantType: isAnonymous ? null : complainantType,
      isAnonymous: !!isAnonymous,
      attachments: sanitizeAttachments(attachments),
      aiAnalysis,
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
    });
  } catch (error) {
    console.error('Create grievance error:', error);
    return res.status(500).json({ success: false, message: 'Error creating grievance' });
  }
});

router.put('/grievances/:id/status', ...adminGuard, async (req, res) => {
  try {
    const { status, resolutionNotes = '', version } = req.body;
    if (!ALLOWED_STATUS.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status value' });
    }

    const grievanceId = req.params.id;
    let existingGrievance;

    // If version provided, use optimistic locking with transaction
    if (version !== undefined) {
      // Wrap in transaction for atomicity
      const result = await updateWithLockAndTransaction(
        Grievance,
        grievanceId,
        async (doc, session) => {
          // Prepare update data
          const update = {
            status,
            resolutionNotes: String(resolutionNotes || '').trim(),
            lastUpdatedBy: req.user._id,
          };
          if (status === 'resolved') {
            update.resolvedAt = new Date();
          }

          // Perform update within transaction
          const updated = await Grievance.findByIdAndUpdate(
            grievanceId,
            update,
            { new: true, session, runValidators: true }
          );

          existingGrievance = doc;
          return updated;
        },
        version
      );

      if (!result.success) {
        if (result.conflict) {
          // Conflict detected - notify user via Socket.io
          const io = req.app.get('io');
          if (io) {
            notifyConflict(io, req.user._id, grievanceId, {
              currentVersion: result.currentVersion,
              currentState: {
                status: existingGrievance?.status,
                priority: existingGrievance?.priority,
                lastUpdatedBy: existingGrievance?.lastUpdatedBy,
                updatedAt: existingGrievance?.updatedAt,
              },
              updatedBy: existingGrievance?.lastUpdatedBy,
              updatedByName: 'Another Administrator',
            });
          }

          return res.status(result.statusCode).json(
            formatConflictResponse(existingGrievance, { status, resolutionNotes })
          );
        }
        return res.status(result.statusCode).json({ success: false, message: result.error });
      }

      const grievance = result.data;

      // Send notification (outside transaction to not affect core operation)
      await notifyComplainantGrievanceStatusUpdated({
        grievance,
        actor: req.user,
        previousStatus: existingGrievance.status,
        status,
        resolutionNotes: update.resolutionNotes,
      });

      // Broadcast successful update
      const io = req.app.get('io');
      if (io) {
        broadcastSuccessfulUpdate(io, grievanceId, {
          version: grievance.__v,
          updatedByName: req.user.name,
          changes: { status, resolutionNotes },
          newStatus: status,
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Grievance status updated successfully',
        data: grievance,
      });
    }

    // Fallback: if no version provided (for backward compatibility)
    existingGrievance = await Grievance.findById(grievanceId).select(
      'complainantId referenceNumber status __v'
    );
    if (!existingGrievance) {
      return res.status(404).json({ success: false, message: 'Grievance not found' });
    }

    const update = {
      status,
      resolutionNotes: String(resolutionNotes || '').trim(),
      lastUpdatedBy: req.user._id,
    };
    if (status === 'resolved') {
      update.resolvedAt = new Date();
    }

    const grievance = await Grievance.findByIdAndUpdate(grievanceId, update, { new: true });
    if (!grievance) {
      return res.status(404).json({ success: false, message: 'Grievance not found' });
    }

    await notifyComplainantGrievanceStatusUpdated({
      grievance,
      actor: req.user,
      previousStatus: existingGrievance.status,
      status,
      resolutionNotes: update.resolutionNotes,
    });

    return res.status(200).json({
      success: true,
      message: 'Grievance status updated successfully',
      data: grievance,
    });
  } catch (error) {
    console.error('Update grievance status error:', error);
    return res.status(500).json({ success: false, message: 'Error updating grievance status' });
  }
});

router.put('/grievances/:id/assign', ...adminGuard, async (req, res) => {
  try {
    const { assignedTo, version, reassignReason = '' } = req.body;
    if (!assignedTo) {
      return res.status(400).json({ success: false, message: 'assignedTo user id is required' });
    }

    const grievanceId = req.params.id;

    const assignee = await User.findOne({ _id: assignedTo, role: 'office_handler' }).select('name email office');
    if (!assignee) {
      return res.status(404).json({ success: false, message: 'Office handler not found' });
    }

    const existingGrievance = await Grievance.findById(grievanceId).select('__v status assignedTo');
    if (!existingGrievance) {
      return res.status(404).json({ success: false, message: 'Grievance not found' });
    }

    const isReassignment = existingGrievance.assignedTo && existingGrievance.assignedTo.toString() !== assignedTo;

    const updateData = {
      assignedTo: assignee._id,
      assignedBy: req.user._id,
      assignedAt: new Date(),
      status: 'in_progress',
      lastUpdatedBy: req.user._id,
    };

    let grievance;

    // Use optimistic locking if version provided
    if (version !== undefined) {
      const result = await updateWithLockAndTransaction(
        Grievance,
        grievanceId,
        async (doc, session) => {
          const updated = await Grievance.findByIdAndUpdate(grievanceId, updateData, {
            new: true,
            session,
            runValidators: true,
          })
            .populate('assignedTo', 'name email office')
            .populate('complainantId', 'name email complainantType')
            .session(session);
          return updated;
        },
        version
      );

      if (!result.success) {
        if (result.conflict) {
          const io = req.app.get('io');
          if (io) {
            notifyConflict(io, req.user._id, grievanceId, {
              currentVersion: result.currentVersion,
              currentState: {
                status: existingGrievance.status,
                assignedTo: existingGrievance.assignedTo,
              },
              updatedBy: existingGrievance.lastUpdatedBy,
              updatedByName: 'Another Administrator',
            });
          }

          return res.status(result.statusCode).json(
            formatConflictResponse(existingGrievance, { assignedTo })
          );
        }
        return res.status(result.statusCode).json({ success: false, message: result.error });
      }

      grievance = result.data;
    } else {
      // Fallback: simple update
      grievance = await Grievance.findByIdAndUpdate(grievanceId, updateData, { new: true })
        .populate('assignedTo', 'name email office')
        .populate('complainantId', 'name email complainantType');

      if (!grievance) {
        return res.status(404).json({ success: false, message: 'Grievance not found' });
      }
    }

    // Log reassignment if applicable
    if (isReassignment) {
      const previousHandler = await User.findById(existingGrievance.assignedTo).select('name email');
      const { attemptAutoAssignment } = require('../utils/grievanceRoutingUtils');
      
      await AuditLog.create({
        grievanceId,
        action: 'GRIEVANCE_REASSIGNED',
        performedBy: req.user._id,
        performedByName: req.user.name,
        previousValue: {
          assignedTo: previousHandler?._id,
          assignedToName: previousHandler?.name,
        },
        newValue: {
          assignedTo: assignee._id,
          assignedToName: assignee.name,
        },
        reason: reassignReason || 'Manual reassignment by admin',
        timestamp: new Date(),
        details: {
          action: 'manual_assign',
          reason: reassignReason,
        },
      });

      console.log(`🔄 Grievance ${grievanceId} reassigned from ${previousHandler?.name || 'Unassigned'} to ${assignee.name} by ${req.user.name}${reassignReason ? ` - Reason: ${reassignReason}` : ''}`);
    }

    // Send notifications
    await notifyComplainantGrievanceAssigned({
      grievance,
      actor: req.user,
      assignee,
    });

    await notifyOfficeHandlerAssignment({
      grievance,
      assignee,
      actor: req.user,
    });

    // Broadcast update
    const io = req.app.get('io');
    if (io) {
      broadcastSuccessfulUpdate(io, grievanceId, {
        version: grievance.__v,
        updatedByName: req.user.name,
        changes: { assignedTo: assignee.name },
        newStatus: 'in_progress',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Grievance assigned successfully',
      data: grievance,
    });
  } catch (error) {
    console.error('Assign grievance error:', error);
    return res.status(500).json({ success: false, message: 'Error assigning grievance' });
  }
});

// PUT: Reassign grievance to different office with auto-routing
router.put('/grievances/:id/reassign-office', ...adminGuard, async (req, res) => {
  try {
    const { newOffice, reassignReason = '', assignToSpecificHandler = null, version } = req.body;
    
    if (!newOffice) {
      return res.status(400).json({ success: false, message: 'New office/destination is required' });
    }

    const grievanceId = req.params.id;
    const beforeState = await Grievance.findById(grievanceId).select('office assignedTo __v status referenceNumber');
    
    if (!beforeState) {
      return res.status(404).json({ success: false, message: 'Grievance not found' });
    }

    // Validate new office exists and get its slug for later assignment
    const officeCategory = await OfficeCategory.findOne({
      name: { $regex: newOffice, $options: 'i' }
    }).select('name slug');

    if (!officeCategory) {
      return res.status(400).json({ success: false, message: 'Invalid office/destination selected' });
    }

    // CRITICAL: Determine new handler BEFORE updating (to make assignment atomic)
    let newHandler = null;

    if (assignToSpecificHandler) {
      const handler = await User.findOne({
        _id: assignToSpecificHandler,
        role: 'office_handler',
        status: 'active',
        isVerified: true,
      }).select('_id name email office');

      if (!handler) {
        return res.status(400).json({ 
          success: false, 
          message: 'Selected handler not found or unauthorized' 
        });
      }
      newHandler = handler;
    } else {
      // Auto-assign to best available handler
      const { findAvailableHandlers } = require('../utils/grievanceRoutingUtils');
      const handlers = await findAvailableHandlers(officeCategory.slug);
      
      if (handlers.length === 0) {
        return res.status(400).json({
          success: false,
          message: `No available handlers in ${officeCategory.name}`
        });
      }
      newHandler = handlers[0];
    }

    // Prepare atomic update: office + handler + status together
    const updateData = {
      office: officeCategory.name,
      assignedTo: newHandler._id,
      assignedBy: req.user._id,
      assignedAt: new Date(),
      status: 'in_progress',
      lastUpdatedBy: req.user._id,
    };

    console.log(`\n📤 [REASSIGN] Preparing update for ${grievanceId}:`);
    console.log(`   Current version from request: ${version}`);
    console.log(`   Update data:`, {
      office: updateData.office,
      assignedTo: updateData.assignedTo.toString(),
      assignedBy: updateData.assignedBy.toString(),
      status: updateData.status
    });

    let grievance;

    // Use optimistic locking if version provided
    if (version !== undefined) {
      const result = await updateWithLockAndTransaction(
        Grievance,
        grievanceId,
        async (doc, session) => {
          const updated = await Grievance.findByIdAndUpdate(grievanceId, updateData, {
            new: true,
            session,
            runValidators: true,
          })
            .populate('assignedTo', 'name email office')
            .populate('complainantId', 'name email complainantType')
            .session(session);
          return updated;
        },
        version
      );

      if (!result.success) {
        if (result.conflict) {
          const io = req.app.get('io');
          if (io) {
            notifyConflict(io, req.user._id, grievanceId, {
              currentVersion: result.currentVersion,
              currentState: {
                office: beforeState.office,
                assignedTo: beforeState.assignedTo,
              },
              updatedBy: beforeState.lastUpdatedBy,
              updatedByName: 'Another Administrator',
            });
          }
          return res.status(result.statusCode).json(
            formatConflictResponse(beforeState, { office: newOffice })
          );
        }
        return res.status(result.statusCode).json({ success: false, message: result.error });
      }

      grievance = result.data;
    } else {
      // Fallback: simple update
      grievance = await Grievance.findByIdAndUpdate(grievanceId, updateData, { new: true })
        .populate('assignedTo', 'name email office')
        .populate('complainantId', 'name email complainantType');

      if (!grievance) {
        return res.status(404).json({ success: false, message: 'Grievance not found' });
      }
    }

    // Log the reassignment action
    try {
      const AuditLog = require('../models/AuditLog');
      await AuditLog.create({
        user: req.user._id,
        userName: req.user.name,
        action: 'GRIEVANCE_REASSIGNED',
        resourceType: 'Grievance',
        resourceId: grievanceId,
        changes: {
          previousOffice: beforeState.office,
          newOffice: officeCategory.name,
          previousHandler: beforeState.assignedTo,
          newHandler: newHandler?._id || null,
          reason: reassignReason,
        },
        details: `Grievance moved from ${beforeState.office || 'unassigned'} to ${officeCategory.name} and assigned to ${newHandler.name}`,
      });
    } catch (auditErr) {
      console.error('Failed to create audit log:', auditErr);
    }

    // Broadcast update
    const io = req.app.get('io');
    if (io) {
      broadcastSuccessfulUpdate(io, grievanceId, {
        version: grievance.__v,
        updatedByName: req.user.name,
        changes: {
          office: newOffice,
          assignedTo: newHandler?.name || 'Unassigned',
        },
        reason: reassignReason,
      });
    }

    return res.status(200).json({
      success: true,
      message: `Grievance reassigned to ${newOffice}${newHandler ? ` and assigned to ${newHandler.name}` : ' (awaiting handler)'}`,
      data: grievance,
      newHandler: newHandler ? { id: newHandler._id, name: newHandler.name, email: newHandler.email } : null,
    });
  } catch (error) {
    console.error('Reassign office error:', error);
    return res.status(500).json({ success: false, message: 'Error reassigning grievance to new office' });
  }
});

router.delete('/grievances/:id', ...adminGuard, async (req, res) => {
  try {
    const { reason = '', version } = req.body || {};
    if (!String(reason).trim()) {
      return res.status(400).json({ success: false, message: 'Deletion reason is required' });
    }

    const grievanceId = req.params.id;

    const grievance = await Grievance.findById(grievanceId)
      .populate('complainantId', 'name email contact phone complainantType')
      .select('referenceNumber subject complainantId archived __v');
    if (!grievance) {
      return res.status(404).json({ success: false, message: 'Grievance not found' });
    }

    const updateData = {
      archived: true,
      archivedAt: new Date(),
      archivedBy: req.user._id,
      archiveReason: String(reason).trim(),
      archiveType: 'deleted',
      lastUpdatedBy: req.user._id,
    };

    let archivedGrievance;

    // Use optimistic locking if version provided
    if (version !== undefined) {
      const result = await updateWithLockAndTransaction(
        Grievance,
        grievanceId,
        async (doc, session) => {
          const updated = await Grievance.findByIdAndUpdate(grievanceId, updateData, {
            new: true,
            session,
            runValidators: true,
          })
            .populate('complainantId', 'name email contact phone complainantType')
            .session(session);
          return updated;
        },
        version
      );

      if (!result.success) {
        if (result.conflict) {
          const io = req.app.get('io');
          if (io) {
            notifyConflict(io, req.user._id, grievanceId, {
              currentVersion: result.currentVersion,
              currentState: {
                archived: grievance.archived,
                status: grievance.status,
              },
              updatedBy: grievance.lastUpdatedBy,
              updatedByName: 'Another Administrator',
            });
          }

          return res.status(result.statusCode).json(
            formatConflictResponse(grievance, { reason })
          );
        }
        return res.status(result.statusCode).json({ success: false, message: result.error });
      }

      archivedGrievance = result.data;
    } else {
      // Fallback: simple update
      archivedGrievance = await Grievance.findByIdAndUpdate(grievanceId, updateData, {
        new: true,
      });

      if (!archivedGrievance) {
        return res.status(404).json({ success: false, message: 'Grievance not found' });
      }
    }

    // Send notification
    await notifyComplainantGrievanceArchived({
      grievance: archivedGrievance,
      actor: req.user,
      reason: String(reason).trim(),
      archiveType: 'deleted',
    });

    // Broadcast update
    const io = req.app.get('io');
    if (io) {
      broadcastSuccessfulUpdate(io, grievanceId, {
        version: archivedGrievance.__v,
        updatedByName: req.user.name,
        changes: { archived: true, reason },
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Grievance archived successfully',
      data: archivedGrievance,
    });
  } catch (error) {
    console.error('Delete grievance error:', error);
    return res.status(500).json({ success: false, message: 'Error archiving grievance' });
  }
});

router.get('/grievances/dashboard', ...adminGuard, async (req, res) => {
  try {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    // Get all time statistics
    const [
      totalGrievances,
      pendingReview,
      escalatedCases,
      resolvedThisWeek,
      resolvedAllTime,
      categoryBreakdown,
      monthlyTrend,
      weeklyTrend,
    ] = await Promise.all([
      Grievance.countDocuments({ archived: { $ne: true } }),
      Grievance.countDocuments({ archived: { $ne: true }, status: { $in: ['pending', 'under_review'] } }),
      Grievance.countDocuments({ archived: { $ne: true }, status: 'escalated' }),
      Grievance.countDocuments({ 
        archived: { $ne: true },
        status: 'resolved', 
        resolvedAt: { $gte: weekAgo } 
      }),
      Grievance.countDocuments({ archived: { $ne: true }, status: 'resolved' }),
      Grievance.aggregate([
        { $match: { archived: { $ne: true } } },
        { $group: { _id: '$category', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 6 }
      ]),
      buildMonthlyTrend(now),
      buildWeeklyTrend(now)
    ]);

    // Calculate resolution rate
    const resolutionRate = totalGrievances > 0 
      ? Number(((resolvedAllTime / totalGrievances) * 100).toFixed(1)) 
      : 0;

    // Get priority queue (high and critical cases that need attention)
    const priorityQueue = await Grievance.find({
      archived: { $ne: true },
      priority: { $in: ['high', 'critical'] },
      status: { $in: ['pending', 'under_review', 'escalated'] }
    })
    .select('referenceNumber subject priority office')
    .sort({ priority: -1, createdAt: 1 })
    .limit(5)
    .lean();
    // Get recent activity
    const recentActivity = await Grievance.find({
      archived: { $ne: true },
      updatedAt: { $gte: weekAgo }
    })
    .select('referenceNumber subject status updatedAt')
    .sort({ updatedAt: -1 })
    .limit(5)
    .lean();

    const formattedActivity = recentActivity.map(item => ({
      id: item._id,
      title: `Case ${item.referenceNumber} updated`,
      detail: `Status changed to ${item.status.replace('_', ' ')}`
    }));

    // Format category breakdown with percentages
    const totalCategories = categoryBreakdown.reduce((sum, cat) => sum + cat.count, 0);
    const formattedCategories = categoryBreakdown.map(cat => ({
      name: cat._id || 'Uncategorized',
      count: cat.count,
      percentage: totalCategories > 0 ? Number(((cat.count / totalCategories) * 100).toFixed(1)) : 0
    }));

    return res.status(200).json({
      success: true,
      data: {
        overview: {
          totalGrievances,
          pendingReview,
          escalatedCases,
          resolvedThisWeek,
          resolutionRate
        },
        trendData: {
          monthly: monthlyTrend,
          weekly: weeklyTrend
        },
        categoryBreakdown: formattedCategories,
        priorityQueue,
        recentActivity: formattedActivity
      }
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    return res.status(500).json({ success: false, message: 'Error fetching dashboard statistics' });
  }
});

router.get('/grievances/export', ...adminGuard, async (req, res) => {
  try {
    const { format = 'json' } = req.query;
    const grievances = await Grievance.find({})
      .populate('assignedTo', 'name email office')
      .sort({ createdAt: -1 });

    if (format === 'csv') {
      const header = [
        'Reference',
        'Subject',
        'Category',
        'Office',
        'Priority',
        'Status',
        'Complainant',
        'Email',
        'Assigned To',
        'Created At',
      ].join(',');

      const rows = grievances.map((g) =>
        [
          escCSV(g.referenceNumber),
          escCSV(g.subject),
          escCSV(g.category),
          escCSV(g.office),
          escCSV(g.priority),
          escCSV(g.status),
          escCSV(g.complainantName),
          escCSV(g.complainantEmail),
          escCSV(g.assignedTo?.name || ''),
          escCSV(g.createdAt?.toISOString?.() || g.createdAt),
        ].join(',')
      );

      const csv = [header, ...rows].join('\n');
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=grievances.csv');
      return res.send(csv);
    }

    return res.status(200).json({ success: true, data: grievances });
  } catch (error) {
    console.error('Export grievances error:', error);
    return res.status(500).json({ success: false, message: 'Error exporting grievances' });
  }
});

// POST: Route grievance to office handler (SUPERADMIN ONLY)
router.post('/grievances/:id/route-to-office', authenticateToken, checkRole('superadmin'), async (req, res) => {
  try {
    const { officeHandlerId } = req.body;
    const grievanceId = req.params.id;

    // Validate inputs
    if (!officeHandlerId) {
      return res.status(400).json({ success: false, message: 'Office handler ID is required' });
    }

    // Load grievance
    const grievance = await Grievance.findById(grievanceId)
      .populate('assignedTo', 'name email office')
      .populate('complainantId', 'name email complainantType');

    if (!grievance) {
      return res.status(404).json({ success: false, message: 'Grievance not found' });
    }

    // Verify office handler exists and is active
    const officeHandler = await User.findById(officeHandlerId);
    if (!officeHandler || officeHandler.role !== 'office_handler' || officeHandler.status === 'blocked') {
      return res.status(400).json({ success: false, message: 'Invalid or inactive office handler' });
    }

    // Update grievance
    grievance.status = 'assign_to_office';
    grievance.assignedTo = officeHandlerId;
    grievance.lastUpdatedBy = req.user._id;

    await grievance.save();

    // Notify office handler
    try {
      await Notification.create({
        recipient: officeHandlerId,
        type: 'grievance_assigned',
        title: 'New Grievance Assigned',
        message: `Grievance "${grievance.subject}" has been routed to you by superadmin.`,
        relatedGrievance: grievanceId,
        relatedUser: grievance.complainantId?._id,
      });
    } catch (notifErr) {
      console.error('Failed to create notification:', notifErr);
    }

    // Notify complainant
    try {
      await notifyOfficeHandlerAssignment(grievance, officeHandler);
    } catch (notifErr) {
      console.error('Failed to notify complainant:', notifErr);
    }

    return res.status(200).json({
      success: true,
      message: 'Grievance routed to office handler successfully',
      data: {
        ...grievance.toObject(),
        assignedTo: {
          _id: officeHandler._id,
          name: officeHandler.name,
          email: officeHandler.email,
          office: officeHandler.office,
        },
      },
    });
  } catch (error) {
    console.error('Route grievance error:', error);
    return res.status(500).json({ success: false, message: 'Error routing grievance' });
  }
});

module.exports = router;
