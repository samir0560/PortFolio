require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const cors = require('cors');
const fs = require('fs');
const cloudinary = require('cloudinary').v2;

const app = express();
const PORT = process.env.PORT || 5000;

// Cloudinary config - supports both custom and standard env variable names
const cloudinaryConfig = {
    cloud_name: process.env.CLOUDINARY_CLOUD || process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_KEY || process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_SECRET || process.env.CLOUDINARY_API_SECRET
};

cloudinary.config(cloudinaryConfig);

if (!cloudinaryConfig.cloud_name || !cloudinaryConfig.api_key || !cloudinaryConfig.api_secret) {
    console.warn('⚠️  Cloudinary configuration incomplete. Please set CLOUDINARY_CLOUD (or CLOUDINARY_CLOUD_NAME), CLOUDINARY_KEY (or CLOUDINARY_API_KEY), and CLOUDINARY_SECRET (or CLOUDINARY_API_SECRET).');
}

// Middleware
// Default allowed origins for local development + common static hosts
const defaultAllowed = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:5500',
    'http://127.0.0.1:5500',
    'http://localhost:5000',
    // Add your deployed frontend origin (fixes the CORS error you saw)
    'https://portfolio-chuv.onrender.com'
];

// Optionally allow additional origins via environment variable FRONTEND_URL (comma separated)
let envOrigins = [];
if (process.env.FRONTEND_URL) {
    envOrigins = process.env.FRONTEND_URL.split(',').map(s => s.trim()).filter(Boolean);
}

const allowedOrigins = new Set([...defaultAllowed, ...envOrigins]);

