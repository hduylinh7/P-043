'use client';

import React, { useState, useEffect, useRef } from 'react';
import { api, ChatMessage, ChatSession } from '../services/api';
import { Send, Bot, User, Plus, MessageSquare, Database, HardDrive, RefreshCw } from 'lucide-react';

export default function ChatInterface() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ agent: string; redis_connected: boolean } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadSessions();
    checkHealth();
  }, []);

  useEffect(() => {
    if (currentSessionId) {
      loadMessages(currentSessionId);
    }
  }, [currentSessionId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const checkHealth = async () => {
    try {
      const res = await api.checkStatus();
      setStatus({ agent: res.agent, redis_connected: res.redis_connected });
    } catch {
      setStatus(null);
    }
  };

  const loadSessions = async () => {
    try {
      const list = await api.getSessions();
      setSessions(list);
      if (list.length > 0 && !currentSessionId) {
        setCurrentSessionId(list[0].id);
      }
    } catch (err) {
      console.error('Failed to load sessions:', err);
    }
  };

  const loadMessages = async (sessionId: string) => {
    try {
      const history = await api.getMessages(sessionId);
      setMessages(history);
    } catch (err) {
      console.error('Failed to load messages:', err);
    }
  };

  const handleNewChat = () => {
    setCurrentSessionId(null);
    setMessages([]);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userText = input.trim();
    setInput('');
    const tempUserMsg: ChatMessage = { role: 'user', content: userText };
    setMessages((prev) => [...prev, tempUserMsg]);
    setLoading(true);

    try {
      const res = await api.sendMessage(userText, currentSessionId || undefined);
      if (!currentSessionId && res.session_id) {
        setCurrentSessionId(res.session_id);
        loadSessions();
      }
      const assistantMsg: ChatMessage = {
        role: 'assistant',
        content: res.response,
        citations: res.citations,
        sources: res.sources,
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: '❌ Connection error to FastAPI backend.' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 font-sans">
      {/* Sidebar */}
      <div className="w-64 border-r border-slate-800 bg-slate-900/60 p-4 flex flex-col justify-between">
        <div>
          <button
            onClick={handleNewChat}
            className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-4 rounded-lg transition-colors font-medium text-sm mb-4"
          >
            <Plus size={16} /> New Chat
          </button>
          
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 px-1">
            Recent Conversations
          </div>

          <div className="space-y-1 overflow-y-auto max-h-[60vh]">
            {sessions.map((s) => (
              <button
                key={s.id}
                onClick={() => setCurrentSessionId(s.id)}
                className={`w-full flex items-center gap-2 text-left text-sm py-2 px-3 rounded-md transition-colors ${
                  currentSessionId === s.id
                    ? 'bg-slate-800 text-indigo-400 font-medium'
                    : 'text-slate-300 hover:bg-slate-800/50'
                }`}
              >
                <MessageSquare size={14} />
                <span className="truncate">{s.title || 'Untitled Chat'}</span>
              </button>
            ))}
          </div>
        </div>

        {/* System Status Indicators */}
        <div className="pt-4 border-t border-slate-800 text-xs text-slate-400 space-y-2">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5"><Database size={13} /> PostgreSQL</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          </div>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5"><HardDrive size={13} /> Redis Cache</span>
            <span className={`w-2 h-2 rounded-full ${status?.redis_connected ? 'bg-emerald-500' : 'bg-blue-500'}`}></span>
          </div>
        </div>
      </div>

      {/* Main Chat View */}
      <div className="flex-1 flex flex-col bg-slate-950">
        {/* Header */}
        <div className="h-14 border-b border-slate-800 px-6 flex items-center justify-between bg-slate-900/30">
          <div className="flex items-center gap-2">
            <Bot size={20} className="text-indigo-400" />
            <h1 className="font-semibold text-slate-200">AI Learning Companion</h1>
            <span className="text-xs bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded-full">
              LangGraph RAG Agent
            </span>
          </div>
          <button onClick={checkHealth} title="Refresh status" className="text-slate-400 hover:text-slate-200">
            <RefreshCw size={15} />
          </button>
        </div>

        {/* Messages list */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-3">
              <Bot size={48} className="text-indigo-500/40" />
              <p className="text-sm">Start a conversation with the AI Learning Companion</p>
            </div>
          ) : (
            messages.map((m, idx) => (
              <div
                key={idx}
                className={`flex gap-3 max-w-3xl ${
                  m.role === 'user' ? 'ml-auto flex-row-reverse' : ''
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                    m.role === 'user'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-800 border border-slate-700 text-indigo-400'
                  }`}
                >
                  {m.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                </div>

                <div className="space-y-2">
                  <div
                    className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                      m.role === 'user'
                        ? 'bg-indigo-600 text-white rounded-tr-none'
                        : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-tl-none'
                    }`}
                  >
                    {m.content}
                  </div>

                  {m.role === 'assistant' && m.sources && m.sources.length > 0 && (
                    <div className="flex items-center gap-1.5 flex-wrap text-xs text-slate-400 pl-1">
                      <span className="font-semibold text-indigo-400">📚 Reference Materials:</span>
                      {m.sources.map((src, sIdx) => (
                        <span
                          key={sIdx}
                          className="bg-slate-800 border border-slate-700 text-slate-300 px-2 py-0.5 rounded-md"
                        >
                          {src}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
          {loading && (
            <div className="flex gap-3 max-w-3xl">
              <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 text-indigo-400 flex items-center justify-center">
                <Bot size={16} />
              </div>
              <div className="bg-slate-900 border border-slate-800 px-4 py-3 rounded-2xl text-sm text-slate-400 animate-pulse">
                RAG Agent searching materials & generating response...
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <form onSubmit={handleSend} className="p-4 border-t border-slate-800 bg-slate-900/30">
          <div className="max-w-3xl mx-auto flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask the AI agent anything..."
              className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-4 py-2.5 rounded-lg transition-colors flex items-center gap-1 font-medium text-sm"
            >
              <Send size={16} />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
