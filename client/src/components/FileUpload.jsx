import { useState, useRef, useCallback } from 'react';

const API_URL = 'http://localhost:3001';

function FileUpload({ token, onClose, onUploaded }) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [preview, setPreview] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const inputRef = useRef(null);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, []);

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) processFile(file);
  };

  const processFile = (file) => {
    setSelectedFile(file);

    // Generate preview
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => setPreview({ type: 'image', url: e.target.result });
      reader.readAsDataURL(file);
    } else if (file.type.startsWith('video/')) {
      setPreview({ type: 'video', url: URL.createObjectURL(file) });
    } else if (file.type.startsWith('audio/')) {
      setPreview({ type: 'audio', url: URL.createObjectURL(file) });
    } else {
      setPreview({ type: 'file', name: file.name, size: file.size });
    }
  };

  const uploadFile = async () => {
    if (!selectedFile) return;
    setUploading(true);

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      const res = await fetch(`${API_URL}/api/upload`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });

      clearInterval(progressInterval);
      setProgress(100);

      if (!res.ok) throw new Error('Upload failed');

      const data = await res.json();
      setTimeout(() => onUploaded(data), 300);
    } catch (err) {
      console.error('Upload error:', err);
      setUploading(false);
      setProgress(0);
    }
  };

  const formatSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  };

  return (
    <div className="file-upload-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="file-upload-modal">
        <div className="file-upload-header">
          <h3>Share a File</h3>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        {!selectedFile ? (
          <div
            className={`drop-zone ${isDragging ? 'dragging' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
          >
            <div className="drop-icon">
              <svg viewBox="0 0 64 64" fill="none">
                <rect x="8" y="16" width="48" height="40" rx="4" stroke="currentColor" strokeWidth="2"/>
                <path d="M32 28v16M24 36l8-8 8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M20 16V12a4 4 0 014-4h16a4 4 0 014 4v4" stroke="currentColor" strokeWidth="2"/>
              </svg>
            </div>
            <p className="drop-text">Drag & drop your file here</p>
            <span className="drop-hint">or click to browse</span>
            <span className="drop-formats">Images, Videos, Audio, ZIP, Documents (max 50MB)</span>
            <input
              ref={inputRef}
              type="file"
              onChange={handleFileSelect}
              style={{ display: 'none' }}
              accept="image/*,video/*,audio/*,.zip,.rar,.7z,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv"
            />
          </div>
        ) : (
          <div className="file-preview-area">
            {preview?.type === 'image' && (
              <img src={preview.url} alt="Preview" className="preview-image" />
            )}
            {preview?.type === 'video' && (
              <video src={preview.url} controls className="preview-video" />
            )}
            {preview?.type === 'audio' && (
              <div className="preview-audio">
                <div className="audio-wave-icon">🎵</div>
                <audio src={preview.url} controls />
              </div>
            )}
            {preview?.type === 'file' && (
              <div className="preview-file">
                <div className="preview-file-icon">📄</div>
                <span className="preview-file-name">{preview.name}</span>
              </div>
            )}

            <div className="file-details">
              <span className="file-detail-name">{selectedFile.name}</span>
              <span className="file-detail-size">{formatSize(selectedFile.size)}</span>
            </div>

            {uploading && (
              <div className="upload-progress">
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${progress}%` }}></div>
                </div>
                <span>{progress}%</span>
              </div>
            )}

            <div className="file-actions">
              <button className="cancel-btn" onClick={() => { setSelectedFile(null); setPreview(null); }}>
                Change File
              </button>
              <button className="upload-btn" onClick={uploadFile} disabled={uploading}>
                {uploading ? 'Uploading...' : 'Send'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default FileUpload;
