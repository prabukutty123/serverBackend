const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');


const app = express();
app.use(bodyParser.json());

const SECRET_KEY = 'bxctasRA5j3ZK7E67oljevClO5j8QilVEaf6eGLXMErbRZ3toiCa2QXbFjg4'; // Use a strong, unique key

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/myfast', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const userSchema = new mongoose.Schema({
  phoneNumber: String,
  name: String,
  email: String,
  password: String,
});

const User = mongoose.model('User', userSchema);
const messageSchema = new mongoose.Schema({
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  receiver: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  message: String,
  timestamp: { type: Date, default: Date.now },
});
const Message = mongoose.model('Message', messageSchema);
const FAST2SMS_API_KEY = 'bxctasRA5j3ZK7E67oljevClO5j8QilVEaf6eGLXMErbRZ3toiCa2QXbFjg4';

let otpStore = {}; // This is a temporary storage, ideally, use a database
// Endpoint to send OTP
app.post('/send-otp', async (req, res) => {
  const { phoneNumber } = req.body;
  const otp = Math.floor(100000 + Math.random() * 900000).toString(); // Generate a 6-digit OTP

  // Save OTP in the store
  otpStore[phoneNumber] = otp;

  // Send OTP using Fast2SMS
  try {
    const response = await axios.post(
      'https://www.fast2sms.com/dev/bulkV2',
      {
        route: 'q',
        message: `Your OTP is ${otp}`,
        language: 'english',
        flash: 0,
        numbers: phoneNumber,
      },
      {
        headers: {
          authorization: FAST2SMS_API_KEY,
        }
      }
    );
    res.status(200).send({ message: 'OTP sent successfully!' });
  } catch (error) {
    res.status(500).send({ message: 'Failed to send OTP', error: error.message });
  }
});

// Endpoint to verify OTP and register/login user
app.post('/verify-otp', async (req, res) => {
  const { phoneNumber, otp } = req.body;

  if (otpStore[phoneNumber] === otp) {
    // OTP is valid
    delete otpStore[phoneNumber]; // Remove OTP from the store after verification

    let user = await User.findOne({ phoneNumber });
    if (!user) {
      // Register new user if not exists
      user = new User({ phoneNumber });
      await user.save();
    }

    // Generate JWT token
    const token = jwt.sign({ userId: user._id }, SECRET_KEY, { expiresIn: '1h' });

    res.status(200).send({ message: 'OTP verified successfully!', token });
  } else {
    // OTP is invalid
    res.status(400).send({ message: 'Invalid OTP' });
  }
});

// Middleware to authenticate token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }
  jwt.verify(token, SECRET_KEY, (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Failed to authenticate token' });
    }
    req.user = user;
    next();
  });
};
// Update profile endpoint
app.post('/update-profile', authenticateToken, async (req, res) => {
  const { name, email } = req.body;

  try {
    const user = await User.findByIdAndUpdate(
      req.user.userId,
      { name, email },
      { new: true }
    );

    res.status(200).json({ message: 'Profile updated successfully', user });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update profile', error });
  }
});
// Endpoint to fetch user list excluding the logged-in user
app.get('/user-list', authenticateToken, async (req, res) => {
  try {
    const users = await User.find({ _id: { $ne: req.user.userId } });
    res.status(200).json({ users });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch user list', error });
  }
});

// Middleware to authenticate token (placeholder)
app.use((req, res, next) => {
  // Simulate setting req.user.userId from token
  req.user = { userId: '60c72b2f9b1e8b3f20d3e3a7' }; // Example user ID
  next();
});



app.post('/send-message', authenticateToken, async (req, res) => {
  const { receiverId, message } = req.body;
  try {
    const newMessage = new Message({
      sender: req.user.userId,
      receiver: receiverId,
      message,
    });
    await newMessage.save();
    res.status(200).json({ message: 'Message sent successfully', newMessage });
  } catch (error) {
    res.status(500).json({ message: 'Failed to send message', error });
  }
});

// Endpoint to get messages between two users
app.get('/get-messages/:receiverId', authenticateToken, async (req, res) => {
  const { receiverId } = req.params;
  try {
    const messages = await Message.find({
      $or: [
        { sender: req.user.userId, receiver: receiverId },
        { sender: receiverId, receiver: req.user.userId },
      ],
    }).sort('timestamp');
    res.status(200).json({ messages });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch messages', error });
  }
});
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