const corsOptions = {
    origin(origin, callback) {
        // If no origin (e.g. server-to-server requests or curl), allow it
        if (!origin) {
            return callback(null, true);
        }
        if (allowedOrigins.has(origin)) {
            return callback(null, true);
        }
        return callback(new Error(`Not allowed by CORS: ${origin}`));
    },
    credentials: true
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static(path.join(__dirname, '../frontend')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI;
mongoose.connect(MONGODB_URI)
.then(() => console.log('✅ Connected to MongoDB'))
.catch(err => console.error('❌ MongoDB connection error:', err));

// MongoDB Schemas
const AdminSchema = new mongoose.Schema({
    username: { 
        type: String, 
        required: true, 
        unique: true,
        trim: true
    },
    password: { 
        type: String, 
        required: true,
        minlength: 6
    },
}, { 
    timestamps: true 
});

const ProjectSchema = new mongoose.Schema({
    title: { 
        type: String, 
        required: true,
        trim: true,
        maxlength: 100
    },
    category: { 
        type: String, 
        required: true,
        enum: ['web', 'mobile', 'design', 'other'],
        default: 'web'
    },
    description: { 
        type: String, 
        required: true,
        maxlength: 1000
    },
    image: { 
        type: String, 
        required: true
    },
    technologies: [{ type: String }],
    liveUrl: { 
        type: String,
        validate: {
            validator: function(v) {
                return v === '' || /^https?:\/\/.+\..+/.test(v);
            },
            message: 'Please provide a valid URL'
        }
    },
    githubUrl: { 
        type: String,
        validate: {
            validator: function(v) {
                return v === '' || /^https?:\/\/.+\..+/.test(v);
            },
            message: 'Please provide a valid URL'
        }
    },
    datePosted: {
        type: String,
        default: () => new Date().toISOString().split('T')[0]
    },
    featured: { type: Boolean, default: false },
    status: { 
        type: String, 
        enum: ['active', 'inactive'], 
        default: 'active' 
    },
    tags: [{ type: String }],
    views: { type: Number, default: 0 }
}, { 
    timestamps: true 
});

const SkillSchema = new mongoose.Schema({
    name: { 
        type: String, 
        required: true,
        unique: true,
        trim: true
    },
    icon: { 
        type: String, 
        required: true,
        default: 'fas fa-code'
    },
    category: { 
        type: String, 
        enum: ['frontend', 'backend', 'database', 'tool', 'language'],
        default: 'frontend'
    },
    description: { type: String, maxlength: 200 },
    featured: { type: Boolean, default: false }
}, { 
    timestamps: true 
});

const SiteSchema = new mongoose.Schema({
    name: { 
        type: String, 
        required: true,
        trim: true
    },
    url: { 
        type: String, 
        required: true,
        validate: {
            validator: function(v) {
                return /^https?:\/\/.+\..+/.test(v);
            },
            message: 'Please provide a valid URL'
        }
    },
    icon: { 
        type: String, 
        required: true,
        default: 'fas fa-globe'
    },
    description: { type: String, maxlength: 200 },
    category: { 
        type: String, 
        enum: ['social', 'professional', 'portfolio'],
        default: 'social'
    },
    displayOrder: { type: Number, default: 0 },
    active: { type: Boolean, default: true }
}, { 
    timestamps: true 
});

const MessageSchema = new mongoose.Schema({
    name: { 
        type: String, 
        required: true,
        trim: true,
        maxlength: 50
    },
    email: { 
        type: String, 
        required: true,
        trim: true,
        lowercase: true,
        validate: {
            validator: function(v) {
                return /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(v);
            },
            message: 'Please provide a valid email'
        }
    },
    subject: { 
        type: String, 
        required: true,
        trim: true,
        maxlength: 100
    },
    message: { 
        type: String, 
        required: true,
        maxlength: 1000
    },
    read: { type: Boolean, default: false },
    ipAddress: String
}, { 
    timestamps: true 
});

const VisitorSchema = new mongoose.Schema({
    date: { type: String, required: true, unique: true },
    count: { type: Number, default: 1 },
    ipAddresses: [{ type: String }]
}, { 
    timestamps: true 
});

const ActivitySchema = new mongoose.Schema({
    activity: { type: String, required: true },
    details: { type: String, required: true },
    type: { 
        type: String, 
        enum: ['login', 'project', 'skill', 'site', 'message', 'settings'],
        default: 'project'
    }
}, { 
    timestamps: true 
});

const SettingsSchema = new mongoose.Schema({
    siteTitle: { type: String, default: 'Samir Chaudhary Portfolio' },
    siteDescription: { type: String, default: 'Full Stack Developer & UI/UX Designer' },
    aboutName: { type: String, default: 'Samir Chaudhary' },
    aboutDescription: { 
        type: String, 
        default: 'I\'m a passionate full-stack developer with expertise in modern web technologies...' 
    },
    aboutImage: { type: String, default: '' },
    contactLocation: { type: String, default: 'Kathmandu, Nepal' },
    contactEmail: { type: String, default: 'samir@example.com' },
    contactPhone: { type: String, default: '+977 9800000000' },
    contactWebsite: { type: String, default: 'www.samirportfolio.com' },
    footerTitle: { type: String, default: 'Samir Chaudhary' },
    footerDescription: { type: String, default: 'Creating digital experiences that inspire and engage users.' },
    copyrightName: { type: String, default: 'Samir Chaudhary' },
    socialLinks: {
        github: { type: String, default: '#' },
        linkedin: { type: String, default: '#' },
        twitter: { type: String, default: '#' },
        dribbble: { type: String, default: '#' }
    },
    themeColor: { type: String, default: '#3498db' },
    secondaryColor: { type: String, default: '#2c3e50' }
}, { 
    timestamps: true 
});

// MongoDB Models
const Admin = mongoose.model('Admin', AdminSchema);
const Project = mongoose.model('Project', ProjectSchema);
const Skill = mongoose.model('Skill', SkillSchema);
const Site = mongoose.model('Site', SiteSchema);
const Message = mongoose.model('Message', MessageSchema);
const Visitor = mongoose.model('Visitor', VisitorSchema);
const Activity = mongoose.model('Activity', ActivitySchema);
const Settings = mongoose.model('Settings', SettingsSchema);

// Multer configuration - use memoryStorage so we can upload buffers to Cloudinary
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    fileFilter: (req, file, cb) => {
        if (file.mimetype && file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed!'), false);
        }
    },
    limits: {
        fileSize: 5 * 1024 * 1024
    }
});

// Session management
const sessions = new Map();

// Authentication middleware
const authenticateAdmin = (req, res, next) => {
    const sessionId = req.headers['authorization'];
    
    if (!sessionId || !sessions.has(sessionId)) {
        return res.status(401).json({ 
            success: false,
            error: 'Authentication required' 
        });
    }
    
    req.admin = sessions.get(sessionId);
    next();
};

// Utility functions
const getClientIP = (req) => {
    return req.ip || 
           req.connection?.remoteAddress || 
           req.socket?.remoteAddress ||
           (req.connection?.socket ? req.connection.socket.remoteAddress : null);
};

const logActivity = async (activity, details, type = 'project') => {
    try {
        await Activity.create({ activity, details, type });
    } catch (error) {
        console.error('Error logging activity:', error);
    }
};

