import { apiClient } from '@/lib/api';
import { 
  APIResponse, 
  ProductImage 
} from '@/types';

export interface BatchUploadResponse {
  uploaded_files: Array<{
    filename: string;
    original_name: string;
    url: string;
    detected_model?: string;
    product_id?: number;
  }>;
  created_products: number;
  updated_products: number;
  errors: string[];
}

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export class UploadService {
  // Admin: Batch upload images with automatic model detection
  static async batchUploadImages(
    files: FileList | File[], 
    defaultCategoryId?: number,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<BatchUploadResponse> {
    const formData = new FormData();
    
    // Add files to form data
    Array.from(files).forEach(file => {
      formData.append('images', file);
    });
    
    // Add default category if provided
    if (defaultCategoryId) {
      formData.append('default_category_id', defaultCategoryId.toString());
    }

    const response = await apiClient.post<APIResponse<BatchUploadResponse>>(
      '/api/v1/admin/uploads/batch',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          if (onProgress && progressEvent.total) {
            const progress: UploadProgress = {
              loaded: progressEvent.loaded,
              total: progressEvent.total,
              percentage: Math.round((progressEvent.loaded * 100) / progressEvent.total)
            };
            onProgress(progress);
          }
        }
      }
    );
    
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    
    throw new Error(response.data.message || 'Failed to upload images');
  }

  // Admin: Upload single product image
  static async uploadProductImage(
    productId: number, 
    file: File,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<ProductImage> {
    const formData = new FormData();
    formData.append('image', file);

    const response = await apiClient.post<APIResponse<ProductImage>>(
      `/api/v1/admin/uploads/products/${productId}/images`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          if (onProgress && progressEvent.total) {
            const progress: UploadProgress = {
              loaded: progressEvent.loaded,
              total: progressEvent.total,
              percentage: Math.round((progressEvent.loaded * 100) / progressEvent.total)
            };
            onProgress(progress);
          }
        }
      }
    );
    
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    
    throw new Error(response.data.message || 'Failed to upload image');
  }

  // Admin: Delete product image
  static async deleteProductImage(imageId: number): Promise<void> {
    const response = await apiClient.delete<APIResponse<void>>(
      `/api/v1/admin/uploads/images/${imageId}`
    );
    
    if (!response.data.success) {
      throw new Error(response.data.message || 'Failed to delete image');
    }
  }

  // Validate file before upload
  static validateFile(file: File): string[] {
    const errors: string[] = [];
    const maxSize = parseInt(process.env.NEXT_PUBLIC_MAX_FILE_SIZE || '10485760'); // 10MB default
    const allowedTypes = (process.env.NEXT_PUBLIC_ALLOWED_FILE_TYPES || 'image/jpeg,image/png,image/webp').split(',');

    if (file.size > maxSize) {
      errors.push(`File size must be less than ${this.formatFileSize(maxSize)}`);
    }

    if (!allowedTypes.includes(file.type)) {
      errors.push(`File type ${file.type} is not allowed. Allowed types: ${allowedTypes.join(', ')}`);
    }

    return errors;
  }

  // Validate multiple files
  static validateFiles(files: FileList | File[]): { valid: File[]; invalid: Array<{ file: File; errors: string[] }> } {
    const valid: File[] = [];
    const invalid: Array<{ file: File; errors: string[] }> = [];

    Array.from(files).forEach(file => {
      const errors = this.validateFile(file);
      if (errors.length === 0) {
        valid.push(file);
      } else {
        invalid.push({ file, errors });
      }
    });

    return { valid, invalid };
  }

  // Format file size for display
  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Get file extension
  static getFileExtension(filename: string): string {
    return filename.slice((filename.lastIndexOf('.') - 1 >>> 0) + 2);
  }

  // Generate preview URL for file
  static generatePreviewUrl(file: File): string {
    return URL.createObjectURL(file);
  }

  // Cleanup preview URL
  static cleanupPreviewUrl(url: string): void {
    URL.revokeObjectURL(url);
  }

  // Check if file is image
  static isImageFile(file: File): boolean {
    return file.type.startsWith('image/');
  }

  // Get allowed file types
  static getAllowedFileTypes(): string[] {
    return (process.env.NEXT_PUBLIC_ALLOWED_FILE_TYPES || 'image/jpeg,image/png,image/webp').split(',');
  }

  // Get max file size
  static getMaxFileSize(): number {
    return parseInt(process.env.NEXT_PUBLIC_MAX_FILE_SIZE || '10485760');
  }

  // Create file input accept attribute
  static getAcceptAttribute(): string {
    return this.getAllowedFileTypes().join(',');
  }

  // Extract FANUC model from filename
  static extractFanucModel(filename: string): string | null {
    // Remove file extension
    const nameWithoutExt = filename.replace(/\.[^/.]+$/, '');
    
    // Common FANUC part number patterns
    const patterns = [
      /A\d{2}B-\d{4}-[A-Z]\d{3}/i,  // A02B-0120-C041
      /A\d{3}-\d{4}-\d{4}/i,        // A860-0360-T001
      /\d{2}[A-Z]-\d+/i,            // 10S-3000
    ];

    for (const pattern of patterns) {
      const match = nameWithoutExt.match(pattern);
      if (match) {
        return match[0].toUpperCase();
      }
    }

    return null;
  }
}

export default UploadService;
