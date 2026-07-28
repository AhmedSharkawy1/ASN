import { notFound } from "next/navigation";

import MenuClient from "./MenuClient";
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

  return <MenuClient config={data.config} categories={data.categories} />;
}
