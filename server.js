const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(bodyParser.json());
app.use(cors());

mongoose.connect('mongodb://localhost:27017/otp-auth', {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => {
    console.log('Connected to MongoDB');
}).catch((error) => {
    console.error('Error connecting to MongoDB:', error);
});

const otpSchema = new mongoose.Schema({
    phoneNumber: String,
    otp: String,
    createdAt: { type: Date, expires: 300, default: Date.now }  // OTP expires in 5 minutes
});

const Otp = mongoose.model('Otp', otpSchema);

const FAST2SMS_API_KEY = 'bxctasRA5j3ZK7E67oljevClO5j8QilVEaf6eGLXMErbRZ3toiCa2QXbFjg4';

app.post('/send-otp', async (req, res) => {
    const { phoneNumber } = req.body;
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    await new Otp({ phoneNumber, otp }).save();

    try {
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
        } else {
            res.json({ success: false, message: 'Failed to send OTP' });
        }
    } catch (error) {
        res.json({ success: false, message: 'Error sending OTP', error });
    }
});

app.post('/verify-otp', async (req, res) => {
    const { phoneNumber, otp } = req.body;
    const record = await Otp.findOne({ phoneNumber, otp });

    if (record) {
        res.json({ success: true, message: 'OTP verified successfully' });
    } else {
        res.json({ success: false, message: 'Invalid OTP' });
    }
});

app.listen(3000, () => {
    console.log('Server running on port 3000');
});
