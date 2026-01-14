import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Format currency
export function formatCurrency(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
  }).format(amount);
}

// Format date
export function formatDate(date: string | Date): string {
  const d = new Date(date);
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

// Format date and time
export function formatDateTime(date: string | Date): string {
  const d = new Date(date);
  return d.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Generate slug from string
export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with hyphens
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
}

// Truncate text
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength).trim() + '...';
}

// Validate email
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Validate phone number (basic)
export function isValidPhone(phone: string): boolean {
  const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
  return phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''));
}

// Format file size
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Get image URL with fallback
export function getImageUrl(imagePath: string, fallback: string = '/images/placeholder.svg'): string {
  if (!imagePath) return fallback;
  
  // If it's already a full URL, return as is
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath;
  }
  
  // If it starts with /uploads, route through Nginx proxy in the browser, or use env on the server
  if (imagePath.startsWith('/uploads')) {
    const isBrowser = typeof window !== 'undefined';
    if (isBrowser) {
      // Browser: use relative path so it hits Nginx /api -> backend
      return `/api${imagePath}`;
    }
    // Server (SSR): use API base from env
    const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:8080';
    return `${apiBaseUrl}${imagePath}`;
  }
  
  // Otherwise, treat as relative path and ensure it starts with /
  if (imagePath.startsWith('/')) {
    return imagePath;
  }

  // Add leading slash for relative paths
  return `/images/products/${imagePath}`;
}

// Get product primary image URL from image_urls array
export function getProductImageUrl(imageUrls: string[] | any[] | any, fallback: string = '/images/placeholder.svg'): string {
  // Handle null, undefined, or non-array values
  if (!imageUrls) return fallback;

  // If it's not an array, try to handle single values
  if (!Array.isArray(imageUrls)) {
    if (typeof imageUrls === 'string') {
      const s = imageUrls.trim();
      // Attempt to parse JSON array string like '["url1","url2"]'
      if ((s.startsWith('[') && s.endsWith(']')) || (s.startsWith('[') && s.includes(']'))) {
        try {
          const parsed = JSON.parse(s);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const first = parsed[0];
            if (typeof first === 'string') return first || fallback;
            if (first && typeof first === 'object' && first.url) return first.url || fallback;
          }
        } catch {/* fall through */}
      }
      // Otherwise treat as direct URL
      return s || fallback;
    }
    if (imageUrls && typeof imageUrls === 'object' && imageUrls.url) {
      return imageUrls.url || fallback;
    }
    return fallback;
  }

  // Now we know it's an array
  if (imageUrls.length === 0) return fallback;

  // If it's an array of strings (image_urls), return the first one
  if (typeof imageUrls[0] === 'string') {
    return imageUrls[0] || fallback;
  }

  // If it's an array of objects (ProductImage[]), find primary image first
  const primaryImage = imageUrls.find(img => img && img.is_primary);
  const imageToUse = primaryImage || imageUrls[0];

  if (!imageToUse) return fallback;

  // All images are now external URLs
  return imageToUse.url || fallback;
}

// Get specific product image URL by index
export function getProductImageUrlByIndex(imageUrls: string[] | any[] | any, index: number, fallback: string = '/images/placeholder.svg'): string {
  // Handle null, undefined, or non-array values
  if (!imageUrls) return fallback;

  // If it's not an array, handle single values
  if (!Array.isArray(imageUrls)) {
    if (index === 0) {
      if (typeof imageUrls === 'string') {
        const s = imageUrls.trim();
        if ((s.startsWith('[') && s.endsWith(']')) || (s.startsWith('[') && s.includes(']'))) {
          try {
            const parsed = JSON.parse(s);
            if (Array.isArray(parsed) && parsed.length > 0) {
              const first = parsed[0];
              if (typeof first === 'string') return first || fallback;
              if (first && typeof first === 'object' && first.url) return first.url || fallback;
            }
          } catch {/* ignore */}
        }
        return s || fallback;
      }
      if (imageUrls && typeof imageUrls === 'object' && imageUrls.url) {
        return imageUrls.url || fallback;
      }
    }
    return fallback;
  }

  // Now we know it's an array
  if (imageUrls.length === 0 || index < 0 || index >= imageUrls.length) return fallback;

  const image = imageUrls[index];
  if (!image) return fallback;

  // If it's a string (from image_urls array), return it directly
  if (typeof image === 'string') {
    return image || fallback;
  }

  // If it's an object (ProductImage), return the url property
  return image.url || fallback;
}

// Debounce function
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

// Deep clone object
export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj.getTime()) as any;
  if (obj instanceof Array) return obj.map(item => deepClone(item)) as any;
  if (typeof obj === 'object') {
    const clonedObj = {} as any;
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        clonedObj[key] = deepClone(obj[key]);
      }
    }
    return clonedObj;
  }
  return obj;
}

// Calculate pagination info
export function calculatePagination(page: number, pageSize: number, total: number) {
  const totalPages = Math.ceil(total / pageSize);
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;
  const startIndex = (page - 1) * pageSize + 1;
  const endIndex = Math.min(page * pageSize, total);

  return {
    totalPages,
    hasNextPage,
    hasPrevPage,
    startIndex,
    endIndex,
  };
}

// Generate random ID
export function generateId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

// Parse JSON safely
export function safeJsonParse<T>(json: string, fallback: T): T {
  try {
    return JSON.parse(json);
  } catch {
    return fallback;
  }
}

// Get initials from name
export function getInitials(name: string): string {
  return name
    .split(' ')
    .map(word => word.charAt(0))
    .join('')
    .toUpperCase()
    .substring(0, 2);
}

// Check if string is empty or whitespace
export function isEmpty(str: string | null | undefined): boolean {
  return !str || str.trim().length === 0;
}

// Capitalize first letter
export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

// Convert string to title case
export function toTitleCase(str: string): string {
  return str.replace(/\w\S*/g, (txt) => 
    txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
  );
}

// Remove HTML tags from string
export function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '');
}

// Convert a SKU to a URL-safe single-path segment (avoid '/')
export function toProductPathId(sku: string): string {
  if (!sku) return '';
  return sku.replace(/[\\/]+/g, '-').replace(/\s+/g, '-');
}

// Get file extension
export function getFileExtension(filename: string): string {
  return filename.slice((filename.lastIndexOf('.') - 1 >>> 0) + 2);
}

// Check if file type is allowed
export function isAllowedFileType(file: File, allowedTypes: string[]): boolean {
  return allowedTypes.includes(file.type);
}

// Convert bytes to human readable format
export function bytesToSize(bytes: number): string {
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  if (bytes === 0) return '0 Byte';
  const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)).toString());
  return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + ' ' + sizes[i];
}
