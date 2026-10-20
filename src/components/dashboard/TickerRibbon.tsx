"use client";

import React from "react";
import { Sparkles, AlertTriangle, TrendingUp } from "lucide-react";

export function TickerRibbon() {
  const items = [
    {
      id: 1,
      badge: "Fast Mover:",
      badgeColor: "text-primary",
      dotColor: "bg-primary",
      text: "Marcus Reed passed tech screen with 94% alignment",
    },
    {
      id: 2,
      badge: "AI Insight:",
      badgeColor: "text-primary",
      icon: Sparkles,
      text: "3 candidate profiles have strong React/TypeScript match for Frontend Lead",
    },
    {
      id: 3,
      badge: "Bottleneck Alert:",
      badgeColor: "text-rose-600",
      icon: AlertTriangle,
      text: "6 applicants pending screening in Product Design > 4 days",
    },
    {
      id: 4,
      badge: "Signal:",
      badgeColor: "text-indigo-600",
      icon: TrendingUp,
      text: "Inbound applications increased 28% after HackerNews hiring post",
    },
  ];

  return (
    <section className="relative w-full overflow-hidden rounded-xl bg-surface-card py-2.5">
      <div className="absolute inset-y-0 left-0 w-80 bg-gradient-to-r from-surface-card to-transparent pointer-events-none z-10" />
      <div className="absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-surface-card to-transparent pointer-events-none z-10" />
      <div className="flex items-center gap-8 whitespace-nowrap animate-ticker hover:[animation-play-state:paused]">
        {[...items, ...items].map((item, idx) => {
          const Icon = item.icon;
          return (
            <React.Fragment key={`${item.id}-${idx}`}>
              <div className="flex items-center gap-2 text-xs text-text-primary">
                {item.dotColor && <span className={`w-2 h-2 rounded-full ${item.dotColor}`} />}
                <div className="space-y-1">
                  <div className="flex items-center gap-1">
                    {Icon && <Icon className={`w-3.5 h-3.5 ${item.badgeColor}`} />}
                    <span className={`font-bold text-sm ${item.badgeColor}`}>{item.badge.slice(0, -1)}</span>
                  </div>
                  <div>
                    <span>{item.text}</span>
                  </div>
                </div>

              </div>
              <span className="text-stone-300 font-bold">•</span>
            </React.Fragment>
          );
        })}
      </div>
    </section>
  );
}