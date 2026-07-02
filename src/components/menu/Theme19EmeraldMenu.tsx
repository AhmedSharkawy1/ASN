import Theme19Menu from "./Theme19Menu";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function Theme19EmeraldMenu(props: any) {
    const customConfig = { ...props.config };
    if (!customConfig.theme_colors) customConfig.theme_colors = {};
    customConfig.theme_colors.primary = '#10b981';
    
    return <Theme19Menu {...props} config={customConfig} />;
}