// Helper: upload buffer to Cloudinary
const uploadBufferToCloudinary = (buffer, folder = 'portfolio') => {
    return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            { folder },
            (error, result) => {
                if (error) return reject(error);
                resolve(result); // result.secure_url, result.public_id, etc.
            }
        );
        stream.end(buffer);
    });
};

// Helper: extract Cloudinary public_id from a Cloudinary URL
const getCloudinaryPublicIdFromUrl = (url) => {
    try {
        // Match portion after /upload/ and strip version and extension
        // Example URL:
        // https://res.cloudinary.com/<cloud>/image/upload/v1610000000/folder/subfolder/public_id.jpg
        const m = url.match(/\/upload\/(?:v\d+\/)?(.+)\.[a-zA-Z0-9]+(?:\?.*)?$/);
        if (m && m[1]) {
            return m[1]; // "folder/subfolder/public_id"
        }
        return null;
    } catch (e) {
        return null;
    }
};

// Initialize default data
const initializeData = async () => {
    try {
        const adminExists = await Admin.findOne({ username: 'admin' });
        if (!adminExists) {
            const hashedPassword = await bcrypt.hash('password123', 12);
            await Admin.create({
                username: 'admin',
                password: hashedPassword
            });
            console.log('✅ Default admin user created');
        }

        const settingsExist = await Settings.findOne();
        if (!settingsExist) {
            await Settings.create({});
            console.log('✅ Default settings created');
        }

        // REMOVED DEFAULT SKILLS - Admin will add skills manually
        console.log('🎉 Portfolio initialization complete');
    } catch (error) {
        console.error('❌ Error initializing data:', error);
    }
};

// Serve HTML files with explicit routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

app.get('/admin-login.html', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/admin-login.html'));
});

app.get('/admin-dashboard.html', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/admin-dashboard.html'));
});

app.get('/projects.html', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/projects.html'));
});

// API Routes - Portfolio Data
app.get('/api/portfolio-data', async (req, res) => {
    try {
        const [settings, projects, skills, sites, analytics] = await Promise.all([
            Settings.findOne(),
            Project.find({ status: 'active' })
                .sort({ featured: -1, createdAt: -1 })
                .limit(6),
            Skill.find().sort({ featured: -1, createdAt: -1 }), // Get all skills added by admin
            Site.find({ active: true }).sort({ displayOrder: 1 }),
            Visitor.aggregate([
                { $group: { _id: null, total: { $sum: '$count' }, unique: { $sum: { $size: '$ipAddresses' } } } }
            ])
        ]);

        res.json({
            success: true,
            data: {
                settings: settings || {},
                projects: projects || [],
                skills: skills || [], // This will only show admin-added skills
                sites: sites || [],
                analytics: {
                    totalVisitors: analytics[0]?.total || 0,
                    uniqueVisitors: analytics[0]?.unique || 0
                }
            }
        });
    } catch (error) {
        console.error('Error fetching portfolio data:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to fetch portfolio data' 
        });
    }
});

// Visitor Tracking
app.post('/api/visitors/track', async (req, res) => {
    try {
        const today = new Date().toDateString();
        const clientIP = getClientIP(req);
        
        // DEVELOPMENT MODE: Set to true to count every reload, false for production (unique IPs only)
        const DEVELOPMENT_MODE = true;
        
        let visitor = await Visitor.findOne({ date: today });
        
        if (visitor) {
            if (DEVELOPMENT_MODE) {
                // Count every reload in development mode
                visitor.count += 1;
                if (clientIP && !visitor.ipAddresses.includes(clientIP)) {
                    visitor.ipAddresses.push(clientIP);
                }
                await visitor.save();
                console.log(`✅ Visitor tracked (DEV MODE): Count = ${visitor.count}, IP = ${clientIP}`);
            } else {
                // Production mode: Only count unique IPs per day
                if (clientIP && !visitor.ipAddresses.includes(clientIP)) {
                    visitor.ipAddresses.push(clientIP);
                    visitor.count += 1;
                    await visitor.save();
                    console.log(`✅ New unique visitor: Count = ${visitor.count}, IP = ${clientIP}`);
                } else {
                    console.log(`ℹ️ Returning visitor (not counted): IP = ${clientIP}`);
                }
            }
        } else {
            visitor = await Visitor.create({
                date: today,
                count: 1,
                ipAddresses: clientIP ? [clientIP] : []
            });
            console.log(`🎉 First visitor of the day! Count = 1, IP = ${clientIP}`);
        }
        
        res.json({ 
            success: true, 
            count: visitor.count,
            message: 'Visitor tracked successfully'
        });
    } catch (error) {
        console.error('❌ Error tracking visitor:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to track visitor' 
        });
    }
});

