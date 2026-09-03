import { Server as SocketIOServer, Socket } from 'socket.io';
import { verifyToken } from '../middleware/auth.js';

let ioInstance: SocketIOServer | null = null;

export function initSocketIO(io: SocketIOServer) {
  ioInstance = io;

  io.on('connection', (socket: Socket) => {
    // Optional auth token from handshake query or auth object
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    if (token && typeof token === 'string') {
      const user = verifyToken(token);
      if (user) {
        socket.data.user = user;
      }
    }

    // Join event room for live updates
    socket.on('join:event', (eventId: string) => {
      if (eventId && typeof eventId === 'string') {
        socket.join(`event:${eventId}`);
      }
    });

    socket.on('leave:event', (eventId: string) => {
      if (eventId && typeof eventId === 'string') {
        socket.leave(`event:${eventId}`);
      }
    });

    socket.on('disconnect', () => {
      // Clean disconnect
    });
  });

  return io;
}

export function broadcastCheckIn(eventId: string, payload: {
  guestName: string;
  category: string;
  checkedInAt: string;
  checkedInBy: string;
  stats: {
    totalInvited: number;
    checkedIn: number;
    remaining: number;
    attendanceRate: number;
    capacity: number;
  };
}) {
  if (ioInstance) {
    ioInstance.to(`event:${eventId}`).emit('checkin:created', payload);
  }
}

export function broadcastAttendanceUpdated(eventId: string, stats: any) {
  if (ioInstance) {
    ioInstance.to(`event:${eventId}`).emit('attendance:updated', stats);
  }
}
