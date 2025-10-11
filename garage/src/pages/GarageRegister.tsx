import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { handleFileUpload } from './../util/cloudinary';

const GarageRegistrationForm = () => {
  const [step, setStep] = useState(1);
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    garageName: '',
    registrationNumber: '',
    garageType: '',
    address: '',
    mapLink: '',
    openingTime: '',
    weeklyOff: '',
    experience: '',
    doorstepService: '',
    specialization: '',
    employeesCount: '',
    serviceablePincodes: '',
    name: '',
    phone: '',
    altPhone: '',
    email: '',
    password: '',
    ownerPhoto: '',
    addressProof: '',
    aadharPan: '',
    signature: '',
    accountHolder: '',
    accountNumber: '',
    ifsc: '',
    cancelledCheque: '',
  });

  type FormData = typeof formData;

  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // Validation functions
  const validateEmail = (email: string): boolean => {
    // Standard email regex pattern - more strict
    // Ensures exactly one @ symbol and valid format
    const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    
    // Additional check: must have exactly one @ symbol
    const atCount = (email.match(/@/g) || []).length;
    
    return emailRegex.test(email) && atCount === 1;
  };

  const validatePhone = (phone: string): boolean => {
    const phoneRegex = /^[6-9]\d{9}$/;
    return phoneRegex.test(phone);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, files } = e.target;
    if (files && files[0]) {
      console.log("Uploading file for:", name, files[0]);
      try {
        const url = await handleFileUpload(files[0]);
        console.log("Uploaded URL:", url);
        setFormData(prev => ({ ...prev, [name]: url }));
        toast.success(`${name} uploaded successfully!`);
        
        // Clear file error on successful upload
        if (errors[name]) {
          setErrors(prev => {
            const newErrors = { ...prev };
            delete newErrors[name];
            return newErrors;
          });
        }
      } catch (err) {
        console.error("File upload failed:", err);
        toast.error("File upload failed. Please try again.");
      }
    }
  };

  const submitForm = async (formData: any) => {
    try {
    const response = await fetch(`${process.env.VITE_API_URL}/api/garage/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
    
      if (!response.ok) {
        const errData = await response.json();
        console.error("Server error:", errData);
        toast.error(`Error: ${errData.message}`);
        return;
      }

      const result = await response.json();
      console.log("Garage saved:", result);
      navigate('/garage/login');
      toast.success("Garage registered successfully!");

    } catch (err: any) {
      console.error("Submit error:", err);
      toast.error("Failed to submit form. Try again later.");
    }
  };

  const requiredFields: { [key: number]: string[] } = {
    1: ['garageName', 'registrationNumber', 'garageType', 'address', 'mapLink', 'openingTime'],
    2: ['experience', 'doorstepService', 'specialization', 'employeesCount', 'serviceablePincodes'],
    3: ['name', 'phone', 'email', 'password', 'accountHolder', 'accountNumber', 'ifsc', 'ownerPhoto', 'addressProof', 'aadharPan', 'signature', 'cancelledCheque'],
  };

  const validateStep = (): boolean => {
    const newErrors: { [key: string]: string } = {};
    
    // Check required fields
    requiredFields[step]?.forEach(field => {
      if (!(formData as any)[field]) {
        newErrors[field] = 'This field is required';
      }
    });

    // Additional validation for step 3
    if (step === 3) {
      // Email validation
      if (formData.email && !validateEmail(formData.email)) {
        newErrors.email = 'Please enter a valid email address';
      }

      // Phone validation
      if (formData.phone && !validatePhone(formData.phone)) {
        newErrors.phone = 'Please enter a valid 10-digit mobile number';
      }

      // Alternate phone validation (optional but if provided, must be valid)
      if (formData.altPhone && formData.altPhone.trim() !== '' && !validatePhone(formData.altPhone)) {
        newErrors.altPhone = 'Please enter a valid 10-digit mobile number';
      }

      // Check if phone and altPhone are the same
      if (formData.phone && formData.altPhone && formData.phone === formData.altPhone) {
        newErrors.altPhone = 'Alternate phone number must be different from primary phone';
      }

      // Password validation
      if (formData.password && formData.password.length < 6) {
        newErrors.password = 'Password must be at least 6 characters long';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const next = () => {
    if (validateStep()) setStep(prev => prev + 1);
  };

  const prev = () => setStep(prev => prev - 1);

  const handleSubmit = () => {
    if (validateStep()) {
      submitForm(formData);
    }
  };

  const renderInput = (label: string, name: string, type = 'text', placeholder = '', optional = false) => (
    <div className="flex flex-col">
      <label className="text-sm font-medium mb-1 dark:text-white">
        {label} {!optional && <span className="text-red-500">*</span>}
        {optional && <span className="text-gray-400 text-xs ml-1">(Optional)</span>}
      </label>
      <input
        type={type}
        name={name}
        placeholder={placeholder || label}
        value={formData[name as keyof FormData]}
        onChange={handleChange}
        className={`w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-800 dark:text-white ${errors[name] ? 'border-red-500' : 'border-gray-300'}`}
      />
      {errors[name] && <span className="text-red-500 text-sm">{errors[name]}</span>}
    </div>
  );

  const renderSelect = (label: string, name: string, options: string[]) => (
    <div className="flex flex-col">
      <label className="text-sm font-medium mb-1 dark:text-white">
        {label} <span className="text-red-500">*</span>
      </label>
      <select
        name={name}
        value={formData[name as keyof FormData]}
        onChange={handleChange}
        className={`w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-800 dark:text-white ${errors[name] ? 'border-red-500' : 'border-gray-300'}`}
      >
        <option value="">Select {label}</option>
        {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
      </select>
      {errors[name] && <span className="text-red-500 text-sm">{errors[name]}</span>}
    </div>
  );

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold dark:text-white">Garage Details</h2>
            {renderInput('Garage Name', 'garageName')}
            {renderInput('Registration Number', 'registrationNumber')}
            {renderSelect('Garage Type', 'garageType', ['Authorized', 'Local', 'Franchise'])}
            {renderInput('Address', 'address')}
            {renderInput('Map Link', 'mapLink')}
            {renderInput('Opening Time', 'openingTime', 'time')}
            {renderInput('Weekly Off', 'weeklyOff', 'text', '', true)}
          </div>
        );
      case 2:
        return (
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold dark:text-white">Garage Services</h2>
            {renderInput('Years of Experience', 'experience')}
            {renderSelect('Doorstep Service Available?', 'doorstepService', ['Yes', 'No'])}
            {renderSelect('Specialization', 'specialization', ['Electric', 'Petrol', 'Both'])}
            {renderInput('Number of Employees', 'employeesCount')}
            {renderInput('Serviceable Pincodes (comma-separated)', 'serviceablePincodes')}
          </div>
        );
      case 3:
        return (
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold dark:text-white">Owner & Bank Details</h2>
            {renderInput('Owner Name', 'name')}
            {renderInput('Owner Phone', 'phone', 'tel', '10-digit mobile number')}
            {renderInput('Alternate Phone', 'altPhone', 'tel', '10-digit mobile number', true)}
            {renderInput('Email ID', 'email', 'email', 'example@email.com')}
            {renderInput('Password', 'password', 'password', 'Min 6 characters')}
            {renderInput('Bank Account Holder Name', 'accountHolder')}
            {renderInput('Account Number', 'accountNumber')}
            {renderInput('IFSC Code', 'ifsc')}
            {['ownerPhoto', 'addressProof', 'aadharPan', 'signature', 'cancelledCheque'].map(name => (
              <div className="flex flex-col" key={name}>
                <label className="text-sm font-medium mb-1 dark:text-white">
                  {name.replace(/([A-Z])/g, ' $1')} <span className="text-red-500">*</span>
                </label>
                <input type="file" name={name} onChange={handleFileChange}
                  className={`w-full p-2 border rounded dark:bg-gray-800 dark:text-white ${errors[name] ? 'border-red-500' : 'border-gray-300'}`} />
                {formData[name as keyof FormData] && <p className="text-green-600 text-sm mt-1">Uploaded ✅</p>}
                {errors[name] && <span className="text-red-500 text-sm">{errors[name]}</span>}
              </div>
            ))}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6 bg-white dark:bg-gray-900 rounded-xl shadow space-y-6">
      {renderStep()}
      <div className="flex justify-between pt-4">
        {step > 1 && <button onClick={prev} className="px-5 py-2 bg-gray-300 dark:bg-gray-700 rounded">Previous</button>}
        {step < 3 ? (
          <button onClick={next} className="px-5 py-2 bg-green-600 text-white rounded">Next</button>
        ) : (
          <button className="px-5 py-2 bg-green-600 text-white rounded" onClick={handleSubmit}>Submit</button>
        )}
      </div>
    </div>
  );
};

export default GarageRegistrationForm;