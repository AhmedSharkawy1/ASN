"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MapPin,
  Phone,
  X,
  ExternalLink,
  Copy,
  Check,
  Building2,
  Navigation,
} from "lucide-react";
import { FaWhatsapp, FaFacebook, FaInstagram, FaTiktok, FaSnapchatGhost } from "react-icons/fa";
import { normalizeBranches, BranchItem } from "@/lib/branchUtils";

interface BranchesModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: any;
  language?: string;
  initialBranchIndex?: number;
}

export default function BranchesModal({
  isOpen,
  onClose,
  config,
  language = "ar",
  initialBranchIndex = 0,
}: BranchesModalProps) {
  const isAr = language === "ar";
  const branches: BranchItem[] = normalizeBranches(config?.branches);
  const [selectedIdx, setSelectedIdx] = useState(initialBranchIndex);
  const [copiedAddress, setCopiedAddress] = useState(false);

  useEffect(() => {
    if (initialBranchIndex >= 0 && initialBranchIndex < branches.length) {
      setSelectedIdx(initialBranchIndex);
    }
  }, [initialBranchIndex, branches.length]);

  // Reset copy state when switching branch
  useEffect(() => {
    setCopiedAddress(false);
  }, [selectedIdx]);

  if (!isOpen || branches.length === 0) return null;

  const activeBranch = branches[selectedIdx] || branches[0];

  const handleCopyAddress = (text: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedAddress(true);
    setTimeout(() => setCopiedAddress(false), 2000);
  };

  // Resolve Map Link: use branch map_link, or generate query from address, or fallback to config map_link
  const mapUrl =
    activeBranch.map_link?.trim() ||
    (activeBranch.address?.trim()
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
          activeBranch.address.trim()
        )}`
      : config?.map_link?.trim() || "");

  // Resolve Social Links: branch-specific or fallback to config general links
  const facebookUrl = activeBranch.facebook_url?.trim() || config?.facebook_url?.trim();
  const instagramUrl = activeBranch.instagram_url?.trim() || config?.instagram_url?.trim();
  const tiktokUrl = activeBranch.tiktok_url?.trim() || config?.tiktok_url?.trim();
  const snapchatUrl = activeBranch.snapchat_url?.trim() || config?.snapchat_url?.trim();
  const hasSocials = Boolean(facebookUrl || instagramUrl || tiktokUrl || snapchatUrl);

  // Clean WhatsApp Number
  const waNumber = (activeBranch.whatsapp_number?.trim() || config?.whatsapp_number?.trim() || "").replace(
    /[^\d+]/g,
    ""
  );

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md"
        dir={isAr ? "rtl" : "ltr"}
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: "spring", damping: 25, stiffness: 250 }}
          className="w-full max-w-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-5 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/70 dark:bg-zinc-800/40">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-500/10 dark:bg-blue-400/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shadow-xs">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-black text-zinc-900 dark:text-white leading-tight">
                  {isAr ? "فروعنا ومواقعنا" : "Our Branches & Locations"}
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
                  {isAr
                    ? `إجمالي ${branches.length} ${branches.length > 2 ? "فروع متاحة" : "فروع"}`
                    : `${branches.length} branches available`}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-zinc-200/60 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 flex items-center justify-center text-zinc-500 dark:text-zinc-300 transition-colors active:scale-95"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Branch Switcher Tabs (if more than 1 branch) */}
          {branches.length > 1 && (
            <div className="px-5 pt-3 pb-2 border-b border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-x-auto no-scrollbar">
              <div className="flex items-center gap-2 min-w-max">
                {branches.map((b, idx) => {
                  const isSelected = idx === selectedIdx;
                  return (
                    <button
                      key={idx}
                      onClick={() => setSelectedIdx(idx)}
                      className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        isSelected
                          ? "bg-blue-600 text-white shadow-md shadow-blue-500/25 scale-100"
                          : "bg-zinc-100 dark:bg-zinc-800/80 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700/80"
                      }`}
                    >
                      <MapPin className={`w-3.5 h-3.5 ${isSelected ? "text-white" : "text-zinc-400"}`} />
                      <span>{b.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Modal Body - Active Branch Details */}
          <div className="p-5 overflow-y-auto space-y-5 pb-6">
            {/* Branch Title & Quick Status */}
            <div className="flex items-start justify-between gap-3 p-4 rounded-2xl bg-gradient-to-r from-blue-500/5 via-sky-500/5 to-transparent dark:from-blue-500/10 dark:via-sky-500/10 border border-blue-500/10 dark:border-blue-400/10">
              <div className="space-y-1">
                <span className="text-[11px] font-black uppercase tracking-wider text-blue-600 dark:text-blue-400">
                  {isAr ? "الفرع المختار" : "Selected Branch"}
                </span>
                <h4 className="text-xl font-black text-zinc-900 dark:text-white">
                  {activeBranch.name}
                </h4>
              </div>
              <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                <Navigation className="w-5 h-5" />
              </div>
            </div>

            {/* Address & Google Maps */}
            <div className="space-y-2.5">
              <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 block px-1">
                {isAr ? "العنوان والموقع على الخريطة" : "Address & Map Location"}
              </label>

              {activeBranch.address ? (
                <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/80 dark:border-zinc-700/60 flex items-center justify-between gap-3">
                  <div className="flex items-start gap-2.5 min-w-0">
                    <MapPin className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                    <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 leading-relaxed">
                      {activeBranch.address}
                    </p>
                  </div>
                  <button
                    onClick={() => handleCopyAddress(activeBranch.address!)}
                    className="p-2 rounded-xl bg-white dark:bg-zinc-700 border border-zinc-200 dark:border-zinc-600 text-zinc-600 dark:text-zinc-300 hover:text-blue-600 transition-colors shrink-0 active:scale-95"
                    title={isAr ? "نسخ العنوان" : "Copy Address"}
                  >
                    {copiedAddress ? (
                      <Check className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>
              ) : (
                <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-dashed border-zinc-200 dark:border-zinc-700/60 text-xs text-zinc-400">
                  {isAr ? "لم يتم تحديد عنوان نصي لهذا الفرع" : "No written address specified"}
                </div>
              )}

              {/* Open in Google Maps Button */}
              {mapUrl ? (
                <a
                  href={mapUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3.5 px-4 rounded-2xl bg-rose-500 hover:bg-rose-600 active:scale-[0.98] transition-all text-white font-black text-sm flex items-center justify-center gap-2.5 shadow-md shadow-rose-500/20"
                >
                  <MapPin className="w-4 h-4" />
                  <span>{isAr ? "فتح الموقع في خرائط جوجل (Google Maps)" : "Open in Google Maps"}</span>
                  <ExternalLink className="w-4 h-4 opacity-75" />
                </a>
              ) : null}
            </div>

            {/* Direct Contact Numbers (Phone & WhatsApp) */}
            <div className="space-y-2.5">
              <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 block px-1">
                {isAr ? "أرقام التواصل والطلب" : "Contact & Orders"}
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {/* Primary Phone */}
                {activeBranch.phone ? (
                  <a
                    href={`tel:${activeBranch.phone.replace(/[^\d+]/g, "")}`}
                    className="flex items-center gap-3 p-3 rounded-2xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-800/40 hover:border-blue-400 transition-all active:scale-[0.98]"
                  >
                    <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                      <Phone className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 block">
                        {isAr ? "اتصال هاتفي" : "Call Phone"}
                      </span>
                      <span className="text-xs font-black text-zinc-900 dark:text-white truncate block tabular-nums" dir="ltr">
                        {activeBranch.phone}
                      </span>
                    </div>
                  </a>
                ) : null}

                {/* Secondary Phone */}
                {activeBranch.phone_secondary ? (
                  <a
                    href={`tel:${activeBranch.phone_secondary.replace(/[^\d+]/g, "")}`}
                    className="flex items-center gap-3 p-3 rounded-2xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-800/40 hover:border-blue-400 transition-all active:scale-[0.98]"
                  >
                    <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                      <Phone className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 block">
                        {isAr ? "رقم إضافي" : "Secondary Phone"}
                      </span>
                      <span className="text-xs font-black text-zinc-900 dark:text-white truncate block tabular-nums" dir="ltr">
                        {activeBranch.phone_secondary}
                      </span>
                    </div>
                  </a>
                ) : null}

                {/* WhatsApp */}
                {waNumber ? (
                  <a
                    href={`https://api.whatsapp.com/send?phone=${waNumber}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-800/40 hover:border-emerald-400 transition-all active:scale-[0.98]"
                  >
                    <div className="w-9 h-9 rounded-xl bg-[#25D366] text-white flex items-center justify-center shrink-0 shadow-xs">
                      <FaWhatsapp className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 block">
                        {isAr ? "محادثة واتساب" : "WhatsApp Chat"}
                      </span>
                      <span className="text-xs font-black text-zinc-900 dark:text-white truncate block tabular-nums" dir="ltr">
                        {activeBranch.whatsapp_number || config?.whatsapp_number}
                      </span>
                    </div>
                  </a>
                ) : null}
              </div>

              {!activeBranch.phone && !activeBranch.phone_secondary && !waNumber && (
                <div className="p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-dashed border-zinc-200 dark:border-zinc-700/60 text-xs text-zinc-400">
                  {isAr ? "لا توجد أرقام تواصل مسجلة لهذا الفرع" : "No contact numbers available for this branch"}
                </div>
              )}
            </div>

            {/* Social Media Channels */}
            {hasSocials && (
              <div className="space-y-2.5">
                <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 block px-1">
                  {isAr ? "وسائل التواصل الاجتماعي للفرع" : "Branch Social Media"}
                </label>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {facebookUrl && (
                    <a
                      href={facebookUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 p-2.5 rounded-xl bg-[#1877F2]/10 hover:bg-[#1877F2]/20 text-[#1877F2] font-bold text-xs transition-all active:scale-95"
                    >
                      <FaFacebook className="w-4 h-4" />
                      <span>{isAr ? "فيسبوك" : "Facebook"}</span>
                    </a>
                  )}

                  {instagramUrl && (
                    <a
                      href={instagramUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 p-2.5 rounded-xl bg-pink-500/10 hover:bg-pink-500/20 text-pink-600 dark:text-pink-400 font-bold text-xs transition-all active:scale-95"
                    >
                      <FaInstagram className="w-4 h-4" />
                      <span>{isAr ? "انستجرام" : "Instagram"}</span>
                    </a>
                  )}

                  {tiktokUrl && (
                    <a
                      href={tiktokUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 p-2.5 rounded-xl bg-zinc-800/10 dark:bg-zinc-100/10 hover:bg-zinc-800/20 text-zinc-900 dark:text-zinc-100 font-bold text-xs transition-all active:scale-95"
                    >
                      <FaTiktok className="w-4 h-4" />
                      <span>{isAr ? "تيك توك" : "TikTok"}</span>
                    </a>
                  )}

                  {snapchatUrl && (
                    <a
                      href={snapchatUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 p-2.5 rounded-xl bg-amber-400/15 hover:bg-amber-400/25 text-amber-600 dark:text-amber-400 font-bold text-xs transition-all active:scale-95"
                    >
                      <FaSnapchatGhost className="w-4 h-4" />
                      <span>{isAr ? "سناب شات" : "Snapchat"}</span>
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
