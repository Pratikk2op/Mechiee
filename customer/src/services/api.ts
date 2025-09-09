import type{ User, Booking, ChatSession, DashboardStats, RegisterFormData, BookingFormData, ApiResponse } from '../types';

const API_BASE_URL = 'https://backend-3lsi.onrender.com/api';

class ApiService {
  private getHeaders() {
    return {
      'Content-Type': 'application/json'
    };
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'API request failed');
    }
    return response.json();
  }

  async get<T>(endpoint: string): Promise<T> {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'GET',
      headers: this.getHeaders(),
      credentials: 'include'
    });
    return this.handleResponse<T>(response);
  }

  async post<T>(endpoint: string, data: Record<string, unknown>): Promise<T> {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
      credentials: 'include'
    });
    return this.handleResponse<T>(response);
  }

  async put<T>(endpoint: string, data: Record<string, unknown>): Promise<T> {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
      credentials: 'include'
    });
    return this.handleResponse<T>(response);
  }

  async delete<T>(endpoint: string): Promise<T> {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
      credentials: 'include'
    });
    return this.handleResponse<T>(response);
  }
}

const apiService = new ApiService();

// Auth API
export const authAPI = {
  login: (
    identifier: string,
    password: string,
    role: string,
    loginMethod: 'email' | 'phone'
  ): Promise<ApiResponse<User>> =>
    apiService.post<ApiResponse<User>>('/auth/login', {
      identifier,
      password,
      role,
      loginMethod
    }),

  register: (userData: RegisterFormData): Promise<ApiResponse<User>> =>
    apiService.post<ApiResponse<User>>('/auth/register', userData),

  getCurrentUser: (): Promise<User> =>
    apiService.get<User>('/auth/me'),

  logout: (): Promise<ApiResponse> =>
    apiService.post<ApiResponse>('/auth/logout', {}),

  updateProfile: (data: { name?: string; email?: string; password?: string }): Promise<User> =>
    apiService.put<User>('/user/profile', data),
};

// Users API
export const usersAPI = {
  getUsers: (): Promise<User[]> =>
    apiService.get<User[]>('/users'),
  getGarages: (): Promise<User[]> =>
    apiService.get<User[]>('/users/garages'),
  getMechanics: (): Promise<User[]> =>
    apiService.get<User[]>('/users/mechanics'),
  updateStatus: (userId: string, isActive: boolean): Promise<ApiResponse> =>
    apiService.put<ApiResponse>(`/users/${userId}/status`, { isActive }),
  updateProfile: (data: Partial<User>): Promise<User> =>
    apiService.put<User>('/users/profile', data),
  updateLocation: (latitude: number, longitude: number): Promise<ApiResponse> =>
    apiService.put<ApiResponse>('/users/location', { latitude, longitude })
};

// Bookings API
export const bookingsAPI = {
  getBookings: (): Promise<Booking[]> =>
    apiService.get<Booking[]>('/bookings'),
  createBooking: (data: BookingFormData): Promise<Booking> =>
    apiService.post<Booking>('/bookings', data),
  updateBookingStatus: (id: string, status: string, mechanicId?: string): Promise<Booking> =>
    apiService.put<Booking>(`/bookings/${id}/status`, { status, mechanicId }),
  addRating: (id: string, score: number, review: string): Promise<Booking> =>
    apiService.put<Booking>(`/bookings/${id}/rating`, { score, review })
};

// Garages API
export const garagesAPI = {
  updateKyc: (garageId: string, kycStatus: string): Promise<ApiResponse> =>
    apiService.put<ApiResponse>(`/garages/kyc/${garageId}`, { kycStatus }),
  updateStatus: (garageId: string, status: string): Promise<ApiResponse> =>
    apiService.put<ApiResponse>(`/garages/status/${garageId}`, { status }),
};

// Chat API
// export const chatAPI = {
//   getAdminChat: (userId: string): Promise<ChatSession[]> =>
//     apiService.get<ChatSession[]>(`/chats/admin/${userId}`),
//   getChat: (chatId: string): Promise<ChatSession> =>
//     apiService.get<ChatSession>(`/chat/${chatId}`),
//   createChat: (participantId: string, bookingId?: string): Promise<ChatSession> =>
//     apiService.post<ChatSession>('/chat/create', { participantId, bookingId }),
//   sendMessage: (chatId: string, content: string): Promise<ApiResponse> =>
//     apiService.post<ApiResponse>(`/chat/${chatId}/message`, { content })
// };

