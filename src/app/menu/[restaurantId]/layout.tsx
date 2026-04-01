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
                .select("name, logo_url, cover_url, slogan_ar")
                .eq("is_marketing_account", true)
                .limit(1)
                .maybeSingle();
            restData = data;
        } else {
            const { data } = await supabase
                .from("restaurants")
                .select("name, logo_url, cover_url, slogan_ar")
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

        const title = `منيو مطعم ${restData.name}`;
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
    return <>{children}</>;
}
