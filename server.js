const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const qs = require('qs');

const app = express();
app.use(bodyParser.json());

const apiKey = 'bxctasRA5j3ZK7E67oljevClO5j8QilVEaf6eGLXMErbRZ3toiCa2QXbFjg4'; // Replace with your Fast2SMS API key
const otpStorage = {}; // Temporary storage for OTPs

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
      otpStorage[phoneNumber] = otp; // Store the OTP with the phone number as the key
      res.json({ success: true, message: 'OTP sent successfully', otp }); // Respond with the OTP for testing
    } else {
      res.status(400).json({ success: false, message: 'Failed to send OTP' });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post('/verify-otp', (req, res) => {
  const { phoneNumber, otp } = req.body;

  if (otpStorage[phoneNumber] && otpStorage[phoneNumber] === otp) {
    delete otpStorage[phoneNumber]; // Clear the OTP after verification
    res.json({ success: true, message: 'OTP verified successfully' });
  } else {
    res.status(400).json({ success: false, message: 'Invalid OTP' });
  }
});

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
