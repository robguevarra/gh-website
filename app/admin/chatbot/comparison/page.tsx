'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2, AlertCircle, Sparkles, RefreshCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import axios from 'axios';

type Message = {
    role: 'user' | 'assistant';
    content: string;
    latency?: number;
    intent?: string;
    error?: boolean;
    escalate?: boolean;
    send_enroll_link?: boolean;
    model?: string;
};

interface ChatWindowProps {
    version: 'v1' | 'v2';
    title: string;
    description?: string;
    messages: Message[];
    isTyping: boolean;
}

function ChatWindow({ version, title, description, messages, isTyping }: ChatWindowProps) {
    const scrollRef = useRef<HTMLDivElement>(null);
    const viewportRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom
    useEffect(() => {
        const scrollToBottom = () => {
            if (viewportRef.current) {
                viewportRef.current.scrollTop = viewportRef.current.scrollHeight;
            }
        };
        scrollToBottom();
        // Small timeout to ensure content rendered
        setTimeout(scrollToBottom, 100);
    }, [messages, isTyping]);

    const isV2 = version === 'v2';

    return (
        <Card className={cn(
            "flex flex-col h-[500px] lg:h-[650px] overflow-hidden border shadow-md transition-all duration-300",
            isV2 ? "border-indigo-200 dark:border-indigo-800 shadow-indigo-100/20" : "border-slate-200 dark:border-slate-800"
        )}>
            {/* Header */}
            <div className={cn(
                "p-4 border-b flex items-center justify-between backdrop-blur-sm",
                isV2 ? "bg-indigo-50/50 dark:bg-indigo-950/20" : "bg-slate-50/50 dark:bg-slate-900/20"
            )}>
                <div className="flex flex-col">
                    <div className="flex items-center gap-2 font-semibold text-sm lg:text-base">
                        {isV2 ? <Sparkles className="h-4 w-4 text-indigo-500" /> : <Bot className="h-4 w-4 text-slate-500" />}
                        {title}
                    </div>
                    {description && <span className="text-[10px] text-muted-foreground hidden sm:inline-block">{description}</span>}
                </div>
                <Badge variant={isV2 ? "default" : "outline"} className={cn("text-xs", isV2 && "bg-indigo-500 hover:bg-indigo-600")}>
                    {version.toUpperCase()}
                </Badge>
            </div>

            {/* Messages Area */}
            <div
                ref={viewportRef}
                className="flex-1 overflow-y-auto p-4 space-y-6 scroll-smooth"
            >
                {messages.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-center p-8 opacity-40 select-none">
                        <Bot className="h-12 w-12 mb-2 text-slate-300 dark:text-slate-700" />
                        <p className="text-sm font-medium">Ready to test</p>
                        <p className="text-xs">Send a message to compare responses</p>
                    </div>
                )}

                {messages.map((msg, i) => (
                    <div
                        key={i}
                        className={cn(
                            "flex flex-col max-w-[90%] gap-1 animate-in fade-in slide-in-from-bottom-2 duration-300",
                            msg.role === "user" ? "ml-auto items-end" : "mr-auto items-start"
                        )}
                    >
                        <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider font-semibold opacity-50 px-1">
                            {msg.role === 'user' ? 'You' : title}
                        </div>

                        <div className={cn(
                            "rounded-2xl px-4 py-3 text-sm shadow-sm whitespace-pre-wrap break-words leading-relaxed",
                            msg.role === "user"
                                ? "bg-primary text-primary-foreground rounded-tr-sm"
                                : "bg-muted/80 backdrop-blur-sm border rounded-tl-sm"
                        )}>
                            {msg.content}
                        </div>

                        {msg.role === 'assistant' && (
                            <div className="flex flex-wrap gap-2 px-1 mt-1">
                                {msg.latency && (
                                    <Badge variant="secondary" className="text-[10px] h-5 px-1.5 font-mono text-muted-foreground bg-slate-100 dark:bg-slate-800 border-0">
                                        {msg.latency}ms
                                    </Badge>
                                )}
                                {msg.model && (
                                    <Badge variant="outline" className="text-[10px] h-5 px-1.5 border-blue-200 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30">
                                        🤖 {msg.model}
                                    </Badge>
                                )}
                                {msg.intent && (
                                    <Badge variant="outline" className="text-[10px] h-5 px-1.5 border-indigo-200 text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/30">
                                        🎯 {msg.intent}
                                    </Badge>
                                )}
                                {msg.send_enroll_link && (
                                    <Badge variant="outline" className="text-[10px] h-5 px-1.5 border-emerald-200 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30">
                                        🔗 Link Sent
                                    </Badge>
                                )}
                                {msg.escalate && (
                                    <Badge variant="outline" className="text-[10px] h-5 px-1.5 border-orange-200 text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/30">
                                        👨‍💻 Escalate
                                    </Badge>
                                )}
                                {msg.error && (
                                    <span className="text-[10px] text-red-500 flex items-center gap-1">
                                        <AlertCircle className="h-3 w-3" /> Error
                                    </span>
                                )}
                            </div>
                        )}
                    </div>
                ))}

                {isTyping && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground ml-2 animate-pulse">
                        <div className="h-2 w-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                        <div className="h-2 w-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                        <div className="h-2 w-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                )}
            </div>
        </Card>
    );
}

