"use client";

import { useEffect, useState } from "react";
import { Megaphone, X, Info, AlertTriangle, Wrench, Sparkles } from "lucide-react";

interface Announcement {
  id: string;
  title: string;
  content: string;
  type: "info" | "warning" | "maintenance" | "feature";
}

export function AnnouncementBanner() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [dismissed, setDismissed] = useState<string[]>([]);

  useEffect(() => {
    fetch("/api/announcements/active")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.announcements)) {
          setAnnouncements(data.announcements);
        }
      })
      .catch(() => {});
  }, []);

  const visible = announcements.filter((a) => !dismissed.includes(a.id));
  if (visible.length === 0) return null;

  const getIcon = (type: string) => {
    switch (type) {
      case "warning":
        return <AlertTriangle className="w-5 h-5 text-amber-500" />;
      case "maintenance":
        return <Wrench className="w-5 h-5 text-rose-500" />;
      case "feature":
        return <Sparkles className="w-5 h-5 text-purple-500" />;
      default:
        return <Info className="w-5 h-5 text-blue-500" />;
    }
  };

  const getBg = (type: string) => {
    switch (type) {
      case "warning":
        return "bg-amber-50 border-amber-200 text-amber-900";
      case "maintenance":
        return "bg-rose-50 border-rose-200 text-rose-900";
      case "feature":
        return "bg-purple-50 border-purple-200 text-purple-900";
      default:
        return "bg-blue-50 border-blue-200 text-blue-900";
    }
  };

  return (
    <div className="space-y-2 p-4 pb-0">
      {visible.map((item) => (
        <div
          key={item.id}
          className={`p-3.5 rounded-lg border flex items-start justify-between shadow-sm transition ${getBg(item.type)}`}
        >
          <div className="flex items-start space-x-3">
            <div className="mt-0.5">{getIcon(item.type)}</div>
            <div>
              <h4 className="font-bold text-sm flex items-center gap-1.5">
                <Megaphone className="w-4 h-4 text-blue-600 inline" />
                {item.title}
              </h4>
              <p className="text-xs mt-0.5 opacity-90">{item.content}</p>
            </div>
          </div>
          <button
            onClick={() => setDismissed((prev) => [...prev, item.id])}
            className="text-gray-400 hover:text-gray-600 p-1 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
