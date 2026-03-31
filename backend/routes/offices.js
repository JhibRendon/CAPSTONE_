const express = require('express');
const router = express.Router();
const Grievance = require('../models/Grievance');
const { authenticateToken, checkRole } = require('../middleware/auth');
const { notifyComplainantGrievanceStatusUpdated } = require('../services/notificationService');
const {
  getOfficeHandlers,
  verifyOfficeHandler,
  rejectOfficeHandler,
  updateOfficeHandler,
  deleteOfficeHandler,
  getOfficeCategories,
  createOfficeCategory,
  updateOfficeCategory,
  deleteOfficeCategory,
} = require('../controllers/officeController');

const adminOfficeGuard = checkRole('admin', 'superadmin');
const OPEN_STATUS = ['pending', 'under_review', 'in_progress', 'escalated'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const buildOfficeMatch = (user) => (
  user.role === 'office_handler'
    ? { archived: { $ne: true }, assignedTo: user._id }
    : { archived: { $ne: true } }
);

const startOfUtcWeek = (dateInput) => {
  const date = new Date(dateInput);
  const utcDate = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = utcDate.getUTCDay() || 7;
  utcDate.setUTCDate(utcDate.getUTCDate() - day + 1);
  utcDate.setUTCHours(0, 0, 0, 0);
  return utcDate;
};

const startOfUtcDay = (dateInput) => {
  const date = new Date(dateInput);
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0));
};

const formatWeekLabel = (dateInput) =>
  new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(dateInput);

const formatRelativeTime = (dateInput) => {
  if (!dateInput) {
    return 'No recent activity';
  }

  const diffMs = Date.now() - new Date(dateInput).getTime();
  const minutes = Math.max(1, Math.floor(diffMs / (1000 * 60)));

  if (minutes < 60) {
    return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  }

  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
};

const buildMonthlyTrend = async (match, now = new Date()) => {
  const startMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 5, 1, 0, 0, 0, 0));

  const [filedRows, resolvedRows, openRows] = await Promise.all([
    Grievance.aggregate([
      { $match: { ...match, createdAt: { $gte: startMonth } } },
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
          ...match,
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
          ...match,
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
  const openMap = new Map(openRows.map((row) => [`${row._id.year}-${row._id.month}`, row.count]));

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
      open: openMap.get(key) || 0,
    });
  }

  return trend;
};