// Admin Authentication Routes
app.post('/api/admin/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        const admin = await Admin.findOne({ username });
        if (!admin) {
            return res.status(401).json({ 
                success: false,
                error: 'Invalid credentials' 
            });
        }
        
        const isPasswordValid = await bcrypt.compare(password, admin.password);
        if (!isPasswordValid) {
            return res.status(401).json({ 
                success: false,
                error: 'Invalid credentials' 
            });
        }
        
        const sessionId = require('crypto').randomBytes(16).toString('hex');
        sessions.set(sessionId, { 
            id: admin._id, 
            username: admin.username 
        });
        
        setTimeout(() => {
            sessions.delete(sessionId);
        }, 24 * 60 * 60 * 1000);
        
        await logActivity('Admin Login', `Admin ${username} logged in`, 'login');
        
        res.json({
            success: true,
            sessionId,
            admin: { username: admin.username }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ 
            success: false,
            error: 'Login failed' 
        });
    }
});

app.get('/api/admin/verify', authenticateAdmin, (req, res) => {
    res.json({ 
        success: true, 
        valid: true, 
        admin: req.admin 
    });
});

app.post('/api/admin/logout', authenticateAdmin, (req, res) => {
    const sessionId = req.headers['authorization'];
    sessions.delete(sessionId);
    res.json({ 
        success: true, 
        message: 'Logged out successfully' 
    });
});

app.put('/api/admin/change-password', authenticateAdmin, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        
        if (!newPassword || newPassword.length < 6) {
            return res.status(400).json({ 
                success: false,
                error: 'Password must be at least 6 characters long' 
            });
        }
        
        const admin = await Admin.findById(req.admin.id);
        if (!admin) {
            return res.status(404).json({ 
                success: false,
                error: 'Admin not found' 
            });
        }
        
        const isCurrentPasswordValid = await bcrypt.compare(currentPassword, admin.password);
        if (!isCurrentPasswordValid) {
            return res.status(400).json({ 
                success: false,
                error: 'Current password is incorrect' 
            });
        }
        
        const hashedNewPassword = await bcrypt.hash(newPassword, 12);
        admin.password = hashedNewPassword;
        await admin.save();
        
        await logActivity('Password Changed', 'Admin password updated', 'settings');
        
        res.json({ 
            success: true, 
            message: 'Password updated successfully' 
        });
    } catch (error) {
        console.error('Password change error:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to change password' 
        });
    }
});

// Settings Routes
app.get('/api/settings', async (req, res) => {
    try {
        let settings = await Settings.findOne();
        if (!settings) {
            settings = await Settings.create({});
        }
        res.json({ 
            success: true, 
            data: settings 
        });
    } catch (error) {
        console.error('Error fetching settings:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to fetch settings' 
        });
    }
});

app.put('/api/settings', authenticateAdmin, upload.single('aboutImage'), async (req, res) => {
    try {
        const updates = req.body;

        // Handle profile image upload via Cloudinary if file provided
        if (req.file && req.file.buffer) {
            try {
                const result = await uploadBufferToCloudinary(req.file.buffer, 'portfolio/profiles');
                updates.aboutImage = result.secure_url;
            } catch (uErr) {
                console.error('Cloudinary upload failed for settings image:', uErr);
                return res.status(500).json({ success: false, error: 'Image upload failed' });
            }
        }

        // Handle social links
        if (updates.socialLinks) {
            try {
                updates.socialLinks = JSON.parse(updates.socialLinks);
            } catch (e) {
                // If not JSON, keep as is
            }
        }

        let settings = await Settings.findOne();
        if (!settings) {
            settings = await Settings.create(updates);
        } else {
            // If there's a new image and old image exists, delete old image (local or cloud)
            if (req.file && settings.aboutImage) {
                // Old local upload path like "/uploads/filename.jpg"
                if (settings.aboutImage.startsWith('/uploads/') || settings.aboutImage.startsWith('uploads/')) {
                    const oldImagePath = path.join(__dirname, settings.aboutImage.replace(/^\//, ''));
                    try {
                        if (fs.existsSync(oldImagePath)) {
                            fs.unlinkSync(oldImagePath);
                        }
                    } catch (e) {
                        console.warn('Could not delete old local settings image:', e.message);
                    }
                } else if (settings.aboutImage.includes('res.cloudinary.com')) {
                    // Attempt to delete from Cloudinary
                    const publicId = getCloudinaryPublicIdFromUrl(settings.aboutImage);
                    if (publicId) {
                        try {
                            await cloudinary.uploader.destroy(publicId);
                        } catch (e) {
                            console.warn('Could not delete old cloudinary settings image:', e.message);
                        }
                    }
                }
            }

            settings = await Settings.findOneAndUpdate(
                {},
                { $set: updates },
                { new: true }
            );
        }

        await logActivity('Settings Updated', 'Website settings updated', 'settings');

        res.json({ 
            success: true, 
            data: settings 
        });
    } catch (error) {
        console.error('Error updating settings:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to update settings' 
        });
    }
});

// Projects Routes
app.get('/api/projects', async (req, res) => {
    try {
        const projects = await Project.find({ status: 'active' })
            .sort({ featured: -1, createdAt: -1 });
        res.json({ 
            success: true, 
            data: projects 
        });
    } catch (error) {
        console.error('Error fetching projects:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to fetch projects' 
        });
    }
});

