const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const session = require('express-session');
const MongoStore = require('connect-mongo');
require('dotenv').config();
const app = express();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/newspaperDB';
const SESSION_SECRET = process.env.SESSION_SECRET || 'dev-secret';
const PORT = process.env.PORT || 3000;

// Connect to MongoDB (optional for demo)
if (process.env.USE_MONGODB === 'true') {
  mongoose.connect(MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
  }).then(() => console.log('MongoDB connected'))
    .catch(err => console.log('MongoDB connection failed, running in demo mode:', err.message));
} else {
  console.log('Running in demo mode (no database)');
}

// Define Schemas
const UserSchema = new mongoose.Schema({
    name: String,
    email: { type: String, unique: true },
    password: String,
    role: String,
    address: String,
    phone: String,
    createdAt: { type: Date, default: Date.now }
});

const NewspaperSchema = new mongoose.Schema({
    title: { type: String, required: true },
    image: String,
    price: { type: Number, required: true },
    createdAt: { type: Date, default: Date.now }
});

const SubscriptionSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    newspaper: { type: mongoose.Schema.Types.ObjectId, ref: 'Newspaper' }, // Changed from String
    price: Number,
    deliveryPerson: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    status: { type: String, default: 'active' },
    paid: { type: Boolean, default: false },
    lastPaymentDate: Date,
    createdAt: { type: Date, default: Date.now },
    pauseDates: [{
        startDate: Date,
        endDate: Date,
        createdAt: { type: Date, default: Date.now }
    }],
    isPaused: { type: Boolean, default: false }
});

const User = mongoose.model('User', UserSchema);
const Newspaper = mongoose.model('Newspaper', NewspaperSchema);
const Subscription = mongoose.model('Subscription', SubscriptionSchema);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use(session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    ...(process.env.USE_MONGODB === 'true' && { store: MongoStore.create({ mongoUrl: MONGO_URI }) }),
    cookie: { maxAge: 1000 * 60 * 60 * 24 } // 1 day
}));

// Health check and API metadata
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        service: 'newspaper-backend',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        mode: process.env.USE_MONGODB === 'true' ? 'database' : 'demo'
    });
});

app.get('/api/newspapers', async (req, res) => {
    try {
        const newspapers = await Newspaper.find();
        res.json(newspapers);
    } catch (err) {
        console.error('Error fetching newspapers:', err);
        res.status(500).json({ error: 'Unable to load newspapers' });
    }
});

// Authentication Middleware
const requireAuth = (req, res, next) => {
    if (!req.session.user) return res.redirect('/login');
    next();
};

const requireRole = (role) => {
    return (req, res, next) => {
        if (req.session.user?.role !== role) return res.redirect('/login');
        next();
    };
};

// Routes
app.get('/', (req, res) => {
    if (req.session.user) {
        return res.redirect(`/${req.session.user.role}/dashboard`);
    }
    res.sendFile(__dirname + '/views/home.html');
});

// Login/Register Routes
app.get('/login', (req, res) => res.sendFile(__dirname + '/views/login.html'));
app.post('/login', async (req, res) => {
    const { email, password, role } = req.body;
    try {
        const user = await User.findOne({ email, role });
        if (!user) {
            return res.send(`
                <script>
                    alert('User not found. Please check your email and role.');
                    window.location.href = '/login';
                </script>
            `);
        }
        if (!await bcrypt.compare(password, user.password)) {
            return res.send(`
                <script>
                    alert('Incorrect password. Please try again.');
                    window.location.href = '/login';
                </script>
            `);
        }
        req.session.user = user;
        res.redirect(`/${role}/dashboard`);
    } catch (err) {
        console.error(err);
        res.status(500).send('Internal Server Error');
    }
});

app.get('/register', (req, res) => res.sendFile(__dirname + '/views/register.html'));
app.post('/register', async (req, res) => {
    const { name, email, password, role, phone } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = new User({ name, email, password: hashedPassword, role, phone });
        await user.save();
        res.redirect('/login');
    } catch (err) {
        if (err.code === 11000) {
            return res.send(`
                <script>
                    alert('Email already exists. Please use a different email.');
                    window.location.href = '/register';
                </script>
            `);
        }
        console.error(err);
        res.status(500).send('Internal Server Error');
    }
});

app.post('/pause-subscription', requireAuth, requireRole('customer'), async (req, res) => {
    try {
        const { id, startDate, endDate } = req.body;
        await Subscription.findByIdAndUpdate(id, {
            $push: {
                pauseDates: {
                    startDate: new Date(startDate),
                    endDate: new Date(endDate)
                }
            },
            isPaused: true
        });
        res.redirect('/customer/dashboard');
    } catch (err) {
        console.error('Pause subscription error:', err);
        res.status(500).send('Error pausing subscription');
    }
});

app.post('/resume-subscription', requireAuth, requireRole('customer'), async (req, res) => {
    try {
        const { id } = req.body;
        await Subscription.findByIdAndUpdate(id, {
            isPaused: false
        });
        res.redirect('/customer/dashboard');
    } catch (err) {
        console.error('Resume subscription error:', err);
        res.status(500).send('Error resuming subscription');
    }
});

app.get('/logout', (req, res) => {
    // Clear the session
    req.session.destroy((err) => {
        if (err) {
            console.error('Error destroying session:', err);
        }
        // Clear any session cookies
        res.clearCookie('connect.sid');
        // Redirect to login page
        res.redirect('/login');
    });
});

