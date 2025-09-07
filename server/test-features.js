// Test script to verify all features are working
import axios from 'axios';
import { generateOTP, storeOTP, verifyOTP } from './utils/emailService.js';

const BASE_URL = 'http://localhost:5000';

// Test password reset functionality
async function testPasswordReset() {
  console.log('🧪 Testing Password Reset Functionality...');
  
  try {
    // Test 1: Request OTP
    const otpRequest = await axios.post(`${BASE_URL}/api/auth/forgot-password`, {
      email: 'test@example.com',
      role: 'customer'
    });
    console.log('✅ OTP Request:', otpRequest.data);

    // Test 2: Generate and verify OTP
    const testEmail = 'test@example.com';
    const testOTP = generateOTP();
    storeOTP(testEmail, testOTP);
    
    const isValid = verifyOTP(testEmail, testOTP);
    console.log('✅ OTP Verification:', isValid ? 'PASSED' : 'FAILED');

    // Test 3: Invalid OTP
    const isInvalid = verifyOTP(testEmail, '000000');
    console.log('✅ Invalid OTP Test:', !isInvalid ? 'PASSED' : 'FAILED');

  } catch (error) {
    console.error('❌ Password Reset Test Failed:', error.response?.data || error.message);
  }
}

// Test admin dashboard functionality
async function testAdminDashboard() {
  console.log('\n🧪 Testing Admin Dashboard Functionality...');
  
  try {
    // Test 1: Get admin stats
    const statsResponse = await axios.get(`${BASE_URL}/api/admin/stats`);
    console.log('✅ Admin Stats:', statsResponse.data);

    // Test 2: Get users
    const usersResponse = await axios.get(`${BASE_URL}/api/admin/users`);
    console.log('✅ Users List:', usersResponse.data.length, 'users found');

    // Test 3: Get pending garages
    const garagesResponse = await axios.get(`${BASE_URL}/api/admin/garages/pending`);
    console.log('✅ Pending Garages:', garagesResponse.data.length, 'garages found');

  } catch (error) {
    console.error('❌ Admin Dashboard Test Failed:', error.response?.data || error.message);
  }
}

// Test chat functionality
async function testChatFunctionality() {
  console.log('\n🧪 Testing Chat Functionality...');
  
  try {
    // Test 1: Get chat rooms
    const roomsResponse = await axios.get(`${BASE_URL}/api/chat/rooms`);
    console.log('✅ Chat Rooms:', roomsResponse.data.length, 'rooms found');

    // Test 2: Get support chats (admin)
    const supportChatsResponse = await axios.get(`${BASE_URL}/api/chat/support-chats`);
    console.log('✅ Support Chats:', supportChatsResponse.data.length, 'chats found');

  } catch (error) {
    console.error('❌ Chat Test Failed:', error.response?.data || error.message);
  }
}

// Test email service
async function testEmailService() {
  console.log('\n🧪 Testing Email Service...');
  
  try {
    const testOTP = generateOTP();
    console.log('✅ OTP Generation:', testOTP);
    
    const testEmail = 'test@example.com';
    storeOTP(testEmail, testOTP);
    console.log('✅ OTP Storage: PASSED');
    
    const verification = verifyOTP(testEmail, testOTP);
    console.log('✅ OTP Verification:', verification ? 'PASSED' : 'FAILED');
    
  } catch (error) {
    console.error('❌ Email Service Test Failed:', error.message);
  }
}

// Main test function
async function runAllTests() {
  console.log('🚀 Starting Feature Tests...\n');
  
  await testEmailService();
  await testPasswordReset();
  await testAdminDashboard();
  await testChatFunctionality();
  
  console.log('\n✅ All tests completed!');
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests().catch(console.error);
}

export { runAllTests }; 