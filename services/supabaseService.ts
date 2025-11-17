import { supabase } from './supabaseClient';

const isSupabaseEnabled = () => !!supabase;

// Upload a file (Blob) to Supabase Storage
export const uploadFileToSupabase = async (file: Blob, bucket: string, path: string): Promise<{ publicUrl: string, storagePath: string }> => {
    if (!isSupabaseEnabled()) {
        // Fallback for local development without Supabase configured.
        // Create a local blob URL so the app can still function.
        const localUrl = URL.createObjectURL(file);
        return { publicUrl: localUrl, storagePath: `local/${path}` };
    }
    
    const { data, error } = await supabase.storage.from(bucket).upload(path, file, {
        cacheControl: '3600',
        upsert: true, // Use upsert to avoid errors on re-runs during testing
    });
    
    if (error) {
        console.error("Supabase upload error:", error);
        throw new Error(`Failed to upload to Supabase Storage: ${error.message}`);
    }

    const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(path);

    if (!publicUrl) {
        throw new Error("Could not get public URL for uploaded file.");
    }
    
    return { publicUrl, storagePath: data.path };
};

// Create a new project record in the 'projects' table
export const createSupabaseProject = async (prompt: string, script: string): Promise<{ id: string }> => {
    if (!isSupabaseEnabled()) {
        // Return a temporary local ID.
        return { id: `local_${crypto.randomUUID()}` };
    }
    const { data, error } = await supabase
        .from('projects')
        .insert([{ prompt, script }])
        .select('id')
        .single();
        
    if (error) {
        console.error("Supabase create project error:", error);
        throw new Error(`Failed to create project record: ${error.message}`);
    }
    
    return data;
};

// Add an asset record linked to a project
export const addAssetToSupabaseProject = async (projectId: string, asset_type: 'image' | 'narration', storage_path: string, asset_order: number | null = null): Promise<void> => {
    if (!isSupabaseEnabled() || projectId.startsWith('local_')) {
        return; // Do nothing if Supabase is disabled or it's a local project
    }
    const { error } = await supabase
        .from('project_assets')
        .insert([{ project_id: projectId, asset_type, storage_path, asset_order }]);
        
    if (error) {
        console.error("Supabase add asset error:", error);
        throw new Error(`Failed to add project asset record: ${error.message}`);
    }
};

// Update a project with the final video path
export const updateSupabaseProjectWithVideo = async (projectId: string, video_storage_path: string): Promise<void> => {
    if (!isSupabaseEnabled() || projectId.startsWith('local_')) {
        return; // Do nothing if Supabase is disabled or it's a local project
    }
    const { error } = await supabase
        .from('projects')
        .update({ final_video_path: video_storage_path })
        .eq('id', projectId);

    if (error) {
        console.error("Supabase update project error:", error);
        throw new Error(`Failed to update project with video path: ${error.message}`);
    }
};