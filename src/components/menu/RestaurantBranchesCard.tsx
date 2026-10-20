'use client';

import React, { useMemo } from 'react';
import { MapPin, Phone, ArrowUpRight, Building2 } from 'lucide-react';
import { FaWhatsapp, FaFacebookF, FaInstagram, FaTiktok, FaSnapchatGhost } from 'react-icons/fa';
import { normalizeBranches, BranchItem, BranchPhoneEntry } from '@/lib/branchUtils';
import { RestaurantConfig } from '@/app/menu/[restaurantId]/menuData';

interface RestaurantBranchesCardProps {
  config: RestaurantConfig | any;
  isAr: boolean;
  primaryColor?: string;
  className?: string;
}

export default function RestaurantBranchesCard({
  config,
  isAr,
  primaryColor = '#6366f1',
  className = '',
}: RestaurantBranchesCardProps) {
  // Normalize Main Branch phone numbers
  const mainPhones = useMemo(() => {
    const list: BranchPhoneEntry[] = [];
    if (Array.isArray(config?.phone_numbers)) {
      config.phone_numbers.forEach((p: any) => {
        if (typeof p === 'object' && p?.number) {
          const num = String(p.number).trim();
          if (num) {
            list.push({
              label: p.label ? String(p.label).trim() : '',
              number: num,
            });
          }
        } else if (typeof p === 'string' && p.trim()) {
          list.push({ label: '', number: p.trim() });
        }
      });
    }

    if (config?.phone) {
      String(config.phone)
        .split(/[,/|\n]+/)
        .forEach((p) => {
          const clean = p.trim();
          if (clean && !list.some((item) => item.number === clean)) {
            list.push({ label: '', number: clean });
          }
        });
    }

    return list;
  }, [config?.phone, config?.phone_numbers]);

  // Main branch map link
  const mainAddress = (config?.address || '').trim();
  const mainMapLink = useMemo(() => {
    const directLink = (config?.map_link || config?.location_url || config?.location_link || '').trim();
    if (directLink) return directLink;
    if (mainAddress) {
      if (mainAddress.startsWith('http://') || mainAddress.startsWith('https://')) return mainAddress;
      return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mainAddress)}`;
    }
    return '';
  }, [config?.map_link, config?.location_url, config?.location_link, mainAddress]);

  const mainWhatsapp = (config?.whatsapp_number || '').trim();
  const mainWhatsappClean = mainWhatsapp.replace(/[^0-9+]/g, '');

  // Normalized additional branches
  const additionalBranches: BranchItem[] = useMemo(() => {
    if (!config?.branches_enabled || !Array.isArray(config?.branches)) return [];
    return normalizeBranches(config.branches);
  }, [config?.branches, config?.branches_enabled]);

  const hasMultipleBranches = config?.branches_enabled && additionalBranches.length > 0;

  // Single Branch Layout (Classic backward-compatible mode)
  if (!hasMultipleBranches) {
    if (!mainAddress && !mainMapLink && mainPhones.length === 0 && !mainWhatsappClean) {
      return null;
    }

    return (
      <div className={`mt-3.5 pt-3 border-t border-black/5 dark:border-white/5 ${className}`}>
        {/* Location / Address Row */}
        {(mainAddress || mainMapLink) && (
          <a
            href={mainMapLink || '#'}
            target="_blank"
            rel="noreferrer"
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-2xl bg-black/[0.02] dark:bg-white/[0.03] hover:bg-black/[0.05] dark:hover:bg-white/[0.06] transition-all group/loc cursor-pointer border border-black/5 dark:border-white/5"
            title={isAr ? 'اضغط لفتح الموقع على خرائط جوجل' : 'Click to open location in Google Maps'}
          >
            <div className="flex items-start gap-2.5 min-w-0 flex-1">
              <div className="w-7 h-7 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center shrink-0 mt-0.5 group-hover/loc:bg-rose-500 group-hover/loc:text-white transition-colors">
                <MapPin className="w-3.5 h-3.5" />
              </div>
              <span className="font-bold text-xs sm:text-sm text-slate-800 dark:text-zinc-100 group-hover/loc:text-rose-500 transition-colors leading-relaxed">
                {mainAddress || (isAr ? 'الموقع الجغرافي للمطعم' : 'Restaurant Location')}
              </span>
            </div>
            <span className="inline-flex items-center self-start sm:self-auto gap-1 text-[11px] font-black text-rose-500 bg-rose-500/10 px-2.5 py-1 rounded-xl shrink-0 group-hover/loc:bg-rose-500 group-hover/loc:text-white transition-all">
              <span>{isAr ? 'عرض اللوكيشن' : 'Open Map'}</span>
              <ArrowUpRight className="w-3 h-3" />
            </span>
          </a>
        )}

        {/* Contact Numbers (Phone & WhatsApp) */}
        {(mainPhones.length > 0 || mainWhatsappClean) && (
          <div className="mt-2.5 flex items-center gap-2 flex-wrap">
            {mainPhones.map((ph, idx) => (
              <a
                key={idx}
                href={`tel:${ph.number}`}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-100 dark:bg-zinc-800/80 hover:bg-slate-200 dark:hover:bg-zinc-700 text-xs font-bold text-slate-800 dark:text-zinc-100 transition-all border border-slate-200 dark:border-zinc-700 shadow-2xs active:scale-95"
              >
                <Phone className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                {ph.label && (
                  <span className="text-[11px] font-bold text-slate-600 dark:text-zinc-300">
                    {ph.label}:
                  </span>
                )}
                <span dir="ltr">{ph.number}</span>
              </a>
            ))}
            {mainWhatsappClean && (
              <a
                href={`https://wa.me/${mainWhatsappClean}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-xs font-black text-emerald-600 dark:text-emerald-400 transition-all border border-emerald-500/20 shadow-2xs active:scale-95"
              >
                <FaWhatsapp className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span dir="ltr">{config.whatsapp_number}</span>
              </a>
            )}
          </div>
        )}
      </div>
    );
  }

  // Multi-Branches Layout (Sequential presentation requested by user)
  return (
    <div className={`mt-3.5 pt-3 border-t border-black/5 dark:border-white/5 space-y-3 ${className}`}>
      <div className="flex items-center gap-2 text-xs font-black text-slate-800 dark:text-zinc-200">
        <Building2 className="w-4 h-4 text-rose-500 shrink-0" />
        <span>{isAr ? 'فروعنا ومواقعنا:' : 'Our Branches & Locations:'}</span>
      </div>

      {/* 1. Main Branch Card */}
      <div className="p-3 rounded-2xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/5 dark:border-white/5 space-y-2.5 transition-all">
        {/* Branch Title & Location Button */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: primaryColor }}
            />
            <span className="font-black text-xs sm:text-sm text-slate-900 dark:text-white truncate">
              {isAr ? 'الفرع الرئيسي' : 'Main Branch'}
            </span>
            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 shrink-0">
              {isAr ? 'الفرع الأساسي' : 'Main'}
            </span>
          </div>

          {mainMapLink && (
            <a
              href={mainMapLink}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-[11px] font-black text-rose-500 bg-rose-500/10 hover:bg-rose-500 hover:text-white px-2.5 py-1 rounded-xl transition-all shrink-0 cursor-pointer"
            >
              <span>{isAr ? 'عرض اللوكيشن' : 'Open Map'}</span>
              <ArrowUpRight className="w-3 h-3" />
            </a>
          )}
        </div>

        {/* Address */}
        {mainAddress && (
          <div className="flex items-start gap-2 text-xs font-semibold text-slate-700 dark:text-zinc-300 leading-relaxed">
            <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
            <span>{mainAddress}</span>
          </div>
        )}

        {/* Contact Numbers & WhatsApp */}
        {(mainPhones.length > 0 || mainWhatsappClean) && (
          <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
            {mainPhones.map((ph, idx) => (
              <a
                key={idx}
                href={`tel:${ph.number}`}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-zinc-800/80 hover:bg-slate-200 dark:hover:bg-zinc-700 text-xs font-bold text-slate-800 dark:text-zinc-100 transition-all border border-slate-200 dark:border-zinc-700 shadow-2xs active:scale-95"
              >
                <Phone className="w-3 h-3 text-emerald-500 shrink-0" />
                {ph.label && (
                  <span className="text-[11px] font-bold text-slate-600 dark:text-zinc-300">
                    {ph.label}:
                  </span>
                )}
                <span dir="ltr">{ph.number}</span>
              </a>
            ))}
            {mainWhatsappClean && (
              <a
                href={`https://wa.me/${mainWhatsappClean}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-xs font-black text-emerald-600 dark:text-emerald-400 transition-all border border-emerald-500/20 shadow-2xs active:scale-95"
              >
                <FaWhatsapp className="w-3 h-3 text-emerald-500 shrink-0" />
                <span dir="ltr">{config.whatsapp_number}</span>
              </a>
            )}
          </div>
        )}
      </div>

      {/* 2. Additional Branches sequentially */}
      {additionalBranches.map((branch, bIdx) => {
        const branchMapLink =
          branch.map_link ||
          (branch.address
            ? branch.address.startsWith('http://') || branch.address.startsWith('https://')
              ? branch.address
              : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(branch.address)}`
            : '');
        const branchPhones = branch.phone_numbers || [];
        const branchWhatsapp = (branch.whatsapp_number || '').trim();
        const branchWhatsappClean = branchWhatsapp.replace(/[^0-9+]/g, '');
        const hasBranchSocial = Boolean(
          branch.facebook_url || branch.instagram_url || branch.tiktok_url || branch.snapchat_url
        );

        return (
          <div
            key={branch.id || bIdx}
            className="p-3 rounded-2xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/5 dark:border-white/5 space-y-2.5 transition-all"
          >
            {/* Branch Title & Location Button */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                <span className="font-black text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                  {branch.name}
                </span>
              </div>

              {branchMapLink && (
                <a
                  href={branchMapLink}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] font-black text-rose-500 bg-rose-500/10 hover:bg-rose-500 hover:text-white px-2.5 py-1 rounded-xl transition-all shrink-0 cursor-pointer"
                >
                  <span>{isAr ? 'عرض اللوكيشن' : 'Open Map'}</span>
                  <ArrowUpRight className="w-3 h-3" />
                </a>
              )}
            </div>

            {/* Address */}
            {branch.address && (
              <div className="flex items-start gap-2 text-xs font-semibold text-slate-700 dark:text-zinc-300 leading-relaxed">
                <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                <span>{branch.address}</span>
              </div>
            )}

            {/* Phone Numbers & WhatsApp */}
            {(branchPhones.length > 0 || branchWhatsappClean) && (
              <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                {branchPhones.map((ph, pIdx) => (
                  <a
                    key={pIdx}
                    href={`tel:${ph.number}`}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-zinc-800/80 hover:bg-slate-200 dark:hover:bg-zinc-700 text-xs font-bold text-slate-800 dark:text-zinc-100 transition-all border border-slate-200 dark:border-zinc-700 shadow-2xs active:scale-95"
                  >
                    <Phone className="w-3 h-3 text-emerald-500 shrink-0" />
                    {ph.label && (
                      <span className="text-[11px] font-bold text-slate-600 dark:text-zinc-300">
                        {ph.label}:
                      </span>
                    )}
                    <span dir="ltr">{ph.number}</span>
                  </a>
                ))}
                {branchWhatsappClean && (
                  <a
                    href={`https://wa.me/${branchWhatsappClean}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-xs font-black text-emerald-600 dark:text-emerald-400 transition-all border border-emerald-500/20 shadow-2xs active:scale-95"
                  >
                    <FaWhatsapp className="w-3 h-3 text-emerald-500 shrink-0" />
                    <span dir="ltr">{branch.whatsapp_number}</span>
                  </a>
                )}
              </div>
            )}

            {/* Branch specific Social Media */}
            {hasBranchSocial && (
              <div className="mt-1 pt-2 border-t border-black/5 dark:border-white/5 flex items-center justify-between gap-2 flex-wrap">
                <span className="text-[11px] font-bold text-slate-500 dark:text-zinc-400">
                  {isAr ? 'صفحات تواصل هذا الفرع:' : 'Branch Social:'}
                </span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {branch.facebook_url && (
                    <a
                      href={branch.facebook_url}
                      target="_blank"
                      rel="noreferrer"
                      className="w-7 h-7 rounded-lg bg-[#1877F2]/10 hover:bg-[#1877F2] text-[#1877F2] hover:text-white flex items-center justify-center transition-all shadow-2xs active:scale-90"
                      title="Facebook"
                    >
                      <FaFacebookF className="w-3 h-3" />
                    </a>
                  )}
                  {branch.instagram_url && (
                    <a
                      href={branch.instagram_url}
                      target="_blank"
                      rel="noreferrer"
                      className="w-7 h-7 rounded-lg bg-[#E4405F]/10 hover:bg-[#E4405F] text-[#E4405F] hover:text-white flex items-center justify-center transition-all shadow-2xs active:scale-90"
                      title="Instagram"
                    >
                      <FaInstagram className="w-3 h-3" />
                    </a>
                  )}
                  {branch.tiktok_url && (
                    <a
                      href={branch.tiktok_url}
                      target="_blank"
                      rel="noreferrer"
                      className="w-7 h-7 rounded-lg bg-black/10 dark:bg-white/10 hover:bg-black dark:hover:bg-white text-slate-800 dark:text-white hover:text-white dark:hover:text-black flex items-center justify-center transition-all shadow-2xs active:scale-90"
                      title="TikTok"
                    >
                      <FaTiktok className="w-3 h-3" />
                    </a>
                  )}
                  {branch.snapchat_url && (
                    <a
                      href={branch.snapchat_url}
                      target="_blank"
                      rel="noreferrer"
                      className="w-7 h-7 rounded-lg bg-[#FFFC00]/20 hover:bg-[#FFFC00] text-yellow-600 hover:text-black flex items-center justify-center transition-all shadow-2xs active:scale-90"
                      title="Snapchat"
                    >
                      <FaSnapchatGhost className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
