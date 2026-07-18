import re

file_path = "src/app/dashboard/theme-vicino/page.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Add imports for uploadImageWithThumb and file upload icon
imports = """import { uploadImageWithThumb } from "@/lib/uploadImage";
import { UploadCloud, FileVideo, Trash2 } from "lucide-react";"""
content = content.replace('import { Save, Loader2, ImagePlus, X, Video } from "lucide-react";', 
                          'import { Save, Loader2, ImagePlus, X, Video, UploadCloud, FileVideo, Trash2 } from "lucide-react";\nimport { uploadImageWithThumb } from "@/lib/uploadImage";')

# 2. Add loading state for uploads
state_insert = """    const [uploadingLogo, setUploadingLogo] = useState(false);
    const [uploadingVideo, setUploadingVideo] = useState(false);
    const [uploadingImages, setUploadingImages] = useState(false);"""
content = content.replace("const [saving, setSaving] = useState(false);", "const [saving, setSaving] = useState(false);\n" + state_insert)

# 3. Add handler functions for uploads
handlers = """
    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploadingLogo(true);
        try {
            const result = await uploadImageWithThumb(file, `vicino/logo/${Date.now()}`);
            if (result?.originalUrl) {
                setConfig({ ...config, vicino_logo_url: result.originalUrl });
                toast.success(isAr ? "تم رفع الشعار بنجاح" : "Logo uploaded successfully");
            }
        } finally {
            setUploadingLogo(false);
        }
    };

    const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploadingVideo(true);
        try {
            // Upload directly to Supabase storage for video
            const fileExt = file.name.split('.').pop();
            const fileName = `vicino/video/${Date.now()}.${fileExt}`;
            const { error: uploadError } = await supabase.storage
                .from('menu-images')
                .upload(fileName, file, { cacheControl: '3600', upsert: true });

            if (uploadError) throw uploadError;

            const { data } = supabase.storage.from('menu-images').getPublicUrl(fileName);
            setConfig({ ...config, vicino_video_url: data.publicUrl });
            toast.success(isAr ? "تم رفع الفيديو بنجاح" : "Video uploaded successfully");
        } catch (err: any) {
            console.error(err);
            toast.error(isAr ? "فشل رفع الفيديو" : "Failed to upload video");
        } finally {
            setUploadingVideo(false);
        }
    };

    const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;
        setUploadingImages(true);
        try {
            const newUrls: string[] = [];
            for (let i = 0; i < files.length; i++) {
                const result = await uploadImageWithThumb(files[i], `vicino/gallery/${Date.now()}_${i}`);
                if (result?.originalUrl) newUrls.push(result.originalUrl);
            }
            setConfig({ ...config, vicino_images: [...config.vicino_images, ...newUrls] });
            toast.success(isAr ? "تم رفع الصور بنجاح" : "Images uploaded successfully");
        } finally {
            setUploadingImages(false);
        }
    };
"""
content = content.replace("const removeImage = (index: number) => {", handlers + "\n    const removeImage = (index: number) => {")

# 4. Replace Video Input
video_ui_old = """<div>
                            <label className="block text-sm mb-1">{isAr ? "رابط الفيديو (Video URL)" : "Video URL"}</label>
                            <input
                                type="url"
                                value={config.vicino_video_url}
                                onChange={(e) => setConfig({ ...config, vicino_video_url: e.target.value })}
                                className="w-full px-4 py-2 border dark:border-zinc-800 rounded-lg bg-stone-50 dark:bg-[#111]"
                                placeholder="https://example.com/video.mp4"
                                dir="ltr"
                            />
                        </div>"""

video_ui_new = """<div>
                            <label className="block text-sm mb-1">{isAr ? "فيديو صفحة الهبوط" : "Landing Page Video"}</label>
                            <div className="flex items-center gap-4">
                                {config.vicino_video_url ? (
                                    <div className="relative w-full h-32 bg-black rounded-lg overflow-hidden border dark:border-zinc-800 flex items-center justify-center group">
                                        <video src={config.vicino_video_url} className="w-full h-full object-cover opacity-50" />
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <FileVideo className="w-8 h-8 text-white" />
                                        </div>
                                        <button onClick={() => setConfig({...config, vicino_video_url: ''})} className="absolute top-2 right-2 p-1.5 bg-red-600 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"><X className="w-4 h-4"/></button>
                                    </div>
                                ) : (
                                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed dark:border-zinc-700 rounded-lg cursor-pointer hover:bg-stone-50 dark:hover:bg-zinc-800/50 transition-colors">
                                        {uploadingVideo ? <Loader2 className="w-8 h-8 animate-spin text-teal-600" /> : <UploadCloud className="w-8 h-8 text-slate-400 mb-2" />}
                                        <span className="text-sm font-bold text-slate-500">{isAr ? "اختر ملف فيديو" : "Select video file"}</span>
                                        <input type="file" accept="video/*" className="hidden" onChange={handleVideoUpload} disabled={uploadingVideo} />
                                    </label>
                                )}
                            </div>
                        </div>"""
