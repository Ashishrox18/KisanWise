import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiService } from '../services/api';
import { ChevronLeft, ChevronRight, Check } from 'lucide-react';

interface FarmerFormData {
  // Step 1: Basic Details
  email: string;
  password: string;
  confirmPassword: string;
  name: string;
  phone: string;
  dateOfBirth: string;
  gender: string;
  
  // Step 2: Address Details
  address: string;
  village: string;
  district: string;
  state: string;
  pincode: string;
  
  // Step 3: Farm Details
  farmSize: string;
  farmSizeUnit: string;
  landOwnership: string;
  soilType: string;
  irrigationType: string;
  
  // Step 4: Bank Details
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  accountHolderName: string;
  branchName: string;
  
  // Step 5: Government ID
  aadhaarNumber: string;
  panNumber: string;
  farmerIdNumber: string;
  kisanCreditCard: string;
}

const indianStates = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal'
];

export default function ProfileUpdate() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<FarmerFormData>({
    email: '', password: '', confirmPassword: '', name: '', phone: '', dateOfBirth: '', gender: '',
    address: '', village: '', district: '', state: '', pincode: '',
    farmSize: '', farmSizeUnit: 'acres', landOwnership: '', soilType: '', irrigationType: '',
    bankName: '', accountNumber: '', ifscCode: '', accountHolderName: '', branchName: '',
    aadhaarNumber: '', panNumber: '', farmerIdNumber: '', kisanCreditCard: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const totalSteps = 5;

  useEffect(() => {
    // Load existing user data
    const userData = sessionStorage.getItem('user');
    if (userData) {
      const user = JSON.parse(userData);
      
      // Pre-fill form with existing data if available
      setFormData(prev => ({
        ...prev,
        email: user.email || '',
        name: user.name || '',
        phone: user.phone?.replace('+91', '') || '',
        // Add profile data if exists
        ...(user.profile && {
          dateOfBirth: user.profile.dateOfBirth || '',
          gender: user.profile.gender || '',
          address: user.profile.address?.street || '',
          village: user.profile.address?.village || '',
          district: user.profile.address?.district || '',
          state: user.profile.address?.state || '',
          pincode: user.profile.address?.pincode || '',
          farmSize: user.profile.farmDetails?.size || '',
          farmSizeUnit: user.profile.farmDetails?.sizeUnit || 'acres',
          landOwnership: user.profile.farmDetails?.ownership || '',
          soilType: user.profile.farmDetails?.soilType || '',
          irrigationType: user.profile.farmDetails?.irrigationType || '',
          bankName: user.profile.bankDetails?.bankName || '',
          accountNumber: user.profile.bankDetails?.accountNumber || '',
          ifscCode: user.profile.bankDetails?.ifscCode || '',
          accountHolderName: user.profile.bankDetails?.accountHolderName || '',
          branchName: user.profile.bankDetails?.branchName || '',
          aadhaarNumber: user.profile.governmentIds?.aadhaar || '',
          panNumber: user.profile.governmentIds?.pan || '',
          farmerIdNumber: user.profile.governmentIds?.farmerId || '',
          kisanCreditCard: user.profile.governmentIds?.kisanCreditCard || '',
        })
      }));
    }
  }, []);

  const updateField = (field: keyof FarmerFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateStep = (step: number): boolean => {
    setError('');
    
    switch (step) {
      case 1:
        if (!formData.name || !formData.email || !formData.phone) {
          setError('Please fill all required fields');
          return false;
        }
        // Password is optional for updates
        if (formData.password || formData.confirmPassword) {
          if (formData.password !== formData.confirmPassword) {
            setError('Passwords do not match');
            return false;
          }
          if (formData.password.length < 6) {
            setError('Password must be at least 6 characters');
            return false;
          }
        }
        if (!/^[6-9]\d{9}$/.test(formData.phone.replace('+91', ''))) {
          setError('Please enter a valid 10-digit Indian mobile number');
          return false;
        }
        break;
      case 2:
        if (!formData.address || !formData.village || !formData.district || !formData.state || !formData.pincode) {
          setError('Please fill all address fields');
          return false;
        }
        if (!/^\d{6}$/.test(formData.pincode)) {
          setError('Please enter a valid 6-digit pincode');
          return false;
        }
        break;
      case 3:
        if (!formData.farmSize || !formData.landOwnership) {
          setError('Please fill all farm details');
          return false;
        }
        break;
      case 4:
        if (!formData.bankName || !formData.accountNumber || !formData.ifscCode || !formData.accountHolderName) {
          setError('Please fill all bank details');
          return false;
        }
        if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(formData.ifscCode)) {
          setError('Please enter a valid IFSC code (e.g., SBIN0001234)');
          return false;
        }
        break;
      case 5:
        if (!formData.aadhaarNumber) {
          setError('Aadhaar number is required');
          return false;
        }
        if (!/^\d{12}$/.test(formData.aadhaarNumber.replace(/\s/g, ''))) {
          setError('Please enter a valid 12-digit Aadhaar number');
          return false;
        }
        if (formData.panNumber && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(formData.panNumber)) {
          setError('Please enter a valid PAN number (e.g., ABCDE1234F)');
          return false;
        }
        break;
    }
    return true;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, totalSteps));
    }
  };

  const handleBack = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
    setError('');
  };

  const handleSubmit = async () => {
    if (!validateStep(currentStep)) return;
    
    setLoading(true);
    setError('');

    try {
      const profileData = {
        name: formData.name,
        phone: formData.phone.startsWith('+91') ? formData.phone : `+91${formData.phone}`,
        profile: {
          dateOfBirth: formData.dateOfBirth,
          gender: formData.gender,
          address: {
            street: formData.address,
            village: formData.village,
            district: formData.district,
            state: formData.state,
            pincode: formData.pincode
          },
          farmDetails: {
            size: formData.farmSize,
            sizeUnit: formData.farmSizeUnit,
            ownership: formData.landOwnership,
            soilType: formData.soilType,
            irrigationType: formData.irrigationType
          },
          bankDetails: {
            bankName: formData.bankName,
            accountNumber: formData.accountNumber,
            ifscCode: formData.ifscCode,
            accountHolderName: formData.accountHolderName,
            branchName: formData.branchName
          },
          governmentIds: {
            aadhaar: formData.aadhaarNumber,
            pan: formData.panNumber,
            farmerId: formData.farmerIdNumber,
            kisanCreditCard: formData.kisanCreditCard
          }
        }
      };

      const response = await apiService.updateProfile(profileData);
      sessionStorage.setItem('user', JSON.stringify(response.user));
      
      // Show success message and redirect
      alert('Profile updated successfully!');
      navigate(-1); // Go back to previous page
    } catch (err: any) {
      setError(err.response?.data?.error || 'Profile update failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center mb-8">
      {[1, 2, 3, 4, 5].map((step) => (
        <div key={step} className="flex items-center">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
            step < currentStep ? 'bg-green-600 text-white' :
            step === currentStep ? 'bg-green-600 text-white' :
            'bg-gray-200 text-gray-600'
          }`}>
            {step < currentStep ? <Check className="w-5 h-5" /> : step}
          </div>
          {step < 5 && (
            <div className={`w-16 h-1 ${step < currentStep ? 'bg-green-600' : 'bg-gray-200'}`} />
          )}
        </div>
      ))}
    </div>
  );

  const renderStep1 = () => (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-gray-800 mb-4">Basic Details</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Full Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            value={formData.name}
            onChange={(e) => updateField('name', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
            placeholder="Enter your full name"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Email <span className="text-red-500">*</span>
          </label>
          <input
            type="email"
            required
            value={formData.email}
            readOnly
            disabled
            className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-600 cursor-not-allowed"
            placeholder="your@email.com"
          />
          <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Mobile Number <span className="text-red-500">*</span>
          </label>
          <input
            type="tel"
            required
            value={formData.phone}
            onChange={(e) => updateField('phone', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
            placeholder="9876543210"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Date of Birth
          </label>
          <input
            type="date"
            value={formData.dateOfBirth}
            onChange={(e) => updateField('dateOfBirth', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Gender
          </label>
          <select
            value={formData.gender}
            onChange={(e) => updateField('gender', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            <option value="">Select Gender</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>
        </div>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-gray-800 mb-4">Address Details</h2>
      
      <div className="grid grid-cols-1 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Address <span className="text-red-500">*</span>
          </label>
          <textarea
            required
            value={formData.address}
            onChange={(e) => updateField('address', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
            placeholder="House/Plot number, Street name"
            rows={2}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Village/Town <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.village}
              onChange={(e) => updateField('village', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="Enter village/town"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              District <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.district}
              onChange={(e) => updateField('district', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="Enter district"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              State <span className="text-red-500">*</span>
            </label>
            <select
              required
              value={formData.state}
              onChange={(e) => updateField('state', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="">Select State</option>
              {indianStates.map(state => (
                <option key={state} value={state}>{state}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Pincode <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.pincode}
              onChange={(e) => updateField('pincode', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="6-digit pincode"
              maxLength={6}
            />
          </div>
        </div>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-gray-800 mb-4">Farm Details</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Farm Size <span className="text-red-500">*</span>
          </label>
          <div className="flex gap-2">
            <input
              type="number"
              required
              value={formData.farmSize}
              onChange={(e) => updateField('farmSize', e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="Enter size"
              step="0.01"
            />
            <select
              value={formData.farmSizeUnit}
              onChange={(e) => updateField('farmSizeUnit', e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="acres">Acres</option>
              <option value="hectares">Hectares</option>
              <option value="bigha">Bigha</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Land Ownership <span className="text-red-500">*</span>
          </label>
          <select
            required
            value={formData.landOwnership}
            onChange={(e) => updateField('landOwnership', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            <option value="">Select Ownership</option>
            <option value="owned">Owned</option>
            <option value="leased">Leased</option>
            <option value="shared">Shared</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Soil Type
          </label>
          <select
            value={formData.soilType}
            onChange={(e) => updateField('soilType', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            <option value="">Select Soil Type</option>
            <option value="alluvial">Alluvial</option>
            <option value="black">Black (Regur)</option>
            <option value="red">Red</option>
            <option value="laterite">Laterite</option>
            <option value="desert">Desert</option>
            <option value="mountain">Mountain</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Irrigation Type
          </label>
          <select
            value={formData.irrigationType}
            onChange={(e) => updateField('irrigationType', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            <option value="">Select Irrigation</option>
            <option value="drip">Drip Irrigation</option>
            <option value="sprinkler">Sprinkler</option>
            <option value="canal">Canal</option>
            <option value="well">Well/Borewell</option>
            <option value="rainfed">Rainfed</option>
          </select>
        </div>
      </div>
    </div>
  );

  const renderStep4 = () => (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-gray-800 mb-4">Bank Details</h2>
      <p className="text-sm text-gray-600 mb-4">Required for receiving payments and subsidies</p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Bank Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            value={formData.bankName}
            onChange={(e) => updateField('bankName', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
            placeholder="e.g., State Bank of India"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Branch Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            value={formData.branchName}
            onChange={(e) => updateField('branchName', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
            placeholder="Enter branch name"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Account Holder Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            value={formData.accountHolderName}
            onChange={(e) => updateField('accountHolderName', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
            placeholder="As per bank records"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Account Number <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            value={formData.accountNumber}
            onChange={(e) => updateField('accountNumber', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
            placeholder="Enter account number"
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            IFSC Code <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            value={formData.ifscCode}
            onChange={(e) => updateField('ifscCode', e.target.value.toUpperCase())}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
            placeholder="e.g., SBIN0001234"
            maxLength={11}
          />
          <p className="text-xs text-gray-500 mt-1">11-character code (e.g., SBIN0001234)</p>
        </div>
      </div>
    </div>
  );

  const renderStep5 = () => (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-gray-800 mb-4">Government Identification</h2>
      <p className="text-sm text-gray-600 mb-4">Required for verification and government schemes</p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Aadhaar Number <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            value={formData.aadhaarNumber}
            onChange={(e) => updateField('aadhaarNumber', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
            placeholder="12-digit Aadhaar number"
            maxLength={12}
          />
          <p className="text-xs text-gray-500 mt-1">12-digit unique identification number</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            PAN Number (Optional)
          </label>
          <input
            type="text"
            value={formData.panNumber}
            onChange={(e) => updateField('panNumber', e.target.value.toUpperCase())}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
            placeholder="e.g., ABCDE1234F"
            maxLength={10}
          />
          <p className="text-xs text-gray-500 mt-1">10-character alphanumeric code</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Farmer ID Number (Optional)
          </label>
          <input
            type="text"
            value={formData.farmerIdNumber}
            onChange={(e) => updateField('farmerIdNumber', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
            placeholder="State-issued farmer ID"
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Kisan Credit Card Number (Optional)
          </label>
          <input
            type="text"
            value={formData.kisanCreditCard}
            onChange={(e) => updateField('kisanCreditCard', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
            placeholder="KCC number if available"
          />
          <p className="text-xs text-gray-500 mt-1">Kisan Credit Card for agricultural credit</p>
        </div>
      </div>

      <div className="mt-6 p-4 bg-blue-50 rounded-md">
        <p className="text-sm text-gray-700">
          <strong>Note:</strong> Your information is secure and will be used only for verification 
          and accessing government agricultural schemes and subsidies.
        </p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
      <div className="max-w-3xl w-full bg-white rounded-lg shadow-xl p-8">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-green-600">Update Profile</h1>
          <p className="text-gray-600 mt-2">Complete your profile information</p>
        </div>

        {renderStepIndicator()}

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-md text-sm">
            {error}
          </div>
        )}

        <div className="mb-6">
          {currentStep === 1 && renderStep1()}
          {currentStep === 2 && renderStep2()}
          {currentStep === 3 && renderStep3()}
          {currentStep === 4 && renderStep4()}
          {currentStep === 5 && renderStep5()}
        </div>

        <div className="flex justify-between">
          <button
            onClick={handleBack}
            disabled={currentStep === 1}
            className="flex items-center px-4 py-2 text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-5 h-5 mr-1" />
            Back
          </button>

          {currentStep < totalSteps ? (
            <button
              onClick={handleNext}
              className="flex items-center px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition"
            >
              Next
              <ChevronRight className="w-5 h-5 ml-1" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Updating...' : 'Update Profile'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

