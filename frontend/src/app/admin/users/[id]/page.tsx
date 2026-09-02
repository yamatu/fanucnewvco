'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { UserService } from '@/services/user.service';
import type { AdminUser } from '@/types';

const getErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof Error && error.message) return error.message;
  return fallback;
};

export default function UserDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const userId = Number(params.id);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [user, setUser] = useState<AdminUser | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchUser = async () => {
      if (!Number.isInteger(userId) || userId <= 0) {
        toast.error('无效的用户 ID');
        router.replace('/admin/users');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const userData = await UserService.getUser(userId);
        if (!cancelled) setUser(userData);
      } catch (error: unknown) {
        if (cancelled) return;
        console.error('获取用户失败:', error);
        toast.error(getErrorMessage(error, '获取用户信息失败'));
        router.replace('/admin/users');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void fetchUser();
    return () => {
      cancelled = true;
    };
  }, [router, userId]);

  const handleDelete = async () => {
    if (!user || !window.confirm(`确定删除用户“${user.username}”吗？此操作不可撤销。`)) return;

    setDeleting(true);
    try {
      await UserService.deleteUser(userId);
      toast.success('用户删除成功');
      router.push('/admin/users');
    } catch (error: unknown) {
      console.error('删除用户失败:', error);
      toast.error(getErrorMessage(error, '删除用户失败'));
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
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

  const roleLabel = { admin: '管理员', editor: '编辑者', viewer: '查看者' }[user.role];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">用户详情</h1>
          <p className="mt-1 text-sm text-gray-500">查看和管理用户 {user.username}</p>
        </div>
        <div className="flex gap-3">
          <button type="button" onClick={() => router.push(`/admin/users/${userId}/edit`)} className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700">
            编辑用户
          </button>
          <button type="button" onClick={() => router.back()} className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50">
            返回
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg bg-white shadow">
        <div className="border-b border-gray-200 px-6 py-5">
          <h2 className="text-lg font-medium text-gray-900">基本信息</h2>
        </div>
        <dl className="divide-y divide-gray-200">
          {[
            ['用户名', user.username],
            ['邮箱', user.email],
            ['姓名', user.full_name || '未设置'],
            ['角色', roleLabel],
            ['状态', user.is_active ? '启用' : '停用'],
            ['创建时间', new Date(user.created_at).toLocaleString()],
            ['更新时间', new Date(user.updated_at).toLocaleString()],
            ['最后登录', user.last_login ? new Date(user.last_login).toLocaleString() : '从未登录'],
          ].map(([label, value], index) => (
            <div key={label} className={`px-6 py-4 sm:grid sm:grid-cols-3 sm:gap-4 ${index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}`}>
              <dt className="text-sm font-medium text-gray-500">{label}</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">{value}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="rounded-lg bg-white p-6 shadow">
        <h2 className="text-lg font-medium text-gray-900">危险操作</h2>
        <p className="mt-2 text-sm text-gray-500">删除用户后无法恢复，且不能删除当前登录账号或最后一个管理员。</p>
        <button type="button" onClick={handleDelete} disabled={deleting} className="mt-5 rounded-md bg-red-100 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-200 disabled:opacity-50">
          {deleting ? '删除中…' : '删除用户'}
        </button>
      </div>
    </div>
  );
}