export default function ComparisonArena() {
    const [input, setInput] = useState('');
    const [historyV1, setHistoryV1] = useState<Message[]>([]);
    const [historyV2, setHistoryV2] = useState<Message[]>([]);
    const [loadingV1, setLoadingV1] = useState(false);
    const [loadingV2, setLoadingV2] = useState(false);

    const handleSend = async () => {
        if (!input.trim() || (loadingV1 || loadingV2)) return;

        const userText = input;
        const userMsg: Message = { role: 'user', content: userText };

        // Optimistic UI update
        setHistoryV1(prev => [...prev, userMsg]);
        setHistoryV2(prev => [...prev, userMsg]);
        setInput('');

        // Parallel Requests
        setLoadingV1(true);
        setLoadingV2(true);

        const fetchResponse = async (version: 'v1' | 'v2') => {
            try {
                const res = await axios.post('/api/chat-proxy', {
                    version,
                    message: userText,
                    user_id: `admin_ref_${Date.now()}`
                }, {
                    headers: { 'Content-Type': 'application/json' }
                });

                const data = res.data;
                const botMsg: Message = {
                    role: 'assistant',
                    content: data.reply || data.message || JSON.stringify(data),
                    latency: data.latency,
                    intent: data.intent,
                    model: data.model, // Capture Model
                    escalate: data.escalate, // Capture Escalate Flag
                    send_enroll_link: data.send_enroll_link, // Capture Link Flag
                    error: false
                };
                return botMsg;
            } catch (err: any) {
                console.error(`Error fetching ${version}:`, err);
                return {
                    role: 'assistant',
                    content: err.response?.data?.error || "Failed to connect to bot service.",
                    error: true
                } as Message;
            }
        };

        // Execute both
        const [resV1, resV2] = await Promise.all([
            fetchResponse('v1'),
            fetchResponse('v2')
        ]);

        setHistoryV1(prev => [...prev, resV1]);
        setHistoryV2(prev => [...prev, resV2]);

        setLoadingV1(false);
        setLoadingV2(false);
    };

    const resetChat = () => {
        setHistoryV1([]);
        setHistoryV2([]);
    };

    return (
        <div className="flex flex-col space-y-4 max-w-[1600px] mx-auto pb-4">
            {/* Header Actions */}
            <div className="flex flex-col gap-4 py-2">
                <div className="flex items-center text-sm text-muted-foreground">
                    <a href="/admin/chatbot" className="hover:text-primary transition-colors">Chatbot</a>
                    <span className="mx-2">/</span>
                    <span className="font-medium text-foreground">Arena</span>
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                        <h2 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400 bg-clip-text text-transparent">
                            Battle Arena
                        </h2>
                        <p className="text-sm text-muted-foreground">Real-time comparison of Bot V1 (Production) vs V2 (Staging)</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={resetChat} className="text-xs">
                        <RefreshCcw className="h-3.5 w-3.5 mr-2" />
                        Reset Session
                    </Button>
                </div>
            </div>

            {/* Split View */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6 items-start h-full">
                <ChatWindow
                    version="v1"
                    title="Legacy Bot"
                    description="Standard logic. Good baseline."
                    messages={historyV1}
                    isTyping={loadingV1}
                />
                <ChatWindow
                    version="v2"
                    title="Smart Bot"
                    description="Dual-Brain (4o-mini + 5-mini). Context aware."
                    messages={historyV2}
                    isTyping={loadingV2}
                />
            </div>

            {/* Input Area - Sticky Bottom Mobile Friendly */}
            <div className="sticky bottom-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 py-4 -mx-4 px-4 border-t lg:border-0 lg:static lg:bg-transparent lg:p-0">
                <div className="relative max-w-4xl mx-auto flex gap-2">
                    <Input
                        className="flex-1 min-h-[50px] text-base shadow-sm border-slate-300 dark:border-slate-700 focus-visible:ring-indigo-500"
                        placeholder="Type a message to challenge both bots..."
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                        disabled={loadingV1 || loadingV2}
                        autoFocus
                    />
                    <Button
                        size="icon"
                        className={cn(
                            "h-[50px] w-[50px] rounded-lg shadow-lg transition-all",
                            loadingV1 || loadingV2 ? "opacity-50 cursor-not-allowed" : "hover:scale-105 active:scale-95 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white border-0"
                        )}
                        onClick={handleSend}
                        disabled={loadingV1 || loadingV2}
                    >
                        {loadingV1 || loadingV2 ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                    </Button>
                </div>
                <p className="text-[10px] text-center text-muted-foreground mt-2 hidden lg:block">
                    PRO TIP: Ask about pricing to see how V2 handles formatting compared to V1.
                </p>
            </div>
        </div>
    );
}
