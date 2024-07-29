const express = require('express');
const axios = require('axios');
const cors = require('cors');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const axios = require('axios');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
app.use(bodyParser.json());

mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

const otpSchema = new mongoose.Schema({
  phone: String,
  otp: String,
  createdAt: { type: Date, expires: 300, default: Date.now }
});

const OTP = mongoose.model('OTP', otpSchema);

app.post('/send-otp', async (req, res) => {
  const { phone } = req.body;
  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  try {
    await axios.post('https://www.fast2sms.com/dev/bulkV2', {
      route: 'v3',
      sender_id: 'FTWSMS',
      message: `Your OTP code is ${otp}`,
      language: 'english',
      flash: 0,
      numbers: phone
    }, {
      headers: {
        authorization: process.env.FAST2SMS_API_KEY,
        'Content-Type': 'application/json'
      }
    });

    const newOTP = new OTP({ phone, otp });
    await newOTP.save();

    res.status(200).json({ message: 'OTP sent successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error sending OTP', error });
  }
});

app.post('/verify-otp', async (req, res) => {
  const { phone, otp } = req.body;

  const validOTP = await OTP.findOne({ phone, otp });

  if (validOTP) {
    res.status(200).json({ message: 'OTP verified successfully' });
  } else {
    res.status(400).json({ message: 'Invalid OTP' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
