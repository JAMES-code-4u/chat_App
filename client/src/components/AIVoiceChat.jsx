import { useState, useEffect, useRef } from 'react';

function AIVoiceChat({ onSendMessage, messages, userId }) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [autoRead, setAutoRead] = useState(true);
  const recognitionRef = useRef(null);
  const synthRef = useRef(window.speechSynthesis);
  const lastMessageIdRef = useRef(null);

  // Initialize speech recognition
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript;
        } else {
          interimTranscript += result[0].transcript;
        }
      }

      setTranscript(finalTranscript || interimTranscript);

      if (finalTranscript) {
        onSendMessage(finalTranscript);
        setTranscript('');
        setIsListening(false);
      }
    };

    recognition.onerror = () => {
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.abort();
    };
  }, [onSendMessage]);

  // Auto-read incoming messages
  useEffect(() => {
    if (!autoRead || messages.length === 0) return;

    const lastMsg = messages[messages.length - 1];
    if (!lastMsg || lastMsg.sender_id === userId) return;
    if (lastMsg.id === lastMessageIdRef.current) return;
    if (lastMsg.message_type !== 'text') return;

    lastMessageIdRef.current = lastMsg.id;
    speakText(lastMsg.content);
  }, [messages, autoRead, userId]);

  const toggleListening = () => {
    if (!recognitionRef.current) return;

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      setTranscript('');
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  const speakText = (text) => {
    if (!text || !synthRef.current) return;

    // Cancel any ongoing speech
    synthRef.current.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.volume = 1;

    // Try to pick a nice voice
    const voices = synthRef.current.getVoices();
    const preferredVoice = voices.find(v => v.name.includes('Google') && v.lang.startsWith('en')) ||
                           voices.find(v => v.lang.startsWith('en'));
    if (preferredVoice) utterance.voice = preferredVoice;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);

    synthRef.current.speak(utterance);
  };

  const stopSpeaking = () => {
    synthRef.current?.cancel();
    setIsSpeaking(false);
  };

  return (
    <div className="ai-voice-bar">
      <div className="voice-bar-content">
        {/* Mic Button */}
        <button
          className={`voice-mic-btn ${isListening ? 'listening' : ''}`}
          onClick={toggleListening}
          title={isListening ? 'Stop listening' : 'Start voice input'}
        >
          <div className="mic-pulse-ring"></div>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 1a3 3 0 00-3 3v8a3 3 0 106 0V4a3 3 0 00-3-3z"/>
            <path d="M19 10v2a7 7 0 01-14 0v-2M12 19v4M8 23h8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>

        {/* Status */}
        <div className="voice-status">
          {isListening ? (
            <div className="voice-listening">
              <div className="wave-bars">
                <span></span><span></span><span></span><span></span><span></span>
              </div>
              <span className="voice-label">
                {transcript || 'Listening...'}
              </span>
            </div>
          ) : isSpeaking ? (
            <div className="voice-speaking">
              <div className="speaker-icon">🔊</div>
              <span>Reading message aloud...</span>
              <button className="stop-speak-btn" onClick={stopSpeaking}>Stop</button>
            </div>
          ) : (
            <span className="voice-idle">
              🎤 AI Voice Mode — Tap mic to speak, messages will be read aloud
            </span>
          )}
        </div>

        {/* Auto-read toggle */}
        <label className="auto-read-toggle" title="Auto-read incoming messages">
          <input
            type="checkbox"
            checked={autoRead}
            onChange={(e) => setAutoRead(e.target.checked)}
          />
          <span className="toggle-slider"></span>
          <span className="toggle-label">Auto-read</span>
        </label>
      </div>
    </div>
  );
}

export default AIVoiceChat;
