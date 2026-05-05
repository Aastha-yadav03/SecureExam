const ExamPaper = require('../models/ExamPaper');
const AccessLog = require('../models/AccessLog');
const AuditTrail = require('../models/AuditTrail');
const { encrypt, decrypt } = require('../utils/encryption');
const { generateHash, verifyHash } = require('../utils/hashGenerator');
const { cache } = require('../config/redis');
const fs = require('fs');
const path = require('path');

/**
 * Create exam paper
 * @param {object} examData - Exam data
 * @param {string} userId - User ID
 * @returns {object} - Created exam paper
 */
const createExamPaper = async (examData, userId) => {
  // Encrypt content
  const contentToEncrypt = JSON.stringify(examData.questions);
  const encrypted = encrypt(contentToEncrypt);

  // Generate hash
  const fileHash = generateHash(contentToEncrypt);

  // Create watermark
  const watermark = {
    userId: userId,
    timestamp: new Date(),
    identifier: `${userId}-${Date.now()}`,
  };

  const examPaper = new ExamPaper({
    ...examData,
    createdBy: userId,
    encryptedContent: encrypted,
    fileHash: fileHash,
    watermark: watermark,
    status: 'draft',
    revisions: [
      {
        version: 1,
        changes: 'Initial creation',
        changedBy: userId,
        changedAt: new Date(),
      },
    ],
  });

  await examPaper.save();

  // Log audit trail
  await AuditTrail.create({
    performedBy: userId,
    action: 'CREATE_EXAM_PAPER',
    entityType: 'exam_paper',
    entityId: examPaper._id,
    description: `Created exam paper: ${examData.title}`,
    severity: 'low',
  });

  // Clear exam list cache for the user
  await cache.clear(`exams:list:${userId}:*`);

  return examPaper;
};

/**
 * Update exam paper
 * @param {string} paperId - Paper ID
 * @param {object} updateData - Update data
 * @param {string} userId - User ID
 * @returns {object} - Updated exam paper
 */
const updateExamPaper = async (paperId, updateData, userId) => {
  const paper = await ExamPaper.findById(paperId);

  if (!paper) {
    throw new Error('Exam paper not found');
  }

  if (paper.createdBy.toString() !== userId && paper.status !== 'draft') {
    throw new Error('Only creator can edit published papers');
  }

  // Update encrypted content if questions changed
  if (updateData.questions) {
    const contentToEncrypt = JSON.stringify(updateData.questions);
    paper.encryptedContent = encrypt(contentToEncrypt);
    paper.fileHash = generateHash(contentToEncrypt);
  }

  // Update other fields
  Object.assign(paper, updateData);

  // Increment version
  paper.version += 1;

  // Add revision record
  paper.revisions.push({
    version: paper.version,
    changes: updateData.changes || 'Updated',
    changedBy: userId,
    changedAt: new Date(),
  });

  await paper.save();

  // Log audit trail
  await AuditTrail.create({
    performedBy: userId,
    action: 'UPDATE_EXAM_PAPER',
    entityType: 'exam_paper',
    entityId: paperId,
    description: `Updated exam paper: ${paper.title}`,
    severity: 'low',
  });

  return paper;
};

/**
 * Publish exam paper
 * @param {string} paperId - Paper ID
 * @param {string} userId - User ID
 * @returns {object} - Published exam paper
 */
const publishExamPaper = async (paperId, userId) => {
  const paper = await ExamPaper.findById(paperId);

  if (!paper) {
    throw new Error('Exam paper not found');
  }

  if (paper.createdBy.toString() !== userId) {
    throw new Error('Only creator can publish exam');
  }

  if (paper.status === 'published') {
    throw new Error('Paper is already published');
  }

  paper.status = 'published';
  paper.publishedAt = new Date();

  await paper.save();

  // Log audit trail
  await AuditTrail.create({
    performedBy: userId,
    action: 'PUBLISH_EXAM_PAPER',
    entityType: 'exam_paper',
    entityId: paperId,
    description: `Published exam paper: ${paper.title}`,
    severity: 'medium',
  });

  return paper;
};

/**
 * Create exam paper from uploaded file
 * @param {object} examData - Exam metadata
 * @param {object} file - Uploaded file object
 * @param {string} userId - User ID
 * @returns {object} - Created exam paper
 */
