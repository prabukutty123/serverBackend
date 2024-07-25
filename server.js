// server.js
const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');

const app = express();
app.use(bodyParser.json());

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/otpdb', {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

const otpSchema = new mongoose.Schema({
    phoneNumber: String,
    otp: String,
    expiry: Number
});
const Otp = mongoose.model('Otp', otpSchema);

// Send OTP
app.post('/sendOtp', async (req, res) => {
    const { phoneNumber } = req.body;
    const otp = Math.floor(100000 + Math.random() * 900000); // Generate OTP
    const otpExpiry = Date.now() + 10 * 60 * 1000; // 10 minutes expiry

    try {
        const response = await axios.post('https://www.fast2sms.com/dev/bulkV2', null, {
            params: {
                route: 'v3',
                sender_id: 'FSTSMS',
                message: `Your OTP is ${otp}`,
                language: 'english',
                numbers: phoneNumber,
                flash: 0
            },
            headers: {
                'Authorization': 'YOUR_FAST2SMS_API_KEY'
            }
        });

        if (response.data.return === 'Success') {
            // Save OTP and expiry to the database
            await Otp.findOneAndUpdate({ phoneNumber }, { otp, expiry: otpExpiry }, { upsert: true });
            res.json({ success: true });
        } else {
            res.status(500).json({ success: false, message: 'Failed to send OTP' });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error sending OTP' });
    }
});

// Verify OTP
app.post('/verifyOtp', async (req, res) => {
    const { phoneNumber, otp } = req.body;

    try {
        const otpRecord = await Otp.findOne({ phoneNumber });

        if (!otpRecord) {
            return res.status(400).json({ success: false, message: 'OTP not found' });
        }

        if (Date.now() > otpRecord.expiry) {
            return res.status(400).json({ success: false, message: 'OTP expired' });
        }

        if (otpRecord.otp === otp) {
            res.json({ success: true });
        } else {
            res.status(400).json({ success: false, message: 'Invalid OTP' });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error verifying OTP' });
    }
});

app.listen(3000, () => {
    console.log('Server running on port 3000');
});
