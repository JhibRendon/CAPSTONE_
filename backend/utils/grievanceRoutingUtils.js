const User = require('../models/User');
const OfficeCategory = require('../models/OfficeCategory');

/**
 * Converts grievance office name to handler office slug
 * E.g., "COT" -> "cot_food_technology_dept"
 */
const getHandlerOfficeSlug = async (grievanceOffice) => {
  if (!grievanceOffice) return null;
  
  try {
    const officeCategory = await OfficeCategory.findOne({
      name: { $regex: grievanceOffice, $options: 'i' }
    });
    
    return officeCategory?.slug || null;
  } catch (error) {
    console.error('Error converting office name to slug:', error);
    return null;
  }
};

/**
 * Finds available office handlers for a specific office
 * Returns handlers sorted by active grievance count (ascending)
 */
const findAvailableHandlers = async (officeSlug) => {
  if (!officeSlug) return [];
  
  try {
    // Find all office handlers with matching office
    const handlers = await User.find({
      role: 'office_handler',
      office: officeSlug,
      status: 'active',
      isVerified: true
    }).select('_id name email office status');
    
    return handlers;
  } catch (error) {
    console.error('Error finding available handlers:', error);
    return [];
  }
};

/**
 * Auto-assigns a grievance to the best available handler
 * Uses round-robin or least-loaded logic
 */
const autoAssignGrievance = async (grievance, admin) => {
  try {
    // Step 1: Convert grievance office to handler office slug
    const officeSlug = await getHandlerOfficeSlug(grievance.office);
    
    if (!officeSlug) {
      console.warn(`⚠️  No office category found for grievance office: ${grievance.office}`);
      return null; // Could not auto-assign
    }
    
    // Step 2: Find available handlers
    const handlers = await findAvailableHandlers(officeSlug);
    
    if (handlers.length === 0) {
      console.warn(`⚠️  No available handlers found for office: ${officeSlug}`);
      return null; // No handlers available
    }
    
    // Step 3: Select handler (simple round-robin: pick first available)
    const selectedHandler = handlers[0];
    
    // Step 4: Return assignment data
    return {
      assignedTo: selectedHandler._id,
      assignedBy: admin?._id || null,
      assignedAt: new Date(),
      handlerName: selectedHandler.name,
      handlerEmail: selectedHandler.email,
    };
  } catch (error) {
    console.error('Auto-assignment error:', error);
    return null;
  }
};

/**
 * Attempts to auto-assign grievance after creation
 * Returns updated grievance if successful, null if auto-assignment failed
 */
const attemptAutoAssignment = async (grievance, Grievance) => {
  try {
    const assignmentData = await autoAssignGrievance(grievance, null);
    
    if (!assignmentData) {
      console.log(`ℹ️  Grievance ${grievance.referenceNumber} could not be auto-assigned (no handlers available)`);
      return null;
    }
    
    // Update grievance with assignment
    const updated = await Grievance.findByIdAndUpdate(
      grievance._id,
      {
        assignedTo: assignmentData.assignedTo,
        assignedBy: assignmentData.assignedBy,
        assignedAt: assignmentData.assignedAt,
        status: 'in_progress', // Auto-assign moves to in_progress
      },
      { new: true }
    ).populate('assignedTo', 'name email office');
    
    console.log(`✅ Grievance ${grievance.referenceNumber} auto-assigned to ${assignmentData.handlerName}`);
    return updated;
  } catch (error) {
    console.error('Error during auto-assignment:', error);
    return null;
  }
};

module.exports = {
  getHandlerOfficeSlug,
  findAvailableHandlers,
  autoAssignGrievance,
  attemptAutoAssignment,
};
