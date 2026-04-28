const mongoose = require('mongoose');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/newspaperDB';

// Connect to MongoDB
mongoose.connect(MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(async () => {
    console.log('Connected to MongoDB');

    // Define schemas (same as server.js)
    const NewspaperSchema = new mongoose.Schema({
        title: { type: String, required: true },
        image: String,
        price: { type: Number, required: true },
        createdAt: { type: Date, default: Date.now }
    });

    const UserSchema = new mongoose.Schema({
        name: String,
        email: { type: String, unique: true },
        password: String,
        role: String,
        address: String,
        phone: String,
        createdAt: { type: Date, default: Date.now }
    });

    const Newspaper = mongoose.model('Newspaper', NewspaperSchema);
    const User = mongoose.model('User', UserSchema);

    // Sample data
    const sampleNewspapers = [
        { title: 'The Daily Times', price: 5.99, image: '/images/daily-times.jpg' },
        { title: 'Morning Herald', price: 4.50, image: '/images/morning-herald.jpg' },
        { title: 'Evening Gazette', price: 3.99, image: '/images/evening-gazette.jpg' },
        { title: 'Sunday Tribune', price: 7.99, image: '/images/sunday-tribune.jpg' }
    ];

    const sampleUsers = [
        { name: 'John Doe', email: 'john@example.com', password: '$2a$10$hashedpassword', role: 'customer', phone: '123-456-7890' },
        { name: 'Jane Smith', email: 'jane@example.com', password: '$2a$10$hashedpassword', role: 'manager', phone: '987-654-3210' },
        { name: 'Bob Johnson', email: 'bob@example.com', password: '$2a$10$hashedpassword', role: 'delivery', phone: '555-123-4567' }
    ];

    try {
        // Clear existing data
        await Newspaper.deleteMany({});
        await User.deleteMany({});

        // Insert sample data
        await Newspaper.insertMany(sampleNewspapers);
        await User.insertMany(sampleUsers);

        console.log('Sample data inserted successfully!');
        console.log(`${sampleNewspapers.length} newspapers added`);
        console.log(`${sampleUsers.length} users added`);

    } catch (error) {
        console.error('Error inserting sample data:', error);
    } finally {
        mongoose.connection.close();
    }

}).catch(err => {
    console.error('MongoDB connection error:', err);
});