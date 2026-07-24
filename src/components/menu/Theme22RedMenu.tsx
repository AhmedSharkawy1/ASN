import Theme22Menu from "./Theme22Menu";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function Theme22RedMenu(props: any) {
    const customConfig = { ...props.config };
    if (!customConfig.theme_colors) customConfig.theme_colors = {};
    customConfig.theme_colors.primary = '#dc2626';
    
    return <Theme22Menu {...props} config={customConfig} />;
}
