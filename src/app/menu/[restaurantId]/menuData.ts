import { createClient } from "@supabase/supabase-js";

import type { PaymentMethodEntry } from "@/app/dashboard/settings/page";

export type Item = {
  id: string;
  title_ar: string;
  title_en?: string;
  desc_ar?: string;
  desc_en?: string;
  prices: number[];
  size_labels: string[];
  is_popular: boolean;
  is_spicy: boolean;
  image_url?: string;
  thumbnail_url?: string | null;
  is_available: boolean;
  old_prices?: number[];
  // Themes read a few extra columns straight off the row.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
};

export type Category = {
  id: string;
  name_ar: string;
  name_en?: string;
  emoji?: string;
  image_url?: string;
  thumbnail_url?: string | null;
  items: Item[];
};

export type RestaurantConfig = {
  id: string;
  name: string;
  slogan_ar?: string;
  slogan_en?: string;
  theme: string;
  phone?: string;
  whatsapp_number?: string;
  facebook_url?: string;
  instagram_url?: string;
  tiktok_url?: string;
  map_link?: string;
  logo_url?: string;
  cover_url?: string;
  cover_images?: string[];
  working_hours?: string;
  payment_methods?: PaymentMethodEntry[];
  marquee_enabled?: boolean;
  marquee_text_ar?: string;
  marquee_text_en?: string;
  orders_enabled?: boolean;
  order_channel?: "whatsapp" | "website" | "both";
  theme_colors?: {
    primary?: string;
    secondary?: string;
    background?: string;
    text?: string;
  };
  currency?: string;
  branches_enabled?: boolean;
  branches?: string[];
  snapchat_url?: string;
  youtube_url?: string;
  whatsapp_group_url?: string;
  default_theme_mode?: "light" | "dark" | "system";
  // Vicino landing page fields.
  // vicino_logo_url may hold a JSON string: {"light":"...","dark":"..."}.
  vicino_landing_enabled?: boolean;
  vicino_video_url?: string;
  vicino_logo_url?: string;
  vicino_about_ar?: string;
  vicino_about_en?: string;
  vicino_history_ar?: string;
  vicino_history_en?: string;
  vicino_images?: string[];
};

const RESTAURANT_COLUMNS =
  "id, name, slogan_ar, slogan_en, theme, phone, whatsapp_number, facebook_url, instagram_url, tiktok_url, snapchat_url, youtube_url, whatsapp_group_url, map_link, logo_url, cover_url, cover_images, working_hours, phone_numbers, payment_methods, marquee_enabled, marquee_text_ar, marquee_text_en, orders_enabled, order_channel, theme_colors, address, currency, branches_enabled, branches, default_theme_mode, vicino_landing_enabled, vicino_video_url, vicino_logo_url, vicino_about_ar, vicino_about_en, vicino_history_ar, vicino_history_en, vicino_images";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Server-side Supabase client for the public menu.
 *
 * `cache: "no-store"` matters: supabase-js calls through fetch, and Next
 * caches fetch by default inside Server Components. Without this a restaurant
 * could publish a menu change and keep being served the old one. This
 * preserves the always-fresh behaviour the client-side fetch had.
 */
function serverSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { fetch: (url, options) => fetch(url, { ...options, cache: "no-store" }) } }
  );
}

/**
 * A size label of "large::120" means "large, was 120". Split the old price
 * out into its own array so themes can render the strikethrough.
 */
function splitOldPrices(item: Item): Item {
  if (!item.size_labels?.some((l: string) => l && l.includes("::"))) return item;

  const newLabels: string[] = [];
  const oldPrices: number[] = [];
  item.size_labels.forEach((l: string) => {
    if (l && l.includes("::")) {
      const [label, rawPrice] = l.split("::");
      newLabels.push(label);
      const parsed = parseFloat(rawPrice);
      oldPrices.push(isNaN(parsed) ? 0 : parsed);
    } else {
      newLabels.push(l);
      oldPrices.push(0);
    }
  });
  return { ...item, size_labels: newLabels, old_prices: oldPrices };
}

export type MenuData = { config: RestaurantConfig; categories: Category[] } | null;

/**
 * Loads everything the menu page needs, on the server.
 *
 * This used to run in the browser after hydration, as three serial
 * round-trips (restaurant -> categories -> items) that could not even start
 * until the bundle had downloaded and executed. Running it here means the
 * first HTML already carries the menu.
 */
export async function loadMenu(restaurantId: string, previewTheme?: string): Promise<MenuData> {
  const supabase = serverSupabase();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query: any = supabase.from("restaurants").select(RESTAURANT_COLUMNS);
  if (restaurantId === "demo") {
    query = query.eq("is_marketing_account", true).limit(1).maybeSingle();
  } else {
    query = query.eq(UUID_RE.test(restaurantId) ? "id" : "slug", restaurantId).single();
  }

  const { data: config } = await query;
  if (!config) return null;

  if (previewTheme) config.theme = previewTheme;

  // Only the columns the mapping below consumes.
  const { data: catsData } = await supabase
    .from("categories")
    .select("id, name_ar, name_en, emoji, image_url, thumbnail_url, sort_order")
    .eq("restaurant_id", config.id)
    .order("sort_order", { ascending: true });

  if (!catsData?.length) return { config, categories: [] };

  const { data: itemsData } = await supabase
    .from("items")
    .select("*")
    .in(
      "category_id",
      catsData.map((c) => c.id)
    )
    .eq("is_available", true)
    .order("sort_order", { ascending: true });

  const categories: Category[] = catsData.map((cat) => ({
    id: cat.id,
    name_ar: cat.name_ar,
    name_en: cat.name_en,
    emoji: cat.emoji,
    image_url: cat.image_url,
    // 37 themes read cat.thumbnail_url; dropping it here forced every one of
    // them onto the full-size image_url.
    thumbnail_url: cat.thumbnail_url,
    items: (itemsData ?? []).filter((i) => i.category_id === cat.id).map(splitOldPrices),
  }));

  return { config, categories };
}