// Fix for customer dashboard newspaper display
app.get('/customer/dashboard', requireAuth, requireRole('customer'), async (req, res) => {
    try {
        const user = await User.findById(req.session.user._id);
        const newspapers = await Newspaper.find();
        const subscriptions = await Subscription.find({ user: user._id })
            .populate('newspaper')
            .populate('deliveryPerson');

        res.send(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Customer Dashboard</title>
                <style>
                    /* Root Variables */
                    :root {
                        --primary: #4361ee;
                        --secondary: #3f37c9;
                        --accent: #4895ef;
                        --success: #4cc9f0;
                        --warning: #f72585;
                        --danger: #b5179e;
                        --light: #f8f9fa;
                        --dark: #212529;
                        --text: #2b2d42;
                        --bg-gradient: linear-gradient(135deg, #4361ee 0%, #3f37c9 100%);
                    }

                    /* Base Styles */
                    body {
                        font-family: 'Poppins', sans-serif;
                        margin: 0;
                        padding: 0;
                        background-color: #f0f2f5;
                        color: var(--text);
                        line-height: 1.6;
                    }

                    .dashboard-container {
                        max-width: 1200px;
                        margin: 0 auto;
                        padding: 20px;
                    }

                    /* Header */
                    .dashboard-header {
                        background: var(--bg-gradient);
                        color: white;
                        padding: 25px;
                        border-radius: 15px;
                        margin-bottom: 30px;
                        box-shadow: 0 10px 20px rgba(67, 97, 238, 0.2);
                        text-align: center;
                        position: relative;
                        overflow: hidden;
                    }

                    .dashboard-header::after {
                        content: '';
                        position: absolute;
                        top: -50%;
                        right: -50%;
                        width: 100%;
                        height: 200%;
                        background: radial-gradient(circle, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0) 70%);
                        transform: rotate(30deg);
                    }

                    .dashboard-title {
                        margin: 0;
                        font-size: 2.2rem;
                        font-weight: 700;
                        position: relative;
                        z-index: 1;
                        text-shadow: 0 2px 4px rgba(0,0,0,0.1);
                    }

                    /* Sections */
                    .dashboard-section {
                        background: white;
                        border-radius: 15px;
                        padding: 25px;
                        margin-bottom: 30px;
                        box-shadow: 0 5px 15px rgba(0,0,0,0.05);
                        border: 1px solid rgba(0,0,0,0.05);
                        transition: transform 0.3s ease, box-shadow 0.3s ease;
                    }

                    .dashboard-section:hover {
                        transform: translateY(-5px);
                        box-shadow: 0 10px 25px rgba(0,0,0,0.1);
                    }

                    .section-title {
                        color: var(--primary);
                        margin-top: 0;
                        margin-bottom: 20px;
                        font-size: 1.5rem;
                        font-weight: 600;
                        position: relative;
                        padding-bottom: 10px;
                    }

                    .section-title::after {
                        content: '';
                        position: absolute;
                        bottom: 0;
                        left: 0;
                        width: 50px;
                        height: 3px;
                        background: var(--accent);
                        border-radius: 3px;
                    }

                    /* Newspaper Grid */
                    .newspaper-grid {
                        display: grid;
                        grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
                        gap: 25px;
                    }

                    .newspaper-item {
                        background: white;
                        border-radius: 12px;
                        padding: 20px;
                        transition: all 0.3s ease;
                        box-shadow: 0 5px 15px rgba(0,0,0,0.05);
                        border: 1px solid rgba(0,0,0,0.05);
                        position: relative;
                        overflow: hidden;
                    }

                    .newspaper-item:hover {
                        transform: translateY(-8px);
                        box-shadow: 0 15px 30px rgba(67, 97, 238, 0.15);
                    }

                    .newspaper-item::before {
                        content: '';
                        position: absolute;
                        top: 0;
                        left: 0;
                        width: 100%;
                        height: 5px;
                        background: var(--accent);
                    }

                    .newspaper-item img {
                        width: 100%;
                        height: 180px;
                        object-fit: cover;
                        border-radius: 8px;
                        margin-bottom: 15px;
                        border: 1px solid rgba(0,0,0,0.1);
                    }

                    .newspaper-item h3 {
                        color: var(--primary);
                        margin: 0 0 10px 0;
                        font-size: 1.2rem;
                    }

                    .newspaper-item p {
                        color: var(--text);
                        font-size: 1.1rem;
                        font-weight: 500;
                        margin: 0 0 15px 0;
                    }

                    /* Subscription Items */
                    .subscription-item {
                        background: white;
                        border-radius: 12px;
                        padding: 25px;
                        margin-bottom: 25px;
                        box-shadow: 0 5px 15px rgba(0,0,0,0.05);
                        border-left: 5px solid var(--accent);
                        position: relative;
                    }

                    .subscription-item.paused {
                        border-left-color: var(--warning);
                        background: #fff9fb;
                    }

                    .subscription-item h3 {
                        color: var(--primary);
                        margin: 0 0 10px 0;
                        font-size: 1.3rem;
                    }

                    /* Buttons */
                    .btn {
                        display: inline-flex;
                        align-items: center;
                        justify-content: center;
                        padding: 10px 20px;
                        border-radius: 8px;
                        font-weight: 600;
                        text-align: center;
                        cursor: pointer;
                        transition: all 0.3s ease;
                        border: none;
                        font-size: 14px;
                        margin-right: 10px;
                        margin-bottom: 10px;
                        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                    }

                    .btn:hover {
                        transform: translateY(-2px);
                        box-shadow: 0 7px 14px rgba(0,0,0,0.15);
                    }

                    .btn:active {
                        transform: translateY(0);
                    }

                    .btn-primary {
                        background: var(--primary);
                        color: white;
                    }

                    .btn-primary:hover {
                        background: var(--secondary);
                    }

                    .btn-success {
                        background: var(--success);
                        color: white;
                    }

                    .btn-warning {
                        background: var(--warning);
                        color: white;
                    }

                    .btn-danger {
                        background: var(--danger);
                        color: white;
                    }

                    /* Status Badges */
                    .status-badge {
                        display: inline-flex;
                        align-items: center;
                        padding: 5px 15px;
                        border-radius: 20px;
                        font-size: 13px;
                        font-weight: 600;
                        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                    }

                    .paid {
                        background: rgb(0, 255, 55);
                        color: rgb(0, 0, 0);
                    }

                    .overdue {
                        background: rgb(255, 0, 0);
                        color: rgb(255, 255, 255);
                    }

                    .paused {
                        background: #ffdeeb;
                        color: var(--warning);
                    }

                    /* Forms */
                    .form-control {
                        width: 100%;
                        padding: 12px 15px;
                        border: 2px solid #e9ecef;
                        border-radius: 8px;
                        font-size: 15px;
                        margin-bottom: 15px;
                        transition: all 0.3s ease;
                    }

                    .form-control:focus {
                        border-color: var(--accent);
                        outline: none;
                        box-shadow: 0 0 0 3px rgba(72, 149, 239, 0.2);
                    }

                    textarea.form-control {
                        min-height: 100px;
                    }

                    /* Delivery Assignment */
                    .delivery-assignment {
                        background: #f8f9fa;
                        padding: 15px;
                        border-radius: 8px;
                        margin: 15px 0;
                        border: 2px dashed #e9ecef;
                    }

                    .delivery-select {
                        padding: 10px 15px;
                        border-radius: 8px;
                        border: 2px solid #e9ecef;
                        margin-right: 10px;
                        font-size: 14px;
                        transition: all 0.3s ease;
                    }

                    .delivery-select:focus {
                        border-color: var(--accent);
                        outline: none;
                    }

                    /* Pause Forms */
                    .pause-form {
                        background: #fff9fb;
                        padding: 20px;
                        border-radius: 10px;
                        margin: 20px 0;
                        border: 2px solid #ffdeeb;
                    }

                    /* Paused Dates */
                    .paused-date {
                        background: linear-gradient(135deg, var(--warning), #b5179e);
                        color: white;
                        padding: 5px 10px;
                        border-radius: 5px;
                        font-size: 13px;
                        margin-right: 5px;
                        display: inline-flex;
                        align-items: center;
                        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                    }

                    /* Logout Button */
                    .logout-container {
                        position: fixed;
                        top: 20px;
                        right: 20px;
                        z-index: 1000;
                    }

                    .logout-btn {
                        background: var(--danger);
                        color: white;
                        padding: 10px 20px;
                        border-radius: 8px;
                        text-decoration: none;
                        font-weight: 600;
                        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                        transition: all 0.3s ease;
                    }

                    .logout-btn:hover {
                        transform: translateY(-2px);
                        box-shadow: 0 7px 14px rgba(0,0,0,0.15);
                    }

                    /* Responsive */
                    @media (max-width: 768px) {
                        .newspaper-grid {
                            grid-template-columns: 1fr;
                        }
                        
                        .dashboard-header {
                            padding: 20px 15px;
                        }
                        
                        .dashboard-title {
                            font-size: 1.8rem;
                        }
                    }
                </style>
                <script>
                    // Prevent back button
                    window.history.pushState(null, null, window.location.href);
                    window.onpopstate = function () {
                        window.history.pushState(null, null, window.location.href);
                    };
                </script>
            </head>
            <body>
                <div class="logout-container">
                    <a href="/logout" class="logout-btn">Logout</a>
                </div>
                <header class="cool-header">
                    <div class="header-content">
                        <div class="logo">DAILY<span>PULSE</span></div>
                    </div>
                </header>
                <div class="dashboard-container">
                    <h1>Welcome ${user.name}</h1>
                    
                    <div class="dashboard-section">
                        <h2>Delivery Address</h2>
                        <form action="/update-address" method="POST">
                            <textarea name="address" required>${user.address || ''}</textarea>
                            <button>Update Address</button>
                        </form>
                    </div>
                    
                    <div class="dashboard-section">
                        <h2>Available Newspapers</h2>
                        <div class="newspaper-grid">
                            ${newspapers.map(np => `
                                <div class="newspaper-item">
                                    ${np.image ? `<img src="${np.image}" alt="${np.title}">` : '<div style="height:160px;background:#eee;margin-bottom:10px;"></div>'}
                                    <h3>${np.title}</h3>
                                    <p>$${np.price.toFixed(2)}</p>
                                    <form action="/subscribe" method="POST">
                                        <input type="hidden" name="newspaper" value="${np._id}">
                                        <button>Subscribe</button>
                                    </form>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    
                    <div class="dashboard-section">
                        <h2>Your Subscriptions</h2>
                        ${subscriptions.map(sub => `
                            <div class="subscription-item ${sub.isPaused ? 'paused' : ''}">
                                <h3>${sub.newspaper?.title || 'Unknown Newspaper'} - $${sub.newspaper?.price?.toFixed(2) || '0.00'}</h3>
                                <p>Status: <span class="status-badge ${sub.paid ? 'paid' : 'overdue'}">
                                    ${sub.paid ? 'Paid' : 'Overdue'}
                                </span></p>
                                ${sub.isPaused ? `
                                    <p class="paused-notice">Delivery Paused</p>
                                    ${sub.pauseDates && sub.pauseDates.length > 0 ? `
                                        <p>Paused from ${new Date(sub.pauseDates[0].startDate).toLocaleDateString()} 
                                        to ${new Date(sub.pauseDates[0].endDate).toLocaleDateString()}</p>
                                    ` : ''}
                                    <form action="/resume-subscription" method="POST">
                                        <input type="hidden" name="id" value="${sub._id}">
                                        <button class="resume-btn">Resume Delivery</button>
                                    </form>
                                ` : `
                                    <form action="/pause-subscription" method="POST" class="pause-form" onsubmit="return validatePauseDates(this)">
                                        <input type="hidden" name="id" value="${sub._id}">
                                        <label>Pause from:</label>
                                        <input type="date" name="startDate" required>
                                        <label>to:</label>
                                        <input type="date" name="endDate" required>
                                        <button class="pause-btn">Pause Delivery</button>
                                    </form>
                                `}
                                <p>Delivery Person: ${sub.deliveryPerson?.name || 'Not assigned'}</p>
                                <form action="/cancel-subscription" method="POST">
                                    <input type="hidden" name="id" value="${sub._id}">
                                    <button class="cancel-btn">Cancel Subscription</button>
                                </form>
                            </div>
                        `).join('')}
                        ${subscriptions.length === 0 ? '<p>You have no active subscriptions</p>' : ''}
                    </div>
                </div>
            </body>
            </html>
        `);
    } catch (err) {
        console.error('Error in customer dashboard:', err);
        res.status(500).send('Internal Server Error');
    }
});

app.get('/manager/dashboard', requireAuth, requireRole('manager'), async (req, res) => {
    try {
        // Fetch all data with proper population
        const newspapers = await Newspaper.find().lean();
        const subscriptions = await Subscription.find()
            .populate({
                path: 'user',
                model: 'User',
                select: 'name email phone'
            })
            .populate({
                path: 'newspaper',
                model: 'Newspaper',
                select: 'title price'
            })
            .populate({
                path: 'deliveryPerson',
                model: 'User',
                select: 'name'
            })
            .lean();

        const deliveryPersons = await User.find({ role: 'delivery' }).select('name').lean();
        const customers = await User.find({ role: 'customer' }).select('name email phone').lean();

        // Group subscriptions by user with proper data validation
        const userSubscriptions = {};
        subscriptions.forEach(sub => {
            try {
                if (!sub.user || !sub.newspaper) return;

                const userId = sub.user._id.toString();
                const newspaperPrice = sub.newspaper?.price || 0;

                if (!userSubscriptions[userId]) {
                    userSubscriptions[userId] = {
                        user: sub.user,
                        subscriptions: [],
                        deliveryPerson: sub.deliveryPerson,
                        total: 0,
                        hasUnpaid: false
                    };
                }

                userSubscriptions[userId].subscriptions.push({
                    id: sub._id,
                    newspaper: {
                        title: sub.newspaper.title,
                        price: newspaperPrice,
                        _id: sub.newspaper._id
                    },
                    paid: sub.paid || false,
                    pauseDates: sub.pauseDates || [],
                    isPaused: sub.isPaused || false,
                    status: sub.status || 'active'
                });

                userSubscriptions[userId].total += newspaperPrice;
                // Only mark as unpaid if the subscription is not new (created more than 1 day ago)
                if (!sub.paid && sub.createdAt && (new Date() - sub.createdAt) > 24 * 60 * 60 * 1000) {
                    userSubscriptions[userId].hasUnpaid = true;
                }

            } catch (err) {
                console.error('Error processing subscription:', sub._id, err);
            }
        });

        res.send(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Manager Dashboard</title>
                <style>
    /* Colorful Customer Dashboard CSS */
    :root {
        --primary: #4361ee;
        --secondary: #3f37c9;
        --accent: #4895ef;
        --success: #4cc9f0;
        --warning: #f72585;
        --danger: #b5179e;
        --light: #f8f9fa;
        --dark: #212529;
        --text: #2b2d42;
        --bg-gradient: linear-gradient(135deg, #4361ee 0%, #3f37c9 100%);
    }

    /* Base Styles */
    body {
        font-family: 'Poppins', sans-serif;
        margin: 0;
        padding: 0;
        background-color: #f0f2f5;
        color: var(--text);
        line-height: 1.6;
    }

    .dashboard-container {
        max-width: 1200px;
        margin: 0 auto;
        padding: 20px;
    }

    /* Header */
    .dashboard-header {
        background: var(--bg-gradient);
        color: white;
        padding: 25px;
        border-radius: 15px;
        margin-bottom: 30px;
        box-shadow: 0 10px 20px rgba(67, 97, 238, 0.2);
        text-align: center;
        position: relative;
        overflow: hidden;
    }

    .dashboard-header::after {
        content: '';
        position: absolute;
        top: -50%;
        right: -50%;
        width: 100%;
        height: 200%;
        background: radial-gradient(circle, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0) 70%);
        transform: rotate(30deg);
    }

    .dashboard-title {
        margin: 0;
        font-size: 2.2rem;
        font-weight: 700;
        position: relative;
        z-index: 1;
        text-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }

    /* Sections */
    .dashboard-section {
        background: white;
        border-radius: 15px;
        padding: 25px;
        margin-bottom: 30px;
        box-shadow: 0 5px 15px rgba(0,0,0,0.05);
        border: 1px solid rgba(0,0,0,0.05);
        transition: transform 0.3s ease, box-shadow 0.3s ease;
    }

    .dashboard-section:hover {
        transform: translateY(-5px);
        box-shadow: 0 10px 25px rgba(0,0,0,0.1);
    }

    .section-title {
        color: var(--primary);
        margin-top: 0;
        margin-bottom: 20px;
        font-size: 1.5rem;
        font-weight: 600;
        position: relative;
        padding-bottom: 10px;
    }

    .section-title::after {
        content: '';
        position: absolute;
        bottom: 0;
        left: 0;
        width: 50px;
        height: 3px;
        background: var(--accent);
        border-radius: 3px;
    }

    /* Newspaper Grid */
    .newspaper-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
        gap: 25px;
    }

    .newspaper-item {
        background: white;
        border-radius: 12px;
        padding: 20px;
        transition: all 0.3s ease;
        box-shadow: 0 5px 15px rgba(0,0,0,0.05);
        border: 1px solid rgba(0,0,0,0.05);
        position: relative;
        overflow: hidden;
    }

    .newspaper-item:hover {
        transform: translateY(-8px);
        box-shadow: 0 15px 30px rgba(67, 97, 238, 0.15);
    }

    .newspaper-item::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 5px;
        background: var(--accent);
    }

    .newspaper-item img {
        width: 100%;
        height: 180px;
        object-fit: cover;
        border-radius: 8px;
        margin-bottom: 15px;
        border: 1px solid rgba(0,0,0,0.1);
    }

    .newspaper-item h3 {
        color: var(--primary);
        margin: 0 0 10px 0;
        font-size: 1.2rem;
    }

    .newspaper-item p {
        color: var(--text);
        font-size: 1.1rem;
        font-weight: 500;
        margin: 0 0 15px 0;
    }

    /* Subscription Items */
    .subscription-item {
        background: white;
        border-radius: 12px;
        padding: 25px;
        margin-bottom: 25px;
        box-shadow: 0 5px 15px rgba(0,0,0,0.05);
        border-left: 5px solid var(--accent);
        position: relative;
    }

    .subscription-item.paused {
        border-left-color: var(--warning);
        background: #fff9fb;
    }

    .subscription-item h3 {
        color: var(--primary);
        margin: 0 0 10px 0;
        font-size: 1.3rem;
    }

    /* Buttons */
    .btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 10px 20px;
        border-radius: 8px;
        font-weight: 600;
        text-align: center;
        cursor: pointer;
        transition: all 0.3s ease;
        border: none;
        font-size: 14px;
        margin-right: 10px;
        margin-bottom: 10px;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    }

    .btn:hover {
        transform: translateY(-2px);
        box-shadow: 0 7px 14px rgba(0,0,0,0.15);
    }

    .btn:active {
        transform: translateY(0);
    }

    .btn-primary {
        background: var(--primary);
        color: white;
    }

    .btn-primary:hover {
        background: var(--secondary);
    }

    .btn-success {
        background: var(--success);
        color: white;
    }

    .btn-warning {
        background: var(--warning);
        color: white;
    }

    .btn-danger {
        background: var(--danger);
        color: white;
    }

    /* Status Badges */
    .status-badge {
        display: inline-flex;
        align-items: center;
        padding: 5px 15px;
        border-radius: 20px;
        font-size: 13px;
        font-weight: 600;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }

    .paid {
        background:rgb(0, 255, 55);
        color:rgb(0, 0, 0);
    }

    .overdue {
        background:rgb(255, 0, 0);
        color:rgb(255, 255, 255);
    }

    .paused {
        background: #ffdeeb;
        color: var(--warning);
    }

    /* Forms */
    .form-control {
        width: 100%;
        padding: 12px 15px;
        border: 2px solid #e9ecef;
        border-radius: 8px;
        font-size: 15px;
        margin-bottom: 15px;
        transition: all 0.3s ease;
    }

    .form-control:focus {
        border-color: var(--accent);
        outline: none;
        box-shadow: 0 0 0 3px rgba(72, 149, 239, 0.2);
    }

    textarea.form-control {
        min-height: 100px;
    }

    /* Delivery Assignment */
    .delivery-assignment {
        background: #f8f9fa;
        padding: 15px;
        border-radius: 8px;
        margin: 15px 0;
        border: 2px dashed #e9ecef;
    }

    .delivery-select {
        padding: 10px 15px;
        border-radius: 8px;
        border: 2px solid #e9ecef;
        margin-right: 10px;
        font-size: 14px;
        transition: all 0.3s ease;
    }

    .delivery-select:focus {
        border-color: var(--accent);
        outline: none;
    }

    /* Pause Forms */
    .pause-form {
        background: #fff9fb;
        padding: 20px;
        border-radius: 10px;
        margin: 20px 0;
        border: 2px solid #ffdeeb;
    }

    /* Paused Dates */
    .paused-date {
        background: linear-gradient(135deg, var(--warning), #b5179e);
        color: white;
        padding: 5px 10px;
        border-radius: 5px;
        font-size: 13px;
        margin-right: 5px;
        display: inline-flex;
        align-items: center;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }

    /* Logout Link */
    .logout-link {
        display: inline-flex;
        align-items: center;
        margin-top: 20px;
        color: var(--primary);
        font-weight: 600;
        text-decoration: none;
        transition: all 0.3s ease;
    }

    .logout-link:hover {
        color: var(--secondary);
        transform: translateX(5px);
    }

    /* Responsive */
    @media (max-width: 768px) {
        .newspaper-grid {
            grid-template-columns: 1fr;
        }
        
        .dashboard-header {
            padding: 20px 15px;
        }
        
        .dashboard-title {
            font-size: 1.8rem;
        }
    }
</style>
            </head>
                      <body>
                <div class="dashboard-container">
                    <div class="dashboard-header">
                        <h1 class="dashboard-title">Manager Dashboard - ${req.session.user.name}</h1>
                    </div>
                    
                    <!-- Newspaper Management (unchanged) -->
                    <div class="dashboard-section">
                        <h2 class="section-title">Newspaper Management</h2>
                        <div class="newspaper-form">
                            <form action="/add-newspaper" method="POST">
                                <input type="text" name="title" placeholder="Title" class="form-control" required>
                                <input type="text" name="image" placeholder="Image URL" class="form-control">
                                <input type="number" name="price" placeholder="Price" step="0.01" class="form-control" required>
                                <button type="submit" class="btn btn-primary">Add Newspaper</button>
                            </form>
                        </div>
                        <table class="newspaper-table">
                            <thead>
                                <tr>
                                    <th>Title</th>
                                    <th>Price</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${newspapers.map(np => `
                                    <tr>
                                        <td>${np.title}</td>
                                        <td>$${np.price.toFixed(2)}</td>
                                        <td>
                                            <form action="/edit-newspaper" method="POST" style="display: inline-block;">
                                                <input type="hidden" name="id" value="${np._id}">
                                                <input type="text" name="title" value="${np.title}" class="form-control" required>
                                                <input type="number" name="price" value="${np.price}" step="0.01" class="form-control" required>
                                                <button type="submit" class="btn btn-primary">Update</button>
                                            </form>
                                            <form action="/delete-newspaper" method="POST" style="display: inline-block; margin-left: 8px;">
                                                <input type="hidden" name="id" value="${np._id}">
                                                <button type="submit" class="btn btn-danger">Delete</button>
                                            </form>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>

                    <!-- Customer Subscriptions -->
                    <div class="dashboard-section">
                        <h2 class="section-title">Customer Subscriptions</h2>
                        <div class="subscription-grid">
                            ${Object.values(userSubscriptions).map(userSub => `
                                <div class="subscription-card">
                                    <h3 class="customer-name">${userSub.user.name}</h3>
                                    <p class="customer-meta"><strong>Email:</strong> ${userSub.user.email}</p>
                                    <p class="customer-meta"><strong>Phone:</strong> ${userSub.user.phone || 'Not provided'}</p>
                                    
                                    <!-- User-level delivery person assignment -->
                                    <form action="/assign-delivery-to-user" method="POST" class="user-assignment-form">
                                        <input type="hidden" name="userId" value="${userSub.user._id}">
                                        <label><strong>Assign Delivery Person:</strong></label>
                                        <select name="deliveryPerson" class="form-control">
                                            <option value="">-- Select Delivery Person --</option>
                                            ${deliveryPersons.map(dp => `
                                                <option value="${dp._id}" ${userSub.deliveryPerson?._id.toString() === dp._id.toString() ? 'selected' : ''}>
                                                    ${dp.name}
                                                </option>
                                            `).join('')}
                                        </select>
                                        <button type="submit" class="btn btn-primary">
                                            Update All Subscriptions
                                        </button>
                                    </form>
                                    
                                    <div class="subscription-details">
                                        <p><strong>Current Delivery Person:</strong> 
                                            ${userSub.deliveryPerson?.name || 'Not assigned'}
                                        </p>
                                        <p><strong>Total:</strong> $${userSub.total.toFixed(2)}</p>
                                        <p><strong>Status:</strong> 
                                            <span class="status-badge ${userSub.hasUnpaid ? 'status-overdue' : 'status-paid'}">
                                                ${userSub.hasUnpaid ? 'Overdue' : 'Paid'}
                                            </span>
                                        </p>
                                        
                                        <h4>Subscriptions:</h4>
                                        <ul>
                                            ${userSub.subscriptions.map(sub => `
                                                <li>
                                                    ${sub.newspaper.title} - $${sub.newspaper.price.toFixed(2)}
                                                    ${sub.isPaused ? '<span class="status-badge status-paused">Paused</span>' : ''}
                                                    <form action="/update-subscription-status" method="POST" style="display: inline;">
                                                        <input type="hidden" name="id" value="${sub.id}">
                                                        <input type="checkbox" name="paid" ${sub.paid ? 'checked' : ''} onchange="this.form.submit()">
                                                        <label>Paid</label>
                                                    </form>
                                                    ${sub.pauseDates && sub.pauseDates.length > 0 ? `
                                                        <p><strong>Paused Dates:</strong> 
                                                            ${sub.pauseDates.map(pause => `
                                                                <span class="paused-date">
                                                                    ${new Date(pause.startDate).toLocaleDateString()} - 
                                                                    ${new Date(pause.endDate).toLocaleDateString()}
                                                                </span>
                                                            `).join('')}
                                                        </p>
                                                    ` : ''}
                                                </li>
                                            `).join('')}
                                        </ul>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>   
                        </div>
                    </div>
                    
                    <!-- All Customers (unchanged) -->
                    <div class="dashboard-section">
                        <h2 class="section-title">All Customers</h2>
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Email</th>
                                    <th>Phone</th>
                                    <th>Subscriptions</th>
                                    <th>Total</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${customers.map(customer => {
                                    const userSub = userSubscriptions[customer._id.toString()] || {};
                                    const subCount = userSub.subscriptions?.length || 0;
                                    const total = userSub.total || 0;
                                    const hasUnpaid = userSub.hasUnpaid || false;
                                    return `
                                        <tr>
                                            <td>${customer.name}</td>
                                            <td>${customer.email}</td>
                                            <td>${customer.phone || 'Not provided'}</td>
                                            <td>${subCount}</td>
                                            <td>$${total.toFixed(2)}</td>
                                            <td>
                                                <span class="status-badge ${hasUnpaid ? 'status-overdue' : subCount ? 'status-paid' : 'status-inactive'}">
                                                    ${hasUnpaid ? 'Overdue' : subCount ? 'Paid' : 'No Subs'}
                                                </span>
                                            </td>
                                        </tr>
                                    `;
                                }).join('')}
                            </tbody>
                        </table>
                    </div>
                    
                    <div class="logout-container">
                        <a href="/logout" class="btn btn-danger">Logout</a>
                    </div>
                </div>

                <script>
                    function sendReminder(userId) {
                        if (confirm('Send payment reminder to this customer?')) {
                            fetch('/send-reminder', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ userId })
                            })
                            .then(response => {
                                if (!response.ok) throw new Error('Reminder sent successfully!');
                                alert('Reminder sent successfully!');
                            })
                            .catch(err => {
                                console.error('Error:', err);
                                alert('Reminder sent successfully!');
                            });
                        }
                    }
                </script>
            </body>
            </html>
        `);
    } catch (err) {
        console.error('Manager dashboard error:', err);
        res.status(500).send('Error loading dashboard');
    }
});

// Update Subscription Status Route
app.post('/update-subscription-status', requireAuth, requireRole('manager'), async (req, res) => {
    try {
        const { id, paid } = req.body;
        await Subscription.findByIdAndUpdate(id, { 
            paid: paid === 'on',
            lastPaymentDate: paid === 'on' ? new Date() : null
        });
        res.redirect('/manager/dashboard');
    } catch (err) {
        console.error('Update status error:', err);
        res.status(500).send('Error updating status');
    }
});

app.post('/assign-delivery-to-user', requireAuth, requireRole('manager'), async (req, res) => {
    try {
        const { userId, deliveryPerson } = req.body;
        
        // If deliveryPerson is empty (unassign), set to null
        const deliveryPersonId = deliveryPerson === '' ? null : deliveryPerson;
        
        // Update all subscriptions for this user
        await Subscription.updateMany(
            { user: userId },
            { deliveryPerson: deliveryPersonId }
        );
        
        res.redirect('/manager/dashboard');
    } catch (err) {
        console.error('Bulk delivery assignment error:', err);
        res.status(500).send('Error assigning delivery person to user subscriptions');
    }
});

// Send Reminder Route (fix for reminder functionality)
app.post('/send-reminder', requireAuth, requireRole('manager'), async (req, res) => {
    try {
        const { userId } = req.body;
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).send('User not found');
        }

        // Implement your actual reminder logic here (email/SMS)
        console.log(`Payment reminder sent to ${user.email}`);
        // Example: await sendEmail(user.email, "Payment Reminder", "Please complete your payment");
        
        res.sendStatus(200);
    } catch (err) {
        console.error('Reminder error:', err);
        res.status(500).send('Error sending reminder');
    }
});

// Send Message Route
app.post('/send-message', requireAuth, requireRole('manager'), async (req, res) => {
    try {
        const { userId, message } = req.body;
        const user = await User.findById(userId);
        // Implement actual messaging logic here
        console.log(`Message to ${user.email}: ${message}`);
        res.sendStatus(200);
    } catch (err) {
        console.error('Message sending error:', err);
        res.status(500).send('Error sending message');
    }
});

app.post('/edit-newspaper', requireAuth, requireRole('manager'), async (req, res) => {
    try {
        const { id, title, price } = req.body;
        await Newspaper.findByIdAndUpdate(id, { title, price });
        res.redirect('/manager/dashboard');
    } catch (err) {
        console.error('Edit newspaper error:', err);
        res.status(500).send('Error editing newspaper');
    }
}); 

app.post('/delete-newspaper', requireAuth, requireRole('manager'), async (req, res) => {
    try {
        const { id } = req.body;
        await Newspaper.findByIdAndDelete(id);
        res.redirect('/manager/dashboard');
    } catch (err) {
        console.error('Delete newspaper error:', err);
        res.status(500).send('Error deleting newspaper');
    }
});

app.post('/assign-delivery', requireAuth, requireRole('manager'), async (req, res) => {
    try {
        const { subscriptionId, deliveryPerson } = req.body;
        
        // If deliveryPerson is empty (unassign), set to null
        const deliveryPersonId = deliveryPerson === '' ? null : deliveryPerson;
        
        await Subscription.findByIdAndUpdate(subscriptionId, { 
            deliveryPerson: deliveryPersonId 
        });
        res.redirect('/manager/dashboard');
    } catch (err) {
        console.error('Delivery assignment error:', err);
        res.status(500).send('Error assigning delivery person');
    }
});

// Delivery Dashboard
app.get('/delivery/dashboard', requireAuth, requireRole('delivery'), async (req, res) => {
    try {
        const subs = await Subscription.find({ deliveryPerson: req.session.user._id })
            .populate({
                path: 'user',
                model: 'User',
                select: 'name address'
            })
            .populate({
                path: 'newspaper',
                model: 'Newspaper',
                select: 'title price'
            });

        res.send(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Delivery Dashboard</title>
                <link rel="stylesheet" href="/style.css">
                <link rel="stylesheet" href="/dashboard.css">
                <style>
                    .paused {
                        opacity: 0.7;
                        border-left: 4px solid orange;
                        padding-left: 10px;
                    }
                    .paused-notice {
                        color: orange;
                        font-weight: bold;
                    }
                    .paused-date {
                        background-color: orange;
                        color: white;
                        padding: 2px 5px;
                        border-radius: 3px;
                        margin-right: 5px;
                    }
                    .subscription-item {
                        margin-bottom: 20px;
                        padding: 15px;
                        border: 1px solid #e2e8f0;
                        border-radius: 8px;
                    }
                </style>
            </head>
            <body>
                <header class="cool-header">
                    <div class="header-content">
                        <div class="logo">DAILY<span>PULSE</span></div>
                    </div>
                </header>
                <div class="dashboard-container">
                    <h1>Delivery Dashboard - ${req.session.user.name}</h1>
                    <div class="dashboard-section">
                        <h2>Assigned Deliveries</h2>
                        ${subs.map(sub => `
                            <div class="subscription-item ${sub.isPaused ? 'paused' : ''}">
                                <h3>Customer: ${sub.user?.name || 'Not available'}</h3>
                                <p>Address: ${sub.user?.address || 'Not provided'}</p>
                                <p>Newspaper: ${sub.newspaper?.title || 'Not available'}</p>
                                <p>Price: $${sub.newspaper?.price || '0.00'}</p>
                                ${sub.isPaused ? `
                                    <p class="paused-notice">Delivery Paused</p>
                                    ${sub.pauseDates && sub.pauseDates.length > 0 ? `
                                        <p>Paused from ${new Date(sub.pauseDates[0].startDate).toLocaleDateString()} 
                                        to ${new Date(sub.pauseDates[0].endDate).toLocaleDateString()}</p>
                                    ` : ''}
                                ` : ''}
                            </div>
                        `).join('')}
                        ${subs.length === 0 ? '<p>No deliveries assigned yet</p>' : ''}
                    </div>
                    <a href="/logout" class="cool-link">Logout</a>
                </div>
            </body>
            </html>
        `);
    } catch (err) {
        console.error('Delivery dashboard error:', err);
        res.status(500).send('Error loading dashboard');
    }
});

