const redis = require('redis');

// Redis client configuration
const redisClient = redis.createClient({
  socket: {
    host: process.env.REDIS_HOST || 'localhost',
    port: Number(process.env.REDIS_PORT) || 6379,
    reconnectStrategy: false,
  },
  password: process.env.REDIS_PASSWORD || undefined,
});

// Event handlers
redisClient.on('error', (err) => {
  console.error('Redis Client Error:', err);
});

redisClient.on('connect', () => {
  console.log('✅ Redis connected successfully');
});

redisClient.on('ready', () => {
  console.log('🔄 Redis client ready');
});

redisClient.on('end', () => {
  console.log('🔌 Redis connection ended');
});

// Connect to Redis
const connectRedis = async () => {
  try {
    if (!redisClient.isOpen) {
      await redisClient.connect();
    }
  } catch (error) {
    console.warn('⚠️ Redis connection failed, continuing without cache:', error.message);
  }
};

// Cache helper functions
const cache = {
  set: async (key, value, expireInSeconds = 3600) => {
    try {
      if (redisClient.isOpen) {
        await redisClient.setEx(key, expireInSeconds, JSON.stringify(value));
      }
    } catch (error) {
      console.warn('Cache set failed:', error.message);
    }
  },

  get: async (key) => {
    try {
      if (redisClient.isOpen) {
        const data = await redisClient.get(key);
        return data ? JSON.parse(data) : null;
      }
      return null;
    } catch (error) {
      console.warn('Cache get failed:', error.message);
      return null;
    }
  },

  del: async (key) => {
    try {
      if (redisClient.isOpen) {
        await redisClient.del(key);
      }
    } catch (error) {
      console.warn('Cache delete failed:', error.message);
    }
  },

  clear: async (pattern = '*') => {
    try {
      if (redisClient.isOpen) {
        const keys = await redisClient.keys(pattern);
        if (keys.length > 0) {
          await redisClient.del(keys);
        }
      }
    } catch (error) {
      console.warn('Cache clear failed:', error.message);
    }
  },

  // Check if Redis is available
  isAvailable: () => redisClient.isOpen,
};

module.exports = {
  redisClient,
  connectRedis,
  cache,
};