app.post('/api/projects', authenticateAdmin, upload.single('image'), async (req, res) => {
    try {
        const { title, category, description, technologies, liveUrl, githubUrl, featured } = req.body;
        
        let imageUrl;
        if (req.file && req.file.buffer) {
            try {
                const result = await uploadBufferToCloudinary(req.file.buffer, 'portfolio/projects');
                imageUrl = result.secure_url;
            } catch (uErr) {
                console.error('Cloudinary upload failed for project image:', uErr);
                return res.status(500).json({ success: false, error: 'Image upload failed' });
            }
        } else if (req.body.imageUrl) {
            imageUrl = req.body.imageUrl;
        } else {
            return res.status(400).json({ 
                success: false,
                error: 'Image is required' 
            });
        }
        
        let techArray = [];
        if (technologies) {
            try {
                const parsedTech = JSON.parse(technologies);
                if (Array.isArray(parsedTech)) {
                    // Accept any technology strings as provided by admin
                    techArray = parsedTech.map(tech => {
                        if (typeof tech === 'string') {
                            return tech.trim();
                        } else if (typeof tech === 'object' && tech.name) {
                            return tech.name.trim();
                        }
                        return String(tech).trim();
                    }).filter(tech => tech);
                }
            } catch (e) {
                // If not valid JSON, treat as comma-separated string
                techArray = technologies.split(',').map(tech => tech.trim()).filter(tech => tech);
            }
        }
        
        const project = await Project.create({
            title,
            category,
            description,
            image: imageUrl,
            technologies: techArray,
            liveUrl,
            githubUrl,
            featured: featured === 'true'
        });
        
        await logActivity('Project Created', `Project "${title}" created`, 'project');
        
        res.status(201).json({ 
            success: true, 
            data: project 
        });
    } catch (error) {
        console.error('Error creating project:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to create project' 
        });
    }
});

