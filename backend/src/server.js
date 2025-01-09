// File: src/server.js
const http = require('http');
const { Server } = require('socket.io');
const app = require('./app');
const connectDB = require('./config/database');
const SocketManager = require('./socket/socketManager');

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

const socketManager = new SocketManager(io);
io.use(socketManager.authenticate);
io.on('connection', socketManager.handleConnection);

const PORT = process.env.PORT || 3000;

const startServer = async () => {
  await connectDB();
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
};

startServer();