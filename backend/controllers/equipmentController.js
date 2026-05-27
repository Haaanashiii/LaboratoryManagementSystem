const Equipment = require('../models/Equipment');
const EquipmentHistory = require('../models/EquipmentHistory');
const BorrowRequest = require('../models/BorrowRequest');
const { uploadToGridFS, downloadFromGridFS, deleteFromGridFS, getFileMetadata } = require('../config/gridfs');
const { emitEquipmentUpdate } = require('../socket');

const ACTIVE_BORROW_STATUSES = ['pending', 'approved', 'pending_lecturer', 'pending_head', 'head_approved', 'ready_pickup', 'borrowed'];

const extractGridFSFileId = (url) => {
  if (!url) return null;
  const match = String(url).match(/\/api\/equipment\/image\/([a-f0-9]{24})/i);
  return match ? match[1] : null;
};

const IMAGE_ROUTE_PATTERN = /\/api\/equipment\/image\/[a-f0-9]{24}$/i;

const parseOptionalNonNegativeInt = (value, fieldLabel) => {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  const numericValue = Number(value);
  if (!Number.isFinite(numericValue) || !Number.isInteger(numericValue) || numericValue < 0) {
    const error = new Error(`${fieldLabel} must be a non-negative whole number`);
    error.statusCode = 400;
    throw error;
  }

  return numericValue;
};

const applyQuantityRules = (payload = {}, options = {}) => {
  const nextPayload = { ...payload };
  const isUpdate = Boolean(options.forUpdate);
  const currentQuantity = Number(options.currentQuantity);
  const currentAvailable = Number(options.currentAvailable);

  const parsedQuantity = parseOptionalNonNegativeInt(nextPayload.quantity, 'Quantity');
  const parsedAvailable = parseOptionalNonNegativeInt(nextPayload.available, 'Available quantity');

  if (!isUpdate) {
    const quantity = parsedQuantity ?? 0;
    let available = parsedAvailable ?? quantity;

    if (quantity === 0) {
      available = 0;
    }

    if (available > quantity) {
      available = quantity;
    }

    nextPayload.quantity = quantity;
    nextPayload.available = available;
    return nextPayload;
  }

  if (parsedQuantity === undefined && parsedAvailable === undefined) {
    delete nextPayload.quantity;
    delete nextPayload.available;
    return nextPayload;
  }

  let quantity = Number.isFinite(currentQuantity) ? currentQuantity : 0;
  let available = Number.isFinite(currentAvailable) ? currentAvailable : 0;

  if (parsedQuantity !== undefined) {
    quantity = parsedQuantity;
  }

  if (parsedAvailable !== undefined) {
    available = parsedAvailable;
  }

  if (quantity === 0) {
    available = 0;
  }

  if (available > quantity) {
    available = quantity;
  }

  nextPayload.quantity = quantity;
  nextPayload.available = available;
  return nextPayload;
};

const normalizeImageReference = (value) => {
  if (!value) return '';
  const raw = String(value).trim();
  if (!raw) return '';

  if (IMAGE_ROUTE_PATTERN.test(raw)) {
    const match = raw.match(/\/api\/equipment\/image\/[a-f0-9]{24}$/i);
    return match ? match[0] : raw;
  }

  if (/^https?:\/\//i.test(raw)) {
    return raw;
  }

  return raw.startsWith('/') ? raw : `/${raw}`;
};

const normalizeEquipmentPayload = (payload = {}, { forUpdate = false } = {}) => {
  const nextPayload = { ...payload };

  if (typeof nextPayload.condition === 'string') {
    const normalizedCondition = nextPayload.condition.trim().toLowerCase();
    if (normalizedCondition === 'needs maintenance') {
      nextPayload.condition = 'Poor';
    }
  }

  const hasImageInput = ['image', 'image_url', 'images', 'images_urls'].some((key) => Object.prototype.hasOwnProperty.call(payload, key));

  if (hasImageInput) {
    const imageCandidates = [];

    if (Array.isArray(payload.images)) imageCandidates.push(...payload.images);
    if (Array.isArray(payload.images_urls)) imageCandidates.push(...payload.images_urls);
    imageCandidates.push(payload.image, payload.image_url);

    const normalizedImages = [...new Set(
      imageCandidates
        .map(normalizeImageReference)
        .filter(Boolean)
    )];

    nextPayload.images = normalizedImages;
    nextPayload.image = normalizedImages[0] || '';
  } else if (!forUpdate) {
    nextPayload.images = [];
    nextPayload.image = '';
  }

  delete nextPayload.image_url;
  delete nextPayload.images_urls;

  return nextPayload;
};

