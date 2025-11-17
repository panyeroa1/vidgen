import * as Supabase from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_KEY;

let supabaseClient = null;

// Only attempt to create a client if both the URL and Key are provided.
// This prevents the app from crashing on startup if env variables are missing.
if (supabaseUrl && supabaseAnonKey) {
    try {
        supabaseClient = Supabase.createClient(supabaseUrl, supabaseAnonKey);
    } catch (error) {
        console.error("Error initializing Supabase client:", error);
        // Set to null if initialization fails
        supabaseClient = null;
    }
} else {
    // This is not an error, but a warning that a feature is disabled.
    console.warn("Supabase environment variables (SUPABASE_URL, SUPABASE_KEY) are not set. Video assets will not be saved. This is normal if you have not configured a Supabase project.");
}

export const supabase = supabaseClient;