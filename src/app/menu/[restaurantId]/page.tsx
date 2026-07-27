import { notFound } from "next/navigation";

import MenuClient from "./MenuClient";
import { loadMenu } from "./menuData";

// The menu must always reflect what the restaurant last published, so this
// route opts out of caching entirely rather than risking a stale menu.
export const dynamic = "force-dynamic";

export default async function SmartMenuPage({
  params,
  searchParams,
}: {
  params: { restaurantId: string };
  searchParams: { preview_theme?: string };
}) {
  const data = await loadMenu(params.restaurantId, searchParams.preview_theme);

  if (!data) notFound();

  return <MenuClient config={data.config} categories={data.categories} />;
}
