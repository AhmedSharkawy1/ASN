import re

file_path = "src/app/dashboard/layout.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Add tenantTheme state
content = content.replace("const [restaurantName, setRestaurantName] = useState('');", "const [restaurantName, setRestaurantName] = useState('');\n    const [tenantTheme, setTenantTheme] = useState('');")

# 2. Add theme to cache loading
content = content.replace("setRestaurantLogo(cached.restaurant_logo || null);", "setRestaurantLogo(cached.restaurant_logo || null);\n                setTenantTheme(cached.theme || '');")

# 3. Add theme to Supabase queries
content = content.replace("select('id,name,logo_url, subscription_expires_at, is_marketing_account')", "select('id,name,logo_url, subscription_expires_at, is_marketing_account, theme')")
content = content.replace("select('id, name, logo_url, parent_id, is_marketing_account')", "select('id, name, logo_url, parent_id, is_marketing_account, theme')")

# 4. Save theme to posDb settings
content = content.replace("restaurant_name: rest.name,", "restaurant_name: rest.name,\n                    theme: rest.theme,")
content = content.replace("setRestaurantName(rest.name);", "setRestaurantName(rest.name);\n                            setTenantTheme(rest.theme);")

content = content.replace("restaurant_name: targetRest.name,", "restaurant_name: targetRest.name,\n                    theme: targetRest.theme,")
content = content.replace("setRestaurantName(targetRest.name);", "setRestaurantName(targetRest.name);\n                            setTenantTheme(targetRest.theme);")

# 5. Conditionally add theme-vicino
old_vicino_nav = '{ href: "/dashboard/theme-vicino", icon: Palette, labelAr: "إعدادات ثيم Vicino", labelEn: "Theme Vicino Settings", key: "theme_vicino" },'
new_vicino_nav = '...(tenantTheme === "vicino" ? [{ href: "/dashboard/theme-vicino", icon: Palette, labelAr: "إعدادات ثيم Vicino", labelEn: "Theme Vicino Settings", key: "theme_vicino" }] : []),'

content = content.replace(old_vicino_nav, new_vicino_nav)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("layout.tsx patched successfully.")
