"use client";

import { useState, useEffect } from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function SettingsPage() {
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("polaris-dark-mode");
    const isDark = saved === "true";
    setDarkMode(isDark);
  }, []);

  function toggleDarkMode(checked: boolean) {
    setDarkMode(checked);
    localStorage.setItem("polaris-dark-mode", String(checked));
    if (checked) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-heading font-bold text-foreground">Settings</h1>

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
    </div>
  );
}
