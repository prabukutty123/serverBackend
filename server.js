const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config(); // Use environment variables

const app = express();
app.use(bodyParser.json());
app.use(cors());

// Connect to MongoDB Database
mongoose.connect('mongodb://localhost:27017/mydatabase', {
  // useNewUrlParser: true,
  // useUnifiedTopology: true
})
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('Error connecting to MongoDB:', err));

// OTP Schema
const otpSchema = new mongoose.Schema({
  phoneNumber: { type: String, required: true },
  otp: { type: String, required: true },
  createdAt: { type: Date, expires: 300, default: Date.now }  // OTP expires in 5 minutes
});

const Otp = mongoose.model('Otp', otpSchema);

// Business Schema
const businessSchema = new mongoose.Schema({
  type: { type: String, required: true },
  name: { type: String, required: true },
  location: { type: String, required: true }
});

const Business = mongoose.model('Business', businessSchema);

// Address Schema
const addressSchema = new mongoose.Schema({
  addressLine1: { type: String, required: true },
  addressLine2: { type: String },
  city: { type: String, required: true },
  state: { type: String, required: true },
  zipCode: { type: String, required: true }
});

const Address = mongoose.model('Address', addressSchema);

// BankDetails Schema
const bankDetailsSchema = new mongoose.Schema({
  accountNumber: { type: String, required: true },
  bankName: { type: String, required: true },
  branch: { type: String, required: true },
  ifscCode: { type: String, required: true }
});

const BankDetails = mongoose.model('BankDetails', bankDetailsSchema);

// Fast2SMS API Key
const FAST2SMS_API_KEY = process.env.FAST2SMS_API_KEY;

// Send OTP Endpoint
app.post('/send-otp', async (req, res) => {
  const { phoneNumber } = req.body;

  if (!phoneNumber) {
    return res.status(400).json({ success: false, message: 'Phone number is required' });
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  try {
    await new Otp({ phoneNumber, otp }).save();

    const response = await axios.post('https://www.fast2sms.com/dev/bulkV2', {
      route: 'otp',
      sender_id: 'FSTSMS',
      message: `Your OTP code is {{otp}}`,
      variables_values: otp,
      language: 'english',
      flash: '0',
      numbers: phoneNumber,
    }, {
      headers: {
        'authorization': FAST2SMS_API_KEY,
        'Content-Type': 'application/json'
      }
    });

    if (response.data.return) {
      res.json({ success: true, message: 'OTP sent successfully' });
      console.log("OTP sent successfully");
    } else {
      res.status(500).json({ success: false, message: 'Failed to send OTP' });
    }
  } catch (error) {
    console.error('Error sending OTP:', error);
    res.status(500).json({ success: false, message: 'Error sending OTP', error: error.message });
  }
});

// Verify OTP Endpoint
app.post('/verify-otp', async (req, res) => {
  const { phoneNumber, otp } = req.body;

  if (!phoneNumber || !otp) {
    return res.status(400).json({ success: false, message: 'Phone number and OTP are required' });
  }

  try {
    const record = await Otp.findOne({ phoneNumber, otp });

    // Log the phone number and OTP for verification
    console.log('Phone number:', phoneNumber);
    console.log('Entered OTP:', otp);

    if (record) {
      res.json({ success: true, message: 'OTP verified successfully' });
      console.log('Verification successful');
    } else {
      res.status(400).json({ success: false, message: 'Invalid OTP' });
      console.log('Invalid OTP');
    }
  } catch (error) {
    console.error('Error verifying OTP:', error);
    res.status(500).json({ success: false, message: 'Error verifying OTP', error: error.message });
  }
});

// Endpoint to get businesses based on type (static)
app.get('/api/businesses/:type', async (req, res) => {
  const { type } = req.params;
  const businesses = {
    type1: [
      { id: 1, name: 'Retail Shopping' },
      { id: 2, name: 'Grocery & Daily Needs' },
      { id: 3, name: 'Food & Beverages' },
      { id: 4, name: 'Fuel' },
      { id: 5, name: 'Art & Antiques' },
      { id: 6, name: 'Travel' },
      { id: 7, name: 'Agriculture' },
      { id: 8, name: 'Hospitality' },
    ],
    type2: [
      { id: 3, name: 'Business 3', location: 'Location 3' },
      { id: 4, name: 'Business 4', location: 'Location 4' },
    ],
  };

  try {
    let data;
    if (businesses[type]) {
      data = businesses[type];
    } else {
      throw new Error('Business type not found');
    }
    res.json(data);
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
});

// Endpoint to fetch businesses from MongoDB
app.get('/api/businesses-mongodb/:type', async (req, res) => {
  const { type } = req.params;
  try {
    const businessesFromDB = await Business.find({ type });
    res.json(businessesFromDB);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch businesses from MongoDB' });
  }
});

// Endpoint to add a new business to MongoDB
app.post('/api/businesses', async (req, res) => {
  try {
    const { type, name } = req.body;
    const newBusiness = new Business({ type, name });
    await newBusiness.save();
    res.status(201).json(newBusiness);
  } catch (error) {
    console.error('Error saving business:', error);
    res.status(500).json({ message: 'Failed to save business', error: error.message });
  }
});
// Endpoint to add a new address
app.post('/api/addresses', async (req, res) => {
  try {
    const { addressLine1, addressLine2, city, state, zipCode } = req.body;
    const newAddress = new Address({ addressLine1, addressLine2, city, state, zipCode });
    await newAddress.save();
    res.status(201).json(newAddress);
  } catch (error) {
    console.error('Error saving address:', error);
    res.status(500).json({ message: 'Failed to save address', error: error.message });
  }
});

// Endpoint to add new bank details
app.post('/api/bank-details', async (req, res) => {
  try {
    const { accountNumber, bankName, branch, ifscCode } = req.body;
    const newBankDetails = new BankDetails({ accountNumber, bankName, branch, ifscCode });
    await newBankDetails.save();
    res.status(201).json(newBankDetails);
  } catch (error) {
    console.error('Error saving bank details:', error);
    res.status(500).json({ message: 'Failed to save bank details', error: error.message });
  }
});

app.post('/verify-aadhaar', async (req, res) => {
  const { aadhaarNumber } = req.body;

  if (!aadhaarNumber) {
    return res.status(400).json({ error: 'Aadhaar number is required' });
  }

  try {
    const response = await axios.post(
      'https://api.gridlines.io/v1/aadhaar-verification', // Replace with the actual Gridlines API endpoint
      { aadhaar_number: aadhaarNumber },
      {
        headers: {
          'Authorization': `Bearer ${process.env.GRIDLINES_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: error.response ? error.response.data : error.message });
  }
});

app.listen(3007, () => {
  console.log('Server running on port 3007');
});