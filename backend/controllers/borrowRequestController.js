const BorrowRequest = require('../models/BorrowRequest');
const Equipment = require('../models/Equipment');
const User = require('../models/User');
const { uploadToGridFS, getFileMetadata, downloadFromGridFS } = require('../config/gridfs');
const { logAuditEvent } = require('../utils/auditLogger');
const {
  notifyStudentBorrowStatus,
  notifyRoleRefresh,
  notifyUserRefresh
} = require('../utils/realtimeNotification');

let stockReconcilePromise = null;
let lastStockReconcileAt = 0;
const STOCK_RECONCILE_INTERVAL_MS = 60 * 1000;

const reconcileLegacyStockReservations = async () => {
  const now = Date.now();
  if (now - lastStockReconcileAt < STOCK_RECONCILE_INTERVAL_MS) {
    return;
  }

  if (stockReconcilePromise) {
    await stockReconcilePromise;
    return;
  }

  stockReconcilePromise = (async () => {
    try {
      const requests = await BorrowRequest.find({
        status: { $in: ['pending_head', 'head_approved', 'ready_pickup', 'borrowed', 'returned', 'rejected'] }
      }).select('_id equipment quantity status stock_reserved released_at');

      for (const request of requests) {
        if (['pending_head', 'head_approved', 'ready_pickup'].includes(request.status) && !request.stock_reserved) {
          const reserved = await Equipment.findOneAndUpdate(
            {
              _id: request.equipment,
              available: { $gte: request.quantity }
            },
            {
              $inc: { available: -request.quantity }
            },
            { new: true }
          );

          if (reserved) {
            request.stock_reserved = true;
            await request.save();
          }

          continue;
        }

        if (request.status === 'borrowed' && !request.stock_reserved) {
          if (request.released_at) {
            request.stock_reserved = true;
            await request.save();
            continue;
          }

          const reserved = await Equipment.findOneAndUpdate(
            {
              _id: request.equipment,
              available: { $gte: request.quantity }
            },
            {
              $inc: { available: -request.quantity }
            },
            { new: true }
          );

          if (reserved) {
            request.stock_reserved = true;
            await request.save();
          }

          continue;
        }

        if (request.status === 'rejected' && request.stock_reserved) {
          await Equipment.findByIdAndUpdate(request.equipment, {
            $inc: { available: request.quantity }
          });
          request.stock_reserved = false;
          await request.save();
          continue;
        }

        if (request.status === 'returned' && request.stock_reserved) {
          await Equipment.findByIdAndUpdate(request.equipment, {
            $inc: { available: request.quantity }
          });
          request.stock_reserved = false;
          await request.save();
        }
      }
    } finally {
      lastStockReconcileAt = Date.now();
      stockReconcilePromise = null;
    }
  })();

  await stockReconcilePromise;
};

