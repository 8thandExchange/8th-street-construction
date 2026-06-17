"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import type { FloorPlanRoom } from "@/lib/collection-pages";

type CollectionFloorPlanProps = {
  label: string;
  rooms: FloorPlanRoom[];
};

export function CollectionFloorPlan({ label, rooms }: CollectionFloorPlanProps) {
  const [activeId, setActiveId] = useState<string | null>(rooms[0]?.id ?? null);
  const active = rooms.find((r) => r.id === activeId);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
      <div className="lg:col-span-8 relative bg-warm-white border border-ink/10 p-4 sm:p-6 md:p-8">
        <div className="absolute top-4 left-4 h-3 w-3 border-t border-l border-rust opacity-60" aria-hidden />
        <div className="absolute top-4 right-4 h-3 w-3 border-t border-r border-rust opacity-60" aria-hidden />
        <div className="absolute bottom-4 left-4 h-3 w-3 border-b border-l border-rust opacity-60" aria-hidden />
        <div className="absolute bottom-4 right-4 h-3 w-3 border-b border-r border-rust opacity-60" aria-hidden />

        <svg
          viewBox="0 0 480 320"
          className="w-full h-auto text-ink/80"
          role="img"
          aria-label={`Interactive floor plan: ${label}`}
        >
          {/* Outer shell */}
          <rect
            x="30"
            y="30"
            width="420"
            height="260"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.2"
            opacity="0.25"
          />

          {rooms.map((room) => {
            const isActive = room.id === activeId;
            return (
              <g key={room.id}>
                <path
                  d={room.path}
                  fill={isActive ? "rgba(181, 69, 27, 0.12)" : "rgba(26, 26, 24, 0.03)"}
                  stroke={isActive ? "#b5451b" : "currentColor"}
                  strokeWidth={isActive ? 1.4 : 0.8}
                  className="cursor-pointer transition-all duration-300"
                  onMouseEnter={() => setActiveId(room.id)}
                  onFocus={() => setActiveId(room.id)}
                  onClick={() => setActiveId(room.id)}
                  tabIndex={0}
                  role="button"
                  aria-label={room.label}
                />
              </g>
            );
          })}

          {/* Dimension ticks */}
          <line x1="30" y1="300" x2="450" y2="300" stroke="currentColor" strokeWidth="0.5" opacity="0.3" />
          <text x="240" y="315" textAnchor="middle" fontSize="8" fill="currentColor" opacity="0.35" fontFamily="sans-serif">
            N
          </text>
        </svg>

        <p className="mt-4 font-sans text-[9px] tracking-[0.28em] uppercase text-pencil/60">
          {label} · Conceptual · Not for construction
        </p>
      </div>

      <div className="lg:col-span-4">
        <p className="font-sans text-[11px] tracking-[0.28em] uppercase text-rust mb-4">Selected Room</p>
        {active ? (
          <div className="border-t border-ink/12 pt-6 transition-opacity duration-300">
            <h3 className="font-display text-2xl sm:text-3xl text-ink">{active.label}</h3>
            {active.area && (
              <p className="mt-2 font-mono text-sm text-gold tracking-wide">{active.area}</p>
            )}
            <p className="mt-4 text-sm text-ink/60 leading-relaxed">
              Hover or select a room to explore the conceptual plan. Final dimensions are determined during design development for your site.
            </p>
          </div>
        ) : (
          <p className="text-sm text-ink/50">Select a room to view details.</p>
        )}

        <ul className="mt-8 space-y-2">
          {rooms.map((room) => (
            <li key={room.id}>
              <button
                type="button"
                onClick={() => setActiveId(room.id)}
                className={cn(
                  "w-full text-left py-2 px-3 font-sans text-[11px] tracking-[0.12em] uppercase transition-colors duration-300",
                  room.id === activeId
                    ? "bg-rust/8 text-rust border-l-2 border-rust"
                    : "text-ink/50 hover:text-ink hover:bg-ink/4 border-l-2 border-transparent"
                )}
              >
                {room.label}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
