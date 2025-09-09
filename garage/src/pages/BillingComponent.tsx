import React, { useState, useEffect } from 'react';
import { 
  Receipt, 

  Send, 
  Download, 
  Edit, 
  Trash2,
  Plus,

  User,
  Phone,
  MapPin,
  Calendar,
  Clock
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

interface BillItem {
  id: string;
  description: string;
  quantity: number;
  rate: number;
  amount: number;
}

interface Bill {
  _id: string;
  bookingId: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  garageId: string;
  garageName: string;
  items: BillItem[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  status: 'draft' | 'sent' | 'paid' | 'overdue';
  dueDate: Date;
  createdAt: Date;
  updatedAt: Date;
  notes?: string;
  paymentMethod?: 'cash' | 'card' | 'upi' | 'bank_transfer';
}

interface BillingComponentProps {
  bookingId?: string;
  isOpen?: boolean;
  onClose?: () => void;
}

const BillingComponent: React.FC<BillingComponentProps> = ({ 
  bookingId, 
  isOpen = false, 
  onClose 
}) => {
  const { user } = useAuth();
  const [bills, setBills] = useState<Bill[]>([]);
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [loading, setLoading] = useState(false);

  // Form state for creating/editing bills
  const [formData, setFormData] = useState({
    customerName: '',
    customerPhone: '',
    customerAddress: '',
    items: [] as BillItem[],
    notes: '',
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 7 days from now
    paymentMethod: 'cash' as 'cash' | 'card' | 'upi' | 'bank_transfer'
  });

  // New item form
  const [newItem, setNewItem] = useState({
    description: '',
    quantity: 1,
    rate: 0
  });

  useEffect(() => {
    if (isOpen) {
      fetchBills();
    }
  }, [isOpen, bookingId]);

  const fetchBills = async () => {
    setLoading(true);
    try {
      // Mock data - replace with actual API call
      const mockBills: Bill[] = [
        {
          _id: 'bill_1',
          bookingId: bookingId || 'booking_1',
          customerId: 'customer_1',
          customerName: 'John Doe',
          customerPhone: '+91 9876543210',
          customerAddress: '123 Main Street, City, State',
          garageId: user?.id || 'garage_1',
          garageName: user?.name || 'ABC Garage',
          items: [
            {
              id: 'item_1',
              description: 'Engine Oil Change',
              quantity: 1,
              rate: 500,
              amount: 500
            },
            {
              id: 'item_2',
              description: 'Oil Filter Replacement',
              quantity: 1,
              rate: 200,
              amount: 200
            },
            {
              id: 'item_3',
              description: 'Labor Charges',
              quantity: 2,
              rate: 300,
              amount: 600
            }
          ],
          subtotal: 1300,
          tax: 130,
          discount: 0,
          total: 1430,
          status: 'sent',
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          createdAt: new Date(),
          updatedAt: new Date(),
          notes: 'Please pay within 7 days',
          paymentMethod: 'cash'
        }
      ];

      setBills(mockBills);
    } catch (error) {
      console.error('Error fetching bills:', error);
      toast.error('Failed to load bills');
    } finally {
      setLoading(false);
    }
  };

  const calculateTotals = (items: BillItem[]) => {
    const subtotal = items.reduce((sum, item) => sum + item.amount, 0);
    const tax = subtotal * 0.1; // 10% tax
    const discount = 0; // Can be modified for discounts
    const total = subtotal + tax - discount;
    return { subtotal, tax, discount, total };
  };

  const addItem = () => {
    if (!newItem.description || newItem.rate <= 0) {
      toast.error('Please fill all item details');
      return;
    }

    const item: BillItem = {
      id: Date.now().toString(),
      description: newItem.description,
      quantity: newItem.quantity,
      rate: newItem.rate,
      amount: newItem.quantity * newItem.rate
    };

    setFormData(prev => ({
      ...prev,
      items: [...prev.items, item]
    }));

    setNewItem({
      description: '',
      quantity: 1,
      rate: 0
    });
  };

  const removeItem = (itemId: string) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter(item => item.id !== itemId)
    }));
  };

  const updateItem = (itemId: string, field: keyof BillItem, value: number | string) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map(item => {
        if (item.id === itemId) {
          const updatedItem = { ...item, [field]: value };
          if (field === 'quantity' || field === 'rate') {
            updatedItem.amount = updatedItem.quantity * updatedItem.rate;
          }
          return updatedItem;
        }
        return item;
      })
    }));
  };

  const createBill = async () => {
    if (!formData.customerName || formData.items.length === 0) {
      toast.error('Please fill customer details and add at least one item');
      return;
    }

    setLoading(true);
    try {
      const { subtotal, tax, discount, total } = calculateTotals(formData.items);

      const newBill: Bill = {
        _id: Date.now().toString(),
        bookingId: bookingId || 'booking_1',
        customerId: 'customer_1',
        customerName: formData.customerName,
        customerPhone: formData.customerPhone,
        customerAddress: formData.customerAddress,
        garageId: user?.id || 'garage_1',
        garageName: user?.name || 'ABC Garage',
        items: formData.items,
        subtotal,
        tax,
        discount,
        total,
        status: 'draft',
        dueDate: new Date(formData.dueDate),
        createdAt: new Date(),
        updatedAt: new Date(),
        notes: formData.notes,
        paymentMethod: formData.paymentMethod
      };

      setBills(prev => [...prev, newBill]);
      setIsCreating(false);
      resetForm();
      toast.success('Bill created successfully');
    } catch (error) {
      console.error('Error creating bill:', error);
      toast.error('Failed to create bill');
    } finally {
      setLoading(false);
    }
  };

  const sendBill = async (billId: string) => {
    try {
      // Mock API call to send bill
      setBills(prev => prev.map(bill => 
        bill._id === billId ? { ...bill, status: 'sent' } : bill
      ));
      toast.success('Bill sent to customer');
    } catch (error) {
      console.error('Error sending bill:', error);
      toast.error('Failed to send bill');
    }
  };

  const deleteBill = async (billId: string) => {
    try {
      setBills(prev => prev.filter(bill => bill._id !== billId));
      toast.success('Bill deleted successfully');
    } catch (error) {
      console.error('Error deleting bill:', error);
      toast.error('Failed to delete bill');
    }
  };

  const resetForm = () => {
    setFormData({
      customerName: '',
      customerPhone: '',
      customerAddress: '',
      items: [],
      notes: '',
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      paymentMethod: 'cash'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'sent': return 'bg-blue-100 text-blue-800';
      case 'paid': return 'bg-green-100 text-green-800';
      case 'overdue': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const { subtotal, tax, discount, total } = calculateTotals(formData.items);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-600 to-green-700 text-white p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Receipt className="h-8 w-8" />
              <div>
                <h2 className="text-2xl font-bold">Billing Management</h2>
                <p className="text-green-100">Generate and manage customer bills</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-green-200 transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="flex h-[calc(90vh-120px)]">
          {/* Bills List */}
          <div className="w-1/3 border-r border-gray-200 overflow-y-auto">
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Bills</h3>
                <button
                  onClick={() => setIsCreating(true)}
                  className="bg-green-600 text-white px-3 py-1 rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-1"
                >
                  <Plus className="h-4 w-4" />
                  <span>New Bill</span>
                </button>
              </div>

              {loading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
                </div>
              ) : (
                <div className="space-y-3">
                  {bills.map((bill) => (
                    <div
                      key={bill._id}
                      onClick={() => setSelectedBill(bill)}
                      className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                        selectedBill?._id === bill._id
                          ? 'border-green-500 bg-green-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-gray-900">Bill #{bill._id.slice(-6)}</h4>
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(bill.status)}`}>
                          {bill.status}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{bill.customerName}</p>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">₹{bill.total.toLocaleString()}</span>
                        <span className="text-gray-500">
                          {new Date(bill.dueDate).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Bill Details / Create Form */}
          <div className="flex-1 overflow-y-auto">
            {isCreating ? (
              <div className="p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-6">Create New Bill</h3>
                
                {/* Customer Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Customer Name *
                    </label>
                    <input
                      type="text"
                      value={formData.customerName}
                      onChange={(e) => setFormData(prev => ({ ...prev, customerName: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      placeholder="Enter customer name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      value={formData.customerPhone}
                      onChange={(e) => setFormData(prev => ({ ...prev, customerPhone: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      placeholder="Enter phone number"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Address
                    </label>
                    <textarea
                      value={formData.customerAddress}
                      onChange={(e) => setFormData(prev => ({ ...prev, customerAddress: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      rows={2}
                      placeholder="Enter customer address"
                    />
                  </div>
                </div>

                {/* Bill Items */}
                <div className="mb-6">
                  <h4 className="text-lg font-medium text-gray-900 mb-4">Bill Items</h4>
                  
                  {/* Add New Item */}
                  <div className="grid grid-cols-4 gap-4 mb-4">
                    <input
                      type="text"
                      value={newItem.description}
                      onChange={(e) => setNewItem(prev => ({ ...prev, description: e.target.value }))}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      placeholder="Description"
                    />
                    <input
                      type="number"
                      value={newItem.quantity}
                      onChange={(e) => setNewItem(prev => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      placeholder="Qty"
                      min="1"
                    />
                    <input
                      type="number"
                      value={newItem.rate}
                      onChange={(e) => setNewItem(prev => ({ ...prev, rate: parseFloat(e.target.value) || 0 }))}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      placeholder="Rate"
                      min="0"
                    />
                    <button
                      onClick={addItem}
                      className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Items List */}
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Description</th>
                          <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Qty</th>
                          <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Rate</th>
                          <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Amount</th>
                          <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {formData.items.map((item) => (
                          <tr key={item.id} className="border-t border-gray-200">
                            <td className="px-4 py-2">
                              <input
                                type="text"
                                value={item.description}
                                onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                                className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-green-500"
                              />
                            </td>
                            <td className="px-4 py-2">
                              <input
                                type="number"
                                value={item.quantity}
                                onChange={(e) => updateItem(item.id, 'quantity', parseInt(e.target.value) || 1)}
                                className="w-20 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-green-500"
                                min="1"
                              />
                            </td>
                            <td className="px-4 py-2">
                              <input
                                type="number"
                                value={item.rate}
                                onChange={(e) => updateItem(item.id, 'rate', parseFloat(e.target.value) || 0)}
                                className="w-24 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-green-500"
                                min="0"
                              />
                            </td>
                            <td className="px-4 py-2 text-sm font-medium">₹{item.amount.toLocaleString()}</td>
                            <td className="px-4 py-2">
                              <button
                                onClick={() => removeItem(item.id)}
                                className="text-red-600 hover:text-red-800"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Bill Summary */}
                <div className="bg-gray-50 p-4 rounded-lg mb-6">
                  <h4 className="text-lg font-medium text-gray-900 mb-4">Bill Summary</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Subtotal:</span>
                      <span className="font-medium">₹{subtotal.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Tax (10%):</span>
                      <span className="font-medium">₹{tax.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Discount:</span>
                      <span className="font-medium">₹{discount.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-lg font-semibold border-t pt-2">
                      <span>Total:</span>
                      <span>₹{total.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* Additional Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Due Date
                    </label>
                    <input
                      type="date"
                      value={formData.dueDate}
                      onChange={(e) => setFormData(prev => ({ ...prev, dueDate: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Payment Method
                    </label>
                    <select
                      value={formData.paymentMethod}
                      onChange={(e) => setFormData(prev => ({ ...prev, paymentMethod: e.target.value as any }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    >
                      <option value="cash">Cash</option>
                      <option value="card">Card</option>
                      <option value="upi">UPI</option>
                      <option value="bank_transfer">Bank Transfer</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notes
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    rows={3}
                    placeholder="Additional notes for the customer..."
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end space-x-4 mt-6">
                  <button
                    onClick={() => {
                      setIsCreating(false);
                      resetForm();
                    }}
                    className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={createBill}
                    disabled={loading}
                    className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                  >
                    {loading ? 'Creating...' : 'Create Bill'}
                  </button>
                </div>
              </div>
            ) : selectedBill ? (
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-semibold text-gray-900">
                    Bill #{selectedBill._id.slice(-6)}
                  </h3>
                  <div className="flex space-x-2">
                    <button className="p-2 text-gray-600 hover:text-gray-800">
                      <Download className="h-5 w-5" />
                    </button>
                    <button className="p-2 text-gray-600 hover:text-gray-800">
                      <Edit className="h-5 w-5" />
                    </button>
                    <button 
                      onClick={() => deleteBill(selectedBill._id)}
                      className="p-2 text-red-600 hover:text-red-800"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                </div>

                {/* Bill Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">Customer Details</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center space-x-2">
                        <User className="h-4 w-4 text-gray-400" />
                        <span>{selectedBill.customerName}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Phone className="h-4 w-4 text-gray-400" />
                        <span>{selectedBill.customerPhone}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <MapPin className="h-4 w-4 text-gray-400" />
                        <span>{selectedBill.customerAddress}</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">Bill Information</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <span>Due: {new Date(selectedBill.dueDate).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Clock className="h-4 w-4 text-gray-400" />
                        <span>Created: {new Date(selectedBill.createdAt).toLocaleDateString()}</span>
                      </div>
                      <div>
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(selectedBill.status)}`}>
                          {selectedBill.status}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bill Items */}
                <div className="mb-6">
                  <h4 className="font-medium text-gray-900 mb-3">Bill Items</h4>
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Description</th>
                          <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Qty</th>
                          <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Rate</th>
                          <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedBill.items.map((item) => (
                          <tr key={item.id} className="border-t border-gray-200">
                            <td className="px-4 py-2 text-sm">{item.description}</td>
                            <td className="px-4 py-2 text-sm">{item.quantity}</td>
                            <td className="px-4 py-2 text-sm">₹{item.rate.toLocaleString()}</td>
                            <td className="px-4 py-2 text-sm font-medium">₹{item.amount.toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Bill Summary */}
                <div className="bg-gray-50 p-4 rounded-lg mb-6">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Subtotal:</span>
                      <span className="font-medium">₹{selectedBill.subtotal.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Tax:</span>
                      <span className="font-medium">₹{selectedBill.tax.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Discount:</span>
                      <span className="font-medium">₹{selectedBill.discount.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-lg font-semibold border-t pt-2">
                      <span>Total:</span>
                      <span>₹{selectedBill.total.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {selectedBill.notes && (
                  <div className="mb-6">
                    <h4 className="font-medium text-gray-900 mb-2">Notes</h4>
                    <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                      {selectedBill.notes}
                    </p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex justify-end space-x-4">
                  {selectedBill.status === 'draft' && (
                    <button
                      onClick={() => sendBill(selectedBill._id)}
                      className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
                    >
                      <Send className="h-4 w-4" />
                      <span>Send Bill</span>
                    </button>
                  )}
                  <button
                    onClick={() => setSelectedBill(null)}
                    className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <Receipt className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Bill Selected</h3>
                  <p className="text-gray-500">Select a bill from the list to view details</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BillingComponent;

