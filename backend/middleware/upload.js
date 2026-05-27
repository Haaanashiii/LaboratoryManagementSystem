const multer = require('multer');
const path = require('path');

// Use memory storage for GridFS
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowedExtensions = ['.jpeg', '.jpg', '.png', '.gif', '.webp', '.bmp', '.tif', '.tiff', '.avif', '.svg'];
  const allowedMimeTypes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/bmp',
    'image/tiff',
    'image/avif',
    'image/svg+xml'
  ];

  const extension = path.extname(file.originalname).toLowerCase();
  const extValid = allowedExtensions.includes(extension);
  const mimeValid = allowedMimeTypes.includes((file.mimetype || '').toLowerCase());

  if (extValid && mimeValid) {
    cb(null, true);
  } else {
    cb(new Error('Only image files (jpeg, jpg, png, gif, webp, bmp, tiff, avif, svg) are allowed'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024, // 5MB default
  }
});

module.exports = upload;
