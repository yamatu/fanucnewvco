'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import { apiClient } from '@/lib/api';
import AdminLayout from '@/components/admin/AdminLayout';
import {
  ChevronLeftIcon,
  PaperAirplaneIcon,
  UserIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline';

interface TicketReply {
  id: number;
  ticket_id: number;
  message: string;
  is_staff: boolean;
  created_at: string;
  admin_user?: {
    full_name: string;
    email: string;
  };
}

interface Ticket {
  id: number;
  ticket_number: string;
  subject: string;
  message: string;
  category: string;
  priority: string;
  status: string;
  order_number?: string;
  created_at: string;
  updated_at: string;
  customer: {
    id: number;
    full_name: string;
    email: string;
    phone?: string;
  };
  replies: TicketReply[];
}

export default function AdminTicketDetailPage() {
  const params = useParams();
  const ticketId = params?.id as string;
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [replyMessage, setReplyMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState('');

  useEffect(() => {
    if (ticketId) {
      loadTicket();
    }
  }, [ticketId]);

  const loadTicket = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get(`/admin/tickets/${ticketId}`);
      if (response.data.success) {
        setTicket(response.data.data);
        setStatus(response.data.data.status);
      }
    } catch (error: any) {
      console.error('Failed to load ticket:', error);
      toast.error('Failed to load ticket details');
    } finally {
      setLoading(false);
    }
  };

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyMessage.trim()) return;

    try {
      setSubmitting(true);
      const response = await apiClient.post(`/admin/tickets/${ticketId}/reply`, {
        message: replyMessage,
      });

      if (response.data.success) {
        toast.success('Reply sent successfully');
        setReplyMessage('');
        loadTicket();
      }
    } catch (error: any) {
      toast.error('Failed to send reply');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    try {
      const response = await apiClient.put(`/admin/tickets/${ticketId}`, {
        status: newStatus,
      });

      if (response.data.success) {
        toast.success('Ticket status updated');
        setStatus(newStatus);
        loadTicket();
      }
    } catch (error: any) {
      toast.error('Failed to update status');
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-sm text-gray-500">Loading ticket...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (!ticket) {
    return (
      <AdminLayout>
        <div className="px-4 sm:px-6 lg:px-8">
          <p className="text-center text-gray-500">Ticket not found</p>
        </div>
      </AdminLayout>
    );
  }

  const priorityColors: Record<string, string> = {
    low: 'bg-gray-100 text-gray-800',
    normal: 'bg-blue-100 text-blue-800',
    high: 'bg-orange-100 text-orange-800',
    urgent: 'bg-red-100 text-red-800',
  };

  return (
    <AdminLayout>
      <div className="px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6">
          <Link
            href="/admin/tickets"
            className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4"
          >
            <ChevronLeftIcon className="h-4 w-4 mr-1" />
            Back to Tickets
          </Link>
          <div className="md:flex md:items-center md:justify-between">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold text-gray-900">{ticket.subject}</h1>
              <div className="mt-2 flex items-center space-x-3 text-sm text-gray-500">
                <span>#{ticket.ticket_number}</span>
                <span>•</span>
                <span className="capitalize">{ticket.category.replace('-', ' ')}</span>
                {ticket.order_number && (
                  <>
                    <span>•</span>
                    <Link
                      href={`/admin/orders?search=${ticket.order_number}`}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      Order #{ticket.order_number}
                    </Link>
                  </>
                )}
                <span>•</span>
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                    priorityColors[ticket.priority]
                  }`}
                >
                  {ticket.priority.toUpperCase()}
                </span>
              </div>
            </div>
            <div className="mt-4 md:mt-0 md:ml-4">
              <select
                value={status}
                onChange={(e) => handleStatusChange(e.target.value)}
                className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
              >
                <option value="open">Open</option>
                <option value="in-progress">In Progress</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Original Message */}
            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0">
                  <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                    <UserIcon className="h-6 w-6 text-gray-600" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {ticket.customer.full_name}
                      </p>
                      <p className="text-xs text-gray-500">{ticket.customer.email}</p>
                    </div>
                    <span className="text-xs text-gray-500">
                      {new Date(ticket.created_at).toLocaleString()}
                    </span>
                  </div>
                  <div className="prose prose-sm max-w-none">
                    <p className="text-gray-700 whitespace-pre-wrap">{ticket.message}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Replies */}
            {ticket.replies && ticket.replies.map((reply) => (
              <div key={reply.id} className="bg-white shadow rounded-lg p-6">
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0">
                    <div
                      className={`h-10 w-10 rounded-full flex items-center justify-center ${
                        reply.is_staff ? 'bg-blue-100' : 'bg-gray-200'
                      }`}
                    >
                      {reply.is_staff ? (
                        <ShieldCheckIcon className="h-6 w-6 text-blue-600" />
                      ) : (
                        <UserIcon className="h-6 w-6 text-gray-600" />
                      )}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {reply.is_staff
                            ? (reply.admin_user?.full_name || 'Support Team')
                            : ticket.customer.full_name}
                          {reply.is_staff && (
                            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                              Staff
                            </span>
                          )}
                        </p>
                      </div>
                      <span className="text-xs text-gray-500">
                        {new Date(reply.created_at).toLocaleString()}
                      </span>
                    </div>
                    <div className="prose prose-sm max-w-none">
                      <p className="text-gray-700 whitespace-pre-wrap">{reply.message}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {/* Reply Form */}
            <div className="bg-white shadow rounded-lg p-6">
              <form onSubmit={handleReply}>
                <label htmlFor="reply" className="block text-sm font-medium text-gray-700 mb-2">
                  Add Reply
                </label>
                <textarea
                  id="reply"
                  rows={4}
                  value={replyMessage}
                  onChange={(e) => setReplyMessage(e.target.value)}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  placeholder="Type your response..."
                  disabled={submitting}
                />
                <div className="mt-4 flex justify-end">
                  <button
                    type="submit"
                    disabled={submitting || !replyMessage.trim()}
                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? (
                      <>
                        <svg
                          className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          ></circle>
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          ></path>
                        </svg>
                        Sending...
                      </>
                    ) : (
                      <>
                        <PaperAirplaneIcon className="h-4 w-4 mr-2" />
                        Send Reply
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Customer Information</h3>
              <dl className="space-y-3">
                <div>
                  <dt className="text-xs font-medium text-gray-500 uppercase">Name</dt>
                  <dd className="mt-1 text-sm text-gray-900">{ticket.customer.full_name}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-gray-500 uppercase">Email</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    <a
                      href={`mailto:${ticket.customer.email}`}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      {ticket.customer.email}
                    </a>
                  </dd>
                </div>
                {ticket.customer.phone && (
                  <div>
                    <dt className="text-xs font-medium text-gray-500 uppercase">Phone</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      <a
                        href={`tel:${ticket.customer.phone}`}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        {ticket.customer.phone}
                      </a>
                    </dd>
                  </div>
                )}
                <div>
                  <dt className="text-xs font-medium text-gray-500 uppercase">Customer ID</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    <Link
                      href={`/admin/customers?search=${ticket.customer.email}`}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      #{ticket.customer.id}
                    </Link>
                  </dd>
                </div>
              </dl>
            </div>

            <div className="bg-white shadow rounded-lg p-6 mt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Ticket Information</h3>
              <dl className="space-y-3">
                <div>
                  <dt className="text-xs font-medium text-gray-500 uppercase">Created</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {new Date(ticket.created_at).toLocaleString()}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-gray-500 uppercase">Last Updated</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {new Date(ticket.updated_at).toLocaleString()}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-gray-500 uppercase">Replies</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {ticket.replies ? ticket.replies.length : 0}
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
