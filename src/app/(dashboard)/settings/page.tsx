"use client";

import { useState, useEffect, useCallback } from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

interface KBEntry {
  id: string;
  category: string;
  title: string;
  content: string;
  created_at: string;
}

export default function SettingsPage() {
  const [darkMode, setDarkMode] = useState(false);
  const [tab, setTab] = useState<"general" | "knowledge-base">("general");
  const [entries, setEntries] = useState<KBEntry[]>([]);
  const [adding, setAdding] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("polaris-dark-mode");
    const isDark = saved === "true";
    setDarkMode(isDark);
  }, []);

  const loadEntries = useCallback(() => {
    fetch("/api/knowledge-base")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setEntries(data);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (tab === "knowledge-base") loadEntries();
  }, [tab, loadEntries]);

  function toggleDarkMode(checked: boolean) {
    setDarkMode(checked);
    localStorage.setItem("polaris-dark-mode", String(checked));
    if (checked) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }

  async function handleAddEntry() {
    if (!newTitle.trim() || !newContent.trim()) return;
    setSaving(true);
    const res = await fetch("/api/knowledge-base", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        category: "executive_summary",
        title: newTitle,
        content: newContent,
      }),
    });
    if (res.ok) {
      toast.success("Example added to knowledge base");
      setNewTitle("");
      setNewContent("");
      setAdding(false);
      loadEntries();
    } else {
      toast.error("Failed to save");
    }
    setSaving(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("Remove this example from the knowledge base?")) return;
    await fetch(`/api/knowledge-base?id=${id}`, { method: "DELETE" });
    loadEntries();
    toast.success("Removed");
  }

  function startEdit(entry: KBEntry) {
    setEditingId(entry.id);
    setEditTitle(entry.title);
    setEditContent(entry.content);
    setExpandedId(entry.id);
  }

  async function handleSaveEdit() {
    if (!editingId) return;
    setEditSaving(true);
    await fetch("/api/knowledge-base", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: editingId, title: editTitle, content: editContent }),
    });
    setEditingId(null);
    setEditSaving(false);
    loadEntries();
    toast.success("Updated");
  }

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-2xl font-heading font-bold text-foreground">Settings</h1>

      {/* Tab switcher */}
      <div className="flex gap-1 bg-[#f0f4f8] rounded-lg p-1 w-fit">
        <button
          onClick={() => setTab("general")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            tab === "general"
              ? "bg-white text-[#0169B4] shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          General
        </button>
        <button
          onClick={() => setTab("knowledge-base")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            tab === "knowledge-base"
              ? "bg-white text-[#0169B4] shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Knowledge Base
        </button>
      </div>

      {tab === "general" ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Appearance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <Label htmlFor="dark-mode" className="text-sm">Dark mode</Label>
                <Switch id="dark-mode" checked={darkMode} onCheckedChange={toggleDarkMode} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Keyboard Shortcuts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { key: "N", desc: "New Deal (navigate to /deals/new)" },
                  { key: "/", desc: "Focus search (on deals page)" },
                  { key: "Esc", desc: "Close dialogs" },
                  { key: "Cmd+Enter", desc: "Send message (in messages page)" },
                ].map((s) => (
                  <div key={s.key} className="flex items-center justify-between py-1">
                    <span className="text-sm text-muted-foreground">{s.desc}</span>
                    <kbd className="px-2 py-1 text-xs font-mono bg-muted rounded border">{s.key}</kbd>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      ) : (
        <>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Executive Summary Examples</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Add example executive summaries so AI can learn your format and writing style.
                    These are used as templates when generating summaries for new deals.
                  </p>
                </div>
                {!adding && (
                  <Button size="sm" onClick={() => setAdding(true)}>
                    Add Example
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {/* Add new entry form */}
              {adding && (
                <div className="border rounded-xl p-4 mb-4 space-y-3 bg-[#f7f9fc]">
                  <div>
                    <Label className="text-xs text-muted-foreground">Title (e.g., merchant name)</Label>
                    <Input
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      placeholder="BitBooks Executive Summary"
                      className="mt-1"
                      autoFocus
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Executive Summary Content</Label>
                    <Textarea
                      value={newContent}
                      onChange={(e) => setNewContent(e.target.value)}
                      placeholder="Paste the full executive summary here..."
                      className="mt-1 min-h-[200px] font-mono text-sm"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleAddEntry} disabled={saving || !newTitle.trim() || !newContent.trim()}>
                      {saving ? "Saving..." : "Save Example"}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => { setAdding(false); setNewTitle(""); setNewContent(""); }}>
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              {/* List of existing entries */}
              {entries.length === 0 && !adding ? (
                <div className="text-center py-8">
                  <svg className="w-10 h-10 text-[#d8e3ef] mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                  <p className="text-sm text-muted-foreground">No examples yet</p>
                  <p className="text-xs text-muted-foreground mt-1">Add executive summary examples so AI can learn your format</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {entries.map((entry) => (
                    <div key={entry.id} className="border rounded-xl overflow-hidden">
                      <div
                        className="flex items-center justify-between p-3 cursor-pointer hover:bg-[#f7f9fc] transition-colors"
                        onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
                      >
                        <div className="flex items-center gap-2">
                          <svg className={`w-4 h-4 text-muted-foreground transition-transform ${expandedId === entry.id ? "rotate-90" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                          <span className="text-sm font-medium">{entry.title}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">
                            {new Date(entry.created_at).toLocaleDateString()}
                          </span>
                          <button
                            onClick={(e) => { e.stopPropagation(); startEdit(entry); }}
                            className="text-muted-foreground hover:text-[#0169B4] transition-colors"
                            title="Edit"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDelete(entry.id); }}
                            className="text-muted-foreground hover:text-red-500 transition-colors"
                            title="Delete"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                      {expandedId === entry.id && (
                        <div className="px-4 pb-4 pt-1 border-t bg-[#f7f9fc]">
                          {editingId === entry.id ? (
                            <div className="space-y-3 mt-2">
                              <div>
                                <Label className="text-xs text-muted-foreground">Title</Label>
                                <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="mt-1" />
                              </div>
                              <div>
                                <Label className="text-xs text-muted-foreground">Content</Label>
                                <Textarea value={editContent} onChange={(e) => setEditContent(e.target.value)} className="mt-1 min-h-[300px] font-mono text-sm" />
                              </div>
                              <div className="flex gap-2">
                                <Button size="sm" onClick={handleSaveEdit} disabled={editSaving}>{editSaving ? "Saving..." : "Save"}</Button>
                                <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>Cancel</Button>
                              </div>
                            </div>
                          ) : (
                            <pre className="text-xs whitespace-pre-wrap font-mono text-muted-foreground max-h-[300px] overflow-y-auto">
                              {entry.content}
                            </pre>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
