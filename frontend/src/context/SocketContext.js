/* eslint-disable react-hooks/exhaustive-deps */
import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext();

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const { user, token } = useAuth();

  useEffect(() => {
    if (user && token) {
      // Initialize socket connection
      const newSocket = io(process.env.REACT_APP_API_URL || 'http://localhost:5000', {
        auth: {
          token,
        },
        transports: ['websocket', 'polling'],
      });

      // Connection events
      newSocket.on('connect', () => {
        console.log('🔌 Connected to server');

        // Join with user data
        newSocket.emit('user:join', {
          userId: user._id,
          userName: user.name,
          userRole: user.role,
        });
      });

      newSocket.on('disconnect', () => {
        console.log('🔌 Disconnected from server');
      });

      // User presence events
      newSocket.on('users:online', (users) => {
        setOnlineUsers(users);
      });

      newSocket.on('user:online', (userData) => {
        setOnlineUsers(prev => [...prev, userData]);
      });

      newSocket.on('user:offline', (userData) => {
        setOnlineUsers(prev => prev.filter(u => u.userId !== userData.userId));
      });

      // Exam events
      newSocket.on('exam:updated', (data) => {
        const notification = {
          id: Date.now(),
          type: 'exam',
          message: `Exam ${data.examId} was ${data.action} by ${data.userName}`,
          timestamp: data.timestamp,
        };
        setNotifications(prev => [notification, ...prev].slice(0, 10)); // Keep last 10
      });

      // Activity events (for admins)
      newSocket.on('activity:new', (data) => {
        if (user.role === 'admin') {
          const notification = {
            id: Date.now(),
            type: 'activity',
            message: `${data.userName}: ${data.action}`,
            details: data.details,
            timestamp: data.timestamp,
          };
          setNotifications(prev => [notification, ...prev].slice(0, 10));
        }
      });

      setSocket(newSocket);

      return () => {
        newSocket.close();
      };
    } else {
      // Clean up if user logs out
      if (socket) {
        socket.close();
        setSocket(null);
        setOnlineUsers([]);
        setNotifications([]);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, token]);

  const emitExamUpdate = (examId, action) => {
    if (socket && user) {
      socket.emit('exam:update', {
        examId,
        action,
        userId: user._id,
        userName: user.name,
      });
    }
  };

  const emitActivity = (action, details) => {
    if (socket && user) {
      socket.emit('activity:update', {
        action,
        details,
      });
    }
  };

  const clearNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const value = {
    socket,
    onlineUsers,
    notifications,
    emitExamUpdate,
    emitActivity,
    clearNotification,
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};