import { notFound } from "next/navigation";

import MenuClient from "./MenuClient";
import { loadMenu } from "./menuData";

// Deliberately NOT force-dynamic: that flag also sets fetchCache to
// default-no-store, which would silently disable the data cache in menuData
// and make MENU_REVALIDATE_SECONDS a no-op. Reading searchParams already
// makes this route render per-request; the caching we want is on the data.

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
