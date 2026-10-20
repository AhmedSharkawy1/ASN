"use client";

import React, { useState, useEffect } from "react";
import { Building2, MapPin, X } from "lucide-react";
import { normalizeBranches, BranchItem } from "@/lib/branchUtils";

interface BranchesFloatingButtonProps {
  config: any;
  language?: string;
  onOpen: () => void;
}

export default function BranchesFloatingButton({
  config,
  language = "ar",
  onOpen,
}: BranchesFloatingButtonProps) {
  const isAr = language === "ar";
  const branches: BranchItem[] = normalizeBranches(config?.branches);
  const [isMinimized, setIsMinimized] = useState(false);

  // Enable delegated click on map links if branches > 1
  useEffect(() => {
    if (!config?.branches_enabled || branches.length <= 1) return;

    const handleDocumentClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest("a, button");
      if (!target) return;

      const isBranchesTrigger = target.getAttribute("data-branches-trigger");
      const href = target.getAttribute("href") || "";
      const text = target.textContent || "";

      // Intercept explicit branch trigger
      if (isBranchesTrigger) {
        e.preventDefault();
        e.stopPropagation();
        onOpen();
        return;
      }

      // If clicking on a map link or button with "الموقع" / "Location"
      const isMapLink =
        href.includes("google.com/maps") ||
        href.includes("maps.app.goo.gl") ||
        href.includes("maps.google.com");
      const isLocationText =
        text.includes("الموقع") ||
        text.includes("Location") ||
        text.includes("فروعنا") ||
        text.includes("Branches");

      if ((isMapLink && isLocationText) && !target.closest("[data-branches-modal]")) {
        e.preventDefault();
        e.stopPropagation();
        onOpen();
      }
    };

    document.addEventListener("click", handleDocumentClick, true);
    return () => document.removeEventListener("click", handleDocumentClick, true);
  }, [config?.branches_enabled, branches.length, onOpen]);

  // Listen to custom event 'openBranchesModal'
  useEffect(() => {
    const handleCustomOpen = () => onOpen();
    window.addEventListener("openBranchesModal", handleCustomOpen);
    return () => window.removeEventListener("openBranchesModal", handleCustomOpen);
  }, [onOpen]);

  if (!config?.branches_enabled || branches.length === 0) return null;

  return (
    <div
      className={`fixed z-[95] transition-all duration-300 ${
        isAr ? "left-4" : "right-4"
      } bottom-24 md:bottom-8`}
      dir={isAr ? "rtl" : "ltr"}
    >
      {isMinimized ? (
        <button
          onClick={() => setIsMinimized(false)}
          className="w-12 h-12 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-xl flex items-center justify-center transition-transform active:scale-95 group relative border-2 border-white/20"
          title={isAr ? "عرض الفروع والمواقع" : "View Branches & Locations"}
        >
          <Building2 className="w-5 h-5" />
          <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-rose-500 text-white text-[10px] font-black flex items-center justify-center shadow-xs">
            {branches.length}
          </span>
        </button>
      ) : (
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md shadow-2xl border border-zinc-200/80 dark:border-zinc-700/80">
          <button
            onClick={onOpen}
            className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs transition-all active:scale-95 shadow-md shadow-blue-500/20"
          >
            <div className="flex items-center gap-1">
              <Building2 className="w-4 h-4" />
              <MapPin className="w-3.5 h-3.5 opacity-80" />
            </div>
            <span>
              {isAr
                ? `فروعنا ومواقعنا (${branches.length})`
                : `Our Branches (${branches.length})`}
            </span>
          </button>
          <button
            onClick={() => setIsMinimized(true)}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            title={isAr ? "تصغير" : "Minimize"}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
