import '../styles/chat.css';

function MessageBubble({ message, isOwn, formatTime }) {
  const renderContent = () => {
    switch (message.message_type) {
      case 'image':
        return (
          <div className="msg-media">
            <img
              src={`http://localhost:3001${message.file_url}`}
              alt={message.file_name || 'Image'}
              className="msg-image"
              loading="lazy"
              onClick={() => window.open(`http://localhost:3001${message.file_url}`, '_blank')}
            />
            {message.content && <p className="msg-caption">{message.content}</p>}
          </div>
        );

      case 'video':
        return (
          <div className="msg-media">
            <video
              src={`http://localhost:3001${message.file_url}`}
              controls
              className="msg-video"
              preload="metadata"
            />
            {message.content && <p className="msg-caption">{message.content}</p>}
          </div>
        );

      case 'audio':
        return (
          <div className="msg-audio">
            <div className="audio-icon">🎵</div>
            <audio
              src={`http://localhost:3001${message.file_url}`}
              controls
              className="msg-audio-player"
            />
            <span className="audio-name">{message.file_name}</span>
          </div>
        );

      case 'file':
        return (
          <div className="msg-file">
            <div className="file-icon">
              {getFileIcon(message.file_name)}
            </div>
            <div className="file-info">
              <span className="file-name">{message.file_name}</span>
              <span className="file-size">{formatFileSize(message.file_size)}</span>
            </div>
            <a
              href={`http://localhost:3001${message.file_url}`}
              download={message.file_name}
              className="file-download"
              title="Download"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </a>
          </div>
        );

      default:
        return <p className="msg-text">{message.content}</p>;
    }
  };

  return (
    <div className={`message-bubble ${isOwn ? 'own' : 'other'}`}>
      <div className="bubble-content">
        {renderContent()}
        <div className="bubble-meta">
          <span className="bubble-time">{formatTime(message.created_at)}</span>
          {isOwn && (
            <span className={`bubble-status ${message.is_read ? 'read' : ''}`}>
              {message.is_read ? '✓✓' : '✓'}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function getFileIcon(filename) {
  if (!filename) return '📄';
  const ext = filename.split('.').pop().toLowerCase();
  const icons = {
    pdf: '📕', doc: '📘', docx: '📘', xls: '📗', xlsx: '📗',
    ppt: '📙', pptx: '📙', zip: '🗜️', rar: '🗜️', '7z': '🗜️',
    txt: '📝', csv: '📊', json: '📋', xml: '📋',
    mp3: '🎵', wav: '🎵', ogg: '🎵', flac: '🎵',
    mp4: '🎬', avi: '🎬', mkv: '🎬', mov: '🎬',
    jpg: '🖼️', jpeg: '🖼️', png: '🖼️', gif: '🖼️', svg: '🖼️', webp: '🖼️'
  };
  return icons[ext] || '📄';
}

function formatFileSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1048576).toFixed(1) + ' MB';
}

export default MessageBubble;
