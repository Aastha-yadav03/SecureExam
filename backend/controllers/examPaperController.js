const path = require('path');
const examPaperService = require('../services/examPaperService');
const accessLogService = require('../services/accessLogService');

/**
 * Create exam paper
 */
const createExamPaper = async (req, res, next) => {
  try {
    const { title, description, subject, class: className, totalMarks, duration, questions } = req.body;

    const examPaper = await examPaperService.createExamPaper(
      {
        title,
        description,
        subject,
        class: className,
        totalMarks,
        duration,
        questions: questions || [],
      },
      req.user.id
    );

    // Log access
    await accessLogService.logAccess({
      userId: req.user.id,
      paperIds: [examPaper._id],
      action: 'created',
      ipAddress: req.clientIp,
      details: `Created exam paper: ${title}`,
    });

    res.status(201).json({
      message: 'Exam paper created successfully',
      data: examPaper,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get exam paper
 */
const getExamPaper = async (req, res, next) => {
  try {
    const { paperId } = req.params;

    const examPaper = await examPaperService.getExamPaper(paperId, req.user.id, req.user.role);

    res.status(200).json({
      message: 'Exam paper retrieved successfully',
      data: examPaper,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * List exam papers
 */
const listExamPapers = async (req, res, next) => {
  try {
    const filters = {
      subject: req.query.subject,
      status: req.query.status,
      class: req.query.class,
    };

    const papers = await examPaperService.listExamPapers(req.user.id, req.user.role, filters);

    res.status(200).json({
      message: 'Exam papers retrieved successfully',
      count: papers.length,
      data: papers,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update exam paper
 */
const updateExamPaper = async (req, res, next) => {
  try {
    const { paperId } = req.params;
    const updateData = req.body;

    const examPaper = await examPaperService.updateExamPaper(paperId, updateData, req.user.id);

    // Log access
    await accessLogService.logAccess({
      userId: req.user.id,
      paperIds: [paperId],
      action: 'updated',
      ipAddress: req.clientIp,
      details: `Updated exam paper: ${examPaper.title}`,
    });

    res.status(200).json({
      message: 'Exam paper updated successfully',
      data: examPaper,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Publish exam paper
 */
const publishExamPaper = async (req, res, next) => {
  try {
    const { paperId } = req.params;

    const examPaper = await examPaperService.publishExamPaper(paperId, req.user.id);

    // Log access
    await accessLogService.logAccess({
      userId: req.user.id,
      paperIds: [paperId],
      action: 'updated',
      ipAddress: req.clientIp,
      details: `Published exam paper: ${examPaper.title}`,
    });

    res.status(200).json({
      message: 'Exam paper published successfully',
      data: examPaper,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Archive exam paper
 */
const archiveExamPaper = async (req, res, next) => {
  try {
    const { paperId } = req.params;

    const examPaper = await examPaperService.archiveExamPaper(paperId, req.user.id);

    res.status(200).json({
      message: 'Exam paper archived successfully',
      data: examPaper,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Upload exam paper file
 */
const uploadExamPaper = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Please upload a file' });
    }

    const { title, description, subject, class: className, totalMarks, duration } = req.body;

    const examPaper = await examPaperService.createExamFromFile(
      {
        title,
        description,
        subject,
        class: className,
        totalMarks: parseInt(totalMarks),
        duration: parseInt(duration),
      },
      req.file,
      req.user.id
    );

    // Log access
    await accessLogService.logAccess({
      userId: req.user.id,
      paperIds: [examPaper._id],
      action: 'uploaded',
      ipAddress: req.clientIp,
      details: `Uploaded exam paper: ${title} (${req.file.originalname})`,
    });

    res.status(201).json({
      message: 'Exam paper uploaded successfully',
      data: examPaper,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Download exam paper file
 */
const downloadExamFile = async (req, res, next) => {
  try {
    const { paperId } = req.params;
    const examPaper = await examPaperService.getExamPaper(paperId, req.user.id);

    if (!examPaper.fileAttachment || !examPaper.fileAttachment.path) {
      return res.status(404).json({ error: 'No file attachment found for this paper' });
    }

    const filePath = path.resolve(examPaper.fileAttachment.path);
    
    res.download(filePath, examPaper.fileAttachment.originalName, (err) => {
      if (err) {
        if (!res.headersSent) {
          res.status(500).json({ error: 'Could not download the file' });
        }
      }
    });

    // Log access
    await accessLogService.logAccess({
      userId: req.user.id,
      paperIds: [paperId],
      action: 'viewed',
      ipAddress: req.clientIp,
      details: `Downloaded exam paper file: ${examPaper.title}`,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createExamPaper,
  uploadExamPaper,
  getExamPaper,
  listExamPapers,
  updateExamPaper,
  publishExamPaper,
  archiveExamPaper,
  downloadExamFile,
};
