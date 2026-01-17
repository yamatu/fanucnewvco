// Import services
import AuthServiceDefault from './auth.service';
import ProductServiceDefault from './product.service';
import CategoryServiceDefault from './category.service';
import OrderServiceDefault from './order.service';
import UserServiceDefault from './user.service';
import BannerServiceDefault from './banner.service';
import HomepageServiceDefault from './homepage.service';
import UploadServiceDefault from './upload.service';
import DashboardServiceDefault from './dashboard.service';
import ContactServiceDefault from './contact.service';
import { MediaService as MediaServiceDefault } from './media.service';

// Export all services
export const AuthService = AuthServiceDefault;
export const ProductService = ProductServiceDefault;
export const CategoryService = CategoryServiceDefault;
export const OrderService = OrderServiceDefault;
export const UserService = UserServiceDefault;
export const BannerService = BannerServiceDefault;
export const HomepageService = HomepageServiceDefault;
export const UploadService = UploadServiceDefault;
export const DashboardService = DashboardServiceDefault;
export const ContactService = ContactServiceDefault;
export const MediaService = MediaServiceDefault;

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
export type { MediaAsset, MediaListResponse, MediaUploadResponse } from './media.service';

// API Service class that combines all services
export class ApiService {
  static auth = AuthService;
  static products = ProductService;
  static categories = CategoryService;
  static orders = OrderService;
  static users = UserService;
  static banners = BannerService;
  static homepage = HomepageService;
  static uploads = UploadService;
  static dashboard = DashboardService;
  static contacts = ContactService;
  static media = MediaService;
}

export default ApiService;