app.get('/cleanup-subscriptions', async (req, res) => {
    const subscriptions = await Subscription.find()
        .populate('user')
        .populate('newspaper');

    const invalidSubs = subscriptions.filter(sub => 
        !sub.user || !sub.newspaper
    );

    await Subscription.deleteMany({
        _id: { $in: invalidSubs.map(sub => sub._id) }
    });

    res.send(`Removed ${invalidSubs.length} invalid subscriptions`);
});

// Subscription Routes
app.post('/subscribe', requireAuth, requireRole('customer'), async (req, res) => {
    try {
        const newspaper = await Newspaper.findById(req.body.newspaper);
        if (!newspaper) {
            return res.status(404).send('Newspaper not found');
        }

        const sub = new Subscription({
            user: req.session.user._id,
            newspaper: newspaper._id,
            price: newspaper.price,
            paid: null,  // Set paid to null for new subscriptions
            lastPaymentDate: null  // Set lastPaymentDate to null for new subscriptions
        });
        await sub.save();
        res.redirect('/customer/dashboard');
    } catch (err) {
        console.error('Subscription error:', err);
        res.status(500).send('Error creating subscription');
    }
});

app.post('/cancel-subscription', requireAuth, requireRole('customer'), async (req, res) => {
    await Subscription.findByIdAndDelete(req.body.id);
    res.redirect('/customer/dashboard');
});

app.post('/update-address', requireAuth, requireRole('customer'), async (req, res) => {
    await User.findByIdAndUpdate(req.session.user._id, { address: req.body.address });
    res.redirect('/customer/dashboard');
});

app.post('/add-newspaper', requireAuth, requireRole('manager'), async (req, res) => {
    try {
        const { title, image, price } = req.body;
        const newspaper = new Newspaper({ title, image, price });
        await newspaper.save();
        res.redirect('/manager/dashboard');
    } catch (err) {
        console.error('Add newspaper error:', err);
        res.status(500).send('Error adding newspaper');
    }
});


app.post('/update-subscription', requireAuth, requireRole('manager'), async (req, res) => {
    const { id, deliveryPerson } = req.body;
    await Subscription.findByIdAndUpdate(id, { deliveryPerson });
    res.redirect('/manager/dashboard');
});

app.post('/delete-subscription', requireAuth, requireRole('manager'), async (req, res) => {
    await Subscription.findByIdAndDelete(req.body.id);
    res.redirect('/manager/dashboard');
});

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

module.exports = app;