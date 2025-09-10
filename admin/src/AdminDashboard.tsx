import React, { useState, useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { 
  Users, 
  Building, 
  MessageCircle,
  UserCheck,
  Eye,
  CheckCircle,
  XCircle,
  UserX,
  AlertCircle,
  DollarSign,
  Calendar,
  LogOut
} from 'lucide-react';
import type { UserRole } from './types';
import { adminAPI } from './services/api';
import TrackingDashboard from './tracking/TrackingDashboard';
import { toast } from 'react-hot-toast';

interface DashboardStats {
  totalUsers: number;
  totalBookings: number;
  totalGarages: number;
  totalMechanics: number;
  pendingBookings: number;
  completedBookings: number;
  totalRevenue: number;
  activeUsers: number;
}

interface PendingGarage {
  _id: string;
  garageName: string;
  ownerName: string;
  email: string;
  phone: string;
  address: string;
  verificationStatus: string;
  createdAt: Date;
  userId: {
    _id: string;
    name: string;
    email: string;
    phone: string;
  };
}

interface User {
  _id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  isActive: boolean;
  isVerified: boolean;
  accountStatus: string;
  createdAt: Date;
  lastLoginAt?: Date;
}

type DashboardTab = 'overview' | 'garages' | 'users' | 'chat' | 'tracking';

const AdminDashboard: React.FC = () => {
  const { user, logout, loading } = useAuth();
  const navigate = useNavigate();
  
  // State for data
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [pendingGarages, setPendingGarages] = useState<PendingGarage[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  
  // UI State
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<DashboardTab>('overview');

  useEffect(() => {
    if (user?.role !== 'admin') {
      navigate('/login');
      return;
    }

    fetchDashboardData();
  }, [user, navigate]);

  const fetchDashboardData = async (): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);
      const [statsRes, garagesRes, usersRes] = await Promise.all([
        adminAPI.getDashboardStats(),
        adminAPI.getPendingGarages(),
        adminAPI.getUsers()
      ]);

      setStats(statsRes);
      setPendingGarages(garagesRes);
      setUsers(usersRes);
    } catch (error: unknown) {
      console.error('Error fetching dashboard data:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to load dashboard data';
      setError(errorMessage);
      toast.error('Failed to load dashboard data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyGarage = async (garageId: string): Promise<void> => {
    try {
      await adminAPI.verifyGarage(garageId);
      toast.success('Garage verified successfully');
      await fetchDashboardData();
    } catch (error) {
      console.error('Error verifying garage:', error);
      toast.error('Failed to verify garage');
    }
  };

  const handleRejectGarage = async (garageId: string, reason: string): Promise<void> => {
    try {
      await adminAPI.rejectGarage(garageId, reason);
      toast.success('Garage rejected');
      await fetchDashboardData();
    } catch (error) {
      console.error('Error rejecting garage:', error);
      toast.error('Failed to reject garage');
    }
  };

  const handleUserAction = async (
    userId: string, 
    action: 'activate' | 'deactivate' | 'suspend' | 'reactivate'
  ): Promise<void> => {
    try {
      switch (action) {
        case 'activate':
          await adminAPI.activateUser(userId);
          break;
        case 'deactivate':
          await adminAPI.deactivateUser(userId);
          break;
        case 'suspend':
          await adminAPI.suspendUser(userId, "NA");
          break;
        case 'reactivate':
          await adminAPI.reactivateUser(userId);
          break;
        default:
          throw new Error(`Unknown action: ${action}`);
      }
      toast.success(`User ${action}d successfully`);
      await fetchDashboardData();
    } catch (error) {
      console.error(`Error ${action}ing user:`, error);
      toast.error(`Failed to ${action} user`);
    }
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'active': 
        return 'text-green-600 bg-green-100';
      case 'suspended': 
        return 'text-yellow-600 bg-yellow-100';
      case 'deactivated': 
        return 'text-red-600 bg-red-100';
      default: 
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getVerificationStatusColor = (status: string): string => {
    switch (status) {
      case 'verified': 
        return 'text-green-600 bg-green-100';
      case 'pending': 
        return 'text-yellow-600 bg-yellow-100';
      case 'rejected': 
        return 'text-red-600 bg-red-100';
      default: 
        return 'text-gray-600 bg-gray-100';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-red-500" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Error loading dashboard</h3>
          <p className="mt-1 text-sm text-gray-500">{error}</p>
          <div className="mt-6">
            <button
              type="button"
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              onClick={() => fetchDashboardData()}
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
              <p className="text-gray-600">Manage your platform</p>
            </div>
            <div className="flex space-x-4">
              <button
                onClick={() => logout()}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2"
              >
                <LogOut className="w-4 h-4" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            {[
              { id: 'overview', name: 'Overview', icon: Eye },
              { id: 'garages', name: 'Garage Verification', icon: Building },
              { id: 'users', name: 'User Management', icon: Users },
              { id: 'chat', name: 'Support Chat', icon: MessageCircle },
              { id: 'tracking', name: 'Live Tracking', icon: Eye }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as DashboardTab)}
                className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                <span>{tab.name}</span>
              </button>
            ))}
          </nav>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Overview Tab */}
        {activeTab === 'overview' && stats && (
          <div className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Users className="h-8 w-8 text-blue-600" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Total Users</dt>
                      <dd className="text-lg font-medium text-gray-900">{stats.totalUsers}</dd>
                    </dl>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Building className="h-8 w-8 text-green-600" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Total Garages</dt>
                      <dd className="text-lg font-medium text-gray-900">{stats.totalGarages}</dd>
                    </dl>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Calendar className="h-8 w-8 text-yellow-600" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Total Bookings</dt>
                      <dd className="text-lg font-medium text-gray-900">{stats.totalBookings}</dd>
                    </dl>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <DollarSign className="h-8 w-8 text-purple-600" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Total Revenue</dt>
                      <dd className="text-lg font-medium text-gray-900">₹{stats.totalRevenue.toLocaleString()}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Quick Actions</h3>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <button
                    onClick={() => setActiveTab('garages')}
                    className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                  >
                    <AlertCircle className="h-6 w-6 text-yellow-600 mr-3" />
                    <div className="text-left">
                      <p className="font-medium text-gray-900">Pending Verifications</p>
                      <p className="text-sm text-gray-500">{pendingGarages.length} garages</p>
                    </div>
                  </button>

                  <button
                    onClick={() => setActiveTab('users')}
                    className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                  >
                    <Users className="h-6 w-6 text-blue-600 mr-3" />
                    <div className="text-left">
                      <p className="font-medium text-gray-900">User Management</p>
                      <p className="text-sm text-gray-500">{users.length} users</p>
                    </div>
                  </button>

                  <button
                    onClick={() => navigate('/admin/chat')}
                    className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                  >
                    <MessageCircle className="h-6 w-6 text-green-600 mr-3" />
                    <div className="text-left">
                      <p className="font-medium text-gray-900">Support Chat</p>
                      <p className="text-sm text-gray-500">Manage customer support</p>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Garage Verification Tab */}
        {activeTab === 'garages' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Pending Garage Verifications</h3>
                <p className="text-sm text-gray-500">Review and verify new garage registrations</p>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Garage Details
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Owner Details
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {pendingGarages.map((garage) => (
                      <tr key={garage._id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{garage.garageName}</div>
                            <div className="text-sm text-gray-500">{garage.address}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{garage.ownerName}</div>
                            <div className="text-sm text-gray-500">{garage.email}</div>
                            <div className="text-sm text-gray-500">{garage.phone}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getVerificationStatusColor(garage.verificationStatus)}`}>
                            {garage.verificationStatus}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleVerifyGarage(garage._id)}
                              className="text-green-600 hover:text-green-900 flex items-center"
                            >
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Verify
                            </button>
                            <button
                              onClick={() => handleRejectGarage(garage._id, 'Documentation incomplete')}
                              className="text-red-600 hover:text-red-900 flex items-center"
                            >
                              <XCircle className="w-4 h-4 mr-1" />
                              Reject
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {pendingGarages.length === 0 && (
                <div className="p-6 text-center text-gray-500">
                  No pending garage verifications
                </div>
              )}
            </div>
          </div>
        )}

        {/* User Management Tab */}
        {activeTab === 'users' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">User Management</h3>
                <p className="text-sm text-gray-500">Manage user accounts and permissions</p>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        User
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Role
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Last Login
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {users.map((user) => (
                      <tr key={user._id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{user.name}</div>
                            <div className="text-sm text-gray-500">{user.email}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                            {user.role}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(user.accountStatus)}`}>
                            {user.accountStatus}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString() : 'Never'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2">
                            {user.accountStatus === 'active' ? (
                              <>
                                <button
                                  onClick={() => handleUserAction(user._id, 'suspend')}
                                  className="text-yellow-600 hover:text-yellow-900 flex items-center"
                                >
                                  <UserX className="w-4 h-4 mr-1" />
                                  Suspend
                                </button>
                                <button
                                  onClick={() => handleUserAction(user._id, 'deactivate')}
                                  className="text-red-600 hover:text-red-900 flex items-center"
                                >
                                  <XCircle className="w-4 h-4 mr-1" />
                                  Deactivate
                                </button>
                              </>
                            ) : (
                              <button
                                onClick={() => handleUserAction(user._id, 'reactivate')}
                                className="text-green-600 hover:text-green-900 flex items-center"
                              >
                                <UserCheck className="w-4 h-4 mr-1" />
                                Reactivate
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {users.length === 0 && (
                <div className="p-6 text-center text-gray-500">
                  No users found
                </div>
              )}
            </div>
          </div>
        )}

        {/* Chat Tab */}
        {activeTab === 'chat' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Support Chat Management</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-blue-900">Active Conversations</h4>
                      <p className="text-blue-600 text-sm">12 ongoing chats</p>
                    </div>
                    <MessageCircle className="h-8 w-8 text-blue-600" />
                  </div>
                </div>
                
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-green-900">Resolved Today</h4>
                      <p className="text-green-600 text-sm">8 conversations</p>
                    </div>
                    <CheckCircle className="h-8 w-8 text-green-600" />
                  </div>
                </div>
                
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-yellow-900">Pending Response</h4>
                      <p className="text-yellow-600 text-sm">3 conversations</p>
                    </div>
                    <AlertCircle className="h-8 w-8 text-yellow-600" />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium text-gray-900">Recent Support Requests</h4>
                <div className="space-y-2">
                  {users.slice(0, 5).map((user) => (
                    <div key={user._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900">{user.name}</p>
                        <p className="text-sm text-gray-500">{user.email} • {user.role}</p>
                      </div>
                    </div>
                  ))}
                </div>
                {users.length === 0 && (
                  <div className="p-4 text-center text-gray-500">
                    No recent support requests
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tracking Tab */}
        {activeTab === 'tracking' && (
          <div className="space-y-6">
            <TrackingDashboard />
          </div>
        )}

        {/* Loading state for when fetching data */}
        {isLoading && activeTab !== 'tracking' && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-gray-600">Loading...</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;