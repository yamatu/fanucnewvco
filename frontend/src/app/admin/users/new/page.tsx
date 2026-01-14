'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { UserService } from '@/services/user.service';
import { AdminUserCreateRequest } from '@/types';

export default function NewUserPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<AdminUserCreateRequest>({
    username: '',
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    role: 'editor',
    is_active: true,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await UserService.createUser(formData);
      toast.success('用户创建成功');
      router.push('/admin/users');
    } catch (error: any) {
      console.error('创建用户失败:', error);
      toast.error(error.response?.data?.message || '创建用户失败');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="space-y-8">
          {/* Header */}
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">新增用户</h1>
                <p className="mt-2 text-sm text-gray-600">
                  创建新的管理员用户账户，填写下方表单信息
                </p>
              </div>
              <button
                onClick={() => router.back()}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                返回
              </button>
            </div>
          </div>

          {/* Form */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">用户信息</h2>
              <p className="mt-1 text-sm text-gray-500">请填写用户的基本信息和权限设置</p>
            </div>
            <form onSubmit={handleSubmit} className="p-6">
              <div className="space-y-6">
                {/* 基本信息 */}
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div className="space-y-1">
                    <label htmlFor="username" className="block text-sm font-medium text-gray-700">
                      用户名 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="username"
                      id="username"
                      required
                      value={formData.username}
                      onChange={handleChange}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors"
                      placeholder="请输入用户名"
                    />
                    <p className="text-xs text-gray-500">用于登录系统的唯一标识</p>
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                      邮箱地址 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      name="email"
                      id="email"
                      required
                      value={formData.email}
                      onChange={handleChange}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors"
                      placeholder="请输入邮箱地址"
                    />
                    <p className="text-xs text-gray-500">用于接收系统通知和密码重置</p>
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="first_name" className="block text-sm font-medium text-gray-700">
                      名字
                    </label>
                    <input
                      type="text"
                      name="first_name"
                      id="first_name"
                      value={formData.first_name}
                      onChange={handleChange}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors"
                      placeholder="请输入名字"
                    />
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="last_name" className="block text-sm font-medium text-gray-700">
                      姓氏
                    </label>
                    <input
                      type="text"
                      name="last_name"
                      id="last_name"
                      value={formData.last_name}
                      onChange={handleChange}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors"
                      placeholder="请输入姓氏"
                    />
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                      密码 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="password"
                      name="password"
                      id="password"
                      required
                      value={formData.password}
                      onChange={handleChange}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors"
                      placeholder="请输入密码"
                      minLength={6}
                    />
                    <p className="text-xs text-gray-500">密码长度至少6位字符</p>
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="role" className="block text-sm font-medium text-gray-700">
                      用户角色 <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="role"
                      id="role"
                      required
                      value={formData.role}
                      onChange={handleChange}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors"
                    >
                      <option value="admin">管理员 - 完全访问权限</option>
                      <option value="editor">编辑者 - 内容管理权限</option>
                      <option value="viewer">查看者 - 只读权限</option>
                    </select>
                    <p className="text-xs text-gray-500">选择用户在系统中的权限级别</p>
                  </div>
                </div>

                {/* 状态设置 */}
                <div className="border-t border-gray-200 pt-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">账户状态</h3>
                  <div className="flex items-start space-x-3">
                    <div className="flex items-center h-5">
                      <input
                        id="is_active"
                        name="is_active"
                        type="checkbox"
                        checked={formData.is_active}
                        onChange={handleChange}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded transition-colors"
                      />
                    </div>
                    <div className="text-sm">
                      <label htmlFor="is_active" className="font-medium text-gray-700">
                        激活用户账户
                      </label>
                      <p className="text-gray-500">
                        激活后用户可以正常登录系统，未激活的用户无法登录
                      </p>
                    </div>
                  </div>
                </div>

                {/* 提交按钮 */}
                <div className="border-t border-gray-200 pt-6">
                  <div className="flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={() => router.back()}
                      className="inline-flex items-center px-6 py-3 border border-gray-300 shadow-sm text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      取消
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="inline-flex items-center px-6 py-3 border border-transparent shadow-sm text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {loading ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          创建中...
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                          </svg>
                          创建用户
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
