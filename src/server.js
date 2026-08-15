import express from 'express';
import cors from 'cors';

import 'dotenv/config';

import authRoutes from './routes/authRoutes.js'
import transactionRoutes from './routes/transactionRoutes.js';

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Main Routes
app.use('/api/auth', authRoutes);
app.use('/api/transactions', transactionRoutes);

// Healthcheck Route
app.get('/', (req, res) => {
  res.send('Server Quản Lý Tài Chính đang chạy ổn định 🚀');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server đang lắng nghe tại port http://localhost:${PORT}`);
});
