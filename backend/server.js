const app = require('./app');
const connectDB = require('./config/database');
const { connectRedis } = require('./config/redis');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();
const User = require('./models/User');

const PORT = process.env.PORT || 5000;

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.IO
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Store active users
const activeUsers = new Map();

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log(`🔌 User connected: ${socket.id}`);

  // User joins with their ID
  socket.on('user:join', (userData) => {
    const { userId, userName, userRole } = userData;
    socket.userId = userId;
    socket.userName = userName;
    socket.userRole = userRole;

    activeUsers.set(userId, {
      socketId: socket.id,
      userName,
      userRole,
      lastSeen: new Date(),
    });

    // Broadcast user online status
    socket.broadcast.emit('user:online', { userId, userName, userRole });

    // Send current online users to the new user
    const onlineUsers = Array.from(activeUsers.values()).map(user => ({
      userId: Array.from(activeUsers.entries()).find(([_, u]) => u.socketId === user.socketId)?.[0],
      userName: user.userName,
      userRole: user.userRole,
    }));
    socket.emit('users:online', onlineUsers);

    console.log(`👤 ${userName} (${userRole}) joined. Active users: ${activeUsers.size}`);
  });

  // Handle exam updates
  socket.on('exam:update', (data) => {
    const { examId, action, userId, userName } = data;

    // Broadcast to all users except sender
    socket.broadcast.emit('exam:updated', {
      examId,
      action,
      userId,
      userName,
      timestamp: new Date(),
    });

    console.log(`📝 Exam ${examId} ${action} by ${userName}`);
  });

  // Handle user activity
  socket.on('activity:update', (data) => {
    const { action, details } = data;

    // Broadcast activity to admins
    const adminSockets = Array.from(activeUsers.values())
      .filter(user => user.userRole === 'admin')
      .map(user => user.socketId);

    adminSockets.forEach(socketId => {
      io.to(socketId).emit('activity:new', {
        action,
        details,
        userName: socket.userName,
        timestamp: new Date(),
      });
    });
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    if (socket.userId) {
      const userData = activeUsers.get(socket.userId);
      activeUsers.delete(socket.userId);

      // Broadcast user offline status
      socket.broadcast.emit('user:offline', {
        userId: socket.userId,
        userName: userData?.userName,
      });

      console.log(`🔌 ${userData?.userName || 'User'} disconnected. Active users: ${activeUsers.size}`);
    }
  });
});

// Make io available to routes
app.set('io', io);

const startServer = async () => {
  try {
    console.log('🚀 Starting SecureExam backend server...');

    // Connect to database BEFORE starting the server
    console.log('📡 Connecting to database...');
    await connectDB();

    // Auto-seed if using memory db or empty db
    const userCount = await User.countDocuments();
    if (userCount === 0) {
      console.log('🌱 Auto-seeding default users into empty database...');
      await User.create([
        {
          name: 'Admin User',
          email: 'admin@secureexam.com',
          password: 'AdminPass123!',
          role: 'admin',
          department: 'Administration',
        },
        {
          name: 'Dr. John Faculty',
          email: 'faculty@secureexam.com',
          password: 'FacultyPass123!',
          role: 'faculty',
          department: 'Computer Science',
        },
        {
          name: 'Prof. Jane Reviewer',
          email: 'reviewer@secureexam.com',
          password: 'ReviewerPass123!',
          role: 'reviewer',
          department: 'Quality Assurance',
        },
        {
          name: 'Faculty Member Two',
          email: 'faculty2@secureexam.com',
          password: 'Faculty2Pass123!',
          role: 'faculty',
          department: 'Mathematics',
        }
      ]);
      console.log('✅ Default users seeded automatically!');
    }

    // Connect to Redis for caching
    console.log('🔄 Connecting to Redis...');
    await connectRedis();

    server.listen(PORT, () => {
      console.log(`🔗 API: http://localhost:${PORT}/api`);
      console.log(`🔌 WebSocket: ws://localhost:${PORT}`);
      console.log(`💻 Frontend: http://localhost:3000`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    process.exit(1);
  }
};

startServer();