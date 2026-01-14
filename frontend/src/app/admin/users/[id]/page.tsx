'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { UserService } from '@/services/user.service';
import { AdminUser } from '@/types';

export default function UserDetailPage() {
  const router = useRouter();
  const params = useParams();
  const userId = params.id as string;
  
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<AdminUser | null>(null);

  useEffect(() => {
    fetchUser();
  }, [userId]);

  const fetchUser = async () => {
    try {
      setLoading(true);
      const response = await UserService.getUser(userId);
      setUser(response.data);
    } catch (error: any) {
      console.error('获取用户失败:', error);
      toast.error('获取用户信息失败');
      router.push('/admin/users');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!user) return;
    
    if (!confirm(`确定要删除用户 "${user.username}" 吗？此操作不可撤销。`)) {
      return;
    }

    try {
      await UserService.deleteUser(userId);
      toast.success('用户删除成功');
      router.push('/admin/users');
    } catch (error: any) {
      console.error('删除用户失败:', error);
      toast.error(error.response?.data?.message || '删除用户失败');
    }
  };

  const getRoleBadge = (role: string) => {
    const roleConfig = {
      admin: { label: '管理员', color: 'bg-red-100 text-red-800' },
      editor: { label: '编辑者', color: 'bg-blue-100 text-blue-800' },
      viewer: { label: '查看者', color: 'bg-gray-100 text-gray-800' },
    };
    
    const config = roleConfig[role as keyof typeof roleConfig] || roleConfig.viewer;
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        {config.label}
      </span>
    );
  };

  const getStatusBadge = (isActive: boolean) => {
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
        isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
      }`}>
        {isActive ? '激活' : '停用'}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-gray-900">用户不存在</h3>
        <p className="mt-1 text-sm text-gray-500">请检查用户ID是否正确</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">用户详情</h1>
          <p className="mt-1 text-sm text-gray-500">
            查看和管理用户 {user.username} 的详细信息
          </p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => router.push(`/admin/users/${userId}/edit`)}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            编辑用户
          </button>
          <button
            onClick={() => router.back()}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            返回
          </button>
        </div>
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">基本信息</h3>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">用户的基本信息和账户状态</p>
        </div>
        <div className="border-t border-gray-200">
          <dl>
            <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">用户名</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{user.username}</dd>
            </div>
            <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">邮箱</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{user.email}</dd>
            </div>
            <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">姓名</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                {user.first_name || user.last_name 
                  ? `${user.first_name || ''} ${user.last_name || ''}`.trim()
                  : '未设置'
                }
              </dd>
            </div>
            <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">角色</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                {getRoleBadge(user.role)}
              </dd>
            </div>
            <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">状态</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                {getStatusBadge(user.is_active)}
              </dd>
            </div>
            <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">创建时间</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                {new Date(user.created_at).toLocaleString()}
              </dd>
            </div>
            <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">最后更新</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                {new Date(user.updated_at).toLocaleString()}
              </dd>
            </div>
            {user.last_login && (
              <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">最后登录</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  {new Date(user.last_login).toLocaleString()}
                </dd>
              </div>
            )}
          </dl>
        </div>
      </div>

      <div className="bg-white shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">危险操作</h3>
          <div className="mt-2 max-w-xl text-sm text-gray-500">
            <p>删除用户将永久移除该用户的所有数据，此操作不可撤销。</p>
          </div>
          <div className="mt-5">
            <button
              onClick={handleDelete}
              className="inline-flex items-center justify-center px-4 py-2 border border-transparent font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:text-sm"
            >
              删除用户
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