// @desc    Get all equipment
// @route   GET /api/equipment
// @access  Private
exports.getEquipment = async (req, res, next) => {
  try {
    const { category, status, available, search } = req.query;

    const ALLOWED_CATEGORIES = ['Electronics', 'Computing', 'Networking', 'Peripherals', 'Power', 'Tools', 'Storage', 'Other'];
    const ALLOWED_EQ_STATUSES = ['available', 'borrowed', 'maintenance', 'retired'];
    const escapeRegex = (str) => String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    // Build query — whitelist enum inputs to prevent NoSQL injection
    const query = {};
    if (req.user?.role === 'student') {
      query.isPublished = { $ne: false };
    }
    if (category && category !== 'all' && ALLOWED_CATEGORIES.includes(category)) query.category = category;
    if (status && ALLOWED_EQ_STATUSES.includes(status)) query.status = status;
    if (available === 'true') query.available = { $gt: 0 };
    if (search) {
      const safe = escapeRegex(String(search).slice(0, 100));
      query.$or = [
        { name:        { $regex: safe, $options: 'i' } },
        { description: { $regex: safe, $options: 'i' } }
      ];
    }

    const equipment = await Equipment.find(query).sort('-createdAt');

    res.json({
      success: true,
      count: equipment.length,
      data: equipment
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single equipment
// @route   GET /api/equipment/:id
// @access  Private
exports.getEquipmentById = async (req, res, next) => {
  try {
    const equipment = await Equipment.findById(req.params.id);

    if (!equipment) {
      return res.status(404).json({
        success: false,
        message: 'Equipment not found'
      });
    }

    res.json({
      success: true,
      data: equipment
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create equipment
// @route   POST /api/equipment
// @access  Private (Admin)
exports.createEquipment = async (req, res, next) => {
  try {
    let payload = normalizeEquipmentPayload(req.body);
    payload = applyQuantityRules(payload);

    const equipment = await Equipment.create(payload);

    await EquipmentHistory.create({
      action: 'added',
      performedBy: req.user?._id || null,
      performedByName: req.user?.name || 'Unknown',
      equipmentId: equipment._id,
      equipmentName: equipment.name,
      category: equipment.category || '',
      previousQuantity: null,
      newQuantity: equipment.quantity,
    });

    emitEquipmentUpdate({ action: 'added', equipmentId: String(equipment._id) });

    res.status(201).json({
      success: true,
      data: equipment
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update equipment
// @route   PUT /api/equipment/:id
// @access  Private (Admin)
exports.updateEquipment = async (req, res, next) => {
  try {
    const existingEquipment = await Equipment.findById(req.params.id).select('quantity available');

    if (!existingEquipment) {
      return res.status(404).json({
        success: false,
        message: 'Equipment not found'
      });
    }

    let payload = normalizeEquipmentPayload(req.body, { forUpdate: true });
    payload = applyQuantityRules(payload, {
      forUpdate: true,
      currentQuantity: existingEquipment.quantity,
      currentAvailable: existingEquipment.available
    });

    const quantityChanged =
      payload.quantity !== undefined &&
      payload.quantity !== existingEquipment.quantity;

    const equipment = await Equipment.findByIdAndUpdate(
      req.params.id,
      payload,
      {
        new: true,
        runValidators: true
      }
    );

    if (quantityChanged) {
      await EquipmentHistory.create({
        action: 'quantity_changed',
        performedBy: req.user?._id || null,
        performedByName: req.user?.name || 'Unknown',
        equipmentId: equipment._id,
        equipmentName: equipment.name,
        category: equipment.category || '',
        previousQuantity: existingEquipment.quantity,
        newQuantity: equipment.quantity,
      });
    }

    emitEquipmentUpdate({ action: 'updated', equipmentId: String(equipment._id) });

    res.json({
      success: true,
      data: equipment
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete equipment
// @route   DELETE /api/equipment/:id
// @access  Private (Admin)
exports.deleteEquipment = async (req, res, next) => {
  try {
    const equipment = await Equipment.findById(req.params.id);

    if (!equipment) {
      return res.status(404).json({ success: false, message: 'Equipment not found' });
    }

    // Block deletion if there are active borrow requests
    const activeBorrowCount = await BorrowRequest.countDocuments({
      equipment: equipment._id,
      status: { $in: ACTIVE_BORROW_STATUSES },
    });

    if (activeBorrowCount > 0) {
      return res.status(409).json({
        success: false,
        message: `Cannot delete — ${activeBorrowCount} active borrow request${activeBorrowCount > 1 ? 's' : ''} still reference this equipment. Resolve all borrows first.`,
      });
    }

    // Cascade-delete all borrow requests for this equipment
    await BorrowRequest.deleteMany({ equipment: equipment._id });

    // Delete GridFS images
    const imageUrls = [equipment.image, ...(equipment.images || [])].filter(Boolean);
    for (const url of imageUrls) {
      const fileId = extractGridFSFileId(url);
      if (fileId) {
        try { await deleteFromGridFS(fileId); } catch { /* already gone */ }
      }
    }

    await EquipmentHistory.create({
      action: 'deleted',
      performedBy: req.user?._id || null,
      performedByName: req.user?.name || 'Unknown',
      equipmentId: equipment._id,
      equipmentName: equipment.name,
      category: equipment.category || '',
      previousQuantity: equipment.quantity,
      newQuantity: null,
    });

    await equipment.deleteOne();

    emitEquipmentUpdate({ action: 'deleted', equipmentId: String(equipment._id) });

    res.json({ success: true, message: 'Equipment and all associated records deleted successfully.' });
  } catch (error) {
    next(error);
  }
};

// @desc    Get equipment categories
// @route   GET /api/equipment/categories/list
// @access  Private
exports.getCategories = async (req, res, next) => {
  try {
    const categories = await Equipment.distinct('category');

    res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update equipment quantity
// @route   PUT /api/equipment/:id/quantity
// @access  Private (Admin, Lab Assistant)
exports.updateQuantity = async (req, res, next) => {
  try {
    const equipment = await Equipment.findById(req.params.id);

    if (!equipment) {
      return res.status(404).json({
        success: false,
        message: 'Equipment not found'
      });
    }

    const previousQuantity = equipment.quantity;

    const normalizedPayload = applyQuantityRules(
      {
        quantity: req.body.quantity,
        available: req.body.available
      },
      {
        forUpdate: true,
        currentQuantity: equipment.quantity,
        currentAvailable: equipment.available
      }
    );

    if (normalizedPayload.quantity !== undefined) equipment.quantity = normalizedPayload.quantity;
    if (normalizedPayload.available !== undefined) equipment.available = normalizedPayload.available;

    await equipment.save();

    if (normalizedPayload.quantity !== undefined && normalizedPayload.quantity !== previousQuantity) {
      await EquipmentHistory.create({
        action: 'quantity_changed',
        performedBy: req.user?._id || null,
        performedByName: req.user?.name || 'Unknown',
        equipmentId: equipment._id,
        equipmentName: equipment.name,
        category: equipment.category || '',
        previousQuantity,
        newQuantity: equipment.quantity,
      });
    }

    emitEquipmentUpdate({ action: 'updated', equipmentId: String(equipment._id) });

    res.json({
      success: true,
      data: equipment
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Mark equipment as out of stock
// @route   PATCH /api/equipment/:id/out-of-stock
// @access  Private (Admin, Head of Lab, Lab Assistant)
exports.markOutOfStock = async (req, res, next) => {
  try {
    const equipment = await Equipment.findByIdAndUpdate(
      req.params.id,
      { available: 0 },
      { new: true, runValidators: true }
    );

    if (!equipment) {
      return res.status(404).json({
        success: false,
        message: 'Equipment not found'
      });
    }

    res.json({
      success: true,
      data: equipment
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Toggle equipment published/unpublished state
// @route   PATCH /api/equipment/:id/publish
// @access  Private (Admin, Head of Lab)
exports.togglePublish = async (req, res, next) => {
  try {
    const existing = await Equipment.findById(req.params.id).select('isPublished name category');

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Equipment not found'
      });
    }

    const newPublished = existing.isPublished !== false;

    const equipment = await Equipment.findByIdAndUpdate(
      req.params.id,
      { isPublished: !newPublished },
      { new: true }
    );

    await EquipmentHistory.create({
      action: !newPublished ? 'published' : 'unpublished',
      performedBy: req.user?._id || null,
      performedByName: req.user?.name || 'Unknown',
      equipmentId: equipment._id,
      equipmentName: equipment.name,
      category: equipment.category || '',
      previousQuantity: null,
      newQuantity: null,
    });

    emitEquipmentUpdate({ action: !newPublished ? 'published' : 'unpublished', equipmentId: String(equipment._id) });

    return res.json({
      success: true,
      data: equipment
    });
  } catch (error) {
    return next(error);
  }
};

// @desc    Upload equipment image
// @route   POST /api/equipment/upload-image
// @access  Private (Admin, Head of Lab)
exports.uploadImage = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please upload a file'
      });
    }

    // Upload to GridFS
    const fileId = await uploadToGridFS(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype
    );

    const relativePath = `/api/equipment/image/${fileId}`;
    const origin = `${req.protocol}://${req.get('host')}`;

    res.json({
      success: true,
      data: {
        fileId: fileId,
        path: relativePath,
        url: `${origin}${relativePath}`
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Download an external image URL and store it in GridFS
// @route   POST /api/equipment/upload-image-from-url
// @access  Private (Admin, Head of Lab, Lab Assistant)
exports.uploadImageFromUrl = async (req, res, next) => {
  try {
    const { url } = req.body;
    if (!url || !/^https?:\/\/.{4,}/i.test(String(url).trim())) {
      return res.status(400).json({ success: false, message: 'A valid http/https URL is required.' });
    }

    let fetchRes;
    try {
      fetchRes = await fetch(url.trim(), {
        signal: AbortSignal.timeout(15000),
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; LabMgmt/1.0)' },
      });
    } catch {
      return res.status(400).json({ success: false, message: 'Could not reach the image URL.' });
    }

    if (!fetchRes.ok) {
      return res.status(400).json({ success: false, message: `Image URL returned ${fetchRes.status}.` });
    }

    const contentType = fetchRes.headers.get('content-type') || '';
    if (!contentType.startsWith('image/')) {
      return res.status(400).json({ success: false, message: 'URL does not point to an image.' });
    }

    const arrayBuffer = await fetchRes.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const filename = url.split('/').pop().split('?')[0] || 'image.jpg';

    const fileId = await uploadToGridFS(buffer, filename, contentType);
    const relativePath = `/api/equipment/image/${fileId}`;
    const origin = `${req.protocol}://${req.get('host')}`;

    res.json({
      success: true,
      data: { fileId, path: relativePath, url: `${origin}${relativePath}` }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get equipment image from GridFS
// @route   GET /api/equipment/image/:fileId
// @access  Public
exports.getImage = async (req, res, next) => {
  try {
    const { fileId } = req.params;

    // Get file metadata
    const metadata = await getFileMetadata(fileId);
    
    if (!metadata) {
      return res.status(404).json({
        success: false,
        message: 'Image not found'
      });
    }

    // Set content type
    res.set('Content-Type', metadata.metadata.contentType || 'image/jpeg');
    res.set('Cache-Control', 'public, max-age=86400'); // Cache for 1 day
    // Allow frontend app (different origin in dev) to render image responses.
    res.set('Cross-Origin-Resource-Policy', 'cross-origin');

    // Stream the file
    const downloadStream = downloadFromGridFS(fileId);
    downloadStream.pipe(res);

    downloadStream.on('error', (error) => {
      res.status(404).json({
        success: false,
        message: 'Error retrieving image'
      });
    });
  } catch (error) {
    next(error);
  }
};
