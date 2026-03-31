const Notification = require('../models/Notification');

const formatStatus = (status) =>
  String(status || '')
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

const buildStatusMessage = (grievance, actorName, status, resolutionNotes) => {
  const reference = grievance.referenceNumber || 'your grievance';
  const actorText = actorName ? ` by ${actorName}` : '';
  const noteText = resolutionNotes ? ` Notes: ${resolutionNotes}` : '';
  return `Your grievance ${reference} was updated to ${formatStatus(status)}${actorText}.${noteText}`.trim();
};

const createNotification = async ({
  recipient,
  type,
  title,
  message,
  relatedUser = null,
  relatedGrievance = null,
}) => {
  if (!recipient || !type || !title || !message) {
    return null;
  }

  return Notification.create({
    recipient,
    type,
    title,
    message,
    relatedUser,
    relatedGrievance,
  });
};

const notifyComplainantGrievanceSubmitted = async ({ grievance, actor }) => {
  if (!grievance?.complainantId) {
    return null;
  }

  return createNotification({
    recipient: grievance.complainantId,
    type: 'grievance_submitted',
    title: 'Grievance Submitted',
    message: `Your grievance ${grievance.referenceNumber} has been submitted successfully and is awaiting review.`,
    relatedUser: actor?._id || null,
    relatedGrievance: grievance._id,
  });
};

const notifyComplainantGrievanceAssigned = async ({ grievance, actor, assignee }) => {
  if (!grievance?.complainantId) {
    return null;
  }

  const assigneeText = assignee?.name
    ? ` and assigned to ${assignee.name}`
    : grievance.assignedTo?.name
      ? ` and assigned to ${grievance.assignedTo.name}`
      : '';

  return createNotification({
    recipient: grievance.complainantId,
    type: 'grievance_assigned',
    title: 'Grievance Assigned',
    message: `Your grievance ${grievance.referenceNumber} is now being handled${assigneeText}.`,
    relatedUser: actor?._id || assignee?._id || null,
    relatedGrievance: grievance._id,
  });
};

const notifyComplainantGrievanceStatusUpdated = async ({
  grievance,
  actor,
  previousStatus,
  status,
  resolutionNotes = '',
}) => {
  if (!grievance?.complainantId || !status || previousStatus === status) {
    return null;
  }

  return createNotification({
    recipient: grievance.complainantId,
    type: 'grievance_status_updated',
    title: 'Grievance Status Updated',
    message: buildStatusMessage(grievance, actor?.name, status, resolutionNotes),
    relatedUser: actor?._id || null,
    relatedGrievance: grievance._id,
  });
};

const notifyComplainantGrievanceArchived = async ({
  grievance,
  actor,
  reason = '',
  archiveType = 'deleted',
}) => {
  if (!grievance?.complainantId) {
    return null;
  }

  const reasonText = reason ? ` Reason: ${reason}` : '';
  const actionText = archiveType === 'rejected' ? 'rejected and archived' : 'archived';

  return createNotification({
    recipient: grievance.complainantId,
    type: 'grievance_archived',
    title: 'Grievance Archived',
    message: `Your grievance ${grievance.referenceNumber} was ${actionText} by ${actor?.name || 'an administrator'}.${reasonText}`.trim(),
    relatedUser: actor?._id || null,
    relatedGrievance: grievance._id,
  });
};

const notifyOfficeHandlerVerified = async ({ user, actor }) => {
  if (!user?._id) {
    return null;
  }

  return createNotification({
    recipient: user._id,
    type: 'office_handler_verified',
    title: 'Account Verified',
    message: 'Your office staff account has been verified. You can now manage assigned grievances.',
    relatedUser: actor?._id || null,
  });
};

const notifyOfficeHandlerAssignment = async ({ grievance, assignee, actor }) => {
  if (!assignee?._id || !grievance?._id) {
    return null;
  }

  return createNotification({
    recipient: assignee._id,
    type: 'office_handler_assignment',
    title: 'New Grievance Assigned',
    message: `A new grievance ${grievance.referenceNumber} has been assigned to you for handling.`,
    relatedUser: actor?._id || null,
    relatedGrievance: grievance._id,
  });
};

const notifyOfficeHandlerOfficeUpdated = async ({ user, actor, previousOffice, nextOffice }) => {
  if (!user?._id || previousOffice === nextOffice) {
    return null;
  }

  return createNotification({
    recipient: user._id,
    type: 'office_handler_office_updated',
    title: 'Office Assignment Updated',
    message: `Your office assignment was updated from ${previousOffice || 'Unassigned'} to ${nextOffice || 'Unassigned'}.`,
    relatedUser: actor?._id || null,
  });
};

module.exports = {
  formatStatus,
  notifyComplainantGrievanceAssigned,
  notifyComplainantGrievanceArchived,
  notifyComplainantGrievanceStatusUpdated,
  notifyComplainantGrievanceSubmitted,
  notifyOfficeHandlerAssignment,
  notifyOfficeHandlerOfficeUpdated,
  notifyOfficeHandlerVerified,
};
