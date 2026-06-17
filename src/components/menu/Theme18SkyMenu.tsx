import Theme18Menu from "./Theme18Menu";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function Theme18SkyMenu(props: any) {
    const customConfig = { ...props.config };
    if (!customConfig.theme_colors) customConfig.theme_colors = {};
    customConfig.theme_colors.primary = '#0ea5e9';
    
    return <Theme18Menu {...props} config={customConfig} />;
}
