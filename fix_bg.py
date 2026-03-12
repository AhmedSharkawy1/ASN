import os

files_to_fix = [
    'src/components/menu/Theme14Menu.tsx',
    'src/components/menu/Theme15Menu.tsx',
    'src/components/menu/Theme16Menu.tsx'
]

# We need to replace the single image logic with slider logic
def fix_file(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Look for the header section
    header_start_14 = '<div\n                className="modern-header"'
    header_start_15 = '<div className="h-48 md:h-64 relative bg-gray-900"'
    header_start_16 = '<div className="h-48 md:h-64 relative bg-gray-900"'
    
    if header_start_14 in content:
        # Theme 14
        print(f"Fixing {file_path}")
        new_header = """            {/* Header */}
            <div className="modern-header relative">
                {config.cover_images && config.cover_images.length > 0 ? (
                    <Swiper modules={[Autoplay, FreeMode]} autoplay={{ delay: 3000, disableOnInteraction: false }} loop={true} className="w-full h-full absolute inset-0 z-0">
                        {config.cover_images.map((img: string, idx: number) => (
                            <SwiperSlide key={idx}>
                                <div className="w-full h-full bg-cover bg-center" style={{ backgroundImage: `url(${img})` }} />
                            </SwiperSlide>
                        ))}
                    </Swiper>
                ) : (
                    <div className="w-full h-full absolute inset-0 z-0 bg-cover bg-center" style={{ backgroundImage: `url(${config?.cover_url || '/placeholder-cover.jpg'})` }} />
                )}
                <div className="header-overlay"></div>"""
        
        # We need to carefully replace the header
        old_part = """            {/* Header */}
            <div
                className="modern-header"
                style={{ backgroundImage: `url(${config?.cover_url || config?.cover_images?.[0] || '/placeholder-cover.jpg'})` }}
            >
                <div className="header-overlay"></div>"""
        
        if old_part in content:
            content = content.replace(old_part, new_header)
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)

    elif header_start_15 in content or header_start_16 in content:
        # Theme 15 / 16
        print(f"Fixing {file_path}")
        
        # Make sure Swiper is imported
        if 'import { Swiper, SwiperSlide }' not in content:
            content = content.replace('import Image from', "import { Swiper, SwiperSlide } from 'swiper/react';\nimport { Autoplay, EffectFade } from 'swiper/modules';\nimport 'swiper/css';\nimport 'swiper/css/effect-fade';\nimport Image from")
            
        old_part = """        <div className="h-48 md:h-64 relative bg-gray-900">
            <img 
                src={config.cover_url || 'https://images.unsplash.com/photo-1544025162-d76694265947?q=80&w=1000'}
                alt="cover" 
                className="w-full h-full object-cover opacity-80"
            />"""
            
        new_part = """        <div className="h-48 md:h-64 relative bg-gray-900">
            {config.cover_images && config.cover_images.length > 0 ? (
                <Swiper modules={[Autoplay, EffectFade]} effect="fade" autoplay={{ delay: 3000, disableOnInteraction: false }} loop={true} className="w-full h-full absolute inset-0 z-0 opacity-80">
                    {config.cover_images.map((img: string, idx: number) => (
                        <SwiperSlide key={idx}>
                            <img src={img} alt="cover" className="w-full h-full object-cover" />
                        </SwiperSlide>
                    ))}
                </Swiper>
            ) : (
                <img 
                    src={config.cover_url || 'https://images.unsplash.com/photo-1544025162-d76694265947?q=80&w=1000'}
                    alt="cover" 
                    className="w-full h-full object-cover opacity-80"
                />
            )}"""
            
        if old_part in content:
            content = content.replace(old_part, new_part)
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
        else:
             print(f"Could not find replacement block in {file_path}")

for file in files_to_fix:
    fix_file(file)

print("Done")
