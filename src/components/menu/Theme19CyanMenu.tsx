import Theme19Menu from "./Theme19Menu";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function Theme19CyanMenu(props: any) {
    const customConfig = { ...props.config };
    if (!customConfig.theme_colors) customConfig.theme_colors = {};
    customConfig.theme_colors.primary = '#06b6d4';
    
    return <Theme19Menu {...props} config={customConfig} />;
}
