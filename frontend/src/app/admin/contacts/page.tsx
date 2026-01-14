'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ContactService, ContactMessage, ContactStats } from '@/services';
import { queryKeys } from '@/lib/react-query';
import { toast } from 'react-hot-toast';
import {
  EnvelopeIcon,
  PhoneIcon,
  BuildingOfficeIcon,
  CalendarIcon,
  EyeIcon,
  TrashIcon,
  CheckIcon,
  XMarkIcon,
  ChatBubbleLeftRightIcon
} from '@heroicons/react/24/outline';
import { formatDistanceToNow } from 'date-fns';

export default function ContactsPage() {
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [selectedPriority, setSelectedPriority] = useState<string>('');
  const [selectedMessage, setSelectedMessage] = useState<ContactMessage | null>(null);
  const [showModal, setShowModal] = useState(false);

  const queryClient = useQueryClient();

  // 获取联系消息统计
  const { data: stats } = useQuery<ContactStats>({
    queryKey: queryKeys.contacts.stats(),
    queryFn: () => ContactService.getContactStats(),
  });

  // 获取联系消息列表
  const { data: contactsResponse, isLoading } = useQuery({
    queryKey: queryKeys.contacts.list({ status: selectedStatus, priority: selectedPriority }),
    queryFn: () => ContactService.getContacts({
      status: selectedStatus || undefined,
      priority: selectedPriority || undefined,
    }),
  });

  const contacts = contactsResponse?.data || [];

  // 更新消息状态
  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status, priority }: { id: number; status: string; priority?: string }) =>
      ContactService.updateContact(id, { status: status as any, priority: priority as any }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.contacts.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.contacts.stats() });
      toast.success('Status updated successfully');
    },
    onError: () => {
      toast.error('Failed to update status');
    },
  });

  // 删除消息
  const deleteMutation = useMutation({
    mutationFn: (id: number) => ContactService.deleteContact(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.contacts.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.contacts.stats() });
      toast.success('Message deleted successfully');
    },
    onError: () => {
      toast.error('Failed to delete message');
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new': return 'bg-blue-100 text-blue-800';
      case 'read': return 'bg-yellow-100 text-yellow-800';
      case 'replied': return 'bg-green-100 text-green-800';
      case 'closed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getInquiryTypeIcon = (type: string) => {
    switch (type) {
      case 'parts': return <BuildingOfficeIcon className="h-4 w-4" />;
      case 'repair': return <CheckIcon className="h-4 w-4" />;
      case 'support': return <ChatBubbleLeftRightIcon className="h-4 w-4" />;
      case 'quote': return <EnvelopeIcon className="h-4 w-4" />;
      default: return <EnvelopeIcon className="h-4 w-4" />;
    }
  };

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Contact Messages</h1>
        <p className="text-gray-600 mt-2">Manage customer inquiries and support requests</p>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-8">
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
            <div className="text-sm text-gray-600">Total</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-2xl font-bold text-blue-600">{stats.new}</div>
            <div className="text-sm text-gray-600">New</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-2xl font-bold text-yellow-600">{stats.read}</div>
            <div className="text-sm text-gray-600">Read</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-2xl font-bold text-green-600">{stats.replied}</div>
            <div className="text-sm text-gray-600">Replied</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-2xl font-bold text-gray-600">{stats.closed}</div>
            <div className="text-sm text-gray-600">Closed</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-2xl font-bold text-purple-600">{stats.today}</div>
            <div className="text-sm text-gray-600">Today</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-2xl font-bold text-indigo-600">{stats.this_week}</div>
            <div className="text-sm text-gray-600">This Week</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
            >
              <option value="">All Status</option>
              <option value="new">New</option>
              <option value="read">Read</option>
              <option value="replied">Replied</option>
              <option value="closed">Closed</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
            <select
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
            >
              <option value="">All Priority</option>
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
        </div>
      </div>

      {/* Messages List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading messages...</p>
          </div>
        ) : contacts && contacts.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Subject
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Priority
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {contacts.map((contact) => (
                  <tr key={contact.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{contact.name}</div>
                        <div className="text-sm text-gray-500 flex items-center">
                          <EnvelopeIcon className="h-4 w-4 mr-1" />
                          {contact.email}
                        </div>
                        {contact.phone && (
                          <div className="text-sm text-gray-500 flex items-center">
                            <PhoneIcon className="h-4 w-4 mr-1" />
                            {contact.phone}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{contact.subject}</div>
                      <div className="text-sm text-gray-500 truncate max-w-xs">
                        {contact.message}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {getInquiryTypeIcon(contact.inquiry_type)}
                        <span className="ml-2 text-sm text-gray-900 capitalize">
                          {contact.inquiry_type}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(contact.status)}`}>
                        {contact.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPriorityColor(contact.priority)}`}>
                        {contact.priority}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center">
                        <CalendarIcon className="h-4 w-4 mr-1" />
                        {formatDistanceToNow(new Date(contact.created_at), { addSuffix: true })}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => {
                            setSelectedMessage(contact);
                            setShowModal(true);
                          }}
                          className="text-yellow-600 hover:text-yellow-900"
                        >
                          <EyeIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => updateStatusMutation.mutate({ id: contact.id, status: 'replied' })}
                          className="text-green-600 hover:text-green-900"
                          disabled={contact.status === 'replied'}
                        >
                          <CheckIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => deleteMutation.mutate(contact.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center">
            <EnvelopeIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No contact messages found</p>
          </div>
        )}
      </div>

      {/* Message Detail Modal */}
      {showModal && selectedMessage && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-900">Message Details</h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Name</label>
                  <p className="text-sm text-gray-900">{selectedMessage.name}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <p className="text-sm text-gray-900">{selectedMessage.email}</p>
                </div>
              </div>
              
              {selectedMessage.phone && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Phone</label>
                  <p className="text-sm text-gray-900">{selectedMessage.phone}</p>
                </div>
              )}
              
              {selectedMessage.company && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Company</label>
                  <p className="text-sm text-gray-900">{selectedMessage.company}</p>
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Subject</label>
                <p className="text-sm text-gray-900">{selectedMessage.subject}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Message</label>
                <p className="text-sm text-gray-900 whitespace-pre-wrap">{selectedMessage.message}</p>
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Type</label>
                  <p className="text-sm text-gray-900 capitalize">{selectedMessage.inquiry_type}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Status</label>
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(selectedMessage.status)}`}>
                    {selectedMessage.status}
                  </span>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Priority</label>
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPriorityColor(selectedMessage.priority)}`}>
                    {selectedMessage.priority}
                  </span>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Received</label>
                <p className="text-sm text-gray-900">
                  {new Date(selectedMessage.created_at).toLocaleString()}
                </p>
              </div>
            </div>
            
            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => {
                  updateStatusMutation.mutate({ id: selectedMessage.id, status: 'replied' });
                  setShowModal(false);
                }}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                Mark as Replied
              </button>
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
