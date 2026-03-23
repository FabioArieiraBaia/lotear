/**
 * Helper to resolve media URLs (images, PDFs) correctly in both dev and production.
 * Prepends the base URL if the path is relative or starts with /uploads/.
 */
export const resolveUrl = (path: string | null | undefined): string => {
  if (!path) return '';
  
  // If it's already a full URL or blob/data
  if (path.startsWith('http') || path.startsWith('blob:') || path.startsWith('data:')) {
    return path;
  }
  
  // Get base URL from Vite (e.g., /lotear/ or /)
  // @ts-ignore
  const base = import.meta.env.BASE_URL || '/';
  
  // Clean the path of leading slash to avoid double slashes
  const cleanPath = path.startsWith('/') ? path.substring(1) : path;
  
  // Construct absolute path from root
  // If base is /lotear/ and cleanPath is uploads/abc.jpg -> /lotear/uploads/abc.jpg
  return base + cleanPath;
};
