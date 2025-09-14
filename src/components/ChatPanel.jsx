
// src/components/ChatPanel.jsx
import React, { useState } from 'react';

export default function ChatPanel({ onReply }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');

  const sendMessage = async () => {
    if (!input.trim()) return;
    
    const userMsg = { role: 'user', content: input };
    setMessages([...messages, userMsg]);
    setInput('');

    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';
      const res = await fetch(`${backendUrl}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: input })
      });
      
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      
      const data = await res.json();
      setMessages(prev => [...prev, { role: 'bot', content: data.text || 'No response received' }]);
      
      if (data.audio && onReply) {
        onReply(data.audio);
      }
    } catch (err) {
      console.error('Error sending message:', err);
      setMessages(prev => [...prev, { 
        role: 'bot', 
        content: `Error: ${err.message}. Please check if the backend server is running.` 
      }]);
    }
  };

  return (
    <div className="flex flex-col flex-1">
      <div className="flex-1 overflow-y-auto border p-2 rounded bg-gray-50 mb-2">
        {messages.map((m, i) => (
          <div key={i} className={m.role === 'user' ? 'text-right' : 'text-left'}>
            <p className="inline-block bg-gray-200 rounded px-2 py-1 m-1">{m.content}</p>
          </div>
        ))}
      </div>
      <div className="flex">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
          placeholder="Type a message..."
          className="flex-1 border rounded-l px-2 py-1"
        />
        <button onClick={sendMessage} className="bg-blue-500 text-white px-3 rounded-r">Send</button>
      </div>
    </div>
  );
}
