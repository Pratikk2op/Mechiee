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

  // Define a type for formData that includes an index signature
  type FormData = typeof formData;

  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, files } = e.target;
    if (files && files[0]) {
      console.log("Uploading file for:", name, files[0]);
      try {
        const url = await handleFileUpload(files[0]); // upload to firebase
     
        console.log("Uploaded URL:", url);
        setFormData(prev => ({ ...prev, [name]: url }));
        toast.success(`${name} uploaded successfully!`);
      } catch (err) {
        console.error("File upload failed:", err);
        toast.error("File upload failed. Please try again.");
      }
    }
  };
  

  const submitForm = async (formData: any) => {
    try {
      const response = await fetch(`https://api.mechiee.in/api/garage/register`, {
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
    3: ['name', 'phone', 'email', 'password'],
  };

  const validateStep = (): boolean => {
    const newErrors: { [key: string]: string } = {};
    requiredFields[step]?.forEach(field => {
      if (!(formData as any)[field]) newErrors[field] = 'This field is required';
    });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const next = () => {
    if (validateStep()) setStep(prev => prev + 1);
  };

  const prev = () => setStep(prev => prev - 1);

  const renderInput = (label: string, name: string, type = 'text', placeholder = '') => (
    <div className="flex flex-col">
      <label className="text-sm font-medium mb-1 dark:text-white">
        {label} <span className="text-red-500">*</span>
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
            {renderInput('Weekly Off', 'weeklyOff')}
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
            {renderInput('Owner Phone', 'phone')}
            {renderInput('Alternate Phone', 'altPhone')}
            {renderInput('Email ID', 'email', 'email')}
            {renderInput('Password', 'password', 'password')}
            {renderInput('Bank Account Holder Name', 'accountHolder')}
            {renderInput('Account Number', 'accountNumber')}
            {renderInput('IFSC Code', 'ifsc')}
            {['ownerPhoto', 'addressProof', 'aadharPan', 'signature', 'cancelledCheque'].map(name => (
              <div className="flex flex-col" key={name}>
                <label className="text-sm font-medium mb-1 dark:text-white">
                  {name.replace(/([A-Z])/g, ' $1')} <span className="text-red-500">*</span>
                </label>
                <input type="file" name={name} onChange={handleFileChange}
                  className="w-full p-2 border rounded dark:bg-gray-800 dark:text-white" />
                {formData[name as keyof FormData] && <p className="text-green-600 text-sm mt-1">Uploaded ✅</p>}
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
          <button className="px-5 py-2 bg-green-600 text-white rounded" onClick={() => submitForm(formData)}>Submit</button>
        )}
      </div>
    </div>
  );
};

export default GarageRegistrationForm;
