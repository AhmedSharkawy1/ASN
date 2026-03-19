"use client";
/* ═══════════════════════════ USE PRINT SETTINGS HOOK ═══════════════════════════ */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import { getPrinterSettings, savePrinterSettings } from '@/lib/helpers/printerSettings';
import type { PrinterSettings } from '@/lib/helpers/printerSettings';
import { executePrint } from '@/lib/helpers/printEngine';

export function usePrintSettings(restaurantId: string | null) {
    const [settings, setSettings] = useState<PrinterSettings>(getPrinterSettings());
    const [loading, setLoading] = useState(true);
    const [printModalHtml, setPrintModalHtml] = useState<string | null>(null);
    // Track if we've already loaded for this restaurant
    const [loadedRestaurantId, setLoadedRestaurantId] = useState<string | null>(null);

    // Load settings from Supabase
    useEffect(() => {
        // Skip if no ID or if we've already loaded for this ID
        if (!restaurantId || loadedRestaurantId === restaurantId) return;

        const init = async () => {
            setLoading(true);

            // 1. Try to load from Supabase
            try {
                const { data } = await supabase
                    .from('print_settings')
                    .select('*')
                    .eq('restaurant_id', restaurantId)
                    .maybeSingle();

                if (data) {
                    const loaded: PrinterSettings = {
                        paperWidth: data.paper_size || '80mm',
                        printerName: data.printer_name || 'الطابعة الافتراضية',
                        fontSize: data.font_size || 15,
                        autoPrint: data.auto_print ?? false,
                        systemPrinterName: data.system_printer_name || '',
                        orientation: data.orientation || 'portrait',
                        margins: data.margins || 'none',
                    };

                    // Respect URL override (Automatic Tool)
                    const params = new URLSearchParams(window.location.search);
                    if (params.get('autoprint') === '1') {
                        loaded.autoPrint = true;
                    }

                    setSettings(loaded);
                    savePrinterSettings(loaded); // Cache locally
                }
            } catch (err) {
                console.warn('[PrintSettings] Supabase load error, using local:', err);
            }

            setLoadedRestaurantId(restaurantId);
            setLoading(false);
        };

        init();
    }, [restaurantId, loadedRestaurantId]);

    // Save settings to both localStorage and Supabase
    const saveSettings = useCallback(async (newSettings: PrinterSettings) => {
        setSettings(newSettings);
        savePrinterSettings(newSettings); // localStorage cache

        if (!restaurantId) return;

        try {
            await supabase.from('print_settings').upsert({
                restaurant_id: restaurantId,
                printer_name: newSettings.printerName,
                system_printer_name: newSettings.systemPrinterName || '',
                paper_size: newSettings.paperWidth,
                orientation: newSettings.orientation || 'portrait',
                margins: newSettings.margins || 'none',
                font_size: newSettings.fontSize,
                auto_print: newSettings.autoPrint,
                updated_at: new Date().toISOString(),
            }, { onConflict: 'restaurant_id' });
        } catch (err) {
            console.error('[PrintSettings] Supabase save error:', err);
        }
    }, [restaurantId]);

    // Main print function
    const print = useCallback(async (html: string) => {
        await executePrint(html, settings, (modalHtml) => {
            setPrintModalHtml(modalHtml);
        });
    }, [settings]);

    // Close modal
    const closePrintModal = useCallback(() => {
        setPrintModalHtml(null);
    }, []);

    return {
        settings,
        setSettings,
        loading,
        printModalHtml,
        saveSettings,
        print,
        closePrintModal,
    };
}
