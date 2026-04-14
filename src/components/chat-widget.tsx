"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import ReactMarkdown from "react-markdown";

interface DealTag {
  id: string;
  merchant_name: string;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  deal_tags?: DealTag[];
}

interface ChatSession {
  id: string;
  title: string;
  deal_ids: string[];
  created_at: string;
  updated_at: string;
}

interface DealSuggestion {
  id: string;
  merchant_name: string;
}

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [dealTags, setDealTags] = useState<DealTag[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // @mention state
  const [mentionActive, setMentionActive] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionStart, setMentionStart] = useState(-1);
  const [suggestions, setSuggestions] = useState<DealSuggestion[]>([]);
  const [selectedSuggestion, setSelectedSuggestion] = useState(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Chat history state
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading, scrollToBottom]);

  useEffect(() => {
    if (open && inputRef.current && !showHistory) {
      inputRef.current.focus();
    }
  }, [open, showHistory]);

  // Fetch suggestions when mention query changes
  useEffect(() => {
    if (!mentionActive || mentionQuery.length < 1) {
      setSuggestions([]);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/deals/search?q=${encodeURIComponent(mentionQuery)}`
        );
        if (res.ok) {
          const data = await res.json();
          setSuggestions(data);
          setSelectedSuggestion(0);
        }
      } catch {
        setSuggestions([]);
      }
    }, 200);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [mentionActive, mentionQuery]);

  // Auto-save conversation to Supabase
  const saveSession = useCallback(
    async (msgs: ChatMessage[], tags: DealTag[]) => {
      if (msgs.length === 0) return;

      const title =
        msgs.find((m) => m.role === "user")?.content.slice(0, 80) ||
        "New conversation";
      const dealIdsArr = [...new Set(tags.map((t) => t.id))];

      try {
        if (activeSessionId) {
          await fetch("/api/chat/history", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id: activeSessionId,
              messages: msgs,
              deal_ids: dealIdsArr,
              title,
            }),
          });
        } else {
          const res = await fetch("/api/chat/history", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              messages: msgs,
              deal_ids: dealIdsArr,
              title,
            }),
          });
          if (res.ok) {
            const data = await res.json();
            setActiveSessionId(data.id);
          }
        }
      } catch {
        // silent fail — don't break chat UX
      }
    },
    [activeSessionId]
  );

  async function handleSend() {
    const text = input.trim();
    if (!text || loading) return;

    // Collect all deal tags from the current input + existing tags
    const allTags = [...dealTags];

    const userMessage: ChatMessage = {
      role: "user",
      content: text,
      timestamp: new Date().toISOString(),
      deal_tags: allTags.length > 0 ? allTags : undefined,
    };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");
    setMentionActive(false);
    setSuggestions([]);
    setLoading(true);

    try {
      const dealIdsToSend = [
        ...new Set(
          newMessages.flatMap(
            (m) => m.deal_tags?.map((t) => t.id) || []
          )
        ),
      ];

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          conversationHistory: messages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          dealIds: dealIdsToSend.length > 0 ? dealIdsToSend : undefined,
        }),
      });

      const data = await res.json();
      const assistantMsg: ChatMessage = {
        role: "assistant",
        content:
          res.ok && data.response
            ? data.response
            : "Something went wrong. Please try again.",
        timestamp: new Date().toISOString(),
      };

      const finalMessages = [...newMessages, assistantMsg];
      setMessages(finalMessages);
      saveSession(finalMessages, allTags.length > 0 ? allTags : dealTags);
    } catch {
      const errorMsg: ChatMessage = {
        role: "assistant",
        content: "Something went wrong. Please try again.",
        timestamp: new Date().toISOString(),
      };
      const finalMessages = [...newMessages, errorMsg];
      setMessages(finalMessages);
      saveSession(finalMessages, dealTags);
    } finally {
      setLoading(false);
    }
  }

  function handleInputChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const val = e.target.value;
    setInput(val);

    const cursorPos = e.target.selectionStart;
    // Check if we're in an @mention context
    const textBeforeCursor = val.slice(0, cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf("@");

    if (lastAtIndex >= 0) {
      const afterAt = textBeforeCursor.slice(lastAtIndex + 1);
      // Only active if no space before @ (or @ is at start) and no closing space in the query
      const charBeforeAt = lastAtIndex > 0 ? val[lastAtIndex - 1] : " ";
      if (
        (charBeforeAt === " " || charBeforeAt === "\n" || lastAtIndex === 0) &&
        !afterAt.includes("\n")
      ) {
        setMentionActive(true);
        setMentionQuery(afterAt);
        setMentionStart(lastAtIndex);
        return;
      }
    }

    setMentionActive(false);
    setMentionQuery("");
    setSuggestions([]);
  }

  function selectMention(deal: DealSuggestion) {
    // Replace @query with @DealName
    const before = input.slice(0, mentionStart);
    const afterCursor = input.slice(
      mentionStart + 1 + mentionQuery.length
    );
    const newInput = `${before}@${deal.merchant_name} ${afterCursor}`;
    setInput(newInput);

    // Add to deal tags if not already present
    if (!dealTags.find((t) => t.id === deal.id)) {
      setDealTags((prev) => [
        ...prev,
        { id: deal.id, merchant_name: deal.merchant_name },
      ]);
    }

    setMentionActive(false);
    setSuggestions([]);
    inputRef.current?.focus();
  }

  function removeDealTag(id: string) {
    setDealTags((prev) => prev.filter((t) => t.id !== id));
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    // If mention dropdown is open, handle arrow keys and enter
    if (mentionActive && suggestions.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedSuggestion((prev) =>
          prev < suggestions.length - 1 ? prev + 1 : 0
        );
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedSuggestion((prev) =>
          prev > 0 ? prev - 1 : suggestions.length - 1
        );
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        selectMention(suggestions[selectedSuggestion]);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setMentionActive(false);
        setSuggestions([]);
        return;
      }
    }

    // Backspace at start of input removes last deal tag
    if (
      e.key === "Backspace" &&
      dealTags.length > 0 &&
      inputRef.current?.selectionStart === 0 &&
      inputRef.current?.selectionEnd === 0
    ) {
      e.preventDefault();
      setDealTags((prev) => prev.slice(0, -1));
      return;
    }

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function startNewChat() {
    setMessages([]);
    setDealTags([]);
    setActiveSessionId(null);
    setInput("");
    setShowHistory(false);
  }

  async function loadHistory() {
    setHistoryLoading(true);
    try {
      const res = await fetch("/api/chat/history");
      if (res.ok) {
        const data = await res.json();
        setHistory(data);
      }
    } catch {
      // silent
    } finally {
      setHistoryLoading(false);
    }
  }

  async function loadSession(id: string) {
    try {
      const res = await fetch(`/api/chat/history?id=${id}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
        setActiveSessionId(data.id);
        // Restore deal tags from messages
        const allTags: DealTag[] = [];
        for (const msg of data.messages || []) {
          if (msg.deal_tags) {
            for (const tag of msg.deal_tags) {
              if (!allTags.find((t) => t.id === tag.id)) {
                allTags.push(tag);
              }
            }
          }
        }
        setDealTags(allTags);
        setShowHistory(false);
      }
    } catch {
      // silent
    }
  }

  function toggleHistory() {
    if (!showHistory) loadHistory();
    setShowHistory(!showHistory);
  }

  return (
    <>
      {/* Chat panel */}
      {open && (
        <div
          className="fixed bottom-20 right-4 z-[9999] flex flex-col bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden"
          style={{
            width: "min(380px, calc(100vw - 32px))",
            height: "min(500px, calc(100vh - 120px))",
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-[#0169B4] text-white shrink-0">
            <div className="flex items-center gap-2">
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                />
              </svg>
              <span className="font-semibold text-sm">Polaris Assistant</span>
            </div>
            <div className="flex items-center gap-1">
              {/* History button */}
              <button
                onClick={toggleHistory}
                className={`p-1.5 rounded-lg transition-colors ${showHistory ? "bg-white/20" : "hover:bg-white/10"}`}
                title="Chat history"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </button>
              {/* New chat button */}
              <button
                onClick={startNewChat}
                className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                title="New chat"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
              </button>
              {/* Close button */}
              <button
                onClick={() => setOpen(false)}
                className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          </div>

          {/* History panel */}
          {showHistory ? (
            <div className="flex-1 overflow-y-auto">
              {historyLoading ? (
                <div className="text-center text-sm text-gray-400 py-8">
                  Loading...
                </div>
              ) : history.length === 0 ? (
                <div className="text-center text-sm text-gray-400 py-8">
                  <p className="font-medium text-gray-500">No past chats</p>
                  <p className="mt-1 text-xs">
                    Start a conversation and it&apos;ll appear here
                  </p>
                </div>
              ) : (
                <div className="divide-y">
                  {history.map((session) => (
                    <button
                      key={session.id}
                      onClick={() => loadSession(session.id)}
                      className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors ${
                        activeSessionId === session.id ? "bg-blue-50" : ""
                      }`}
                    >
                      <p className="text-sm font-medium text-gray-800 truncate">
                        {session.title}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {new Date(session.updated_at).toLocaleDateString(
                          undefined,
                          {
                            month: "short",
                            day: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                          }
                        )}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <>
              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
                {messages.length === 0 && !loading && (
                  <div className="text-center text-sm text-gray-400 mt-8">
                    <p className="font-medium text-gray-500">
                      Ask about your deals
                    </p>
                    <p className="mt-1 text-xs">
                      Type <span className="font-mono text-gray-500">@</span>{" "}
                      to tag a specific deal
                    </p>
                  </div>
                )}
                {messages.map((msg, i) => (
                  <div
                    key={i}
                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                        msg.role === "user"
                          ? "bg-[#00B6ED] text-white rounded-br-md whitespace-pre-wrap"
                          : "bg-gray-100 text-gray-800 rounded-bl-md"
                      }`}
                    >
                      {msg.role === "assistant" ? (
                        <div className="chat-markdown [&_p]:my-1 [&_ul]:my-1 [&_ol]:my-1 [&_li]:my-0.5 [&_ul]:pl-4 [&_ol]:pl-4 [&_ul]:list-disc [&_ol]:list-decimal [&_h1]:text-base [&_h1]:font-bold [&_h1]:my-2 [&_h2]:text-sm [&_h2]:font-bold [&_h2]:my-1.5 [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:my-1 [&_code]:text-xs [&_code]:bg-gray-200 [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_pre]:bg-gray-200 [&_pre]:rounded-lg [&_pre]:p-2 [&_pre]:my-1 [&_pre]:overflow-x-auto [&_strong]:font-semibold [&_a]:text-[#0169B4] [&_a]:underline [&_blockquote]:border-l-2 [&_blockquote]:border-gray-300 [&_blockquote]:pl-2 [&_blockquote]:my-1 [&_blockquote]:text-gray-600">
                          <ReactMarkdown>{msg.content}</ReactMarkdown>
                        </div>
                      ) : (
                        msg.content
                      )}
                    </div>
                  </div>
                ))}
                {loading && (
                  <div className="flex justify-start">
                    <div className="bg-gray-100 rounded-2xl rounded-bl-md px-4 py-3">
                      <div className="flex gap-1.5">
                        <span
                          className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                          style={{ animationDelay: "0ms" }}
                        />
                        <span
                          className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                          style={{ animationDelay: "150ms" }}
                        />
                        <span
                          className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                          style={{ animationDelay: "300ms" }}
                        />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input area */}
              <div className="border-t bg-white shrink-0">
                {/* Deal tags */}
                {dealTags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 px-3 pt-2">
                    {dealTags.map((tag) => (
                      <span
                        key={tag.id}
                        className="inline-flex items-center gap-1 bg-[#0169B4]/10 text-[#0169B4] text-xs font-medium px-2 py-0.5 rounded-full"
                      >
                        @{tag.merchant_name}
                        <button
                          onClick={() => removeDealTag(tag.id)}
                          className="hover:text-red-500 transition-colors"
                        >
                          <svg
                            className="w-3 h-3"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M6 18L18 6M6 6l12 12"
                            />
                          </svg>
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                <div className="relative px-3 py-2.5">
                  {/* @mention dropdown */}
                  {mentionActive && suggestions.length > 0 && (
                    <div className="absolute bottom-full left-3 right-3 mb-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden z-10">
                      {suggestions.map((deal, i) => (
                        <button
                          key={deal.id}
                          onClick={() => selectMention(deal)}
                          className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                            i === selectedSuggestion
                              ? "bg-[#0169B4]/10 text-[#0169B4]"
                              : "hover:bg-gray-50 text-gray-700"
                          }`}
                        >
                          <span className="font-medium">
                            {deal.merchant_name}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="flex items-end gap-2">
                    <textarea
                      ref={inputRef}
                      value={input}
                      onChange={handleInputChange}
                      onKeyDown={handleKeyDown}
                      placeholder="Ask about your deals... (@ to tag)"
                      rows={1}
                      className="flex-1 resize-none rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0169B4]/30 focus:border-[#0169B4] max-h-24 overflow-y-auto"
                      style={{ minHeight: "38px" }}
                    />
                    <button
                      onClick={handleSend}
                      disabled={!input.trim() || loading}
                      className="shrink-0 w-9 h-9 rounded-xl bg-[#0169B4] text-white flex items-center justify-center hover:bg-[#0157a0] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 19V5m0 0l-7 7m7-7l7 7"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Floating button */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-4 right-4 z-[9999] w-14 h-14 rounded-full bg-[#0169B4] text-white shadow-lg hover:bg-[#0157a0] hover:shadow-xl transition-all flex items-center justify-center"
      >
        {open ? (
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        ) : (
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
            />
          </svg>
        )}
      </button>
    </>
  );
}
