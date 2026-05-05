import React, { useState } from 'react';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { useNavigate } from 'react-router-dom';
import './ExamCreator.css';

const ExamCreator = () => {
  const { token } = useAuth();
  const { emitExamUpdate } = useSocket();
  const navigate = useNavigate();
  const [mode, setMode] = useState('manual'); // 'manual' or 'upload'
  const [file, setFile] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    subject: '',
    class: '',
    totalMarks: '100',
    duration: '60',
  });
  const [questions, setQuestions] = useState([
    { questionId: '1', text: '', marks: 1, difficulty: 'easy', questionType: 'mcq', options: ['', '', '', ''] },
  ]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [dragging, setDragging] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) setFile(selectedFile);
  };

  const onDragOver = (e) => {
    e.preventDefault();
    setDragging(true);
  };

  const onDragLeave = () => setDragging(false);

  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) setFile(droppedFile);
  };

  const handleQuestionChange = (index, field, value) => {
    const newQuestions = [...questions];
    newQuestions[index][field] = value;
    setQuestions(newQuestions);
  };

  const handleOptionChange = (qIndex, oIndex, value) => {
    const newQuestions = [...questions];
    newQuestions[qIndex].options[oIndex] = value;
    setQuestions(newQuestions);
  };

  const addQuestion = () => {
    setQuestions([
      ...questions,
      {
        questionId: String(questions.length + 1),
        text: '',
        marks: 1,
        difficulty: 'easy',
        questionType: 'mcq',
        options: ['', '', '', ''],
      },
    ]);
  };

  const removeQuestion = (index) => {
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      let response;
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000';

      if (mode === 'upload') {
        if (!file) throw new Error('Please select a file to upload');

        const uploadData = new FormData();
        uploadData.append('paper', file);
        Object.keys(formData).forEach((key) => uploadData.append(key, formData[key]));

        response = await fetch(`${apiUrl}/api/exams/upload`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: uploadData,
        });
      } else {
        response = await fetch(`${apiUrl}/api/exams`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            ...formData,
            totalMarks: parseInt(formData.totalMarks),
            duration: parseInt(formData.duration),
            questions,
          }),
        });
      }

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to process request');
      }

      const result = await response.json();
      const examId = result.data?._id || result.exam?._id;

      // Emit real-time update
      if (examId) {
        emitExamUpdate(examId, 'created');
      }

      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Navbar />
      <div className="container" style={{ animation: 'fadeInUp 0.6s ease-out' }}>
        <div className="exam-creator">
          <header style={{ marginBottom: 'var(--spacing-lg)' }}>
            <h1>Course Assessment</h1>
            <p className="text-muted">Generate secure digital exams or digitize your existing paper assessments.</p>
          </header>

          <div className="creator-mode-tabs">
            <button
              className={`tab-btn ${mode === 'manual' ? 'active' : ''}`}
              onClick={() => setMode('manual')}
            >
              Manual Entry
            </button>
            <button
              className={`tab-btn ${mode === 'upload' ? 'active' : ''}`}
              onClick={() => setMode('upload')}
            >
              Upload Document
            </button>
          </div>

          {error && <div className="alert alert-error">{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="form-section">
              <h2>General Information</h2>

              <div className="form-group">
                <label className="form-label">Exam Title</label>
                <input
                  type="text"
                  name="title"
                  className="form-input"
                  placeholder="e.g. Final Semester Mathematics"
                  value={formData.title}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Brief Description</label>
                <textarea
                  name="description"
                  className="form-input"
                  placeholder="Outline the scope and objectives of this exam..."
                  value={formData.description}
                  onChange={handleChange}
                  rows="3"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Subject Domain</label>
                  <input
                    type="text"
                    name="subject"
                    className="form-input"
                    placeholder="e.g. Calculus II"
                    value={formData.subject}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Target Class</label>
                  <input
                    type="text"
                    name="class"
                    className="form-input"
                    placeholder="e.g. Grade 12-A"
                    value={formData.class}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Total Score</label>
                  <input
                    type="number"
                    name="totalMarks"
                    className="form-input"
                    value={formData.totalMarks}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Duration (mins)</label>
                  <input
                    type="number"
                    name="duration"
                    className="form-input"
                    value={formData.duration}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>
            </div>

            {mode === 'manual' ? (
              <div className="form-section">
                <h2>Questionnaire</h2>

                {questions.map((question, qIndex) => (
                  <div key={qIndex} className="question-block">
                    <div className="question-header">
                      <h3>Item #{qIndex + 1}</h3>
                      {questions.length > 1 && (
                        <button
                          type="button"
                          className="btn btn-secondary"
                          style={{ color: 'var(--accent)', borderColor: 'rgba(244, 63, 94, 0.2)' }}
                          onClick={() => removeQuestion(qIndex)}
                        >
                          Delete
                        </button>
                      )}
                    </div>

                    <div className="form-group">
                      <label className="form-label">Content</label>
                      <textarea
                        className="form-input"
                        placeholder="Compose the question stem here..."
                        value={question.text}
                        onChange={(e) => handleQuestionChange(qIndex, 'text', e.target.value)}
                        required
                        rows="2"
                      />
                    </div>

                    <div className="form-row" style={{ marginTop: '1rem' }}>
                      <div className="form-group">
                        <label className="form-label">Marks Weight</label>
                        <input
                          type="number"
                          className="form-input"
                          value={question.marks}
                          onChange={(e) => handleQuestionChange(qIndex, 'marks', parseInt(e.target.value))}
                          min="1"
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label">Difficulty</label>
                        <select
                          className="form-select"
                          value={question.difficulty}
                          onChange={(e) => handleQuestionChange(qIndex, 'difficulty', e.target.value)}
                        >
                          <option value="easy">Beginner</option>
                          <option value="medium">Intermediate</option>
                          <option value="hard">Advanced</option>
                        </select>
                      </div>

                      <div className="form-group">
                        <label className="form-label">Format</label>
                        <select
                          className="form-select"
                          value={question.questionType}
                          onChange={(e) => handleQuestionChange(qIndex, 'questionType', e.target.value)}
                        >
                          <option value="mcq">Multiple Choice</option>
                          <option value="short">Short Answer</option>
                          <option value="essay">Long Text / Essay</option>
                        </select>
                      </div>
                    </div>

                    {question.questionType === 'mcq' && (
                      <div style={{ marginTop: '1rem' }}>
                        <label className="form-label">Distractors (Options)</label>
                        <div style={{ display: 'grid', gap: '0.75rem' }}>
                          {question.options.map((option, oIndex) => (
                            <input
                              key={oIndex}
                              type="text"
                              className="form-input"
                              value={option}
                              onChange={(e) => handleOptionChange(qIndex, oIndex, e.target.value)}
                              placeholder={`Option ${oIndex + 1}`}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                <button type="button" className="btn btn-secondary" onClick={addQuestion} style={{ width: '100%' }}>
                  Add Another Question
                </button>
              </div>
            ) : (
              <div className="form-section upload-container">
                <h2>Document Upload</h2>
                <div
                  className={`upload-area ${dragging ? 'dragging' : ''}`}
                  onDragOver={onDragOver}
                  onDragLeave={onDragLeave}
                  onDrop={onDrop}
                  onClick={() => document.getElementById('file-upload').click()}
                >
                  <input
                    id="file-upload"
                    type="file"
                    style={{ display: 'none' }}
                    onChange={handleFileChange}
                    accept=".pdf,.docx,.jpg,.jpeg,.png"
                  />
                  <span className="upload-icon">📄</span>
                  <h3>{dragging ? 'Drop to upload' : 'Select or Drag Paper'}</h3>
                  <p className="text-muted">Supports PDF, DOCX, and Image formats (Max 5MB)</p>
                </div>

                {file && (
                  <div className="file-info">
                    <span className="file-type-icon">
                      {file.type.includes('pdf') ? '📕' : file.type.includes('word') ? '📘' : '🖼️'}
                    </span>
                    <strong>{file.name}</strong>
                    <span className="text-muted">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                  </div>
                )}
              </div>
            )}

            <div className="form-actions">
              <button type="submit" className="btn btn-primary" disabled={loading} style={{ flex: 2 }}>
                {loading ? 'Processing...' : mode === 'manual' ? 'Finalize & Create Exam' : 'Upload & Create Paper'}
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => navigate('/')} style={{ flex: 1 }}>
                Discard Draft
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
};

export default ExamCreator;
