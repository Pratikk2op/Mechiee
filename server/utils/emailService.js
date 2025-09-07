import nodemailer from 'nodemailer';
import crypto from 'crypto';

// Create transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Generate OTP
export const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Store OTPs temporarily (in production, use Redis)
const otpStore = new Map();

// Send OTP email
export const sendOTPEmail = async (email, otp, purpose = 'password reset') => {
  try {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: `OTP for ${purpose} - Mechiee Bike Service`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center;">
            <h1>Mechiee Bike Service</h1>
          </div>
          <div style="padding: 20px; background: #f9f9f9;">
            <h2>Your OTP for ${purpose}</h2>
            <p>Hello!</p>
            <p>You have requested an OTP for ${purpose}. Please use the following code:</p>
            <div style="background: #fff; border: 2px solid #667eea; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0;">
              <h1 style="color: #667eea; font-size: 32px; margin: 0; letter-spacing: 5px;">${otp}</h1>
            </div>
            <p><strong>This OTP is valid for 10 minutes only.</strong></p>
            <p>If you didn't request this OTP, please ignore this email.</p>
            <p>Best regards,<br>Mechiee Team</p>
          </div>
          <div style="background: #333; color: white; padding: 10px; text-align: center; font-size: 12px;">
            <p>This is an automated email. Please do not reply.</p>
          </div>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error('Email sending error:', error);
    return false;
  }
};

// Store OTP with expiration
export const storeOTP = (email, otp) => {
  const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes
  otpStore.set(email, { otp, expiresAt });
  
  // Clean up expired OTPs
  setTimeout(() => {
    if (otpStore.has(email) && otpStore.get(email).expiresAt < Date.now()) {
      otpStore.delete(email);
    }
  }, 10 * 60 * 1000);
};

// Verify OTP
export const verifyOTP = (email, otp) => {
  const stored = otpStore.get(email);
  if (!stored) return false;
  
  if (Date.now() > stored.expiresAt) {
    otpStore.delete(email);
    return false;
  }
  
  if (stored.otp === otp) {
    otpStore.delete(email);
    return true;
  }
  
  return false;
};

// Send notification email
export const sendNotificationEmail = async (email, subject, message) => {
  try {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: subject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center;">
            <h1>Mechiee Bike Service</h1>
          </div>
          <div style="padding: 20px; background: #f9f9f9;">
            <h2>${subject}</h2>
            <div style="background: #fff; padding: 20px; border-radius: 8px; margin: 20px 0;">
              ${message}
            </div>
            <p>Best regards,<br>Mechiee Team</p>
          </div>
          <div style="background: #333; color: white; padding: 10px; text-align: center; font-size: 12px;">
            <p>This is an automated email. Please do not reply.</p>
          </div>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error('Email sending error:', error);
    return false;
  }
}; 