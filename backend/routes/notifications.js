const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const { authenticateToken } = require('../middleware/auth');
const { updateLiveCounts } = require('../utils/socketEvents');

// GET: Fetch notifications for the authenticated user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const notifications = await Notification.find({ recipient: req.user._id })
      .populate('relatedUser', 'name email role profilePicture')
      .populate('relatedGrievance', 'referenceNumber subject status')
      .sort({ createdAt: -1 })
      .limit(50);

    const unreadCount = await Notification.countDocuments({
      recipient: req.user._id,
      read: false,
    });

    return res.json({ success: true, notifications, unreadCount });
  } catch (error) {
    console.error('Get notifications error:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PUT: Mark a single notification as read
router.put('/:id/read', authenticateToken, async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, recipient: req.user._id },
      { read: true },
      { new: true }
    );
    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }

    // Emit real-time update
    const io = req.app.locals.io;
    const unreadCount = await Notification.countDocuments({
      recipient: req.user._id,
      read: false,
    });
    updateLiveCounts(io, req.user._id.toString(), { unreadNotifications: unreadCount });

    return res.json({ success: true, notification });
  } catch (error) {
    console.error('Mark read error:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PUT: Mark all notifications as read
router.put('/read-all', authenticateToken, async (req, res) => {
  try {
    await Notification.updateMany(
      { recipient: req.user._id, read: false },
      { read: true }
    );

    // Emit real-time update
    const io = req.app.locals.io;
    updateLiveCounts(io, req.user._id.toString(), { unreadNotifications: 0 });

    return res.json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Mark all read error:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
