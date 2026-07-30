import { notFound } from "next/navigation";

import MenuClient from "./MenuClient";
import MenuOffline from "./MenuOffline";
import { loadMenu } from "./menuData";

export default async function SmartMenuPage({
  params,
  searchParams,
}: {
  params: { restaurantId: string };
  searchParams: { preview_theme?: string; previewTheme?: string };
}) {
  const preview = searchParams.previewTheme || searchParams.preview_theme;
  const data = await loadMenu(params.restaurantId, preview);

  if (!data) notFound();

  // Switched off by a super admin. Deliberately not notFound(): the restaurant
  // exists and its link is already printed on menus and shared in chats, so a
  // visitor is told the page is paused rather than that it never existed.
  if (data.config.menu_enabled === false) {
    return <MenuOffline name={data.config.name} logoUrl={data.config.logo_url} />;
  }

  return <MenuClient config={data.config} categories={data.categories} />;
}
