'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { DocumentType } from '@/types/organizer';

interface Application {
  id: string;
  status: string;
  businessName: string;
  createdAt: string;
}

interface FormData {
  businessName: string;
  contactPerson: string;
  email: string;
  phone: string;
  address: string;
  panNumber: string;
  gstNumber?: string;
  aadhaarNumber: string;
  bankDetails: {
    accountNumber: string;
    ifscCode: string;
    accountHolderName: string;
    bankName: string;
    branch?: string;
  };
}

export default function OrganizerApplicationPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [existingApplication, setExistingApplication] = useState<Application | null>(null);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState<FormData>({
    businessName: '',
    contactPerson: '',
    email: '',
    phone: '',
    address: '',
    panNumber: '',
    gstNumber: '',
    aadhaarNumber: '',
    bankDetails: {
      accountNumber: '',
      ifscCode: '',
      accountHolderName: '',
      bankName: '',
      branch: ''
    }
  });
  
  const [documents, setDocuments] = useState<{
    [key in DocumentType]?: File
  }>({});
  
  const [step, setStep] = useState(1); // 1: Basic Info, 2: Documents, 3: Bank Details

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/login');
        return;
      }
      
      // Check for existing application
      checkExistingApplication();
    }
  }, [user, authLoading, router]);

  const checkExistingApplication = async () => {
    try {
      const response = await fetch('/api/organizer/status');
      const data = await response.json();
      
      if (response.ok && data.application) {
        setExistingApplication(data.application);
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error checking application status:', error);
      setLoading(false);
    }
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (existingApplication) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md mx-auto">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Application Already Submitted
            </h2>
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-4">
              <p className="text-yellow-700">
                You have already submitted an organizer application. Current status: {' '}
                <span className="font-semibold">
                  {existingApplication.status.toLowerCase()}
                </span>
              </p>
            </div>
            <div className="space-y-4">
              <p className="text-gray-600">
                Your application is currently being reviewed by our team. You can check the status of your application here:
              </p>
              <button
                onClick={() => router.push('/organizer/status')}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Check Application Status
              </button>
              <button
                onClick={() => router.push('/dashboard')}
                className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Return to Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name.startsWith('bank.')) {
      const bankField = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        bankDetails: {
          ...prev.bankDetails,
          [bankField]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: DocumentType) => {
    if (e.target.files?.[0]) {
      setDocuments(prev => ({
        ...prev,
        [type]: e.target.files![0]
      }));
    }
  };

  const uploadDocuments = async () => {
    const uploadedDocs = [];
    for (const [type, file] of Object.entries(documents)) {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', type);

      const response = await fetch('/api/organizer/upload', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error(`Failed to upload ${type}`);
      }

      const { reference } = await response.json();
      uploadedDocs.push({ type, reference });
    }
    return uploadedDocs;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Upload documents first
      const uploadedDocuments = await uploadDocuments();

      // Submit application
      const response = await fetch('/api/organizer/apply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...formData,
          documents: uploadedDocuments
        })
      });

      if (!response.ok) {
        throw new Error('Failed to submit application');
      }

      router.push('/organizer/status');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const renderBasicInfo = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700">Business Name</label>
        <input
          type="text"
          name="businessName"
          value={formData.businessName}
          onChange={handleInputChange}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Contact Person</label>
        <input
          type="text"
          name="contactPerson"
          value={formData.contactPerson}
          onChange={handleInputChange}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Email</label>
        <input
          type="email"
          name="email"
          value={formData.email}
          onChange={handleInputChange}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Phone</label>
        <input
          type="tel"
          name="phone"
          value={formData.phone}
          onChange={handleInputChange}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Address</label>
        <input
          type="text"
          name="address"
          value={formData.address}
          onChange={handleInputChange}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">PAN Number</label>
        <input
          type="text"
          name="panNumber"
          value={formData.panNumber}
          onChange={handleInputChange}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Aadhaar Number</label>
        <input
          type="text"
          name="aadhaarNumber"
          value={formData.aadhaarNumber}
          onChange={handleInputChange}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
          required
        />
      </div>
    </div>
  );

  const renderDocuments = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700">PAN Card</label>
        <input
          type="file"
          onChange={(e) => handleFileChange(e, DocumentType.PAN_CARD)}
          className="mt-1 block w-full"
          accept="image/*,.pdf"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Aadhaar Card</label>
        <input
          type="file"
          onChange={(e) => handleFileChange(e, DocumentType.AADHAAR_CARD)}
          className="mt-1 block w-full"
          accept="image/*,.pdf"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Business Proof</label>
        <input
          type="file"
          onChange={(e) => handleFileChange(e, DocumentType.BUSINESS_PROOF)}
          className="mt-1 block w-full"
          accept="image/*,.pdf"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">GST Certificate (Optional)</label>
        <input
          type="file"
          onChange={(e) => handleFileChange(e, DocumentType.GST_CERTIFICATE)}
          className="mt-1 block w-full"
          accept="image/*,.pdf"
        />
      </div>
    </div>
  );

  const renderBankDetails = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700">Account Holder Name</label>
        <input
          type="text"
          name="bank.accountHolderName"
          value={formData.bankDetails.accountHolderName}
          onChange={handleInputChange}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Account Number</label>
        <input
          type="text"
          name="bank.accountNumber"
          value={formData.bankDetails.accountNumber}
          onChange={handleInputChange}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">IFSC Code</label>
        <input
          type="text"
          name="bank.ifscCode"
          value={formData.bankDetails.ifscCode}
          onChange={handleInputChange}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Bank Name</label>
        <input
          type="text"
          name="bank.bankName"
          value={formData.bankDetails.bankName}
          onChange={handleInputChange}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Branch (Optional)</label>
        <input
          type="text"
          name="bank.branch"
          value={formData.bankDetails.branch}
          onChange={handleInputChange}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
        />
      </div>
    </div>
  );

  const validateStep = (currentStep: number) => {
    switch (currentStep) {
      case 1:
        return !!(formData.businessName && formData.contactPerson && formData.email && 
                 formData.phone && formData.address && formData.panNumber && formData.aadhaarNumber);
      case 2:
        const requiredDocs = [DocumentType.PAN_CARD, DocumentType.AADHAAR_CARD, DocumentType.BUSINESS_PROOF];
        return requiredDocs.every(type => documents[type]);
      case 3:
        return !!(formData.bankDetails.accountNumber && formData.bankDetails.ifscCode && 
                 formData.bankDetails.accountHolderName && formData.bankDetails.bankName);
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (validateStep(step)) {
      setStep(step + 1);
      setError('');
    } else {
      setError('Please fill in all required fields before proceeding');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white px-8 py-6 shadow rounded-lg">
          <h1 className="text-2xl font-bold mb-6">Organizer Application</h1>

          {/* Progress Steps */}
          <div className="mb-8">
            <div className="flex justify-between">
              <div className={`text-sm ${step >= 1 ? 'text-blue-600' : 'text-gray-400'}`}>Basic Info</div>
              <div className={`text-sm ${step >= 2 ? 'text-blue-600' : 'text-gray-400'}`}>Documents</div>
              <div className={`text-sm ${step >= 3 ? 'text-blue-600' : 'text-gray-400'}`}>Bank Details</div>
            </div>
            <div className="mt-2 h-2 bg-gray-200 rounded-full">
              <div 
                className="h-full bg-blue-600 rounded-full transition-all duration-300"
                style={{ width: `${((step - 1) / 2) * 100}%` }}
              />
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            {step === 1 && renderBasicInfo()}
            {step === 2 && renderDocuments()}
            {step === 3 && renderBankDetails()}

            {error && (
              <div className="mt-4 text-red-600 text-sm">
                {error}
              </div>
            )}

            <div className="mt-6 flex justify-between">
              {step > 1 && (
                <button
                  type="button"
                  onClick={() => setStep(step - 1)}
                  className="bg-gray-200 text-gray-700 px-4 py-2 rounded hover:bg-gray-300"
                >
                  Back
                </button>
              )}
              {step < 3 ? (
                <button
                  type="button"
                  onClick={handleNext}
                  className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 ml-auto"
                >
                  Next
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={loading || !validateStep(3)}
                  className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 ml-auto disabled:bg-gray-400"
                >
                  {loading ? 'Submitting...' : 'Submit Application'}
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
} 