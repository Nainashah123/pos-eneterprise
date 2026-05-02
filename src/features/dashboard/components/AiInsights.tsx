'use client';

import { useState } from 'react';
import { Sparkles, Send } from 'lucide-react';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { AI_INSIGHTS } from '@/data/mock';
import { aiApi } from '@/lib/api/client';
import { cn } from '@/lib/utils/cn';

type Message = { role: 'assistant' | 'user'; text: string };

const CHAT_MESSAGES: Message[] = [
  { role: 'assistant', text: 'Hi! I\'m your AI sales assistant. Ask me anything about your store performance, inventory, or customer trends.' },
];

const QUICK_PROMPTS = [
  'What\'s my best-selling product?',
  'How can I increase revenue?',
  'Which customers haven\'t bought recently?',
];

export function AiInsights() {
  const [messages, setMessages] = useState<Message[]>(CHAT_MESSAGES);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'insights' | 'chat'>('insights');

  const sendMessage = async (text: string) => {
    if (!text.trim()) return;
    setMessages((m) => [...m, { role: 'user', text }]);
    setInput('');
    setLoading(true);
    try {
      const reply = await aiApi.chat(text);
      setMessages((m) => [...m, { role: 'assistant', text: reply }]);
    } catch {
      setMessages((m) => [...m, { role: 'assistant', text: 'Sorry, I could not process your request. Please try again.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="flex flex-col h-full">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-indigo-500" />
          <CardTitle>AI Smart Assistant</CardTitle>
        </div>
        <div className="flex gap-1">
          {(['insights', 'chat'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                'px-3 py-1 text-xs font-medium rounded-lg capitalize transition-colors',
                activeTab === tab
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800',
              )}
            >
              {tab}
            </button>
          ))}
        </div>
      </CardHeader>

      {activeTab === 'insights' ? (
        <div className="space-y-3 flex-1 overflow-y-auto">
          {AI_INSIGHTS.map((insight) => (
            <div
              key={insight.id}
              className={cn(
                'rounded-xl p-3 border',
                insight.priority === 'high'
                  ? 'bg-red-50 border-red-100 dark:bg-red-950/30 dark:border-red-900/50'
                  : 'bg-indigo-50 border-indigo-100 dark:bg-indigo-950/30 dark:border-indigo-900/50',
              )}
            >
              <div className="flex items-start gap-2">
                <span className="text-lg leading-none">{insight.icon}</span>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-xs font-semibold text-gray-800 dark:text-gray-200">
                      {insight.title}
                    </p>
                    <Badge
                      variant={insight.priority === 'high' ? 'danger' : 'primary'}
                      className="text-[10px]"
                    >
                      {insight.priority}
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                    {insight.body}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto space-y-3 mb-3">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={cn(
                  'max-w-[85%] rounded-2xl px-3 py-2 text-xs leading-relaxed',
                  msg.role === 'assistant'
                    ? 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 self-start'
                    : 'bg-indigo-600 text-white self-end ml-auto',
                )}
              >
                {msg.text}
              </div>
            ))}
            {loading && (
              <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl px-3 py-2 max-w-[85%]">
                <div className="flex gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-gray-400 animate-bounce" />
                  <span className="h-1.5 w-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:0.1s]" />
                  <span className="h-1.5 w-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:0.2s]" />
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-1 mb-2">
            {QUICK_PROMPTS.map((p) => (
              <button
                key={p}
                onClick={() => sendMessage(p)}
                className="text-[10px] px-2 py-1 rounded-full border border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition-colors"
              >
                {p}
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage(input)}
              placeholder="Ask AI anything..."
              className="flex-1 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-2 text-xs dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
            />
            <Button size="icon-sm" onClick={() => sendMessage(input)} disabled={!input.trim() || loading}>
              <Send className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}

