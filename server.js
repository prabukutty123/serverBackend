const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB connection
mongoose.connect('mongodb://localhost:27017/merchat', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});

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
// Sample data for demonstration
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

// Start server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
