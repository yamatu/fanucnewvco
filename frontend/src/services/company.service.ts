import { apiClient } from '@/lib/api';
import { 
  APIResponse, 
  CompanyProfile,
  CompanyStats,
  WorkshopFacility
} from '@/types';

export interface CompanyProfileRequest {
  company_name: string;
  company_subtitle: string;
  establishment_year: string;
  location: string;
  workshop_size: string;
  description_1: string;
  description_2: string;
  achievement: string;
  stats: CompanyStats[];
  expertise: string[];
  workshop_facilities: WorkshopFacility[];
}

export class CompanyService {
  // Get company profile (public)
  static async getCompanyProfile(): Promise<CompanyProfile> {
    const response = await apiClient.get<APIResponse<CompanyProfile>>(
      '/api/v1/public/company-profile'
    );
    
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    
    throw new Error(response.data.message || 'Failed to fetch company profile');
  }

  // Admin: Get company profile
  static async getAdminCompanyProfile(): Promise<CompanyProfile> {
    const response = await apiClient.get<APIResponse<CompanyProfile>>(
      '/api/v1/admin/company-profile'
    );
    
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    
    throw new Error(response.data.message || 'Failed to fetch company profile');
  }

  // Admin: Create or update company profile
  static async upsertCompanyProfile(profileData: CompanyProfileRequest): Promise<CompanyProfile> {
    const response = await apiClient.post<APIResponse<CompanyProfile>>(
      '/api/v1/admin/company-profile',
      profileData
    );
    
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    
    throw new Error(response.data.message || 'Failed to save company profile');
  }

  // Admin: Update company profile
  static async updateCompanyProfile(id: number, profileData: Partial<CompanyProfileRequest>): Promise<CompanyProfile> {
    const response = await apiClient.put<APIResponse<CompanyProfile>>(
      `/api/v1/admin/company-profile/${id}`,
      profileData
    );
    
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    
    throw new Error(response.data.message || 'Failed to update company profile');
  }

  // Admin: Delete company profile
  static async deleteCompanyProfile(id: number): Promise<void> {
    const response = await apiClient.delete<APIResponse<void>>(
      `/api/v1/admin/company-profile/${id}`
    );
    
    if (!response.data.success) {
      throw new Error(response.data.message || 'Failed to delete company profile');
    }
  }

  // Get default company stats template
  static getDefaultStats(): CompanyStats[] {
    return [
      {
        icon: 'calendar',
        value: '2010',
        label: 'Established',
        description: 'Years of experience in FANUC parts'
      },
      {
        icon: 'building',
        value: '5,000',
        label: 'Workshop Size',
        description: 'Square meters of modern facility'
      },
      {
        icon: 'users',
        value: '50+',
        label: 'Expert Team',
        description: 'Skilled technicians and engineers'
      },
      {
        icon: 'globe',
        value: '30+',
        label: 'Countries Served',
        description: 'Global reach and distribution'
      }
    ];
  }

  // Get default expertise areas
  static getDefaultExpertise(): string[] {
    return [
      'FANUC CNC Systems',
      'Servo Motors & Drives',
      'Industrial Robots',
      'Control Systems',
      'Spare Parts Supply',
      'Technical Support',
      'Repair Services',
      'System Integration'
    ];
  }

  // Get default workshop facilities
  static getDefaultWorkshopFacilities(): WorkshopFacility[] {
    return [
      {
        id: 'testing-area',
        title: 'Testing & Quality Control',
        description: 'State-of-the-art testing equipment ensures all parts meet FANUC specifications',
        image_url: '/images/workshop/testing-area.jpg'
      },
      {
        id: 'storage-warehouse',
        title: 'Organized Storage',
        description: 'Climate-controlled warehouse with systematic inventory management',
        image_url: '/images/workshop/warehouse.jpg'
      },
      {
        id: 'repair-station',
        title: 'Repair & Refurbishment',
        description: 'Professional repair services with original FANUC parts and procedures',
        image_url: '/images/workshop/repair-station.jpg'
      },
      {
        id: 'packaging-area',
        title: 'Secure Packaging',
        description: 'Professional packaging ensures safe delivery of sensitive electronic components',
        image_url: '/images/workshop/packaging.jpg'
      }
    ];
  }

  // Validate company profile data
  static validateCompanyProfile(profileData: Partial<CompanyProfileRequest>): string[] {
    const errors: string[] = [];

    if (!profileData.company_name || profileData.company_name.length < 2) {
      errors.push('Company name must be at least 2 characters long');
    }

    if (!profileData.establishment_year || !/^\d{4}$/.test(profileData.establishment_year)) {
      errors.push('Please enter a valid establishment year (4 digits)');
    }

    if (!profileData.location || profileData.location.length < 3) {
      errors.push('Location must be at least 3 characters long');
    }

    if (!profileData.workshop_size || profileData.workshop_size.length < 2) {
      errors.push('Workshop size is required');
    }

    if (!profileData.description_1 || profileData.description_1.length < 10) {
      errors.push('First description must be at least 10 characters long');
    }

    return errors;
  }

  // Format company stats for display
  static formatStats(stats: CompanyStats[]): CompanyStats[] {
    return stats.map(stat => ({
      ...stat,
      value: this.formatStatValue(stat.value),
    }));
  }

  // Helper: Format stat value
  private static formatStatValue(value: string): string {
    // Add commas to numbers
    if (/^\d+$/.test(value)) {
      return parseInt(value).toLocaleString();
    }
    return value;
  }

  // Get available icons for stats
  static getAvailableIcons(): Array<{ value: string; label: string }> {
    return [
      { value: 'calendar', label: 'Calendar' },
      { value: 'building', label: 'Building' },
      { value: 'users', label: 'Users' },
      { value: 'globe', label: 'Globe' },
      { value: 'chart-bar', label: 'Chart' },
      { value: 'cog', label: 'Settings' },
      { value: 'truck', label: 'Delivery' },
      { value: 'shield-check', label: 'Quality' },
      { value: 'clock', label: 'Time' },
      { value: 'star', label: 'Star' }
    ];
  }
}

export default CompanyService;