// @desc    Get all borrow requests
// @route   GET /api/borrow-requests
// @access  Private
exports.getBorrowRequests = async (req, res, next) => {
  try {
    await reconcileLegacyStockReservations();

    const { status, student_email, lecturer_email, equipment_id, history } = req.query;

    // Build query
    const query = {};
    
    // Role-based filtering
    if (req.user.role === 'student') {
      query.student = req.user.id;
    } else if (req.user.role === 'lecturer') {
      // Match by ObjectId (normal) OR by stored email (fallback if account was recreated)
      query.$or = [
        { lecturer: req.user.id },
        { lecturer_email: req.user.email }
      ];
      // history=true means fetch all statuses (approval history page)
      // otherwise default to pending_lecturer (pending approvals page)
      if (!status && !history) query.status = 'pending_lecturer';
    }
    
    // Additional filters
    if (status && req.user.role !== 'student') query.status = status;
    if (student_email) query.student_email = student_email;
    if (equipment_id) query.equipment = equipment_id;

    const requests = await BorrowRequest.find(query)
      .populate('student', 'name email')
      .populate('equipment', 'name category')
      .populate('lecturer', 'name email')
      .sort('-createdAt');

    res.json({
      success: true,
      count: requests.length,
      data: requests
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single borrow request
// @route   GET /api/borrow-requests/:id
// @access  Private
exports.getBorrowRequest = async (req, res, next) => {
  try {
    const request = await BorrowRequest.findById(req.params.id)
      .populate('student', 'name email studentId')
      .populate('equipment', 'name category location')
      .populate('lecturer', 'name email')
      .populate('head_of_lab', 'name email')
      .populate('prepared_by', 'name email')
      .populate('released_by', 'name email')
      .populate('returned_to', 'name email');

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Borrow request not found'
      });
    }

    // Check access rights
    if (req.user.role === 'student' && String(request.student._id) !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this request'
      });
    }

    res.json({
      success: true,
      data: request
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create borrow request
// @route   POST /api/borrow-requests
// @access  Private (Student)
exports.createBorrowRequest = async (req, res, next) => {
  try {
    const {
      equipment,
      quantity,
      purpose,
      objective,
      borrow_date,
      return_date,
      lecturer_id,
      lecturer_email,
      agree_policy
    } = req.body;

    const borrowDate = new Date(borrow_date);
    const returnDate = new Date(return_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (Number.isNaN(borrowDate.getTime()) || Number.isNaN(returnDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Valid borrow and return dates are required'
      });
    }

    const normalizedBorrowDate = new Date(borrowDate);
    const normalizedReturnDate = new Date(returnDate);
    normalizedBorrowDate.setHours(0, 0, 0, 0);
    normalizedReturnDate.setHours(0, 0, 0, 0);

    if (normalizedBorrowDate < today) {
      return res.status(400).json({
        success: false,
        message: 'Borrow date cannot be in the past'
      });
    }

    if (normalizedReturnDate <= normalizedBorrowDate) {
      return res.status(400).json({
        success: false,
        message: 'Return date must be after borrow date'
      });
    }

    const blockingStatuses = ['pending', 'pending_lecturer', 'pending_head', 'head_approved', 'ready_pickup', 'borrowed'];
    const existingActiveRequest = await BorrowRequest.findOne({
      student: req.user.id,
      equipment,
      status: { $in: blockingStatuses }
    }).select('_id status createdAt');

    if (existingActiveRequest) {
      return res.status(409).json({
        success: false,
        message: 'You already have an active request for this equipment. Please wait for the current request to be completed or rejected.'
      });
    }

    if (agree_policy !== true) {
      return res.status(400).json({
        success: false,
        message: 'You must agree to the replacement policy before submitting a request'
      });
    }

    // Check if equipment exists and has enough quantity
    const equipmentItem = await Equipment.findById(equipment);
    if (!equipmentItem) {
      return res.status(404).json({
        success: false,
        message: 'Equipment not found'
      });
    }

    if (equipmentItem.available < quantity) {
      return res.status(400).json({
        success: false,
        message: 'Not enough equipment available'
      });
    }

    // Determine workflow: new simplified flow (no lecturer) or legacy multi-step flow
    const useLegacyFlow = !!(lecturer_id || lecturer_email);

    let lecturer = null;
    if (useLegacyFlow) {
      if (!lecturer_id && !lecturer_email) {
        return res.status(400).json({
          success: false,
          message: 'Please select a lecturer for approval'
        });
      }

      if (lecturer_id) {
        lecturer = await User.findOne({ _id: lecturer_id, role: 'lecturer', status: 'active' });
      } else if (lecturer_email) {
        lecturer = await User.findOne({ email: lecturer_email, role: 'lecturer', status: 'active' });
      }

      if (!lecturer) {
        return res.status(400).json({
          success: false,
          message: 'Selected lecturer could not be found'
        });
      }
    }

    // Resolve serial number from equipment document if not supplied
    const resolvedSerialNumber = req.body.serial_number || equipmentItem.serialNumber || '';

    // Notify role based on workflow
    const notifyRole = useLegacyFlow ? 'lecturer' : 'lab_assistant';

    // Create request
    const request = await BorrowRequest.create({
      student: req.user.id,
      student_email: req.user.email,
      borrower_name: req.user.name,
      student_id: req.user.studentId || '',
      equipment,
      equipment_name: equipmentItem.name,
      serial_number: resolvedSerialNumber,
      quantity,
      purpose: purpose || objective || '',
      objective: objective || purpose || '',
      borrow_date,
      return_date,
      agreed_replacement_policy: true,
      agreed_replacement_policy_at: Date.now(),
      ...(useLegacyFlow
        ? { lecturer: lecturer._id, lecturer_email: lecturer.email, status: 'pending_lecturer' }
        : { status: 'pending' })
    });

    // Populate before returning
    await request.populate('equipment', 'name category');

    // Notify dashboards that a new request is waiting.
    notifyRoleRefresh(notifyRole, {
      type: 'borrow_request_created',
      requestId: String(request._id)
    });

    res.status(201).json({
      success: true,
      data: request
    });

    await logAuditEvent({
      req,
      userId: req.user.id,
      userEmail: req.user.email,
      actionType: 'borrow_created',
      entityType: 'borrow_request',
      entityId: request._id,
      status: 'success',
      details: {
        equipment: request.equipment_name,
        quantity: request.quantity
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Lecturer approve/reject request
// @route   PUT /api/borrow-requests/:id/lecturer-action
// @access  Private (Lecturer)
exports.lecturerAction = async (req, res, next) => {
  try {
    const { action, remarks } = req.body; // action: 'approve' or 'reject'
    const normalizedRemarks = String(remarks || '').trim();

    const request = await BorrowRequest.findById(req.params.id);

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Request not found'
      });
    }

    if (request.status !== 'pending_lecturer') {
      return res.status(400).json({
        success: false,
        message: 'Request is not pending lecturer approval'
      });
    }

    const assignedById = request.lecturer && request.lecturer.toString() === req.user.id;
    const assignedByEmail = request.lecturer_email && request.lecturer_email === req.user.email;
    if (!assignedById && !assignedByEmail) {
      return res.status(403).json({
        success: false,
        message: 'Only the assigned lecturer can approve or reject this request'
      });
    }

    if (action === 'approve') {
      const updatedEquipment = await Equipment.findOneAndUpdate(
        {
          _id: request.equipment,
          available: { $gte: request.quantity }
        },
        {
          $inc: { available: -request.quantity }
        },
        {
          new: true
        }
      );

      if (!updatedEquipment) {
        return res.status(400).json({
          success: false,
          message: 'Equipment no longer available in requested quantity'
        });
      }

      request.status = 'pending_head';
      request.lecturer = req.user.id;
      request.lecturer_approved_at = Date.now();
      request.lecturer_remarks = normalizedRemarks;
      request.stock_reserved = true;
    } else if (action === 'reject') {
      request.status = 'rejected';
      request.rejected_by = req.user.id;
      request.rejected_at = Date.now();
      request.rejection_reason = normalizedRemarks;
    }

    await request.save();

    await notifyStudentBorrowStatus(request);
    notifyUserRefresh(String(request.student), {
      type: 'borrow_request_status_changed',
      requestId: String(request._id),
      status: request.status
    });

    if (action === 'approve') {
      notifyRoleRefresh('head_of_lab', {
        type: 'borrow_request_status_changed',
        requestId: String(request._id),
        status: request.status
      });
    }

    res.json({
      success: true,
      data: request
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Head of lab approve/reject request
// @route   PUT /api/borrow-requests/:id/head-action
// @access  Private (Head of Lab)
exports.headAction = async (req, res, next) => {
  try {
    const { action, remarks } = req.body;
    const normalizedRemarks = String(remarks || '').trim();

    const request = await BorrowRequest.findById(req.params.id).populate('equipment');

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Request not found'
      });
    }

    if (request.status !== 'pending_head') {
      return res.status(400).json({
        success: false,
        message: 'Request is not pending head approval'
      });
    }

    if (action === 'approve') {
      // Fallback for legacy requests that were approved by lecturer
      // before stock reservation was introduced.
      if (!request.stock_reserved && request.equipment.available < request.quantity) {
        return res.status(400).json({
          success: false,
          message: 'Equipment no longer available in requested quantity'
        });
      }

      request.status = 'head_approved';
      request.head_of_lab = req.user.id;
      request.head_approved_at = Date.now();
      request.head_remarks = normalizedRemarks;
    } else if (action === 'reject') {
      if (request.stock_reserved) {
        request.equipment.available += request.quantity;
        await request.equipment.save();
        request.stock_reserved = false;
      }

      request.status = 'rejected';
      request.rejected_by = req.user.id;
      request.rejected_at = Date.now();
      request.rejection_reason = normalizedRemarks;
    }

    await request.save();

    await notifyStudentBorrowStatus(request);
    notifyUserRefresh(String(request.student), {
      type: 'borrow_request_status_changed',
      requestId: String(request._id),
      status: request.status
    });

    if (action === 'approve') {
      notifyRoleRefresh('lab_assistant', {
        type: 'borrow_request_status_changed',
        requestId: String(request._id),
        status: request.status
      });
    }

    res.json({
      success: true,
      data: request
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Mark equipment as ready for pickup
// @route   PUT /api/borrow-requests/:id/prepare
// @access  Private (Lab Assistant)
exports.prepareEquipment = async (req, res, next) => {
  try {
    const request = await BorrowRequest.findById(req.params.id).populate('equipment');

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Request not found'
      });
    }

    if (request.status !== 'head_approved') {
      return res.status(400).json({
        success: false,
        message: 'Request is not approved by head of lab'
      });
    }

    // Backward compatibility: if this request predates stock reservation,
    // reserve it at prepare time. Otherwise, skip duplicate availability checks.
    if (!request.stock_reserved) {
      const updatedEquipment = await Equipment.findOneAndUpdate(
        {
          _id: request.equipment,
          available: { $gte: request.quantity }
        },
        {
          $inc: { available: -request.quantity }
        },
        {
          new: true
        }
      );

      if (!updatedEquipment) {
        return res.status(400).json({
          success: false,
          message: 'Equipment no longer available in requested quantity'
        });
      }

      request.stock_reserved = true;
    }

    request.status = 'ready_pickup';
    request.prepared_by = req.user.id;
    request.prepared_at = Date.now();
    await request.save();

    await notifyStudentBorrowStatus(request);
    notifyUserRefresh(String(request.student), {
      type: 'borrow_request_status_changed',
      requestId: String(request._id),
      status: request.status
    });

    res.json({
      success: true,
      data: request
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Confirm equipment pickup/release
// @route   PUT /api/borrow-requests/:id/release
// @access  Private (Lab Assistant)
exports.releaseEquipment = async (req, res, next) => {
  try {
    const request = await BorrowRequest.findById(req.params.id);

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Request not found'
      });
    }

    if (request.status !== 'ready_pickup') {
      return res.status(400).json({
        success: false,
        message: 'Equipment is not ready for pickup'
      });
    }

    // Backward compatibility: if this request predates stock reservation,
    // reserve it at release time.
    if (!request.stock_reserved) {
      const updatedEquipment = await Equipment.findOneAndUpdate(
        {
          _id: request.equipment,
          available: { $gte: request.quantity }
        },
        {
          $inc: { available: -request.quantity }
        },
        {
          new: true
        }
      );

      if (!updatedEquipment) {
        return res.status(400).json({
          success: false,
          message: 'Equipment no longer available in requested quantity'
        });
      }

      request.stock_reserved = true;
    }

    request.status = 'borrowed';
    request.released_by = req.user.id;
    request.released_at = Date.now();
    await request.save();

    await notifyStudentBorrowStatus(request);
    notifyUserRefresh(String(request.student), {
      type: 'borrow_request_status_changed',
      requestId: String(request._id),
      status: request.status
    });
    notifyRoleRefresh('admin', {
      type: 'borrow_request_status_changed',
      requestId: String(request._id),
      status: request.status
    });

    await logAuditEvent({
      req,
      userId: req.user.id,
      userEmail: req.user.email,
      actionType: 'borrow_released',
      entityType: 'borrow_request',
      entityId: request._id,
      status: 'success',
      details: {
        equipment: request.equipment_name,
        quantity: request.quantity
      }
    });

    res.json({
      success: true,
      data: request
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Process equipment return
// @route   PUT /api/borrow-requests/:id/return
// @access  Private (Lab Assistant)
exports.returnEquipment = async (req, res, next) => {
  try {
    const toBoolean = (value) => {
      if (typeof value === 'boolean') return value;
      if (typeof value === 'string') {
        const normalized = value.toLowerCase();
        if (normalized === 'true') return true;
        if (normalized === 'false') return false;
      }
      return value;
    };

    const {
      return_condition,
      return_remarks,
      damage_details,
      student_will_replace,
      replacement_completed,
      returned_early
    } = req.body;

    const allowedConditions = ['Good', 'Damaged', 'Lost'];
    if (!allowedConditions.includes(return_condition)) {
      return res.status(400).json({
        success: false,
        message: 'Return condition must be Good, Damaged, or Lost'
      });
    }

    if (return_condition !== 'Good' && (!return_remarks || !return_remarks.trim())) {
      return res.status(400).json({
        success: false,
        message: 'Return remarks are required for damaged or lost items'
      });
    }

    if (return_condition === 'Damaged' && (!damage_details || !damage_details.trim())) {
      return res.status(400).json({
        success: false,
        message: 'Please specify what part is damaged'
      });
    }

    const normalizedStudentWillReplaceInput = toBoolean(student_will_replace);
    const normalizedReplacementCompletedInput = toBoolean(replacement_completed);
    const normalizedReturnedEarlyInput = toBoolean(returned_early);

    if (returned_early !== undefined && typeof normalizedReturnedEarlyInput !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'Returned early flag must be true or false'
      });
    }

    if (return_condition === 'Damaged' && typeof normalizedStudentWillReplaceInput !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'Please specify whether the borrower will replace the damaged item'
      });
    }

    const normalizedWillReplace =
      return_condition === 'Lost' ? true : Boolean(normalizedStudentWillReplaceInput);

    const mustTrackReplacement =
      return_condition === 'Lost' || (return_condition === 'Damaged' && normalizedWillReplace);

    if (mustTrackReplacement && typeof normalizedReplacementCompletedInput !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'Please specify whether replacement has been completed'
      });
    }

    const normalizedReplacementCompleted = mustTrackReplacement
      ? normalizedReplacementCompletedInput
      : false;

    const request = await BorrowRequest.findById(req.params.id).populate('equipment');

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Request not found'
      });
    }

    if (request.status !== 'borrowed') {
      return res.status(400).json({
        success: false,
        message: 'Equipment is not currently borrowed'
      });
    }

    const isLost = return_condition === 'Lost';

    // Return equipment to inventory only when item is physically returned,
    // or when a replacement has already been completed.
    const equipment = request.equipment;
    if (!isLost || normalizedReplacementCompleted) {
      equipment.available += request.quantity;
    }
    
    // Update equipment condition if returned condition is worse
    const conditionOrder = ['Excellent', 'Good', 'Fair', 'Poor', 'Damaged'];
    if (
      return_condition === 'Damaged' &&
      conditionOrder.indexOf(return_condition) > conditionOrder.indexOf(equipment.condition)
    ) {
      equipment.condition = return_condition;
    }
    
    await equipment.save();

    const processedAt = new Date();
    const dueAt = request.return_date ? new Date(request.return_date) : null;
    const isMarkedEarly = normalizedReturnedEarlyInput === true;
    const isLateReturn = dueAt ? processedAt.getTime() > dueAt.getTime() : false;
    const returnTiming = isMarkedEarly ? 'early' : (isLateReturn ? 'late' : 'on_time');

    request.status = 'returned';
    request.actual_return_date = processedAt;
    request.returned_early = returnTiming === 'early';
    request.return_timing = returnTiming;
    request.return_condition = return_condition;
    request.return_remarks = return_remarks ? return_remarks.trim() : '';
    request.damage_details = return_condition === 'Damaged' ? damage_details.trim() : '';
    if (return_condition === 'Damaged' && req.file) {
      const fileId = await uploadToGridFS(req.file.buffer, req.file.originalname, req.file.mimetype);
      request.damage_image_url = `/api/borrow-requests/damage-image/${fileId}`;
      request.damage_reported_by = req.user.id;
      request.damage_status = 'pending_verification';
      request.damage_verified_by = null;
      request.damage_verified_at = null;
      request.damage_verification_remarks = '';
    } else if (return_condition !== 'Damaged') {
      request.damage_image_url = '';
      request.damage_reported_by = null;
      request.damage_status = 'none';
      request.damage_verified_by = null;
      request.damage_verified_at = null;
      request.damage_verification_remarks = '';
    }
    request.student_will_replace = return_condition === 'Good' ? false : normalizedWillReplace;
    request.replacement_completed = normalizedReplacementCompleted;
    request.replacement_completed_at = normalizedReplacementCompleted ? Date.now() : null;
    request.stock_reserved = false;
    request.returned_to = req.user.id;
    await request.save();

    await notifyStudentBorrowStatus(request);
    notifyUserRefresh(String(request.student), {
      type: 'borrow_request_status_changed',
      requestId: String(request._id),
      status: request.status
    });
    notifyRoleRefresh('admin', {
      type: 'borrow_request_status_changed',
      requestId: String(request._id),
      status: request.status
    });

    await logAuditEvent({
      req,
      userId: req.user.id,
      userEmail: req.user.email,
      actionType: 'borrow_returned',
      entityType: 'borrow_request',
      entityId: request._id,
      status: 'success',
      details: {
        condition: return_condition,
        damage_status: request.damage_status,
        return_timing: request.return_timing
      }
    });

    res.json({
      success: true,
      data: request
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get damage image stream
// @route   GET /api/borrow-requests/damage-image/:fileId
// @access  Private
exports.getDamageImage = async (req, res, next) => {
  try {
    const metadata = await getFileMetadata(req.params.fileId);

    if (!metadata) {
      return res.status(404).json({
        success: false,
        message: 'Damage image not found'
      });
    }

    res.set('Content-Type', metadata.metadata.contentType || 'image/jpeg');
    res.set('Cache-Control', 'public, max-age=86400');

    const downloadStream = downloadFromGridFS(req.params.fileId);
    downloadStream.pipe(res);

    downloadStream.on('error', () => {
      res.status(404).json({
        success: false,
        message: 'Error retrieving damage image'
      });
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Verify or reject damage report
// @route   PUT /api/borrow-requests/:id/damage-verify
// @access  Private (Admin)
exports.verifyDamageReport = async (req, res, next) => {
  try {
    const { action, remarks = '' } = req.body;

    if (!['verify', 'reject'].includes(action)) {
      return res.status(400).json({
        success: false,
        message: 'Action must be verify or reject'
      });
    }

    const request = await BorrowRequest.findById(req.params.id);

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Request not found'
      });
    }

    if (request.return_condition !== 'Damaged') {
      return res.status(400).json({
        success: false,
        message: 'Only damaged returns can be verified'
      });
    }

    request.damage_status = action === 'verify' ? 'verified' : 'rejected';
    request.damage_verified_by = req.user.id;
    request.damage_verified_at = Date.now();
    request.damage_verification_remarks = remarks.trim();
    await request.save();

    await logAuditEvent({
      req,
      userId: req.user.id,
      userEmail: req.user.email,
      actionType: 'damage_verified',
      entityType: 'borrow_request',
      entityId: request._id,
      status: 'success',
      details: {
        result: request.damage_status
      }
    });

    res.json({
      success: true,
      data: request
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get my borrow requests (student)
// @route   GET /api/borrow-requests/my-requests
// @access  Private (Student)
exports.getMyRequests = async (req, res, next) => {
  try {
    await reconcileLegacyStockReservations();

    const requests = await BorrowRequest.find({ student: req.user.id })
      .populate('equipment', 'name category image images')
      .sort('-createdAt');

    res.json({
      success: true,
      count: requests.length,
      data: requests
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete borrow request (only if pending)
// @route   DELETE /api/borrow-requests/:id
// @access  Private (Student - own request, Admin)
exports.deleteBorrowRequest = async (req, res, next) => {
  try {
    const request = await BorrowRequest.findById(req.params.id);

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Request not found'
      });
    }

    // Only allow deletion of pending requests
    if (!['pending', 'pending_lecturer', 'pending_head'].includes(request.status)) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete approved or processed requests'
      });
    }

    // Check if user owns the request (or is admin)
    if (req.user.role !== 'admin' && request.student.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this request'
      });
    }

    if (request.stock_reserved) {
      await Equipment.findByIdAndUpdate(request.equipment, {
        $inc: { available: request.quantity }
      });
    }

    await request.deleteOne();

    res.json({
      success: true,
      message: 'Request deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// NEW SIMPLIFIED APPROVAL FLOW (Lab Assistant)
// ─────────────────────────────────────────────────────────────────────────────

const { saveBorrowRequestPdf } = require('../utils/pdfGenerator');
const path = require('path');
const fs = require('fs');

// @desc    Lab assistant approves a pending request and generates PDF
// @route   PUT /api/borrow-requests/:id/approve
// @access  Private (lab_assistant)
exports.approveBorrowRequest = async (req, res, next) => {
  try {
    const request = await BorrowRequest.findById(req.params.id)
      .populate('approved_by', 'name')
      .populate('student', 'name email studentId');

    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    if (!['pending', 'pending_lecturer', 'pending_head'].includes(request.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot approve a request with status "${request.status}"`
      });
    }

    request.status = 'approved';
    request.approved_by = req.user.id;
    request.approved_at = new Date();

    await request.save();

    // Re-populate for PDF
    await request.populate('approved_by', 'name');
    await request.populate('lecturer', 'name email');
    await request.populate('head_of_lab', 'name email');
    await request.populate('equipment', 'name category image images');

    // Generate PDF
    let pdfPath = null;
    try {
      pdfPath = await saveBorrowRequestPdf(request.toObject ? request.toObject() : request);
      request.pdf_url = pdfPath;
      await request.save();
    } catch (pdfErr) {
      console.error('PDF generation failed (non-fatal):', pdfErr.message);
    }

    // Real-time notifications
    await notifyStudentBorrowStatus(request);
    notifyRoleRefresh('lab_assistant', { type: 'request_approved', requestId: String(request._id) });

    await logAuditEvent({
      req,
      userId: req.user.id,
      userEmail: req.user.email,
      actionType: 'borrow_approved',
      entityType: 'borrow_request',
      entityId: request._id,
      status: 'success',
      details: { equipment: request.equipment_name, quantity: request.quantity }
    });

    res.json({ success: true, data: request, pdfUrl: pdfPath });
  } catch (error) {
    next(error);
  }
};

// @desc    Lab assistant rejects a pending request
// @route   PUT /api/borrow-requests/:id/reject
// @access  Private (lab_assistant)
exports.rejectBorrowRequest = async (req, res, next) => {
  try {
    const { reason } = req.body;

    const request = await BorrowRequest.findById(req.params.id);

    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    if (!['pending', 'pending_lecturer', 'pending_head'].includes(request.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot reject a request with status "${request.status}"`
      });
    }

    request.status = 'rejected';
    request.rejected_by = req.user.id;
    request.rejected_at = new Date();
    request.rejection_reason = String(reason || '').trim();

    if (request.stock_reserved) {
      await Equipment.findByIdAndUpdate(request.equipment, {
        $inc: { available: request.quantity }
      });
      request.stock_reserved = false;
    }

    await request.save();

    await notifyStudentBorrowStatus(request);
    notifyRoleRefresh('lab_assistant', { type: 'request_rejected', requestId: String(request._id) });

    await logAuditEvent({
      req,
      userId: req.user.id,
      userEmail: req.user.email,
      actionType: 'borrow_rejected',
      entityType: 'borrow_request',
      entityId: request._id,
      status: 'success',
      details: { equipment: request.equipment_name, reason: request.rejection_reason }
    });

    res.json({ success: true, data: request });
  } catch (error) {
    next(error);
  }
};

// @desc    Download generated PDF for a borrow request
// @route   GET /api/borrow-requests/:id/pdf
// @access  Private (student owner, lab_assistant, admin, lecturer, head_of_lab)
exports.downloadBorrowPdf = async (req, res, next) => {
  try {
    const request = await BorrowRequest.findById(req.params.id)
      .populate('approved_by', 'name')
      .populate('student', 'name email studentId')
      .populate('lecturer', 'name email')
      .populate('head_of_lab', 'name email')
      .populate('equipment', 'name category image images');

    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    // Authorization: must be the student, a lab assistant, admin, lecturer, or head
    const allowedRoles = ['lab_assistant', 'admin', 'lecturer', 'head_of_lab'];
    const isOwner = String(request.student?._id || request.student) === String(req.user.id);
    if (!isOwner && !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    // Always regenerate so the PDF reflects the latest approval state
    const { generateBorrowRequestPdf } = require('../utils/pdfGenerator');
    const buffer = await generateBorrowRequestPdf(request.toObject ? request.toObject() : request);

    const inline = req.query.inline === 'true';
    const borrowerName = (request.borrower_name || 'Student').replace(/[^a-zA-Z0-9_\-]/g, '_');
    const dateStr = new Date().toISOString().slice(0, 10);
    const filename = inline
      ? `borrow-request-${request._id}.pdf`
      : `BorrowRequest_${borrowerName}_${dateStr}.pdf`;
    const disposition = inline ? 'inline' : `attachment; filename="${filename}"`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', disposition);
    res.setHeader('Content-Length', buffer.length);
    res.end(buffer);
  } catch (error) {
    next(error);
  }
};

// ── EXTENSION REQUEST ─────────────────────────────────────────────────────────

// @desc    Student submits a return-date extension request
// @route   POST /api/borrow-requests/:id/extension
// @access  Private (student)
exports.requestExtension = async (req, res, next) => {
  try {
    const { requested_date, reason } = req.body;

    if (!requested_date) {
      return res.status(400).json({ success: false, message: 'requested_date is required' });
    }

    const newDate = new Date(requested_date);
    if (isNaN(newDate.getTime())) {
      return res.status(400).json({ success: false, message: 'Invalid requested_date format' });
    }

    const borrowReq = await BorrowRequest.findById(req.params.id);
    if (!borrowReq) {
      return res.status(404).json({ success: false, message: 'Borrow request not found' });
    }

    if (String(borrowReq.student) !== String(req.user.id)) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    if (borrowReq.status !== 'borrowed') {
      return res.status(400).json({ success: false, message: 'Extension can only be requested while the item is borrowed' });
    }

    if (borrowReq.extension_request && borrowReq.extension_request.status === 'pending' && borrowReq.extension_request.requested_date) {
      return res.status(409).json({ success: false, message: 'An extension request is already pending' });
    }

    if (newDate <= borrowReq.return_date) {
      return res.status(400).json({ success: false, message: 'New return date must be after the current return date' });
    }

    borrowReq.extension_request = {
      requested_date: newDate,
      reason: (reason || '').trim(),
      status: 'pending',
      requested_at: new Date(),
    };
    await borrowReq.save();

    // Notify lab assistant (for action) and admin (for awareness)
    notifyRoleRefresh('lab_assistant', { type: 'extension_requested', borrowRequestId: String(borrowReq._id) });
    notifyRoleRefresh('admin', { type: 'extension_requested', borrowRequestId: String(borrowReq._id) });

    await logAuditEvent({
      req,
      userId: req.user.id,
      userEmail: req.user.email,
      actionType: 'extension_requested',
      entityType: 'borrow_request',
      entityId: borrowReq._id,
      status: 'success',
      details: { equipment: borrowReq.equipment_name, requested_date: newDate },
    });

    res.json({ success: true, data: borrowReq });
  } catch (err) {
    next(err);
  }
};

// @desc    Lab assistant approves or rejects an extension request
// @route   PUT /api/borrow-requests/:id/extension
// @access  Private (lab_assistant, admin)
exports.reviewExtension = async (req, res, next) => {
  try {
    const { action, note } = req.body;

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ success: false, message: 'action must be "approve" or "reject"' });
    }

    const borrowReq = await BorrowRequest.findById(req.params.id);
    if (!borrowReq) {
      return res.status(404).json({ success: false, message: 'Borrow request not found' });
    }

    if (!borrowReq.extension_request || borrowReq.extension_request.status !== 'pending' || !borrowReq.extension_request.requested_date) {
      return res.status(400).json({ success: false, message: 'No pending extension request found' });
    }

    borrowReq.extension_request.status = action === 'approve' ? 'approved' : 'rejected';
    borrowReq.extension_request.reviewed_by = req.user.id;
    borrowReq.extension_request.reviewed_at = new Date();
    borrowReq.extension_request.review_note = (note || '').trim();

    if (action === 'approve') {
      borrowReq.return_date = borrowReq.extension_request.requested_date;
    }

    await borrowReq.save();

    notifyUserRefresh(String(borrowReq.student), {
      type: `extension_${action}d`,
      borrowRequestId: String(borrowReq._id),
    });
    notifyRoleRefresh('lab_assistant', { type: 'extension_reviewed' });
    notifyRoleRefresh('admin', { type: 'extension_reviewed', borrowRequestId: String(borrowReq._id) });

    await logAuditEvent({
      req,
      userId: req.user.id,
      userEmail: req.user.email,
      actionType: `extension_${action}d`,
      entityType: 'borrow_request',
      entityId: borrowReq._id,
      status: 'success',
      details: { equipment: borrowReq.equipment_name, action },
    });

    res.json({ success: true, data: borrowReq });
  } catch (err) {
    next(err);
  }
};
// @route   POST /api/borrow-requests/preview-pdf
// @access  Private
exports.previewBorrowPdf = async (req, res, next) => {
  try {
    const {
      borrower_name,
      student_id,
      student_email,
      equipment_name,
      serial_number,
      quantity,
      borrow_date,
      return_date,
      purpose,
      objective,
      lecturer_name,
    } = req.body;

    const previewRequest = {
      borrower_name: borrower_name || req.user?.name || '',
      student_id: student_id || req.user?.studentId || '',
      student_email: student_email || req.user?.email || '',
      equipment_name: equipment_name || '',
      serial_number: serial_number || '',
      quantity: Number(quantity) || 1,
      borrow_date,
      return_date,
      purpose: purpose || objective || '',
      objective: objective || purpose || '',
      lecturer_name,
      status: 'pending_lecturer',
    };

    const { generateBorrowRequestPdf } = require('../utils/pdfGenerator');
    const buffer = await generateBorrowRequestPdf(previewRequest);

    const inline = req.query.inline === 'true';
    const safeStudentName = (previewRequest.borrower_name || 'Student').replace(/[^a-zA-Z0-9_\-]/g, '_');
    const dateStr = new Date().toISOString().slice(0, 10);
    const filename = `BorrowRequest_${safeStudentName}_${dateStr}.pdf`;
    const disposition = inline ? 'inline' : `attachment; filename="${filename}"`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', disposition);
    res.setHeader('Content-Length', buffer.length);
    res.end(buffer);
  } catch (error) {
    next(error);
  }
};
