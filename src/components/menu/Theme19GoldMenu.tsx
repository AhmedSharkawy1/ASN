import Theme19Menu from "./Theme19Menu";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function Theme19GoldMenu(props: any) {
    const customConfig = { ...props.config };
    if (!customConfig.theme_colors) customConfig.theme_colors = {};
    customConfig.theme_colors.primary = '#D4A017';
    
    return <Theme19Menu {...props} config={customConfig} />;
}
