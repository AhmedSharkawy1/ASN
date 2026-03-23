import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const backupId = searchParams.get('backup_id');
        const mode = searchParams.get('mode'); // 'save' to save locally

        if (!backupId) {
            return NextResponse.json({ error: "Missing backup_id parameter" }, { status: 400 });
        }

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

        if (!supabaseServiceKey) {
            return NextResponse.json({ error: "Server missing SERVICE_ROLE_KEY." }, { status: 500 });
        }

        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
            auth: { autoRefreshToken: false, persistSession: false }
        });

        // Get backup record
        const { data: backup, error: fetchErr } = await supabaseAdmin
            .from('system_backups')
            .select('*')
            .eq('id', backupId)
            .single();

        if (fetchErr || !backup) {
            return NextResponse.json({ error: "Backup not found" }, { status: 404 });
        }

        if (!backup.backup_file || backup.file_size_bytes === 0) {
            return NextResponse.json({ 
                error: "This backup has no file — it was created before storage was configured. Please delete this record and create a new backup." 
            }, { status: 404 });
        }

        // Download from Supabase Storage
        const { data: fileData, error: downloadErr } = await supabaseAdmin.storage
            .from('client-backups')
            .download(backup.backup_file);

        if (downloadErr || !fileData) {
            return NextResponse.json({ error: `Failed to download backup: ${downloadErr?.message}` }, { status: 500 });
        }

        const text = await fileData.text();

        // Build a clean, readable filename with the client name
        let restaurantName = '';
        if (backup.tenant_id) {
            const { data: rest } = await supabaseAdmin
                .from('restaurants')
                .select('name')
                .eq('id', backup.tenant_id)
                .single();
            restaurantName = rest?.name || '';
        }
        const dateStr = new Date(backup.created_at).toISOString().split('T')[0];
        const cleanName = restaurantName
            ? `${restaurantName}_backup_${dateStr}.json`
            : `${backup.backup_name}.json`;

        if (mode === 'save') {
            // Save the file to public/backups/ so it can be served statically
            const backupsDir = path.join(process.cwd(), 'public', 'backups');
            await mkdir(backupsDir, { recursive: true });

            // Generate a safe unique name for the filesystem using the backup ID
            const fsSafeName = `backup_${backup.id}.json`;
            const filePath = path.join(backupsDir, fsSafeName);
            await writeFile(filePath, text, 'utf-8');

            return NextResponse.json({
                success: true,
                file_url: `/backups/${fsSafeName}`,
                file_name: fsSafeName,
                original_name: cleanName, // Client name + date for browser download
            });
        }

        // Default: return as binary download stream
        const bytes = new TextEncoder().encode(text);
        return new NextResponse(bytes, {
            status: 200,
            headers: {
                'Content-Type': 'application/octet-stream',
                'Content-Disposition': `attachment; filename="${cleanName}"`,
                'Content-Length': String(bytes.length),
                'Cache-Control': 'no-cache, no-store, must-revalidate',
            },
        });

    } catch (err) {
        console.error("[Backup] Download API Error:", err);
        const errMsg = err instanceof Error ? err.message : 'Unknown error';
        return NextResponse.json({ error: errMsg }, { status: 500 });
    }
}