// Admin API
export const adminAPI = {
  getDashboardStats: (): Promise<DashboardStats> =>
    apiService.get<DashboardStats>('/admin/stats'),
  getUsers: (): Promise<User[]> =>
    apiService.get<User[]>('/admin/users'),
  getBookings: (): Promise<Booking[]> =>
    apiService.get<Booking[]>('/admin/bookings'),
  getGarages: (): Promise<User[]> =>
    apiService.get<User[]>('/admin/garages'),
  getMechanics: (): Promise<User[]> =>
    apiService.get<User[]>('/admin/mechanics'),
  activateUser: (userId: string): Promise<ApiResponse> =>
    apiService.put<ApiResponse>(`/admin/users/${userId}/activate`, {}),
  deactivateUser: (userId: string): Promise<ApiResponse> =>
    apiService.put<ApiResponse>(`/admin/users/${userId}/deactivate`, {}),
  verifyGarage: (garageId: string): Promise<ApiResponse> =>
    apiService.put<ApiResponse>(`/admin/garages/${garageId}/verify`, {}),
  rejectGarage: (garageId: string, reason: string): Promise<ApiResponse> =>
    apiService.put<ApiResponse>(`/admin/garages/${garageId}/reject`, { reason }),
  getPendingGarages: (): Promise<User[]> =>
    apiService.get<User[]>('/admin/garages/pending'),
  suspendUser: (userId: string, reason: string): Promise<ApiResponse> =>
    apiService.put<ApiResponse>(`/admin/users/${userId}/suspend`, { reason }),
  reactivateUser: (userId: string): Promise<ApiResponse> =>
    apiService.put<ApiResponse>(`/admin/users/${userId}/reactivate`, {}),
  deleteUser: (userId: string): Promise<ApiResponse> =>
    apiService.delete<ApiResponse>(`/admin/users/${userId}`),
  approveBooking: (bookingId: string): Promise<ApiResponse> =>
    apiService.put<ApiResponse>(`/admin/bookings/${bookingId}/approve`, {}),
  rejectBooking: (bookingId: string): Promise<ApiResponse> =>
    apiService.put<ApiResponse>(`/admin/bookings/${bookingId}/reject`, {}),
  cancelBooking: (bookingId: string): Promise<ApiResponse> =>
    apiService.put<ApiResponse>(`/admin/bookings/${bookingId}/cancel`, {})
};

// Tracking API
export const trackingAPI = {
  updateLocation: (latitude: number, longitude: number, bookingId?: string): Promise<ApiResponse> =>
    apiService.put<ApiResponse>('/tracking/location', { latitude, longitude, bookingId }),
  getBookingLocation: (bookingId: string): Promise<{ latitude: number; longitude: number }> =>
    apiService.get<{ latitude: number; longitude: number }>(`/tracking/booking/${bookingId}`),
  getMechanicLocation: (mechanicId: string): Promise<{ latitude: number; longitude: number }> =>
    apiService.get<{ latitude: number; longitude: number }>(`/tracking/mechanic/${mechanicId}`),
  getCustomerLocation: (customerId: string): Promise<{ latitude: number; longitude: number }> =>
    apiService.get<{ latitude: number; longitude: number }>(`/tracking/customer/${customerId}`),
  startTracking: (bookingId: string): Promise<ApiResponse> =>
    apiService.post<ApiResponse>(`/tracking/start/${bookingId}`, {}),
  stopTracking: (bookingId: string): Promise<ApiResponse> =>
    apiService.post<ApiResponse>(`/tracking/stop/${bookingId}`, {}),
  getTrackingHistory: (bookingId: string): Promise<Array<{ timestamp: Date; location: { latitude: number; longitude: number } }>> =>
    apiService.get<Array<{ timestamp: Date; location: { latitude: number; longitude: number } }>>(`/tracking/history/${bookingId}`)
};

// Payments API
export const paymentsAPI = {
  createPaymentIntent: (bookingId: string): Promise<{ clientSecret: string }> =>
    apiService.post<{ clientSecret: string }>('/payments/create-payment-intent', { bookingId }),
  confirmPayment: (bookingId: string, paymentIntentId: string): Promise<ApiResponse> =>
    apiService.post<ApiResponse>('/payments/confirm-payment', { bookingId, paymentIntentId })
};