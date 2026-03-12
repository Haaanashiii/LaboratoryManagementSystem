const BorrowRequest = require('../models/BorrowRequest');
const Equipment = require('../models/Equipment');
const User = require('../models/User');

// @desc    Get all borrow requests
// @route   GET /api/borrow-requests
// @access  Private
exports.getBorrowRequests = async (req, res, next) => {
  try {
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
    const { equipment, quantity, purpose, borrow_date, return_date, lecturer_email } = req.body;

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
      lecturer: lecturer?._id,
      lecturer_email: lecturer?.email,
      status: 'pending_lecturer'
    });

    // Populate before returning
    await request.populate('equipment', 'name category');

    res.status(201).json({
      success: true,
      data: request
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
      request.status = 'pending_head';
      request.lecturer = req.user.id;
      request.lecturer_approved_at = Date.now();
      request.lecturer_remarks = remarks;
    } else if (action === 'reject') {
      request.status = 'rejected';
      request.rejected_by = req.user.id;
      request.rejected_at = Date.now();
      request.rejection_reason = remarks;
    }

    await request.save();

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
      // Check equipment availability again
      if (request.equipment.available < request.quantity) {
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
      request.status = 'rejected';
      request.rejected_by = req.user.id;
      request.rejected_at = Date.now();
      request.rejection_reason = remarks;
    }

    await request.save();

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

    // Reserve equipment
    const equipment = request.equipment;
    equipment.available -= request.quantity;
    await equipment.save();

    request.status = 'ready_pickup';
    request.prepared_by = req.user.id;
    request.prepared_at = Date.now();
    await request.save();

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

    request.status = 'borrowed';
    request.released_by = req.user.id;
    request.released_at = Date.now();
    await request.save();

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
    const { return_condition, return_remarks } = req.body;

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

    // Return equipment to inventory
    const equipment = request.equipment;
    equipment.available += request.quantity;
    
    // Update equipment condition if returned condition is worse
    const conditionOrder = ['Excellent', 'Good', 'Fair', 'Poor', 'Damaged'];
    if (conditionOrder.indexOf(return_condition) > conditionOrder.indexOf(equipment.condition)) {
      equipment.condition = return_condition;
    }
    
    await equipment.save();

    request.status = 'returned';
    request.actual_return_date = Date.now();
    request.return_condition = return_condition;
    request.return_remarks = return_remarks;
    request.returned_to = req.user.id;
    await request.save();

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

    await request.deleteOne();

    res.json({
      success: true,
      message: 'Request deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};
