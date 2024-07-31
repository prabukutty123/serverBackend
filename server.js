const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config(); // Use environment variables

const app = express();
app.use(bodyParser.json());
app.use(cors());

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

const FAST2SMS_API_KEY = process.env.FAST2SMS_API_KEY;

app.post('/send-otp', async (req, res) => {
  const { phoneNumber } = req.body;

  if (!phoneNumber) {
    return res.status(400).json({ success: false, message: 'Phone number is required' });
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  try {
    await new Otp({ phoneNumber, otp }).save();

    const response = await axios.post('https://www.fast2sms.com/dev/bulkV2', {
      route: 'q',
      message: `Your OTP code is ${otp}`,
      language: 'english',
      flash: 0,
      numbers: phoneNumber
    }, {
      headers: {
        'authorization': FAST2SMS_API_KEY,
        'Content-Type': 'application/json'
      }
    });

    if (response.data.return) {
      res.json({ success: true, message: 'OTP sent successfully' });
      console.log(res,"OTPEntered");
    } else {
      res.status(500).json({ success: false, message: 'Failed to send OTP' });
    }
  } catch (error) {
    console.error('Error sending OTP:', error);
    res.status(500).json({ success: false, message: 'Error sending OTP', error: error.message });
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

app.listen(3001, () => {
  console.log('Server running on port 3000');
});
