import type { Metadata } from "next";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function generateMetadata({
    params,
}: {
    params: { restaurantId: string };
}): Promise<Metadata> {
    try {
        const supabase = createClient(supabaseUrl, supabaseAnonKey);
        const id = params.restaurantId;

        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

        let restData: any = null;

        if (id === "demo") {
            const { data } = await supabase
                .from("restaurants")
                .select("name, logo_url, cover_url, slogan_ar, menu_title_word")
                .eq("is_marketing_account", true)
                .limit(1)
                .maybeSingle();
            restData = data;
        } else {
            const { data } = await supabase
                .from("restaurants")
                .select("name, logo_url, cover_url, slogan_ar, menu_title_word")
                .eq(isUUID ? "id" : "slug", id)
                .single();
            restData = data;
        }

        if (!restData) {
            return {
                title: "منيو مطعم | ASN Technology",
                description: "استعرض المنيو الإلكتروني",
            };
        }

        const titleWord = restData.menu_title_word && restData.menu_title_word.trim() !== "" ? restData.menu_title_word : "مطعم";
        const title = `منيو ${titleWord} ${restData.name}`;
        const description = restData.slogan_ar || `استعرض منيو ${restData.name} الإلكتروني - اطلب الآن!`;
        const image = restData.logo_url || restData.cover_url || "/logo.png";

        return {
            title,
            description,
            openGraph: {
                title,
                description,
                type: "website",
                images: [
                    {
                        url: image,
                        width: 600,
                        height: 600,
                        alt: `منيو ${restData.name}`,
                    },
                ],
            },
            twitter: {
                card: "summary_large_image",
                title,
                description,
                images: [image],
            },
        };
    } catch (error) {
        console.error("Failed to generate metadata:", error);
        return {
            title: "منيو مطعم | ASN Technology",
            description: "استعرض المنيو الإلكتروني",
        };
    }
}

export default function MenuLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="mobile-view-wrapper min-h-screen bg-stone-100 dark:bg-[#050505] w-full flex justify-center">
            <style dangerouslySetInnerHTML={{__html: `
                .mobile-view-wrapper {
                    /* Ensures the background stays fixed */
                }
                .mobile-constrained {
                    width: 100%;
                    max-width: 500px;
                    min-height: 100vh;
                    background-color: var(--theme-bg, #ffffff);
                    position: relative;
                    box-shadow: 0 0 40px rgba(0,0,0,0.08);
                    overflow-x: hidden;
                }
                @media (min-width: 500px) {
                    /* Fix full width fixed elements */
                    .mobile-constrained .fixed.w-full,
                    .mobile-constrained .fixed.inset-0,
                    .mobile-constrained .fixed.inset-x-0,
                    .mobile-constrained .fixed[class*="left-0"][class*="right-0"] {
                        max-width: 500px !important;
                        left: 50% !important;
                        right: auto !important;
                        transform: translateX(-50%) !important;
                        margin: 0 auto !important;
                    }
                    /* Specific fix for elements that might just be left-0 or right-0 */
                    .mobile-constrained .fixed.left-4 {
                        left: calc(50% - 250px + 1rem) !important;
                    }
                    .mobile-constrained .fixed.right-4 {
                        right: calc(50% - 250px + 1rem) !important;
                    }
                    .mobile-constrained .fixed.bottom-4.right-4 {
                        right: calc(50% - 250px + 1rem) !important;
                    }
                }
                /* Dark mode background sync */
                .dark .mobile-constrained {
                    background-color: var(--theme-bg, #111111);
                    box-shadow: 0 0 40px rgba(0,0,0,0.5);
                }
            `}} />
            <div className="mobile-constrained">
                {children}
            </div>
        </div>
    );
}

