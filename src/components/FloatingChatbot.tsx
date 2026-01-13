import { useState, useRef, useEffect } from 'react';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { MessageCircle, Send, X, Minimize2, Settings } from 'lucide-react';
import { api } from '../lib/api';
import { AISettingsDialog } from './AISettingsDialog';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
}

export function FloatingChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [showAISettings, setShowAISettings] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: 'Hi! I\'m here to help answer your questions about UTM Mandarin Club. You can ask me about meeting times, venues, membership, activities, and more!',
      sender: 'bot',
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [iconPosition, setIconPosition] = useState({ x: window.innerWidth - 90, y: window.innerHeight - 90 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  
  const chatRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleMouseDown = (e: React.MouseEvent) => {
    // Only allow dragging when closed (icon mode)
    if (!isOpen) {
      setIsDragging(true);
      setDragOffset({
        x: e.clientX - iconPosition.x,
        y: e.clientY - iconPosition.y
      });
    }
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging && !isOpen) {
      const newX = Math.max(0, Math.min(e.clientX - dragOffset.x, window.innerWidth - 60));
      const newY = Math.max(0, Math.min(e.clientY - dragOffset.y, window.innerHeight - 60));
      setIconPosition({ x: newX, y: newY });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, dragOffset, isOpen]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: input,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    const currentInput = input;
    setInput('');
    setLoading(true);

    try {
      const response = await api.askChatbot(currentInput);
      
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: response.answer || 'I received your question but couldn\'t generate a response.',
        sender: 'bot',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error('Chatbot error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: 'Sorry, I encountered an error. Please try asking your question in a different way, or contact our club admins at mandarinclub@utm.edu.',
        sender: 'bot',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const quickQuestions = [
    'How much is membership?',
    'How to join?',
    'What are the levels?',
    'How to check in?'
  ];

  const handleQuickQuestion = (question: string) => {
    setInput(question);
  };

  if (!isOpen) {
    return (
      <button
        onMouseDown={handleMouseDown}
        onClick={(e) => {
          // Only open if we're not dragging
          if (!isDragging) {
            setIsOpen(true);
          }
        }}
        className="fixed w-14 h-14 bg-red-600 hover:bg-red-700 text-white rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-110 z-50 cursor-move"
        style={{
          left: `${iconPosition.x}px`,
          top: `${iconPosition.y}px`,
        }}
      >
        <MessageCircle className="w-6 h-6" />
      </button>
    );
  }

  return (
    <>
      <div
        ref={chatRef}
        className="fixed bottom-6 right-6 z-50"
        style={{
          width: '380px'
        }}
      >
        <Card className="shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-red-600 text-white p-4 select-none flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5" />
              <div>
                <h3 className="font-medium">Club Assistant</h3>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowAISettings(true);
                }}
                className="hover:bg-red-700 p-1 rounded"
                title="Configure AI"
              >
                <Settings className="w-4 h-4" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsMinimized(!isMinimized);
                }}
                className="hover:bg-red-700 p-1 rounded"
              >
                <Minimize2 className="w-4 h-4" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsOpen(false);
                }}
                className="hover:bg-red-700 p-1 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Chat Body */}
          {!isMinimized && (
            <>
              <div className="h-96 overflow-y-auto p-4 space-y-4 bg-white">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg px-4 py-2 ${
                        message.sender === 'user'
                          ? 'bg-red-600 text-white'
                          : 'bg-gray-100 text-gray-900'
                      }`}
                    >
                      <p className="text-sm whitespace-pre-line">{message.text}</p>
                    </div>
                  </div>
                ))}
                {loading && (
                  <div className="flex justify-start">
                    <div className="bg-gray-100 rounded-lg px-4 py-2">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Quick Questions */}
              {messages.length === 1 && (
                <div className="flex flex-wrap gap-2 p-4 bg-gray-50 border-t">
                  {quickQuestions.map((question) => (
                    <button
                      key={question}
                      onClick={() => handleQuickQuestion(question)}
                      className="px-3 py-1 text-xs bg-white hover:bg-gray-100 border rounded-full transition-colors"
                    >
                      {question}
                    </button>
                  ))}
                </div>
              )}

              {/* Input */}
              <div className="p-4 bg-white border-t flex gap-2">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type your question..."
                  disabled={loading}
                  className="flex-1"
                />
                <Button onClick={handleSend} disabled={loading || !input.trim()} size="sm">
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </>
          )}
        </Card>
      </div>

      {/* AI Settings Dialog */}
      <AISettingsDialog 
        open={showAISettings} 
        onClose={() => setShowAISettings(false)} 
      />
    </>
  );
}