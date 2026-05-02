'use client';
// WHY: 'use client' tells Next.js this file runs in the browser, not on the server.
// React hooks like useState and event handlers (onClick, onChange) only work in the browser.
// Without this directive, Next.js would try to render this on the server and crash.

import { useState } from 'react';
// WHY: useState is a React hook that lets a component "remember" a value between renders.
// Think of it like a variable that, when changed, automatically re-draws the UI.
// Without useState, any variable you change would be forgotten on the next render.

import { Sparkles, Send } from 'lucide-react';
// WHY: Lucide is an icon library. Instead of drawing SVG icons by hand, you import
// named components like <Sparkles /> and <Send /> — they render as small vector icons.

import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
// WHY: These are reusable layout components built for this project. Using them keeps
// the visual design consistent across every page — same padding, same shadows, same style.

import { Button } from '@/components/ui/Button';
// WHY: The project's own Button component wraps a plain HTML <button> but adds
// consistent styles and loading/disabled states so you don't repeat Tailwind classes everywhere.

import { Badge } from '@/components/ui/Badge';
// WHY: A Badge is a small pill-shaped label (like "high" or "low" priority). Using a
// shared component means all badges look the same throughout the app.

import { AI_INSIGHTS } from '@/data/mock';
// WHY: Mock data is placeholder data used while the real backend feature is being built.
// It lets the UI look realistic without needing a live AI server for the "Insights" tab.

import { aiApi } from '@/lib/api/client';
// WHY: aiApi is this project's collection of functions that talk to the backend AI endpoints.
// Instead of writing raw fetch() calls here, we use these pre-built helpers.

import { cn } from '@/lib/utils/cn';
// WHY: cn() (short for "classnames") merges Tailwind CSS class strings together cleanly.
// It handles conditional classes — e.g., "apply this class only when activeTab === 'chat'".

// WHY: We define a TypeScript type for a chat message. A type is a contract that says
// "every Message object must have a role (either 'assistant' or 'user') and a text string".
// TypeScript will show an error at compile-time if you accidentally pass the wrong shape.
type Message = { role: 'assistant' | 'user'; text: string };

// WHY: This is the initial message that appears in the chat before the user types anything.
// Defining it outside the component means it is only created once — not recreated on every render.
const CHAT_MESSAGES: Message[] = [
  { role: 'assistant', text: 'Hi! I\'m your AI sales assistant. Ask me anything about your store performance, inventory, or customer trends.' },
];

// WHY: These are pre-written questions shown as clickable buttons so users can quickly
// ask common questions without typing. Defined outside the component so the array
// reference stays stable and doesn't cause unnecessary re-renders.
const QUICK_PROMPTS = [
  'What\'s my best-selling product?',
  'How can I increase revenue?',
  'Which customers haven\'t bought recently?',
];

