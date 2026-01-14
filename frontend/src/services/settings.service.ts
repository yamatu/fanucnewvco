import { apiClient } from '@/lib/api';
import { APIResponse } from '@/types';

export interface Settings {
  id?: number;
  site_name: string;
  site_description: string;
  site_url: string;
  admin_email: string;
  support_email: string;
  timezone: string;
  currency: string;
  language: string;
  maintenance_mode: boolean;
  allow_registration: boolean;
  email_notifications: boolean;
  sms_notifications: boolean;
  google_analytics_id: string;
  facebook_pixel_id: string;
  smtp_host: string;
  smtp_port: number;
  smtp_username: string;
  smtp_password: string;
  smtp_encryption: string;
  created_at?: string;
  updated_at?: string;
}

export class SettingsService {
  private static readonly BASE_PATH = '/admin/settings';

  // Get all settings
  static async getSettings() {
    const response = await apiClient.get<APIResponse<Settings>>(this.BASE_PATH);
    return response.data;
  }

  // Update settings
  static async updateSettings(data: Settings) {
    const response = await apiClient.put<APIResponse<Settings>>(this.BASE_PATH, data);
    return response.data;
  }

  // Get specific setting
  static async getSetting(key: string) {
    const response = await apiClient.get<APIResponse<any>>(`${this.BASE_PATH}/${key}`);
    return response.data;
  }

  // Update specific setting
  static async updateSetting(key: string, value: any) {
    const response = await apiClient.put<APIResponse<any>>(`${this.BASE_PATH}/${key}`, { value });
    return response.data;
  }

  // Helper methods
  static getTimezoneOptions() {
    return [
      { value: 'UTC', label: 'UTC (Coordinated Universal Time)' },
      { value: 'America/New_York', label: 'Eastern Time (ET)' },
      { value: 'America/Chicago', label: 'Central Time (CT)' },
      { value: 'America/Denver', label: 'Mountain Time (MT)' },
      { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
      { value: 'Europe/London', label: 'London (GMT/BST)' },
      { value: 'Europe/Paris', label: 'Paris (CET/CEST)' },
      { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
      { value: 'Asia/Shanghai', label: 'Shanghai (CST)' },
      { value: 'Asia/Seoul', label: 'Seoul (KST)' },
    ];
  }

  static getCurrencyOptions() {
    return [
      { value: 'USD', label: 'US Dollar ($)', symbol: '$' },
      { value: 'EUR', label: 'Euro (€)', symbol: '€' },
      { value: 'GBP', label: 'British Pound (£)', symbol: '£' },
      { value: 'JPY', label: 'Japanese Yen (¥)', symbol: '¥' },
      { value: 'CNY', label: 'Chinese Yuan (¥)', symbol: '¥' },
      { value: 'KRW', label: 'Korean Won (₩)', symbol: '₩' },
    ];
  }

  static getLanguageOptions() {
    return [
      { value: 'en', label: 'English', flag: '🇺🇸' },
      { value: 'zh', label: '中文', flag: '🇨🇳' },
      { value: 'ja', label: '日本語', flag: '🇯🇵' },
      { value: 'ko', label: '한국어', flag: '🇰🇷' },
      { value: 'fr', label: 'Français', flag: '🇫🇷' },
      { value: 'de', label: 'Deutsch', flag: '🇩🇪' },
      { value: 'es', label: 'Español', flag: '🇪🇸' },
    ];
  }

  static getSmtpEncryptionOptions() {
    return [
      { value: '', label: 'None' },
      { value: 'tls', label: 'TLS' },
      { value: 'ssl', label: 'SSL' },
    ];
  }

  static validateSettings(data: Settings): string[] {
    const errors: string[] = [];

    if (!data.site_name || data.site_name.trim().length === 0) {
      errors.push('Site name is required');
    }

    if (data.admin_email && !this.isValidEmail(data.admin_email)) {
      errors.push('Please provide a valid admin email address');
    }

    if (data.support_email && !this.isValidEmail(data.support_email)) {
      errors.push('Please provide a valid support email address');
    }

    if (data.site_url && !this.isValidUrl(data.site_url)) {
      errors.push('Please provide a valid site URL');
    }

    if (data.smtp_port && (data.smtp_port < 1 || data.smtp_port > 65535)) {
      errors.push('SMTP port must be between 1 and 65535');
    }

    if (data.google_analytics_id && !this.isValidGoogleAnalyticsId(data.google_analytics_id)) {
      errors.push('Please provide a valid Google Analytics ID (e.g., G-XXXXXXXXXX)');
    }

    if (data.facebook_pixel_id && !this.isValidFacebookPixelId(data.facebook_pixel_id)) {
      errors.push('Please provide a valid Facebook Pixel ID (numeric)');
    }

    return errors;
  }

  private static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private static isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  private static isValidGoogleAnalyticsId(id: string): boolean {
    // Google Analytics 4 format: G-XXXXXXXXXX
    const ga4Regex = /^G-[A-Z0-9]{10}$/;
    // Universal Analytics format: UA-XXXXXXXX-X
    const uaRegex = /^UA-\d{8}-\d{1,2}$/;
    return ga4Regex.test(id) || uaRegex.test(id);
  }

  private static isValidFacebookPixelId(id: string): boolean {
    // Facebook Pixel ID is typically a 15-16 digit number
    const pixelRegex = /^\d{15,16}$/;
    return pixelRegex.test(id);
  }

  static formatCurrency(amount: number, currency: string = 'USD'): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  }

  static formatDate(date: string | Date, timezone: string = 'UTC'): string {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(dateObj);
  }
}
