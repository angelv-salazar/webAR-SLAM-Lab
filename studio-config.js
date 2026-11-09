/**
 * ESTUDIO SLAM — CONFIGURACIÓN DE TU PROPIA COPIA
 *
 * 1. Haz Fork del repositorio.
 * 2. Crea un proyecto en Supabase.
 * 3. Reemplaza los dos valores de TU_SUPABASE más abajo.
 * 4. Guarda los cambios en GitHub y activa GitHub Pages.
 *
 * El sitio original conserva su Supabase únicamente cuando se abre desde
 * su propia dirección. Una copia de GitHub Pages NO usará los datos del autor.
 * La clave "publishable" es PÚBLICA por diseño; NUNCA pegues aquí service_role
 * ni sb_secret. Los permisos se controlan mediante Auth y RLS en Supabase.
 *
 * Si solo usas modo Individual, puedes dejar TU_SUPABASE vacío.
 */

const TU_SUPABASE = {
  url: '', // Ejemplo: 'https://abcdefghijk.supabase.co'
  publishableKey: '' // Clave sb_publishable_... de Settings > API Keys
};

// Configuración del proyecto original: no copiarla ni editarla en forks.
// Solo se activa dentro de la dirección exacta del repositorio original.
const ORIGINAL = {
  url: 'https://kflgqbqbpzhxmiyovsvg.supabase.co',
  publishableKey: 'sb_publishable_sECvt4oXZdOkZQVFpth6XA_oG3fA5Vh'
};
const isOriginalSite =
  location.hostname === 'angelv-salazar.github.io' &&
  location.pathname.startsWith('/webAR-SLAM-Lab/');
const selected = isOriginalSite ? ORIGINAL : TU_SUPABASE;
const url = (selected.url || '').trim().replace(/\/+$/, '');
const key = (selected.publishableKey || '').trim();

export const STUDIO_CONFIG = Object.freeze({
  supabaseUrl: url,
  supabasePublishableKey: key,
  supabaseConfigured: /^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(url) &&
    /^(sb_publishable_|eyJ)[A-Za-z0-9_.-]+$/.test(key)
});
