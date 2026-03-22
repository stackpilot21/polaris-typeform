"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface Message {
  id: string;
  deal_id: string | null;
  direction: "INBOUND" | "OUTBOUND";
  channel: "SMS" | "EMAIL";
  from_number: string | null;
  to_number: string | null;
  from_email: string | null;
  to_email: string | null;
  subject: string | null;
  body: string;
  read: boolean;
  created_at: string;
  deals: {
    merchant_name: string;
    contact_email: string;
    contact_phone: string;
  } | null;
}

interface Conversation {
  deal_id: string | null;
  merchant_name: string;
  lastMessage: Message;
  unreadCount: number;
  messages: Message[];
}

export default function MessagesPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64"><p className="text-muted-foreground">Loading messages...</p></div>}>
      <MessagesContent />
    </Suspense>
  );
}

function MessagesContent() {
  const searchParams = useSearchParams();
  const initialDealId = searchParams.get("deal_id");

  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDealId, setSelectedDealId] = useState<string | null>(initialDealId);
  const [replyBody, setReplyBody] = useState("");
  const [replyChannel, setReplyChannel] = useState<"SMS" | "EMAIL">("SMS");
  const [sending, setSending] = useState(false);

  const loadMessages = useCallback(async () => {
    const res = await fetch("/api/messages");
    const data = await res.json();
    setMessages(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  // Mark messages as read when conversation is selected
  useEffect(() => {
    if (!selectedDealId) return;
    const unreadMessages = messages.filter(
      (m) => m.deal_id === selectedDealId && !m.read && m.direction === "INBOUND"
    );
    unreadMessages.forEach((m) => {
      fetch(`/api/messages/${m.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ read: true }),
      });
    });
    if (unreadMessages.length > 0) {
      setMessages((prev) =>
        prev.map((m) =>
          m.deal_id === selectedDealId && !m.read && m.direction === "INBOUND"
            ? { ...m, read: true }
            : m
        )
      );
    }
  }, [selectedDealId, messages]);

  // Group messages by deal
  const conversations: Conversation[] = [];
  const dealMap = new Map<string, Conversation>();

  for (const msg of messages) {
    const key = msg.deal_id || "unknown";
    if (!dealMap.has(key)) {
      dealMap.set(key, {
        deal_id: msg.deal_id,
        merchant_name: msg.deals?.merchant_name || "Unknown",
        lastMessage: msg,
        unreadCount: 0,
        messages: [],
      });
    }
    const conv = dealMap.get(key)!;
    conv.messages.push(msg);
    if (!msg.read && msg.direction === "INBOUND") {
      conv.unreadCount++;
    }
  }

  dealMap.forEach((conv) => {
    conv.messages.sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
    conversations.push(conv);
  });

  conversations.sort(
    (a, b) =>
      new Date(b.lastMessage.created_at).getTime() -
      new Date(a.lastMessage.created_at).getTime()
  );

  const selectedConversation = conversations.find(
    (c) => c.deal_id === selectedDealId
  );

  // Determine available channels for selected deal
  const selectedDeal = selectedConversation?.lastMessage.deals;
  const hasPhone = !!selectedDeal?.contact_phone;
  const hasEmail = !!selectedDeal?.contact_email;

  async function handleSend() {
    if (!replyBody.trim() || !selectedDealId || !selectedDeal) return;
    setSending(true);

    const to =
      replyChannel === "SMS"
        ? selectedDeal.contact_phone
        : selectedDeal.contact_email;

    await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        deal_id: selectedDealId,
        channel: replyChannel,
        body: replyBody,
        to,
      }),
    });

    setReplyBody("");
    setSending(false);
    loadMessages();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading messages...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-heading font-bold text-foreground">Messages</h2>
        <p className="text-sm text-muted-foreground mt-1">
          View and reply to conversations
        </p>
      </div>

      <div className="flex gap-4 h-[calc(100vh-220px)]">
        {/* Left panel - conversation list */}
        <Card className="w-80 shrink-0 overflow-y-auto">
          <div className="divide-y">
            {conversations.length === 0 && (
              <div className="p-6 text-center text-muted-foreground text-sm">
                No messages yet
              </div>
            )}
            {conversations.map((conv) => (
              <button
                key={conv.deal_id || "unknown"}
                className={`w-full text-left p-4 hover:bg-muted/50 transition-colors ${
                  selectedDealId === conv.deal_id ? "bg-muted" : ""
                }`}
                onClick={() => setSelectedDealId(conv.deal_id)}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm truncate">
                    {conv.merchant_name}
                  </span>
                  {conv.unreadCount > 0 && (
                    <Badge className="bg-[#0169B4] text-white text-xs ml-2 shrink-0">
                      {conv.unreadCount}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1 truncate">
                  {conv.lastMessage.body}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                    {conv.lastMessage.channel}
                  </Badge>
                  <span className="text-[10px] text-muted-foreground">
                    {new Date(conv.lastMessage.created_at).toLocaleString()}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </Card>

        {/* Right panel - conversation detail */}
        <Card className="flex-1 flex flex-col overflow-hidden">
          {!selectedConversation ? (
            <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
              Select a conversation to view messages
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="p-4 border-b">
                <h3 className="font-semibold">
                  {selectedConversation.merchant_name}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {selectedDeal?.contact_phone} &middot; {selectedDeal?.contact_email}
                </p>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {selectedConversation.messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${
                      msg.direction === "OUTBOUND" ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div
                      className={`max-w-[75%] rounded-2xl px-4 py-2 ${
                        msg.direction === "OUTBOUND"
                          ? "bg-[#0169B4] text-white"
                          : "bg-gray-100 text-gray-900"
                      }`}
                    >
                      {msg.subject && (
                        <p
                          className={`text-xs font-semibold mb-1 ${
                            msg.direction === "OUTBOUND"
                              ? "text-white/80"
                              : "text-gray-500"
                          }`}
                        >
                          Re: {msg.subject}
                        </p>
                      )}
                      <p className="text-sm whitespace-pre-wrap">{msg.body}</p>
                      <div
                        className={`flex items-center gap-2 mt-1 ${
                          msg.direction === "OUTBOUND"
                            ? "text-white/60"
                            : "text-gray-400"
                        }`}
                      >
                        <span className="text-[10px]">
                          {msg.channel}
                        </span>
                        <span className="text-[10px]">
                          {new Date(msg.created_at).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Reply box */}
              <div className="p-4 border-t space-y-2">
                {hasPhone && hasEmail && (
                  <div className="flex gap-1">
                    <button
                      className={`text-xs px-3 py-1 rounded-full transition-colors ${
                        replyChannel === "SMS"
                          ? "bg-[#0169B4] text-white"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                      onClick={() => setReplyChannel("SMS")}
                    >
                      SMS
                    </button>
                    <button
                      className={`text-xs px-3 py-1 rounded-full transition-colors ${
                        replyChannel === "EMAIL"
                          ? "bg-[#0169B4] text-white"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                      onClick={() => setReplyChannel("EMAIL")}
                    >
                      Email
                    </button>
                  </div>
                )}
                <div className="flex gap-2">
                  <Textarea
                    value={replyBody}
                    onChange={(e) => setReplyBody(e.target.value)}
                    placeholder={`Send ${replyChannel} message...`}
                    className="resize-none"
                    rows={2}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                        handleSend();
                      }
                    }}
                  />
                  <Button
                    onClick={handleSend}
                    disabled={sending || !replyBody.trim()}
                    className="bg-[#0169B4] hover:bg-[#015a9a] self-end"
                  >
                    {sending ? "..." : "Send"}
                  </Button>
                </div>
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
