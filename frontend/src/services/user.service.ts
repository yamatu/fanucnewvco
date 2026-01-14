import { apiClient } from '@/lib/api';
import { 
  APIResponse, 
  AdminUser 
} from '@/types';

export interface UserCreateRequest {
  username: string;
  email: string;
  password: string;
  full_name: string;
  role: 'admin' | 'editor' | 'viewer';
  is_active: boolean;
}

export interface AdminUserCreateRequest {
  username: string;
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  role: 'admin' | 'editor' | 'viewer';
  is_active: boolean;
}

export interface UserUpdateRequest {
  username: string;
  email: string;
  full_name: string;
  role: 'admin' | 'editor' | 'viewer';
  is_active: boolean;
  password?: string; // Optional - only if changing password
}

export interface AdminUserUpdateRequest {
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: 'admin' | 'editor' | 'viewer';
  is_active: boolean;
  password?: string;
}

export interface UserFilters {
  search?: string;
  role?: string;
  is_active?: string;
}

export class UserService {
  // Admin: Get users
  static async getUsers(filters: UserFilters = {}): Promise<AdminUser[]> {
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        params.append(key, value.toString());
      }
    });

    const response = await apiClient.get<APIResponse<AdminUser[]>>(
      `/admin/users?${params.toString()}`
    );
    
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    
    throw new Error(response.data.message || 'Failed to fetch users');
  }

  // Admin: Get single user
  static async getUser(id: number): Promise<AdminUser> {
    const response = await apiClient.get<APIResponse<AdminUser>>(
      `/admin/users/${id}`
    );
    
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    
    throw new Error(response.data.message || 'User not found');
  }

  // Admin: Create user
  static async createUser(userData: UserCreateRequest | AdminUserCreateRequest): Promise<AdminUser> {
    // Convert AdminUserCreateRequest to UserCreateRequest if needed
    let requestData: UserCreateRequest;

    if ('first_name' in userData && 'last_name' in userData) {
      // Handle AdminUserCreateRequest format
      const adminUserData = userData as AdminUserCreateRequest;
      requestData = {
        username: adminUserData.username,
        email: adminUserData.email,
        password: adminUserData.password,
        full_name: `${adminUserData.first_name} ${adminUserData.last_name}`.trim(),
        role: adminUserData.role,
        is_active: adminUserData.is_active,
      };
    } else {
      // Handle UserCreateRequest format
      requestData = userData as UserCreateRequest;
    }

    const response = await apiClient.post<APIResponse<AdminUser>>(
      '/admin/users',
      requestData
    );

    if (response.data.success && response.data.data) {
      return response.data.data;
    }

    throw new Error(response.data.message || 'Failed to create user');
  }

  // Admin: Update user
  static async updateUser(id: number, userData: UserUpdateRequest | AdminUserUpdateRequest): Promise<AdminUser> {
    // Convert AdminUserUpdateRequest to UserUpdateRequest if needed
    let requestData: UserUpdateRequest;

    if ('first_name' in userData && 'last_name' in userData) {
      // Handle AdminUserUpdateRequest format
      const adminUserData = userData as AdminUserUpdateRequest;
      requestData = {
        username: adminUserData.username,
        email: adminUserData.email,
        full_name: `${adminUserData.first_name} ${adminUserData.last_name}`.trim(),
        role: adminUserData.role,
        is_active: adminUserData.is_active,
        password: adminUserData.password,
      };
    } else {
      // Handle UserUpdateRequest format
      requestData = userData as UserUpdateRequest;
    }

    const response = await apiClient.put<APIResponse<AdminUser>>(
      `/admin/users/${id}`,
      requestData
    );

    if (response.data.success && response.data.data) {
      return response.data.data;
    }

    throw new Error(response.data.message || 'Failed to update user');
  }

  // Admin: Delete user
  static async deleteUser(id: number): Promise<void> {
    const response = await apiClient.delete<APIResponse<void>>(
      `/admin/users/${id}`
    );
    
    if (!response.data.success) {
      throw new Error(response.data.message || 'Failed to delete user');
    }
  }

  // Admin: Toggle user status
  static async toggleUserStatus(id: number): Promise<AdminUser> {
    const response = await apiClient.patch<APIResponse<AdminUser>>(
      `/api/v1/admin/users/${id}/toggle-status`
    );
    
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    
    throw new Error(response.data.message || 'Failed to toggle user status');
  }

  // Get role options
  static getRoleOptions(): Array<{ value: string; label: string; description: string }> {
    return [
      { 
        value: 'admin', 
        label: 'Administrator', 
        description: 'Full access to all features' 
      },
      { 
        value: 'editor', 
        label: 'Editor', 
        description: 'Can manage content but not users' 
      },
      { 
        value: 'viewer', 
        label: 'Viewer', 
        description: 'Read-only access' 
      },
    ];
  }

  // Get role label
  static getRoleLabel(role: string): string {
    const roleOption = this.getRoleOptions().find(option => option.value === role);
    return roleOption?.label || role;
  }

  // Get role color
  static getRoleColor(role: string): string {
    const colors: Record<string, string> = {
      admin: 'red',
      editor: 'blue',
      viewer: 'green',
    };
    return colors[role] || 'gray';
  }

  // Check if user can perform action
  static canPerformAction(currentUserRole: string, targetUserRole: string, action: string): boolean {
    const roleHierarchy = { admin: 3, editor: 2, viewer: 1 };
    const currentLevel = roleHierarchy[currentUserRole as keyof typeof roleHierarchy] || 0;
    const targetLevel = roleHierarchy[targetUserRole as keyof typeof roleHierarchy] || 0;

    switch (action) {
      case 'edit':
      case 'delete':
        return currentLevel >= targetLevel && currentUserRole === 'admin';
      case 'view':
        return currentLevel >= 1;
      default:
        return false;
    }
  }

  // Validate user data
  static validateUserData(userData: Partial<UserCreateRequest>): string[] {
    const errors: string[] = [];

    if (!userData.username || userData.username.length < 3) {
      errors.push('Username must be at least 3 characters long');
    }

    if (!userData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userData.email)) {
      errors.push('Please enter a valid email address');
    }

    if (!userData.full_name || userData.full_name.length < 2) {
      errors.push('Full name must be at least 2 characters long');
    }

    if (userData.password && userData.password.length < 6) {
      errors.push('Password must be at least 6 characters long');
    }

    if (!userData.role || !['admin', 'editor', 'viewer'].includes(userData.role)) {
      errors.push('Please select a valid role');
    }

    return errors;
  }
}

export default UserService;
