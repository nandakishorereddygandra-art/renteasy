const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection - Fixed for latest MongoDB driver
const MONGODB_URI = 'mongodb://localhost:27017/rentalplatform';

// Removed deprecated options
mongoose.connect(MONGODB_URI)
.then(() => console.log('✅ Connected to MongoDB locally'))
.catch(err => console.error('❌ MongoDB connection error:', err));

// Models
const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['user', 'manager'], default: 'user' },
  createdAt: { type: Date, default: Date.now }
});

const RentalSchema = new mongoose.Schema({
  productName: { type: String, required: true },
  price: { type: Number, required: true },
  days: { type: Number, required: true },
  condition: { type: String, required: true },
  location: { type: String, required: true },
  description: { type: String },
  category: { type: String },
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  ownerName: { type: String },
  status: { type: String, enum: ['available', 'rented'], default: 'available' },
  createdAt: { type: Date, default: Date.now },
  imageUrl: { type: String, default: 'https://via.placeholder.com/300x200?text=Rental+Item' }
});

const User = mongoose.model('User', UserSchema);
const Rental = mongoose.model('Rental', RentalSchema);

// JWT Secret
const JWT_SECRET = 'your-secret-key-change-this-in-production-2024';

// Middleware
const authMiddleware = async (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
    req.userRole = decoded.role;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token.' });
  }
};

const managerMiddleware = (req, res, next) => {
  if (req.userRole !== 'manager') {
    return res.status(403).json({ error: 'Access denied. Manager only.' });
  }
  next();
};

// Routes
// Auth Routes
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already exists' });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ name, email, password: hashedPassword, role: role || 'user' });
    await user.save();
    const token = jwt.sign({ userId: user._id, role: user.role }, JWT_SECRET);
    res.status(201).json({ token, user: { id: user._id, name: user.name, email: user.email, role: user.role } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }
    const token = jwt.sign({ userId: user._id, role: user.role }, JWT_SECRET);
    res.json({ token, user: { id: user._id, name: user.name, email: user.email, role: user.role } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/auth/me', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-password');
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Rental Routes
app.get('/api/rentals', async (req, res) => {
  try {
    const rentals = await Rental.find({ status: 'available' }).sort({ createdAt: -1 });
    res.json(rentals);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/rentals/all', authMiddleware, managerMiddleware, async (req, res) => {
  try {
    const rentals = await Rental.find().sort({ createdAt: -1 });
    res.json(rentals);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/rentals/user', authMiddleware, async (req, res) => {
  try {
    const rentals = await Rental.find({ ownerId: req.userId }).sort({ createdAt: -1 });
    res.json(rentals);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/rentals', authMiddleware, async (req, res) => {
  try {
    const { productName, price, days, condition, location, description, category, imageUrl } = req.body;
    const user = await User.findById(req.userId);
    const rental = new Rental({
      productName,
      price,
      days,
      condition,
      location,
      description,
      category,
      imageUrl: imageUrl || 'https://via.placeholder.com/300x200?text=Rental+Item',
      ownerId: req.userId,
      ownerName: user.name
    });
    await rental.save();
    res.status(201).json(rental);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/rentals/:id', authMiddleware, async (req, res) => {
  try {
    const rental = await Rental.findById(req.params.id);
    if (!rental) {
      return res.status(404).json({ error: 'Rental not found' });
    }
    if (rental.ownerId.toString() !== req.userId && req.userRole !== 'manager') {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    await rental.deleteOne();
    res.json({ message: 'Rental deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/rentals/:id/status', authMiddleware, async (req, res) => {
  try {
    const { status } = req.body;
    const rental = await Rental.findById(req.params.id);
    if (!rental) {
      return res.status(404).json({ error: 'Rental not found' });
    }
    if (rental.ownerId.toString() !== req.userId && req.userRole !== 'manager') {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    rental.status = status;
    await rental.save();
    res.json(rental);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// User Routes (Manager only)
app.get('/api/users', authMiddleware, managerMiddleware, async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/users/:id', authMiddleware, managerMiddleware, async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    await Rental.deleteMany({ ownerId: req.params.id });
    res.json({ message: 'User and their rentals deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});