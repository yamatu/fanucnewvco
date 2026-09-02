'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { UserService, type UserUpdateRequest } from '@/services/user.service';
import type { AdminUser } from '@/types';

const emptyForm: UserUpdateRequest = {
  username: '',
  email: '',
  full_name: '',
  role: 'editor',
  is_active: true,
};

const getErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof Error && error.message) return error.message;
  return fallback;
};

export default function EditUserPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const userId = Number(params.id);

  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [user, setUser] = useState<AdminUser | null>(null);
  const [formData, setFormData] = useState<UserUpdateRequest>(emptyForm);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    let cancelled = false;

    const fetchUser = async () => {
      if (!Number.isInteger(userId) || userId <= 0) {
        toast.error('无效的用户 ID');
        router.replace('/admin/users');
        setFetchLoading(false);
        return;
      }

      try {
        setFetchLoading(true);
        const userData = await UserService.getUser(userId);
        if (cancelled) return;
        setUser(userData);
        setFormData({
          username: userData.username,
          email: userData.email,
          full_name: userData.full_name || '',
          role: userData.role,
          is_active: userData.is_active,
        });
      } catch (error: unknown) {
        if (cancelled) return;
        console.error('获取用户失败:', error);
        toast.error(getErrorMessage(error, '获取用户信息失败'));
        router.replace('/admin/users');
      } finally {
        if (!cancelled) setFetchLoading(false);
      }
    };

    void fetchUser();
    return () => {
      cancelled = true;
    };
  }, [router, userId]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (newPassword || confirmPassword) {
      if (newPassword.length < 6) {
        toast.error('新密码至少需要 6 位');
        return;
      }
      if (newPassword !== confirmPassword) {
        toast.error('两次输入的密码不一致');
        return;
      }
    }

    setLoading(true);
    try {
      await UserService.updateUser(userId, {
        ...formData,
        ...(newPassword ? { password: newPassword } : {}),
      });
      toast.success('用户更新成功');
      router.push('/admin/users');
    } catch (error: unknown) {
      console.error('更新用户失败:', error);
      toast.error(getErrorMessage(error, '更新用户失败'));
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = event.target;
    setFormData((current) => ({
      ...current,
      [name]: type === 'checkbox' ? (event.target as HTMLInputElement).checked : value,
    }));
  };

  if (fetchLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-16 w-16 animate-spin rounded-full border-b-2 border-blue-500" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="py-12 text-center">
        <h3 className="text-lg font-medium text-gray-900">用户不存在</h3>
        <p className="mt-1 text-sm text-gray-500">请检查用户 ID 是否正确</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">编辑用户</h1>
          <p className="mt-1 text-sm text-gray-500">编辑用户 {user.username} 的账号信息</p>
        </div>
        <button type="button" onClick={() => router.back()} className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50">
          返回
        </button>
      </div>

      <div className="rounded-lg bg-white shadow">
        <form onSubmit={handleSubmit} className="space-y-6 p-6">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700">用户名 *</label>
              <input id="username" name="username" type="text" required value={formData.username} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm" />
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">邮箱 *</label>
              <input id="email" name="email" type="email" required value={formData.email} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm" />
            </div>
            <div>
              <label htmlFor="full_name" className="block text-sm font-medium text-gray-700">姓名 *</label>
              <input id="full_name" name="full_name" type="text" required value={formData.full_name} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm" />
            </div>
            <div>
              <label htmlFor="role" className="block text-sm font-medium text-gray-700">角色 *</label>
              <select id="role" name="role" required value={formData.role} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm">
                <option value="admin">管理员</option>
                <option value="editor">编辑者</option>
                <option value="viewer">查看者</option>
              </select>
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-900">
            <input id="is_active" name="is_active" type="checkbox" checked={formData.is_active} onChange={handleChange} className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
            启用用户
          </label>

          <div className="rounded-md bg-gray-50 p-4">
            <h2 className="mb-2 text-sm font-medium text-gray-900">账号信息</h2>
            <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-3">
              <p><span className="text-gray-500">创建时间：</span>{new Date(user.created_at).toLocaleString()}</p>
              <p><span className="text-gray-500">更新时间：</span>{new Date(user.updated_at).toLocaleString()}</p>
              {user.last_login && <p><span className="text-gray-500">最后登录：</span>{new Date(user.last_login).toLocaleString()}</p>}
            </div>
          </div>

          <div className="border-t border-gray-200 pt-6">
            <h2 className="mb-4 text-lg font-medium text-gray-900">重置密码</h2>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label htmlFor="new_password" className="block text-sm font-medium text-gray-700">新密码</label>
                <input id="new_password" type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm" placeholder="留空则不修改" />
              </div>
              <div>
                <label htmlFor="confirm_password" className="block text-sm font-medium text-gray-700">确认新密码</label>
                <input id="confirm_password" type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm" />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => router.back()} className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50">取消</button>
            <button type="submit" disabled={loading} className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-50">
              {loading ? '更新中…' : '更新用户'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