const getAverageResolutionTimeDays = async (match) => {
  const [result] = await Grievance.aggregate([
    {
      $match: {
        ...match,
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

const buildResolutionTrend = async (match, now = new Date()) => {
  const currentWeekStart = startOfUtcWeek(now);
  const firstWeekStart = new Date(currentWeekStart);
  firstWeekStart.setUTCDate(firstWeekStart.getUTCDate() - 7 * 7);

  const rows = await Grievance.aggregate([
    {
      $match: {
        ...match,
        status: 'resolved',
        resolvedAt: { $gte: firstWeekStart, $ne: null },
      },
    },
    {
      $project: {
        resolvedAt: 1,
        resolutionDays: {
          $divide: [{ $subtract: ['$resolvedAt', '$createdAt'] }, 1000 * 60 * 60 * 24],
        },
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
        average: { $avg: '$resolutionDays' },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  const trendMap = new Map(
    rows.map((row) => [new Date(row._id).toISOString(), Number(row.average.toFixed(1))])
  );

  const trend = [];
  for (let i = 0; i < 8; i += 1) {
    const weekStart = new Date(firstWeekStart);
    weekStart.setUTCDate(firstWeekStart.getUTCDate() + i * 7);
    const key = weekStart.toISOString();

    trend.push({
      label: formatWeekLabel(weekStart),
      average: trendMap.get(key) || 0,
    });
  }

  return trend;
};

// All routes require authentication
router.use(authenticateToken);

// Office handler management
router.get('/handlers', adminOfficeGuard, getOfficeHandlers);
router.put('/handlers/:userId/verify', adminOfficeGuard, verifyOfficeHandler);
router.put('/handlers/:userId', adminOfficeGuard, updateOfficeHandler);
router.post('/handlers/:userId/reject', adminOfficeGuard, rejectOfficeHandler);
router.delete('/handlers/:userId', adminOfficeGuard, deleteOfficeHandler);

router.get('/grievances/assigned', checkRole('office_handler', 'admin', 'superadmin'), async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status = '',
      search = '',
    } = req.query;

    const query = req.user.role === 'office_handler' ? { assignedTo: req.user._id } : {};

    if (status) {
      query.status = status;
    }

    if (search) {
      query.$or = [
        { referenceNumber: { $regex: search, $options: 'i' } },
        { subject: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { complainantName: { $regex: search, $options: 'i' } },
        { complainantEmail: { $regex: search, $options: 'i' } },
      ];
    }

    const parsedPage = Math.max(1, parseInt(page, 10));
    const parsedLimit = Math.max(1, Math.min(100, parseInt(limit, 10)));
    const skip = (parsedPage - 1) * parsedLimit;

    const [grievances, total] = await Promise.all([
      Grievance.find(query)
        .populate('complainantId', 'name email complainantType')
        .populate('assignedTo', 'name email office')
        .populate('rootCauseAnalysis.completedBy', 'name email office')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parsedLimit),
      Grievance.countDocuments(query),
    ]);

    // Sanitize anonymous grievances - remove personal details
    const sanitizedGrievances = grievances.map(g => {
      const grievanceObj = g.toObject ? g.toObject() : g;
      if (grievanceObj.isAnonymous) {
        grievanceObj.complainantEmail = null;
        grievanceObj.complainantType = null;
        grievanceObj.complainantName = 'Anonymous';
        if (grievanceObj.complainantId) {
          grievanceObj.complainantId.email = null;
        }
      }
      return grievanceObj;
    });

    return res.status(200).json({
      success: true,
      data: sanitizedGrievances,
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
    console.error('Get assigned grievances error:', error);
    return res.status(500).json({ success: false, message: 'Error fetching assigned grievances' });
  }
});

router.get('/grievances/stats', checkRole('office_handler', 'admin', 'superadmin'), async (req, res) => {
  try {
    const match = buildOfficeMatch(req.user);
    const [total, pending, inProgress, resolved, escalated] = await Promise.all([
      Grievance.countDocuments(match),
      Grievance.countDocuments({ ...match, status: { $in: ['pending', 'under_review'] } }),
      Grievance.countDocuments({ ...match, status: 'in_progress' }),
      Grievance.countDocuments({ ...match, status: 'resolved' }),
      Grievance.countDocuments({ ...match, status: 'escalated' }),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        total,
        pending,
        inProgress,
        resolved,
        escalated,
      },
    });
  } catch (error) {
    console.error('Get office grievance stats error:', error);
    return res.status(500).json({ success: false, message: 'Error fetching grievance statistics' });
  }
});

router.get('/grievances/dashboard', checkRole('office_handler', 'admin', 'superadmin'), async (req, res) => {
  try {
    const match = buildOfficeMatch(req.user);
    const now = new Date();
    const todayStart = startOfUtcDay(now);
    const weekStart = startOfUtcWeek(now);

    const [
      total,
      pending,
      inProgress,
      escalated,
      resolvedToday,
      resolvedThisWeek,
      resolvedTotal,
      avgResolutionDays,
      recentGrievances,
    ] = await Promise.all([
      Grievance.countDocuments(match),
      Grievance.countDocuments({ ...match, status: { $in: ['pending', 'under_review'] } }),
      Grievance.countDocuments({ ...match, status: 'in_progress' }),
      Grievance.countDocuments({ ...match, status: 'escalated' }),
      Grievance.countDocuments({ ...match, status: 'resolved', resolvedAt: { $gte: todayStart } }),
      Grievance.countDocuments({ ...match, status: 'resolved', resolvedAt: { $gte: weekStart } }),
      Grievance.countDocuments({ ...match, status: 'resolved' }),
      getAverageResolutionTimeDays(match),
      Grievance.find(match)
        .select('referenceNumber subject status priority createdAt updatedAt')
        .sort({ updatedAt: -1, createdAt: -1 })
        .limit(5)
        .lean(),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        summary: {
          total,
          pending,
          inProgress,
          escalated,
          resolvedToday,
          resolvedThisWeek,
          resolvedTotal,
          avgResolutionDays,
        },
        recentGrievances: recentGrievances.map((item) => ({
          id: item._id,
          referenceNumber: item.referenceNumber,
          subject: item.subject,
          status: item.status,
          priority: item.priority,
          updatedAt: item.updatedAt,
          createdAt: item.createdAt,
          relativeTime: formatRelativeTime(item.updatedAt || item.createdAt),
        })),
      },
    });
  } catch (error) {
    console.error('Get office dashboard error:', error);
    return res.status(500).json({ success: false, message: 'Error fetching office dashboard data' });
  }
});

router.get('/grievances/analytics', checkRole('office_handler', 'admin', 'superadmin'), async (req, res) => {
  try {
    const match = buildOfficeMatch(req.user);
    const [totalCases, pending, inProgress, resolved, escalated, avgResolutionDays, monthlyTrend] = await Promise.all([
      Grievance.countDocuments(match),
      Grievance.countDocuments({ ...match, status: { $in: ['pending', 'under_review'] } }),
      Grievance.countDocuments({ ...match, status: 'in_progress' }),
      Grievance.countDocuments({ ...match, status: 'resolved' }),
      Grievance.countDocuments({ ...match, status: 'escalated' }),
      getAverageResolutionTimeDays(match),
      buildMonthlyTrend(match),
    ]);

    const resolutionRate = totalCases > 0 ? Number(((resolved / totalCases) * 100).toFixed(1)) : 0;

    return res.status(200).json({
      success: true,
      data: {
        summary: {
          totalCases,
          pending,
          inProgress,
          resolved,
          escalated,
          avgResolutionDays,
          resolutionRate,
        },
        monthlyTrend,
      },
    });
  } catch (error) {
    console.error('Get office analytics error:', error);
    return res.status(500).json({ success: false, message: 'Error fetching office analytics data' });
  }
});

router.get('/grievances/resolution-stats', checkRole('office_handler', 'admin', 'superadmin'), async (req, res) => {
  try {
    const match = buildOfficeMatch(req.user);
    const resolvedRows = await Grievance.aggregate([
      {
        $match: {
          ...match,
          status: 'resolved',
          resolvedAt: { $ne: null },
        },
      },
      {
        $project: {
          category: { $ifNull: ['$category', 'Uncategorized'] },
          resolutionDays: {
            $divide: [{ $subtract: ['$resolvedAt', '$createdAt'] }, 1000 * 60 * 60 * 24],
          },
        },
      },
      { $sort: { resolutionDays: 1 } },
    ]);

    const categoryRows = await Grievance.aggregate([
      {
        $match: {
          ...match,
          status: 'resolved',
          resolvedAt: { $ne: null },
        },
      },
      {
        $project: {
          category: { $ifNull: ['$category', 'Uncategorized'] },
          resolutionDays: {
            $divide: [{ $subtract: ['$resolvedAt', '$createdAt'] }, 1000 * 60 * 60 * 24],
          },
        },
      },
      {
        $group: {
          _id: '$category',
          resolved: { $sum: 1 },
          avgTime: { $avg: '$resolutionDays' },
        },
      },
      { $sort: { resolved: -1, avgTime: 1 } },
      { $limit: 6 },
    ]);

    const weeklyTrend = await buildResolutionTrend(match);
    const totalResolved = resolvedRows.length;
    const values = resolvedRows.map((row) => row.resolutionDays);
    const avgResolutionTime = totalResolved
      ? Number((values.reduce((sum, value) => sum + value, 0) / totalResolved).toFixed(1))
      : 0;
    const medianTime = totalResolved
      ? Number(
          (
            totalResolved % 2 === 0
              ? (values[(totalResolved / 2) - 1] + values[totalResolved / 2]) / 2
              : values[Math.floor(totalResolved / 2)]
          ).toFixed(1)
        )
      : 0;
    const minTime = totalResolved ? Number(values[0].toFixed(1)) : 0;
    const maxTime = totalResolved ? Number(values[totalResolved - 1].toFixed(1)) : 0;
    const withinSLA = values.filter((value) => value <= 3).length;
    const slaCompliance = totalResolved ? Number(((withinSLA / totalResolved) * 100).toFixed(1)) : 0;

    return res.status(200).json({
      success: true,
      data: {
        summary: {
          avgResolutionTime,
          medianTime,
          maxTime,
          minTime,
          totalResolved,
          withinSLA,
          slaCompliance,
        },
        weeklyTrend,
        categoryBreakdown: categoryRows.map((item) => ({
          category: item._id || 'Uncategorized',
          avgTime: Number(item.avgTime.toFixed(1)),
          resolved: item.resolved,
        })),
      },
    });
  } catch (error) {
    console.error('Get office resolution stats error:', error);
    return res.status(500).json({ success: false, message: 'Error fetching office resolution statistics' });
  }
});

router.put('/grievances/:id/status', checkRole('office_handler', 'admin', 'superadmin'), async (req, res) => {
  try {
    const { status, resolutionNotes = '' } = req.body;
    const allowedStatus = ['under_review', 'in_progress', 'resolved', 'rejected', 'escalated'];

    if (!allowedStatus.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status value' });
    }

    const query = { _id: req.params.id };
    if (req.user.role === 'office_handler') {
      query.assignedTo = req.user._id;
    }

    const update = {
      status,
      resolutionNotes: String(resolutionNotes || '').trim(),
      lastUpdatedBy: req.user._id,
    };

    if (status === 'resolved') {
      update.resolvedAt = new Date();
    }

    const existingGrievance = await Grievance.findOne(query).select('complainantId referenceNumber status');
    if (!existingGrievance) {
      return res.status(404).json({ success: false, message: 'Assigned grievance not found' });
    }

    const grievance = await Grievance.findOneAndUpdate(query, update, { new: true })
      .populate('complainantId', 'name email')
      .populate('assignedTo', 'name email office');

    if (!grievance) {
      return res.status(404).json({ success: false, message: 'Assigned grievance not found' });
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
      message: 'Grievance updated successfully',
      data: grievance,
    });
  } catch (error) {
    console.error('Update assigned grievance error:', error);
    return res.status(500).json({ success: false, message: 'Error updating grievance' });
  }
});

// Root Cause Analysis endpoints
router.post('/grievances/:id/rca', checkRole('office_handler', 'admin', 'superadmin'), async (req, res) => {
  try {
    const {
      problemSummary,
      rootCauseCategory,
      rootCauseDescription,
      actionTaken,
      preventiveAction,
      rcaStatus,
    } = req.body;

    // Validate required fields
    if (!problemSummary || !rootCauseCategory || !rootCauseDescription || !actionTaken || !preventiveAction) {
      return res.status(400).json({
        success: false,
        message: 'All RCA fields are required: problemSummary, rootCauseCategory, rootCauseDescription, actionTaken, preventiveAction',
      });
    }

    const query = { _id: req.params.id };
    if (req.user.role === 'office_handler') {
      query.assignedTo = req.user._id;
    }

    const grievance = await Grievance.findOne(query);
    if (!grievance) {
      return res.status(404).json({ success: false, message: 'Grievance not found' });
    }

    // Initialize rootCauseAnalysis if it doesn't exist
    if (!grievance.rootCauseAnalysis) {
      grievance.rootCauseAnalysis = {};
    }

    // Update RCA fields
    grievance.rootCauseAnalysis.problemSummary = String(problemSummary || '').trim();
    grievance.rootCauseAnalysis.rootCauseCategory = rootCauseCategory;
    grievance.rootCauseAnalysis.rootCauseDescription = String(rootCauseDescription || '').trim();
    grievance.rootCauseAnalysis.actionTaken = String(actionTaken || '').trim();
    grievance.rootCauseAnalysis.preventiveAction = String(preventiveAction || '').trim();
    grievance.rootCauseAnalysis.rcaStatus =
      rcaStatus === 'escalated'
        ? 'escalated'
        : grievance.rootCauseAnalysis.rcaStatus || 'in_progress';
    grievance.rootCauseAnalysis.responsibleOffice =
      grievance.rootCauseAnalysis.responsibleOffice || req.user.office || grievance.office;

    await grievance.save();
    await grievance.populate('complainantId', 'name email');
    await grievance.populate('assignedTo', 'name email office');
    await grievance.populate('rootCauseAnalysis.completedBy', 'name email office');

    return res.status(200).json({
      success: true,
      message: 'Root Cause Analysis saved successfully',
      data: grievance,
    });
  } catch (error) {
    console.error('Save RCA error:', error);
    return res.status(500).json({ success: false, message: 'Error saving RCA' });
  }
});

router.put('/grievances/:id/rca/resolve', checkRole('office_handler', 'admin', 'superadmin'), async (req, res) => {
  try {
    const query = { _id: req.params.id };
    if (req.user.role === 'office_handler') {
      query.assignedTo = req.user._id;
    }

    const grievance = await Grievance.findOne(query);
    if (!grievance) {
      return res.status(404).json({ success: false, message: 'Grievance not found' });
    }

    // Initialize rootCauseAnalysis if it doesn't exist
    if (!grievance.rootCauseAnalysis) {
      grievance.rootCauseAnalysis = {};
    }

    // Mark RCA as resolved
    const resolutionTimestamp = new Date();
    grievance.rootCauseAnalysis.rcaStatus = 'resolved';
    grievance.rootCauseAnalysis.completedBy = req.user._id;
    grievance.rootCauseAnalysis.completedAt = resolutionTimestamp;
    grievance.rootCauseAnalysis.resolutionDate = resolutionTimestamp;
    grievance.rootCauseAnalysis.responsibleOffice = req.user.office || grievance.office;

    // Update grievance status to resolved
    grievance.status = 'resolved';
    grievance.resolvedAt = resolutionTimestamp;
    grievance.lastUpdatedBy = req.user._id;

    const existingGrievance = await Grievance.findOne(query).select('complainantId referenceNumber');
    await grievance.save();

    // Populate for response
    await grievance.populate('complainantId', 'name email');
    await grievance.populate('assignedTo', 'name email office');
    await grievance.populate('rootCauseAnalysis.completedBy', 'name email office');

    // Notify complainant of resolution
    if (grievance.complainantId && grievance.complainantId.email) {
      try {
        await notifyComplainantGrievanceStatusUpdated({
          grievance,
          actor: req.user,
          previousStatus: 'in_progress',
          status: 'resolved',
          resolutionNotes: `Root Cause Analysis completed by ${req.user.name}`,
        });
      } catch (notifyError) {
        console.error('Error sending resolution notification:', notifyError);
        // Don't fail the request if notification fails
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Root Cause Analysis resolved successfully',
      data: grievance,
    });
  } catch (error) {
    console.error('Resolve RCA error:', error);
    return res.status(500).json({ success: false, message: 'Error resolving RCA' });
  }
});

// Office category management
router.get('/categories', adminOfficeGuard, getOfficeCategories);
router.post('/categories', adminOfficeGuard, createOfficeCategory);
router.put('/categories/:categoryId', adminOfficeGuard, updateOfficeCategory);
router.delete('/categories/:categoryId', adminOfficeGuard, deleteOfficeCategory);

module.exports = router;