app.put('/api/projects/:id', authenticateAdmin, upload.single('image'), async (req, res) => {
    try {
        const { title, category, description, technologies, liveUrl, githubUrl, featured } = req.body;
        
        const project = await Project.findById(req.params.id);
        if (!project) {
            return res.status(404).json({ 
                success: false,
                error: 'Project not found' 
            });
        }
        
        let imageUrl = project.image;
        // If a new file uploaded, upload to Cloudinary and remove old (local or cloud)
        if (req.file && req.file.buffer) {
            // delete old image if exists
            if (project.image) {
                if (project.image.startsWith('/uploads/') || project.image.startsWith('uploads/')) {
                    const oldImagePath = path.join(__dirname, project.image.replace(/^\//, ''));
                    try {
                        if (fs.existsSync(oldImagePath)) {
                            fs.unlinkSync(oldImagePath);
                        }
                    } catch (e) {
                        console.warn('Could not delete old local project image:', e.message);
                    }
                } else if (project.image.includes('res.cloudinary.com')) {
                    const publicId = getCloudinaryPublicIdFromUrl(project.image);
                    if (publicId) {
                        try {
                            await cloudinary.uploader.destroy(publicId);
                        } catch (e) {
                            console.warn('Could not delete old cloudinary project image:', e.message);
                        }
                    }
                }
            }

            // upload new one
            try {
                const result = await uploadBufferToCloudinary(req.file.buffer, 'portfolio/projects');
                imageUrl = result.secure_url;
            } catch (uErr) {
                console.error('Cloudinary upload failed for project update image:', uErr);
                return res.status(500).json({ success: false, error: 'Image upload failed' });
            }
        } else if (req.body.imageUrl && req.body.imageUrl !== project.image) {
            // If admin provided a different external URL, attempt to delete old if it was cloud/local
            if (project.image) {
                if (project.image.startsWith('/uploads/') || project.image.startsWith('uploads/')) {
                    const oldImagePath = path.join(__dirname, project.image.replace(/^\//, ''));
                    try {
                        if (fs.existsSync(oldImagePath)) {
                            fs.unlinkSync(oldImagePath);
                        }
                    } catch (e) {
                        console.warn('Could not delete old local project image:', e.message);
                    }
                } else if (project.image.includes('res.cloudinary.com')) {
                    const publicId = getCloudinaryPublicIdFromUrl(project.image);
                    if (publicId) {
                        try {
                            await cloudinary.uploader.destroy(publicId);
                        } catch (e) {
                            console.warn('Could not delete old cloudinary project image:', e.message);
                        }
                    }
                }
            }
            imageUrl = req.body.imageUrl;
        }
        
        let techArray = project.technologies;
        if (technologies) {
            try {
                const parsedTech = JSON.parse(technologies);
                if (Array.isArray(parsedTech)) {
                    // Accept any technology strings as provided by admin
                    techArray = parsedTech.map(tech => {
                        if (typeof tech === 'string') {
                            return tech.trim();
                        } else if (typeof tech === 'object' && tech.name) {
                            return tech.name.trim();
                        }
                        return String(tech).trim();
                    }).filter(tech => tech);
                }
            } catch (e) {
                // If not valid JSON, treat as comma-separated string
                techArray = technologies.split(',').map(tech => tech.trim()).filter(tech => tech);
            }
        }
        
        const updatedProject = await Project.findByIdAndUpdate(
            req.params.id,
            {
                title,
                category,
                description,
                image: imageUrl,
                technologies: techArray,
                liveUrl,
                githubUrl,
                featured: featured === 'true'
            },
            { new: true }
        );
        
        await logActivity('Project Updated', `Project "${title}" updated`, 'project');
        
        res.json({ 
            success: true, 
            data: updatedProject 
        });
    } catch (error) {
        console.error('Error updating project:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to update project' 
        });
    }
});

app.delete('/api/projects/:id', authenticateAdmin, async (req, res) => {
    try {
        const project = await Project.findById(req.params.id);
        if (!project) {
            return res.status(404).json({ 
                success: false,
                error: 'Project not found' 
            });
        }
        
        // Delete project image file from uploads folder OR cloudinary
        if (project.image) {
            if (project.image.startsWith('/uploads/') || project.image.startsWith('uploads/')) {
                const imagePath = path.join(__dirname, project.image.replace(/^\//, ''));
                try {
                    if (fs.existsSync(imagePath)) {
                        fs.unlinkSync(imagePath);
                        console.log(`✅ Deleted project image: ${imagePath}`);
                    } else {
                        console.log(`⚠️ Image file not found: ${imagePath}`);
                    }
                } catch (fileError) {
                    console.error(`❌ Error deleting image file: ${fileError.message}`);
                    // Continue with project deletion even if file deletion fails
                }
            } else if (project.image.includes('res.cloudinary.com')) {
                const publicId = getCloudinaryPublicIdFromUrl(project.image);
                if (publicId) {
                    try {
                        await cloudinary.uploader.destroy(publicId);
                        console.log(`✅ Deleted cloudinary image with public_id: ${publicId}`);
                    } catch (e) {
                        console.warn('Could not delete cloudinary image:', e.message);
                    }
                } else {
                    console.log('⚠️ Could not determine cloudinary public_id from URL');
                }
            } else {
                // If not local or cloudinary (external url), attempt to remove any local file with same filename (best-effort)
                const imageFileName = project.image.split('/').pop();
                const imagePath = path.join(__dirname, 'uploads', imageFileName);
                try {
                    if (fs.existsSync(imagePath)) {
                        fs.unlinkSync(imagePath);
                        console.log(`✅ Deleted fallback image: ${imagePath}`);
                    }
                } catch (e) {
                    // ignore
                }
            }
        }
        
        // Delete the project from database
        await Project.findByIdAndDelete(req.params.id);
        
        await logActivity('Project Deleted', `Project "${project.title}" deleted`, 'project');
        
        console.log(`✅ Project "${project.title}" deleted from system`);
        
        res.json({ 
            success: true, 
            message: 'Project deleted successfully' 
        });
    } catch (error) {
        console.error('Error deleting project:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to delete project' 
        });
    }
});

// Skills Routes - Only admin can manage skills
app.get('/api/skills', async (req, res) => {
    try {
        const skills = await Skill.find().sort({ featured: -1, createdAt: -1 });
        res.json({ 
            success: true, 
            data: skills 
        });
    } catch (error) {
        console.error('Error fetching skills:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to fetch skills' 
        });
    }
});

app.post('/api/skills', authenticateAdmin, async (req, res) => {
    try {
        const { name, icon, category, description, featured } = req.body;
        
        const skill = await Skill.create({
            name,
            icon,
            category,
            description,
            featured: featured === 'true' || featured === true
        });
        
        await logActivity('Skill Created', `Skill "${name}" created`, 'skill');
        
        res.status(201).json({ 
            success: true, 
            data: skill 
        });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ 
                success: false,
                error: 'Skill with this name already exists' 
            });
        }
        console.error('Error creating skill:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to create skill' 
        });
    }
});

