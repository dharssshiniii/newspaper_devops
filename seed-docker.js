const mongoose = require('mongoose');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://mongo:27017/newspaperDB';

async function seedDatabase() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('Connected to MongoDB');

        // Define schema (same as server.js)
        const NewspaperSchema = new mongoose.Schema({
            title: { type: String, required: true },
            image: String,
            price: { type: Number, required: true },
            createdAt: { type: Date, default: Date.now }
        });

        const Newspaper = mongoose.model('Newspaper', NewspaperSchema);

        // Sample data
        const newspapers = [
            {
                title: 'The Times',
                image: '/images/times.jpg',
                price: 5.99
            },
            {
                title: 'The Guardian',
                image: '/images/guardian.jpg',
                price: 4.99
            },
            {
                title: 'Financial Times',
                image: '/images/ft.jpg',
                price: 7.99
            },
            {
                title: 'The Telegraph',
                image: '/images/telegraph.jpg',
                price: 3.99
            }
        ];

        await Newspaper.insertMany(newspapers);
        console.log(`${newspapers.length} newspapers inserted successfully!`);

    } catch (error) {
        console.error('Error seeding database:', error);
    } finally {
        await mongoose.connection.close();
    }
}

seedDatabase();