content = content.replace(video_ui_old, video_ui_new)

# 5. Replace Logo Input
logo_ui_old = """<div>
                            <label className="block text-sm mb-1">{isAr ? "رابط اللوجو المخصص لصفحة الهبوط" : "Custom Landing Page Logo URL"}</label>
                            <input
                                type="url"
                                value={config.vicino_logo_url}
                                onChange={(e) => setConfig({ ...config, vicino_logo_url: e.target.value })}
                                className="w-full px-4 py-2 border dark:border-zinc-800 rounded-lg bg-stone-50 dark:bg-[#111]"
                                placeholder="https://example.com/logo.png"
                                dir="ltr"
                            />
                        </div>"""

logo_ui_new = """<div>
                            <label className="block text-sm mb-1">{isAr ? "اللوجو المخصص لصفحة الهبوط" : "Custom Landing Page Logo"}</label>
                            <div className="flex items-center gap-4">
                                {config.vicino_logo_url ? (
                                    <div className="relative w-full h-32 rounded-lg overflow-hidden border dark:border-zinc-800 flex items-center justify-center bg-stone-50 dark:bg-[#111] group">
                                        <img src={config.vicino_logo_url} className="w-full h-full object-contain p-2" alt="Logo" />
                                        <button onClick={() => setConfig({...config, vicino_logo_url: ''})} className="absolute top-2 right-2 p-1.5 bg-red-600 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"><X className="w-4 h-4"/></button>
                                    </div>
                                ) : (
                                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed dark:border-zinc-700 rounded-lg cursor-pointer hover:bg-stone-50 dark:hover:bg-zinc-800/50 transition-colors">
                                        {uploadingLogo ? <Loader2 className="w-8 h-8 animate-spin text-teal-600" /> : <UploadCloud className="w-8 h-8 text-slate-400 mb-2" />}
                                        <span className="text-sm font-bold text-slate-500">{isAr ? "اختر صورة الشعار" : "Select logo image"}</span>
                                        <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} disabled={uploadingLogo} />
                                    </label>
                                )}
                            </div>
                        </div>"""
content = content.replace(logo_ui_old, logo_ui_new)

# 6. Replace Gallery Images Input
gallery_input_old = """<div className="flex gap-2">
                        <input
                            type="url"
                            id="newImageUrl"
                            className="flex-1 px-4 py-2 border dark:border-zinc-800 rounded-lg bg-stone-50 dark:bg-[#111]"
                            placeholder="https://example.com/image.jpg"
                            dir="ltr"
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    const val = (e.target as HTMLInputElement).value;
                                    if (val) {
                                        setConfig({ ...config, vicino_images: [...config.vicino_images, val] });
                                        (e.target as HTMLInputElement).value = '';
                                    }
                                }
                            }}
                        />
                        <button
                            type="button"
                            onClick={() => {
                                const input = document.getElementById('newImageUrl') as HTMLInputElement;
                                if (input.value) {
                                    setConfig({ ...config, vicino_images: [...config.vicino_images, input.value] });
                                    input.value = '';
                                }
                            }}
                            className="px-4 py-2 bg-stone-200 dark:bg-zinc-800 rounded-lg font-bold"
                        >
                            {isAr ? "إضافة" : "Add"}
                        </button>
                    </div>"""

gallery_input_new = """<div className="flex gap-2">
                        <label className="flex-1 flex items-center justify-center gap-2 py-4 border-2 border-dashed dark:border-zinc-700 rounded-lg cursor-pointer hover:bg-stone-50 dark:hover:bg-zinc-800/50 transition-colors">
                            {uploadingImages ? <Loader2 className="w-5 h-5 animate-spin text-teal-600" /> : <UploadCloud className="w-5 h-5 text-slate-400" />}
                            <span className="font-bold text-slate-500">{isAr ? "رفع صور للمعرض (يمكن اختيار عدة صور)" : "Upload gallery images (Multiple allowed)"}</span>
                            <input type="file" accept="image/*" multiple className="hidden" onChange={handleGalleryUpload} disabled={uploadingImages} />
                        </label>
                    </div>"""
content = content.replace(gallery_input_old, gallery_input_new)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Dashboard patched successfully.")