app.put('/api/skills/:id', authenticateAdmin, async (req, res) => {
    try {
        const { name, icon, category, description, featured } = req.body;
        
        const skill = await Skill.findByIdAndUpdate(
            req.params.id,
            {
                name,
                icon,
                category,
                description,
                featured: featured === 'true' || featured === true
            },
            { new: true }
        );
        
        if (!skill) {
            return res.status(404).json({ 
                success: false,
                error: 'Skill not found' 
            });
        }
        
        await logActivity('Skill Updated', `Skill "${name}" updated`, 'skill');
        
        res.json({ 
            success: true, 
            data: skill 
        });
    } catch (error) {
        console.error('Error updating skill:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to update skill' 
        });
    }
});

app.delete('/api/skills/:id', authenticateAdmin, async (req, res) => {
    try {
        const skill = await Skill.findByIdAndDelete(req.params.id);
        if (!skill) {
            return res.status(404).json({ 
                success: false,
                error: 'Skill not found' 
            });
        }
        
        await logActivity('Skill Deleted', `Skill "${skill.name}" deleted`, 'skill');
        
        res.json({ 
            success: true, 
            message: 'Skill deleted successfully' 
        });
    } catch (error) {
        console.error('Error deleting skill:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to delete skill' 
        });
    }
});

// Sites Routes
app.get('/api/sites', async (req, res) => {
    try {
        const sites = await Site.find({ active: true }).sort({ displayOrder: 1 });
        res.json({ 
            success: true, 
            data: sites 
        });
    } catch (error) {
        console.error('Error fetching sites:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to fetch sites' 
        });
    }
});

app.post('/api/sites', authenticateAdmin, async (req, res) => {
    try {
        const { name, url, icon, description, category, displayOrder } = req.body;
        
        const site = await Site.create({
            name,
            url,
            icon: icon || 'fas fa-globe',
            description,
            category,
            displayOrder: parseInt(displayOrder) || 0
        });
        
        await logActivity('Site Created', `Site "${name}" created`, 'site');
        
        res.status(201).json({ 
            success: true, 
            data: site 
        });
    } catch (error) {
        console.error('Error creating site:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to create site' 
        });
    }
});

app.put('/api/sites/:id', authenticateAdmin, async (req, res) => {
    try {
        const { name, url, icon, description, category, displayOrder, active } = req.body;
        
        const site = await Site.findByIdAndUpdate(
            req.params.id,
            {
                name,
                url,
                icon: icon || 'fas fa-globe',
                description,
                category,
                displayOrder: parseInt(displayOrder) || 0,
                active: active !== 'false'
            },
            { new: true }
        );
        
        if (!site) {
            return res.status(404).json({ 
                success: false,
                error: 'Site not found' 
            });
        }
        
        await logActivity('Site Updated', `Site "${name}" updated`, 'site');
        
        res.json({ 
            success: true, 
            data: site 
        });
    } catch (error) {
        console.error('Error updating site:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to update site' 
        });
    }
});

app.delete('/api/sites/:id', authenticateAdmin, async (req, res) => {
    try {
        const site = await Site.findByIdAndDelete(req.params.id);
        if (!site) {
            return res.status(404).json({ 
                success: false,
                error: 'Site not found' 
            });
        }
        
        await logActivity('Site Deleted', `Site "${site.name}" deleted`, 'site');
        
        res.json({ 
            success: true, 
            message: 'Site deleted successfully' 
        });
    } catch (error) {
        console.error('Error deleting site:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to delete site' 
        });
    }
});

