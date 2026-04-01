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

    const { status, student_email, lecturer_email, equipment_id } = req.query;
    
    console.log('=== getBorrowRequests DEBUG ===');
    console.log('User role:', req.user.role);
    console.log('User id:', req.user.id);
    console.log('Query params:', req.query);
    
    // Build query
    const query = {};
    
    // Role-based filtering
    if (req.user.role === 'student') {
      query.student = req.user.id;
    } else if (req.user.role === 'lecturer') {
      // If no status or pending_lecturer status, show all pending_lecturer requests
      if (!status || status === 'pending_lecturer') {
        query.status = 'pending_lecturer';
      } else {
        // For other statuses, show requests assigned to this lecturer
        query.lecturer = req.user.id;
        if (status) {
          query.status = status;
        }
      }
    }
    
    // Additional filters
    if (status && req.user.role !== 'lecturer') query.status = status;
    if (student_email) query.student_email = student_email;
    if (equipment_id) query.equipment = equipment_id;

    console.log('Final query:', JSON.stringify(query));
    
    const requests = await BorrowRequest.find(query)
      .populate('student', 'name email')
      .populate('equipment', 'name category')
      .populate('lecturer', 'name email')
      .sort('-createdAt');

    console.log('Results count:', requests.length);
    console.log('=== END DEBUG ===');
    
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
    if (req.user.role === 'student' && request.student.toString() !== req.user.id) {
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
    const { equipment, quantity, purpose, borrow_date, return_date, lecturer_email, agree_policy } = req.body;

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

    // Find lecturer if email provided (optional)
    let lecturer = null;
    if (lecturer_email) {
      lecturer = await User.findOne({ email: lecturer_email, role: 'lecturer' });
    }

    // Create request
    const request = await BorrowRequest.create({
      student: req.user.id,
      student_email: req.user.email,
      borrower_name: req.user.name,
      equipment,
      equipment_name: equipmentItem.name,
      quantity,
      purpose,
      borrow_date,
      return_date,
      agreed_replacement_policy: true,
      agreed_replacement_policy_at: Date.now(),
      lecturer: lecturer?._id,
      lecturer_email: lecturer?.email,
      status: 'pending_lecturer'
    });

    // Populate before returning
    await request.populate('equipment', 'name category');

    // Notify lecturer dashboards that new requests are waiting.
    notifyRoleRefresh('lecturer', {
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
      request.lecturer_remarks = remarks;
      request.stock_reserved = true;
    } else if (action === 'reject') {
      request.status = 'rejected';
      request.rejected_by = req.user.id;
      request.rejected_at = Date.now();
      request.rejection_reason = remarks;
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
      request.head_remarks = remarks;
    } else if (action === 'reject') {
      if (request.stock_reserved) {
        request.equipment.available += request.quantity;
        await request.equipment.save();
        request.stock_reserved = false;
      }

      request.status = 'rejected';
      request.rejected_by = req.user.id;
      request.rejected_at = Date.now();
      request.rejection_reason = remarks;
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

    // Validate availability before marking ready for pickup.
    if (request.equipment.available < request.quantity) {
      return res.status(400).json({
        success: false,
        message: 'Equipment no longer available in requested quantity'
      });
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
      replacement_completed
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

    request.status = 'returned';
    request.actual_return_date = Date.now();
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
        damage_status: request.damage_status
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
      .populate('equipment', 'name category')
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
    if (!['pending_lecturer', 'pending_head'].includes(request.status)) {
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
