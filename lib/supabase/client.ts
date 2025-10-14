import {createClient as createSupabaseClient} from "@supabase/supabase-js";

export const createClient=()=>{
  // Vite exposes only vars that start with VITE_ via import.meta.env
  const viteUrl=(import.meta as any).env?.VITE_SUPABASE_URL;
  const viteKey=(import.meta as any).env?.VITE_SUPABASE_ANON_KEY;

  // Fallbacks (SSR or if you later run in Next.js)
  const nextUrl=(import.meta as any).env?.NEXT_PUBLIC_SUPABASE_URL || (typeof process!=="undefined"? (process as any).env?.NEXT_PUBLIC_SUPABASE_URL:undefined);
  const nextKey=(import.meta as any).env?.NEXT_PUBLIC_SUPABASE_ANON_KEY || (typeof process!=="undefined"? (process as any).env?.NEXT_PUBLIC_SUPABASE_ANON_KEY:undefined);

  const url=viteUrl||nextUrl;
  const key=viteKey||nextKey;

  if(!url||!key){ throw new Error("Supabase env vars missing (add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in Vercel)."); }

  return createSupabaseClient(url, key, {auth:{persistSession:false}});
};
