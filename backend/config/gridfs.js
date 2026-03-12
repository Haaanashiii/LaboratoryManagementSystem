const mongoose = require('mongoose');
const { GridFSBucket } = require('mongodb');

let bucket;

/**
 * Initialize GridFS bucket
 * Call this after mongoose connection is established
 */
const initGridFS = () => {
  try {
    const db = mongoose.connection.db;
    
    if (!db) {
      console.warn('⚠️  MongoDB not connected yet, GridFS initialization delayed');
      return null;
    }
    
    bucket = new GridFSBucket(db, {
      bucketName: 'equipmentImages'
    });
    console.log('✅ GridFS initialized');
    return bucket;
  } catch (error) {
    console.error('❌ GridFS initialization error:', error.message);
    return null;
  }
};

/**
 * Get GridFS bucket instance
 */
const getGridFSBucket = () => {
  if (!bucket) {
    // Try to initialize if not already done
    const initialized = initGridFS();
    if (!initialized) {
      throw new Error('GridFS not initialized. MongoDB connection may not be ready.');
    }
  }
  return bucket;
};

/**
 * Upload file to GridFS
 * @param {Buffer} buffer - File buffer
 * @param {String} filename - File name
 * @param {String} mimetype - File MIME type
 * @returns {Promise<String>} - File ID
 */
const uploadToGridFS = (buffer, filename, mimetype) => {
  return new Promise((resolve, reject) => {
    const bucket = getGridFSBucket();
    
    const uploadStream = bucket.openUploadStream(filename, {
      metadata: {
        contentType: mimetype,
        uploadDate: new Date()
      }
    });

    uploadStream.on('error', (error) => {
      reject(error);
    });

    uploadStream.on('finish', (file) => {
      resolve(file._id.toString());
    });

    uploadStream.end(buffer);
  });
};

/**
 * Download file from GridFS
 * @param {String} fileId - File ID
 * @returns {Stream} - Download stream
 */
const downloadFromGridFS = (fileId) => {
  const bucket = getGridFSBucket();
  const objectId = new mongoose.Types.ObjectId(fileId);
  return bucket.openDownloadStream(objectId);
};

/**
 * Delete file from GridFS
 * @param {String} fileId - File ID
 */
const deleteFromGridFS = async (fileId) => {
  const bucket = getGridFSBucket();
  const objectId = new mongoose.Types.ObjectId(fileId);
  await bucket.delete(objectId);
};

/**
 * Get file metadata from GridFS
 * @param {String} fileId - File ID
 * @returns {Promise<Object>} - File metadata
 */
const getFileMetadata = async (fileId) => {
  const bucket = getGridFSBucket();
  const objectId = new mongoose.Types.ObjectId(fileId);
  
  const files = await bucket.find({ _id: objectId }).toArray();
  return files.length > 0 ? files[0] : null;
};

module.exports = {
  initGridFS,
  getGridFSBucket,
  uploadToGridFS,
  downloadFromGridFS,
  deleteFromGridFS,
  getFileMetadata
};
