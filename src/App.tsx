import { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from '@google/genai';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Send, User, Bot, Loader2, Sparkles, BookOpen, Calculator, PenTool } from 'lucide-react';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

type Message = {
  id: string;
  role: 'user' | 'model';
  content: string;
};

const SYSTEM_INSTRUCTION = `You are StudyBuddy, a highly efficient AI tutor. 
Your goal is to provide the simplest and most direct answers possible.
When a student asks a question:
1. Give the final answer immediately and clearly upfront.
2. Keep any explanations extremely brief, simple, and to the point.
3. Use the simplest language possible. Do not overcomplicate.
4. Format your responses using Markdown for readability.
Do not use Socratic questioning. Do not write long paragraphs. Provide the direct, simple solution right away.`;

const SUGGESTIONS = [
  { icon: <Calculator className="w-4 h-4" />, text: "Help me solve this algebra equation: 2x + 5 = 15" },
  { icon: <BookOpen className="w-4 h-4" />, text: "Can you explain the water cycle?" },
  { icon: <PenTool className="w-4 h-4" />, text: "How do I write a good thesis statement?" },
  { icon: <Sparkles className="w-4 h-4" />, text: "What are the main causes of World War I?" },
];

const Starfield = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let stars: { x: number; y: number; radius: number; speed: number; alpha: number }[] = [];

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      initStars();
    };

    const initStars = () => {
      stars = [];
      const numStars = Math.floor((canvas.width * canvas.height) / 1500);
      for (let i = 0; i < numStars; i++) {
        stars.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          radius: Math.random() * 1.2 + 0.1,
          speed: Math.random() * 0.3 + 0.05,
          alpha: Math.random() * 0.5 + 0.3,
        });
      }
    };

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      stars.forEach((star) => {
        ctx.fillStyle = `rgba(255, 255, 255, ${star.alpha})`;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
        ctx.fill();

        star.y -= star.speed;
        if (star.y < 0) {
          star.y = canvas.height;
          star.x = Math.random() * canvas.width;
        }
      });

      animationFrameId = requestAnimationFrame(draw);
    };

    window.addEventListener('resize', resize);
    resize();
    draw();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-0" />;
};

export default function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatRef = useRef<any>(null);

  useEffect(() => {
    chatRef.current = ai.chats.create({
      model: 'gemini-3-flash-preview',
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.7,
      },
    });
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent | string) => {
    if (typeof e !== 'string') e.preventDefault();
    
    const text = typeof e === 'string' ? e : input;
    if (!text.trim() || isLoading) return;

    const userMessage: Message = { id: Date.now().toString(), role: 'user', content: text };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const responseStream = await chatRef.current.sendMessageStream({ message: text });
      
      let fullResponse = '';
      const botMessageId = (Date.now() + 1).toString();
      
      setMessages((prev) => [...prev, { id: botMessageId, role: 'model', content: '' }]);

      for await (const chunk of responseStream) {
        fullResponse += chunk.text;
        setMessages((prev) => 
          prev.map((msg) => 
            msg.id === botMessageId ? { ...msg, content: fullResponse } : msg
          )
        );
      }
    } catch (error) {
      console.error("Error sending message:", error);
      setMessages((prev) => [
        ...prev, 
        { id: Date.now().toString(), role: 'model', content: "**Error:** I'm having trouble connecting right now. Please try again later." }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-[#05050a] text-slate-100 font-sans relative overflow-hidden">
      <Starfield />
      
      {/* Header */}
      <header className="bg-[#05050a]/80 backdrop-blur-md border-b border-white/10 p-4 sticky top-0 z-10 shadow-sm">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <div className="bg-indigo-500/20 text-indigo-400 p-2 rounded-xl border border-indigo-500/30">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-100">StudyBuddy AI</h1>
            <p className="text-sm text-slate-400">Your personal AI tutor</p>
          </div>
        </div>
      </header>

      {/* Chat Area */}
      <main className="flex-1 overflow-y-auto p-4 md:p-6 relative z-10">
        <div className="max-w-4xl mx-auto flex flex-col gap-6">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full mt-20 text-center animate-in fade-in slide-in-from-bottom-4 duration-700">
              <div className="bg-indigo-500/20 p-4 rounded-full mb-6 text-indigo-400 border border-indigo-500/30">
                <BookOpen className="w-12 h-12" />
              </div>
              <h2 className="text-3xl font-bold text-slate-100 mb-4">How can I help you study today?</h2>
              <p className="text-slate-400 max-w-md mb-8">
                I can help you understand complex topics, solve math problems step-by-step, or review your essays.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full max-w-2xl">
                {SUGGESTIONS.map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => handleSubmit(suggestion.text)}
                    className="flex items-center gap-3 p-4 bg-white/5 border border-white/10 rounded-xl hover:border-indigo-500/50 hover:bg-white/10 transition-all text-left group"
                  >
                    <div className="text-indigo-400 group-hover:scale-110 transition-transform">
                      {suggestion.icon}
                    </div>
                    <span className="text-sm text-slate-300 font-medium">{suggestion.text}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg) => (
              <div 
                key={msg.id} 
                className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
              >
                <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                  msg.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                }`}>
                  {msg.role === 'user' ? <User className="w-6 h-6" /> : <Bot className="w-6 h-6" />}
                </div>
                <div className={`max-w-[85%] md:max-w-[75%] rounded-2xl p-4 ${
                  msg.role === 'user' 
                    ? 'bg-indigo-600 text-white rounded-tr-none' 
                    : 'bg-white/10 border border-white/10 shadow-sm rounded-tl-none text-slate-200 backdrop-blur-sm'
                }`}>
                  {msg.role === 'user' ? (
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  ) : (
                    <div className="prose prose-invert max-w-none prose-p:leading-relaxed prose-pre:bg-black/50 prose-pre:border prose-pre:border-white/10">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {msg.content || '...'}
                      </ReactMarkdown>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
          {isLoading && messages.length > 0 && messages[messages.length - 1].role === 'user' && (
             <div className="flex gap-4">
               <div className="flex-shrink-0 w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
                 <Bot className="w-6 h-6" />
               </div>
               <div className="bg-white/10 border border-white/10 shadow-sm rounded-2xl rounded-tl-none p-4 flex items-center gap-3 backdrop-blur-sm">
                 <Loader2 className="w-5 h-5 text-emerald-400 animate-spin" />
                 <span className="text-slate-400 text-sm font-medium">Thinking...</span>
               </div>
             </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* Input Area */}
      <footer className="bg-[#05050a]/80 backdrop-blur-md border-t border-white/10 p-4 relative z-10">
        <div className="max-w-4xl mx-auto">
          <form 
            onSubmit={handleSubmit}
            className="flex items-end gap-2 bg-white/5 border border-white/10 rounded-2xl p-2 focus-within:ring-2 focus-within:ring-indigo-500/50 focus-within:border-indigo-500/50 transition-all shadow-sm"
          >
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
              placeholder="Ask a question or share a problem..."
              className="flex-1 max-h-32 min-h-[44px] bg-transparent border-none focus:ring-0 resize-none py-2 px-3 text-slate-100 placeholder-slate-500"
              rows={1}
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-white/10 disabled:text-slate-600 text-white p-3 rounded-xl transition-colors flex-shrink-0 mb-0.5"
            >
              <Send className="w-5 h-5" />
            </button>
          </form>
          <p className="text-center text-xs text-slate-500 mt-3">
            StudyBuddy can make mistakes. Consider verifying important information.
          </p>
        </div>
      </footer>
    </div>
  );
}