const createExamFromFile = async (examData, file, userId) => {
  // Store file information
  const fileInfo = {
    originalName: file.originalname,
    mimeType: file.mimetype,
    size: file.size,
    path: file.path,
    filename: file.filename,
  };

  // Create watermark
  const watermark = {
    userId: userId,
    timestamp: new Date(),
    identifier: `${userId}-${Date.now()}`,
  };

  const examPaper = new ExamPaper({
    ...examData,
    createdBy: userId,
    file: fileInfo,
    watermark: watermark,
    status: 'published', // Uploaded files are automatically published
    publishedAt: new Date(),
    revisions: [
      {
        version: 1,
        changes: 'File upload',
        changedBy: userId,
        changedAt: new Date(),
      },
    ],
  });

  await examPaper.save();

  // Log audit trail
  await AuditTrail.create({
    performedBy: userId,
    action: 'UPLOAD_EXAM_PAPER',
    entityType: 'exam_paper',
    entityId: examPaper._id,
    description: `Uploaded exam paper: ${examData.title}`,
    severity: 'medium',
  });

  return examPaper;
};

/**
 * Get exam paper with decryption
 * @param {string} paperId - Paper ID
 * @param {string} userId - User ID
 * @param {string} userRole - User role
 * @returns {object} - Exam paper with decrypted content
 */
const getExamPaper = async (paperId, userId, userRole) => {
  // Try to get from cache first
  const cacheKey = `exam:${paperId}:${userId}:${userRole}`;
  const cachedPaper = await cache.get(cacheKey);

  if (cachedPaper) {
    console.log(`📋 Cache hit for exam ${paperId}`);
    return cachedPaper;
  }

  const paper = await ExamPaper.findById(paperId).populate('createdBy', 'name email');

  if (!paper) {
    throw new Error('Exam paper not found');
  }

  // Check access permissions based on role and paper status
  const isCreator = paper.createdBy._id.toString() === userId;

  if (userRole === 'admin') {
    // Admin can access everything
  } else if (userRole === 'reviewer') {
    // Reviewers can access published and draft exams
    if (paper.status === 'archived') {
      throw new Error('Unauthorized access');
    }
  } else if (userRole === 'faculty') {
    // Faculty can only access their own exams or published exams
    if (!isCreator && paper.status !== 'published') {
      throw new Error('Unauthorized access');
    }
  } else {
    throw new Error('Unauthorized access');
  }

  // Log access
  await AccessLog.create({
    userId: userId,
    paperIds: [paperId],
    action: 'viewed',
    resourceType: 'exam_paper',
    details: `Viewed exam paper: ${paper.title}`,
  });

  // Decrypt content only if it exists
  if (paper.encryptedContent && paper.encryptedContent.encryptedData) {
    const decryptedContent = decrypt(paper.encryptedContent);
    paper.questions = JSON.parse(decryptedContent);
  }

  // Cache the result for 10 minutes
  await cache.set(cacheKey, paper, 600);

  return paper;
};

/**
 * List exam papers
 * @param {string} userId - User ID
 * @param {string} role - User role
 * @param {object} filters - Filter options
 * @returns {array} - Exam papers
 */
const listExamPapers = async (userId, role, filters = {}) => {
  // Create cache key based on user and filters
  const cacheKey = `exams:list:${userId}:${role}:${JSON.stringify(filters)}`;
  const cachedPapers = await cache.get(cacheKey);

  if (cachedPapers) {
    console.log(`📋 Cache hit for exam list`);
    return cachedPapers;
  }

  let query = {};

  if (role === 'faculty') {
    query.createdBy = userId;
  } else if (role === 'reviewer') {
    query.status = { $in: ['published', 'draft'] };
  } else if (role === 'admin') {
    // Admin can see all
  }

  // Apply filters
  if (filters.subject) {
    query.subject = filters.subject;
  }
  if (filters.status) {
    query.status = filters.status;
  }
  if (filters.class) {
    query.class = filters.class;
  }

  const papers = await ExamPaper.find(query)
    .populate('createdBy', 'name email')
    .populate('reviewedBy', 'name email')
    .select('-encryptedContent -questions')
    .sort({ createdAt: -1 });

  // Cache the result for 5 minutes
  await cache.set(cacheKey, papers, 300);

  return papers;
};

/**
 * Archive exam paper
 * @param {string} paperId - Paper ID
 * @param {string} userId - User ID
 * @returns {object} - Archived paper
 */
const archiveExamPaper = async (paperId, userId) => {
  const paper = await ExamPaper.findById(paperId);

  if (!paper) {
    throw new Error('Exam paper not found');
  }

  paper.status = 'archived';
  await paper.save();

  await AuditTrail.create({
    performedBy: userId,
    action: 'ARCHIVE_EXAM_PAPER',
    entityType: 'exam_paper',
    entityId: paperId,
    severity: 'medium',
  });

  return paper;
};

module.exports = {
  createExamPaper,
  createExamFromFile,
  updateExamPaper,
  publishExamPaper,
  getExamPaper,
  listExamPapers,
  archiveExamPaper,
};
