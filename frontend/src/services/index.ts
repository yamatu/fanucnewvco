// Import services
import AuthServiceDefault from './auth.service';
import ProductServiceDefault from './product.service';
import CategoryServiceDefault from './category.service';
import OrderServiceDefault from './order.service';
import UserServiceDefault from './user.service';
import BannerServiceDefault from './banner.service';
import CompanyServiceDefault from './company.service';
import HomepageServiceDefault from './homepage.service';
import UploadServiceDefault from './upload.service';
import DashboardServiceDefault from './dashboard.service';
import { AnalyticsService as AnalyticsServiceDefault } from './analytics.service';
import { SettingsService as SettingsServiceDefault } from './settings.service';
import ContactServiceDefault from './contact.service';

// Export all services
export const AuthService = AuthServiceDefault;
export const ProductService = ProductServiceDefault;
export const CategoryService = CategoryServiceDefault;
export const OrderService = OrderServiceDefault;
export const UserService = UserServiceDefault;
export const BannerService = BannerServiceDefault;
export const CompanyService = CompanyServiceDefault;
export const HomepageService = HomepageServiceDefault;
export const UploadService = UploadServiceDefault;
export const DashboardService = DashboardServiceDefault;
export const AnalyticsService = AnalyticsServiceDefault;
export const SettingsService = SettingsServiceDefault;
export const ContactService = ContactServiceDefault;

// Export types
export type { ProductFilters } from './product.service';
export type { OrderCreateRequest, OrderFilters, PaymentRequest } from './order.service';
export type { UserCreateRequest, UserUpdateRequest, UserFilters } from './user.service';
export type { BannerCreateRequest } from './banner.service';
export type { CompanyProfileRequest } from './company.service';
export type { HomepageContentRequest, HomepageSection } from './homepage.service';
export type { BatchUploadResponse, UploadProgress } from './upload.service';
export type { 
  DashboardStats, 
  RevenueData, 
  TopProduct,
  OrderStatusDistribution
} from './dashboard.service';
export type {
  ContactMessage,
  ContactCreateRequest,
  ContactUpdateRequest,
  ContactFilters,
  ContactStats
} from './contact.service';

// API Service class that combines all services
export class ApiService {
  static auth = AuthService;
  static products = ProductService;
  static categories = CategoryService;
  static orders = OrderService;
  static users = UserService;
  static banners = BannerService;
  static company = CompanyService;
  static homepage = HomepageService;
  static uploads = UploadService;
  static dashboard = DashboardService;
  static analytics = AnalyticsService;
  static settings = SettingsService;
  static contacts = ContactService;
}

export default ApiService;
