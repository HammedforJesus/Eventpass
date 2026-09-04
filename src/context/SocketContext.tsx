import React, { createContext, useContext, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

interface SocketContextType {
  joinEvent: (eventId: string) => void;
  leaveEvent: (eventId: string) => void;
  onCheckIn: (callback: (data: any) => void) => () => void;
  onAttendanceUpdated: (callback: (data: any) => void) => () => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    // Connect to same origin or configured API URL
    const apiUrl = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
    const socket = io(apiUrl || window.location.origin, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 3,
      timeout: 5000,
    });
    socketRef.current = socket;

    return () => {
      socket.disconnect();
    };
  }, []);

  const joinEvent = (eventId: string) => {
    if (socketRef.current) {
      socketRef.current.emit('join:event', eventId);
    }
  };

  const leaveEvent = (eventId: string) => {
    if (socketRef.current) {
      socketRef.current.emit('leave:event', eventId);
    }
  };

  const onCheckIn = (callback: (data: any) => void) => {
    if (!socketRef.current) return () => {};
    socketRef.current.on('checkin:created', callback);
    return () => {
      socketRef.current?.off('checkin:created', callback);
    };
  };

  const onAttendanceUpdated = (callback: (data: any) => void) => {
    if (!socketRef.current) return () => {};
    socketRef.current.on('attendance:updated', callback);
    return () => {
      socketRef.current?.off('attendance:updated', callback);
    };
  };

  return (
    <SocketContext.Provider value={{ joinEvent, leaveEvent, onCheckIn, onAttendanceUpdated }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};