// Messages Routes
app.post('/api/messages', async (req, res) => {
    try {
        const { name, email, subject, message } = req.body;
        const ipAddress = getClientIP(req);
        
        const newMessage = await Message.create({
            name,
            email,
            subject,
            message,
            ipAddress
        });
        
        await logActivity('New Message', `Message from ${name}`, 'message');
        
        res.status(201).json({ 
            success: true, 
            message: 'Message sent successfully' 
        });
    } catch (error) {
        console.error('Error submitting message:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to send message' 
        });
    }
});

app.get('/api/messages', authenticateAdmin, async (req, res) => {
    try {
        const messages = await Message.find().sort({ createdAt: -1 });
        res.json({ 
            success: true, 
            data: messages 
        });
    } catch (error) {
        console.error('Error fetching messages:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to fetch messages' 
        });
    }
});

app.delete('/api/messages/:id', authenticateAdmin, async (req, res) => {
    try {
        const message = await Message.findById(req.params.id);
        if (!message) {
            return res.status(404).json({ 
                success: false,
                error: 'Message not found' 
            });
        }
        
        await Message.findByIdAndDelete(req.params.id);
        
        await logActivity('Message Deleted', `Message from ${message.name} deleted`, 'message');
        
        res.json({ 
            success: true, 
            message: 'Message deleted successfully' 
        });
    } catch (error) {
        console.error('Error deleting message:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to delete message' 
        });
    }
});

// Dashboard Routes - Real-time statistics
app.get('/api/dashboard/stats', authenticateAdmin, async (req, res) => {
    try {
        // Get all visitor records
        const allVisitors = await Visitor.find({}).sort({ createdAt: -1 });
        
        // Calculate total visitors (sum of all counts)
        const totalVisitors = allVisitors.reduce((sum, v) => sum + v.count, 0);
        
        // Calculate unique visitors (count unique IPs across all days)
        const allIPs = new Set();
        allVisitors.forEach(v => {
            v.ipAddresses.forEach(ip => allIPs.add(ip));
        });
        const uniqueVisitors = allIPs.size;
        
        // Get today's visitors
        const todayVisitors = await Visitor.findOne({ date: new Date().toDateString() }).sort({ createdAt: -1 });
        
        // Get other stats
        const [totalProjects, totalSkills, totalSites, unreadMessages] = await Promise.all([
            Project.countDocuments(),
            Skill.countDocuments(),
            Site.countDocuments({ active: true }),
            Message.countDocuments({ read: false })
        ]);

        const stats = {
            totalProjects,
            totalSkills,
            totalSites,
            unreadMessages,
            totalVisitors,
            uniqueVisitors,
            todayVisitors: todayVisitors?.count || 0
        };
        
        console.log('📊 Dashboard stats:', stats);
        
        res.json({ 
            success: true, 
            data: stats 
        });
    } catch (error) {
        console.error('❌ Error fetching dashboard stats:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to fetch dashboard statistics' 
        });
    }
});

// Health Check
app.get('/api/health', (req, res) => {
    res.json({ 
        success: true, 
        message: 'Server is running',
        timestamp: new Date().toISOString()
    });
});

// Error handling
app.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ 
                success: false,
                error: 'File too large. Maximum size is 5MB.' 
            });
        }
    }
    
    console.error('Server error:', error);
    res.status(500).json({ 
        success: false,
        error: 'Internal server error' 
    });
});

// 404 handler for undefined API routes
app.use('/api', (req, res, next) => {
    if (!res.headersSent) {
        res.status(404).json({ 
            success: false,
            error: 'API endpoint not found' 
        });
    }
});

// Serve static files for all other routes (without *)
app.use((req, res, next) => {
    // Check if the request is for a file that exists
    const filePath = path.join(__dirname, '../frontend', req.path);
    if (fs.existsSync(filePath) && !req.path.startsWith('/api')) {
        res.sendFile(filePath);
    } else if (!req.path.startsWith('/api')) {
        // If file doesn't exist and it's not an API route, serve index.html
        res.sendFile(path.join(__dirname, '../frontend/index.html'));
    } else {
        next();
    }
});

// Start server
app.listen(PORT, async () => {
    await initializeData();
    console.log(`🚀 Server is running on port ${PORT}`);
    console.log(`📍 Homepage: http://localhost:${PORT}`);
});
