const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const axios = require('axios');
const qs = require('qs');
require('dotenv').config(); // Use environment variables
const app = express();
app.use(bodyParser.json());
app.use(cors());
const apiKey = 'bxctasRA5j3ZK7E67oljevClO5j8QilVEaf6eGLXMErbRZ3toiCa2QXbFjg4'; // Replace with your Fast2SMS API key

mongoose.connect('mongodb://localhost:27017/mydatabase', {
  // useNewUrlParser: true,
  // useUnifiedTopology: true
})
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('Error connecting to MongoDB:', err));

const otpSchema = new mongoose.Schema({
  phoneNumber: String,
  otp: String,
  createdAt: { type: Date, expires: 300, default: Date.now }  // OTP expires in 5 minutes
});

const Otp = mongoose.model('Otp', otpSchema);

// Business Schema
const businessSchema = new mongoose.Schema({
  type: String,
  name: String,
  location: String,
});

const Business = mongoose.model('Business', businessSchema);
const addressSchema = new mongoose.Schema({
  addressLine1: {
      type: String,
      required: true,
  },
  addressLine2: String,
  city: {
      type: String,
      required: true,
  },
  state: {
      type: String,
      required: true,
  },
  zipCode: {
      type: String,
      required: true,
  },
});

const Address = mongoose.model('Address', addressSchema);

const bankDetailsSchema = new mongoose.Schema({
  accountNumber: { type: String, required: true },
  bankName: { type: String, required: true },
  branch: { type: String, required: true },
  ifscCode: { type: String, required: true }
});

const BankDetails = mongoose.model('BankDetails', bankDetailsSchema);
const businesses = {
  type1: [
      { id: 1, name: 'Retail Shopping'},
      { id: 2, name: 'Grocery & Daily Needs'},
      { id: 3, name: 'Food & Beverages'},
      { id: 4, name: 'Fuel' },
      { id: 5, name: 'Art & Antiques'},
      { id: 6, name: 'Travel'},
      { id: 7, name: 'Agriculture'},
      { id: 8, name: 'Hospitality'},
  ],
  type2: [
      { id: 3, name: 'Business 3', location: 'Location 3' },
      { id: 4, name: 'Business 4', location: 'Location 4' },
  ],
};


// const FAST2SMS_API_KEY = process.env.FAST2SMS_API_KEY;

app.post('/send-otp', async (req, res) => {
  const { phoneNumber } = req.body;
  const otp = Math.floor(100000 + Math.random() * 900000).toString(); // Generate a 6-digit OTP

  const apiUrl = 'https://www.fast2sms.com/dev/bulkV2';

  try {
    const response = await axios.post(apiUrl, qs.stringify({
      route: 'otp',
      sender_id: 'FSTSMS',
      message: `Your OTP code is {{otp}}`,
      variables_values: otp,
      language: 'english',
      flash: '0',
      numbers: phoneNumber,
    }), {
      headers: {
        authorization: apiKey,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    if (response.data.return === true) {
      res.json({ success: true, message: 'OTP sent successfully', otp }); // Respond with the OTP for testing
    } else {
      res.status(400).json({ success: false, message: 'Failed to send OTP' });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});
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

// Endpoint to get businesses based on type
app.get('/api/businesses/:type', async (req, res) => {
  const { type } = req.params;
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
      const { type, name, location } = req.body;
      const newBusiness = new Business({ type, name, location });
      await newBusiness.save();
      res.status(201).json(newBusiness);
  } catch (error) {
      res.status(500).json({ message: 'Failed to save business', error });
  }
});

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
app.listen(3001, () => {
  console.log('Server running on port 3001');
});
