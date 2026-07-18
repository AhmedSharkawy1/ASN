import sys

file_path = "f:/ASN/ASN/src/app/menu/[restaurantId]/page.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace(
    "const [showLanding, setShowLanding] = useState(false);",
    "const [showLanding, setShowLanding] = useState(false);\n  const [showGlobalSplash, setShowGlobalSplash] = useState(false);"
)

content = content.replace(
    "const [orderSuccess, setOrderSuccess] = useState(false);\n\n  useEffect(() => {",
    "const [orderSuccess, setOrderSuccess] = useState(false);\n\n  useEffect(() => {\n    if (showGlobalSplash) {\n      const timer = setTimeout(() => setShowGlobalSplash(false), 2500);\n      return () => clearTimeout(timer);\n    }\n  }, [showGlobalSplash]);\n\n  useEffect(() => {"
)

content = content.replace(
    "if (restData.vicino_landing_enabled) {\n          setShowLanding(true);\n        }",
    "if (restData.vicino_landing_enabled && restData.theme === 'vicino') {\n          setShowLanding(true);\n        } else if (restData.theme !== 'vicino') {\n          setShowGlobalSplash(true);\n        }"
)

splash_ui = """
  if (showGlobalSplash && config?.theme !== "vicino") {
      const primaryColor = config?.theme_colors?.primary || '#B8860B';
      const isDark = config?.default_theme_mode === 'dark' || (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches);
      
      let parsedLogos = { light: config?.vicino_logo_url, dark: config?.vicino_logo_url };
      if (config?.vicino_logo_url?.startsWith('{')) {
          try { parsedLogos = JSON.parse(config.vicino_logo_url); } catch {}
      }
      const currentLogo = isDark ? (parsedLogos.dark || parsedLogos.light) : (parsedLogos.light || parsedLogos.dark);
      const finalLogoSrc = currentLogo || config?.logo_url;

      return (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center transition-colors duration-500" style={{ backgroundColor: isDark ? '#0a0a0a' : '#ffffff' }}>
              <div className="relative w-40 h-40 md:w-56 md:h-56 flex items-center justify-center">
                  <div className="absolute inset-0 rounded-full border-[3px] border-t-transparent animate-spin" style={{ borderColor: `${primaryColor}30`, borderTopColor: primaryColor }}></div>
                  <div className="absolute inset-2 rounded-full border-[3px] border-b-transparent animate-[spin_3s_linear_infinite_reverse]" style={{ borderColor: `${primaryColor}10`, borderBottomColor: primaryColor }}></div>
                  {finalLogoSrc && (
                      <img src={finalLogoSrc} alt="Loading Logo" className="w-24 h-24 md:w-32 md:h-32 object-contain animate-pulse rounded-full" />
                  )}
              </div>
          </div>
      );
  }

  // If PizzaPasta theme, render the dedicated full-layout component
  if (config?.theme === "pizzapasta") {"""

content = content.replace(
    '// If PizzaPasta theme, render the dedicated full-layout component\n  if (config?.theme === "pizzapasta") {',
    splash_ui
)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("Patch applied successfully.")