export function AiInsights() {
  // WHY: useState<Message[]> creates a piece of state to hold the array of chat messages.
  // The <Message[]> part is a TypeScript generic — it tells useState exactly what type
  // of value it is storing (an array of Message objects). CHAT_MESSAGES is the starting value.
  const [messages, setMessages] = useState<Message[]>(CHAT_MESSAGES);

  // WHY: This tracks whatever the user is currently typing in the text input box.
  // Every time the user presses a key, setInput updates this value and React re-renders
  // the input to show the new character. Starting value is '' (empty string).
  const [input, setInput] = useState('');

  // WHY: This boolean tracks whether the AI is currently processing a reply.
  // While loading is true, we show the animated "..." dots and disable the Send button
  // so the user can't send another message while waiting.
  const [loading, setLoading] = useState(false);

  // WHY: This tracks which tab the user has selected — 'insights' or 'chat'.
  // The `as const` type hint tells TypeScript the only valid values are those two strings,
  // preventing typos like setActiveTab('insightss') from compiling.
  const [activeTab, setActiveTab] = useState<'insights' | 'chat'>('insights');

  // WHY: async means this function contains code that waits for something (like a network
  // request) before continuing. JavaScript is normally non-blocking — async/await lets
  // us write "wait here, then continue" in a readable top-to-bottom way.
  const sendMessage = async (text: string) => {
    // WHY: .trim() removes leading/trailing whitespace. If the user hits Enter on an
    // empty input (or one with only spaces), we do nothing and exit the function early.
    if (!text.trim()) return;

    // WHY: We add the user's message to the chat immediately so the UI feels instant.
    // The (m) => [...m, newItem] pattern is called a "functional update" — it reads the
    // current state (m) and returns a new array with the new message appended.
    // We NEVER mutate the array directly (like m.push()), because React needs a new
    // array reference to know something changed and trigger a re-render.
    setMessages((m) => [...m, { role: 'user', text }]);

    // WHY: Clear the text input immediately after sending, so the box is ready for the
    // next message. This happens synchronously before the await below.
    setInput('');

    // WHY: Set loading to true BEFORE the network call so the typing indicator ("...")
    // appears right away, not after the slow network round-trip.
    setLoading(true);

    // WHY: try/catch is error handling. Code inside try runs normally. If anything inside
    // throws an error (e.g., the server is down, the network times out), execution jumps
    // to the catch block instead of crashing the whole page.
    try {
      // WHY: await pauses this function here and waits for aiApi.chat(text) to finish.
      // aiApi.chat sends the message to the backend AI endpoint and returns the reply string.
      // Without await, we'd move on before the reply arrived and reply would be a Promise, not a string.
      const reply = await aiApi.chat(text);

      // WHY: Append the AI's reply as an 'assistant' message to the chat.
      // Same functional update pattern as above — new array, never mutate in place.
      setMessages((m) => [...m, { role: 'assistant', text: reply }]);
    } catch {
      // WHY: If the network call failed (server down, no internet, etc.), we still add
      // a friendly error message to the chat instead of showing a blank or crashing.
      // This is called "graceful degradation" — always give the user feedback.
      setMessages((m) => [...m, { role: 'assistant', text: 'Sorry, I could not process your request. Please try again.' }]);
    } finally {
      // WHY: The finally block ALWAYS runs — whether the try succeeded or catch ran.
      // This guarantees loading is set back to false no matter what happened,
      // so the UI never gets stuck showing the loading dots forever.
      setLoading(false);
    }
  };

  return (
    // WHY: Card is the container component giving this widget its rounded border and shadow.
    // flex + flex-col + h-full means the card stretches to fill its parent's height
    // and lays out its children top-to-bottom (column direction).
    <Card className="flex flex-col h-full">
      <CardHeader>
        {/* WHY: flex items-center gap-2 puts the icon and title side by side with spacing. */}
        <div className="flex items-center gap-2">
          {/* WHY: The Sparkles icon is purely decorative — it signals "AI feature" to the user. */}
          <Sparkles className="h-4 w-4 text-indigo-500" />
          <CardTitle>AI Smart Assistant</CardTitle>
        </div>

        {/* WHY: This renders the two tab buttons: "insights" and "chat".
            We use .map() to loop over the array and create a button for each tab,
            instead of copy-pasting the button JSX twice. */}
        <div className="flex gap-1">
          {(['insights', 'chat'] as const).map((tab) => (
            <button
              key={tab}
              // WHY: key={tab} is required by React when rendering lists. React uses keys
              // to track which items changed, were added, or removed during re-renders.
              // Without keys, React can't tell the buttons apart and may update the wrong one.

              onClick={() => setActiveTab(tab)}
              // WHY: When the user clicks this button, setActiveTab updates state to this tab's name,
              // causing the component to re-render and show the correct tab panel below.

              className={cn(
                // WHY: cn() merges class strings. The first argument is always applied.
                // The second argument is conditional — the active tab gets the filled indigo style,
                // the inactive tab gets the subtle hover style.
                'px-3 py-1 text-xs font-medium rounded-lg capitalize transition-colors',
                activeTab === tab
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800',
              )}
            >
              {tab}
              {/* WHY: The CSS class "capitalize" on the button makes 'insights' and 'chat'
                  display as 'Insights' and 'Chat' without changing the underlying string values. */}
            </button>
          ))}
        </div>
      </CardHeader>

      {/* WHY: This is a conditional render. JavaScript's ternary operator (condition ? A : B)
          chooses which JSX block to show. If activeTab is 'insights', show the insights panel;
          otherwise show the chat panel. React removes the hidden panel from the DOM entirely. */}
      {activeTab === 'insights' ? (
        // WHY: space-y-3 adds vertical spacing between each insight card.
        // overflow-y-auto adds a scrollbar if there are too many insights to fit.
        <div className="space-y-3 flex-1 overflow-y-auto">
          {/* WHY: .map() loops over the AI_INSIGHTS array and renders one card per insight. */}
          {AI_INSIGHTS.map((insight) => (
            <div
              key={insight.id}
              // WHY: Again, key is required for list items so React can track them individually.
              className={cn(
                'rounded-xl p-3 border',
                // WHY: High-priority insights get a red background, others get indigo.
                // This gives the user an immediate visual signal about urgency without reading the text.
                insight.priority === 'high'
                  ? 'bg-red-50 border-red-100 dark:bg-red-950/30 dark:border-red-900/50'
                  : 'bg-indigo-50 border-indigo-100 dark:bg-indigo-950/30 dark:border-indigo-900/50',
              )}
            >
              <div className="flex items-start gap-2">
                {/* WHY: The emoji icon sits at the top-left of the insight text. */}
                <span className="text-lg leading-none">{insight.icon}</span>
                <div className="min-w-0">
                  {/* WHY: min-w-0 prevents text from overflowing its flex container —
                      a common CSS flexbox gotcha where long text pushes the container wider. */}
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-xs font-semibold text-gray-800 dark:text-gray-200">
                      {insight.title}
                    </p>
                    {/* WHY: The Badge shows "high" or the priority level as a colored pill.
                        variant='danger' makes it red; variant='primary' makes it indigo. */}
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
        // WHY: The chat panel is a flex column. flex-1 makes it fill remaining space.
        // min-h-0 is a flexbox fix — without it, the inner scrollable area won't shrink correctly.
        <div className="flex flex-col flex-1 min-h-0">
          {/* WHY: This is the scrollable message history area. flex-1 makes it grow to fill
              available space; overflow-y-auto adds a scrollbar when messages overflow. */}
          <div className="flex-1 overflow-y-auto space-y-3 mb-3">
            {/* WHY: Render each message as a chat bubble. We use the array index (i) as the key
                here — not ideal for large dynamic lists, but fine for an append-only chat log. */}
            {messages.map((msg, i) => (
              <div
                key={i}
                className={cn(
                  'max-w-[85%] rounded-2xl px-3 py-2 text-xs leading-relaxed',
                  // WHY: Assistant messages are gray and left-aligned.
                  // User messages are indigo and right-aligned (ml-auto pushes them to the right).
                  // This is the classic chat bubble pattern — different styles for each sender.
                  msg.role === 'assistant'
                    ? 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 self-start'
                    : 'bg-indigo-600 text-white self-end ml-auto',
                )}
              >
                {msg.text}
              </div>
            ))}

            {/* WHY: While loading is true, show three bouncing dots to indicate the AI is
                "thinking". The animate-bounce class uses a CSS keyframe animation.
                The animation-delay classes stagger each dot so they bounce one after another
                rather than all at once, which looks more natural. */}
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

          {/* WHY: Quick-prompt buttons let users ask common questions with a single click.
              Clicking one calls sendMessage() directly, bypassing the text input entirely. */}
          <div className="flex flex-wrap gap-1 mb-2">
            {QUICK_PROMPTS.map((p) => (
              <button
                key={p}
                // WHY: key={p} uses the prompt text itself as the key since it's unique.
                onClick={() => sendMessage(p)}
                // WHY: Clicking sends the pre-written prompt text as a user message.
                className="text-[10px] px-2 py-1 rounded-full border border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition-colors"
              >
                {p}
              </button>
            ))}
          </div>

          {/* WHY: This is the text input row at the bottom — an input field + send button side by side. */}
          <div className="flex gap-2">
            <input
              value={input}
              // WHY: value={input} makes this a "controlled input" — React owns the value.
              // The input always displays exactly what is in the input state variable.

              onChange={(e) => setInput(e.target.value)}
              // WHY: Every keystroke fires onChange. e.target.value is the current text in
              // the box. We call setInput to update the state, which re-renders with the new value.
              // Without this, the user's typing would appear but the state wouldn't update.

              onKeyDown={(e) => e.key === 'Enter' && sendMessage(input)}
              // WHY: This lets the user press Enter to send, in addition to clicking the button.
              // e.key === 'Enter' checks which key was pressed; && short-circuits so sendMessage
              // is only called when it's actually the Enter key.

              placeholder="Ask AI anything..."
              // WHY: placeholder text shows inside the empty input box as a hint to the user.
              className="flex-1 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-2 text-xs dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
            />
            <Button
              size="icon-sm"
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || loading}
              // WHY: The button is disabled when the input is empty (no point sending nothing)
              // OR when a request is already in flight (prevent double-sending).
              // !input.trim() is true when the string is empty or all whitespace.
              // || means "or" — either condition being true disables the button.
            >
              <Send className="h-3.5 w-3.5" />
              {/* WHY: The Send icon (a paper-plane arrow) is a universally understood symbol
                  for "submit" — more compact than a text label in a small icon button. */}
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
