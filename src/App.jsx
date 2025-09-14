// src/App.jsx
import React, { useState, useRef, useEffect } from 'react';
import ChatPanel from './components/ChatPanel';
import Avatar from './components/Avatar';

export default function App() {
  const [audioSrc, setAudioSrc] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef(null);

  useEffect(() => {
    if (audioRef.current && audioSrc) {
      const playAudio = async () => {
        try {
          await audioRef.current.play();
          setIsPlaying(true);
        } catch (error) {
          console.error('Audio play error:', error);
          // Handle autoplay restrictions
          if (error.name === 'NotAllowedError') {
            alert('Please click anywhere to enable audio playback');
          }
        }
      };
      playAudio();
    }
  }, [audioSrc]);

  const handleReply = (audioBase64) => {
    const audioUrl = `data:audio/mpeg;base64,${audioBase64}`;
    setAudioSrc(audioUrl);
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Left side: Chat */}
      <div className="w-1/2 border-r bg-white p-4 flex flex-col">
        <h1 className="text-xl font-bold mb-2">AI Avatar Chatbot</h1>
        <ChatPanel onReply={handleReply} />
      </div>

      {/* Right side: Avatar */}
      <div className="w-1/2 flex items-center justify-center bg-gray-50">
        <Avatar audioRef={audioRef} isPlaying={isPlaying} setIsPlaying={setIsPlaying} />
      </div>

      {/* Hidden audio element */}
      <audio ref={audioRef} src={audioSrc} onEnded={() => setIsPlaying(false)} hidden />
    </div>
  );
}
