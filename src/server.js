import express from 'express';
import cors from 'cors';

import 'dotenv/config';

import authRoutes from './routes/authRoutes.js'
import transactionRoutes from './routes/transactionRoutes.js';
import categoryRoutes from './routes/categoryRoutes.js';
import walletRoutes from './routes/walletRoutes.js';

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Main Routes
app.use('/api/auth', authRoutes);
app.use('/api/transaction', transactionRoutes);
app.use('/api/category', categoryRoutes);
app.use('/api/wallet', walletRoutes);

// Healthcheck Route
app.get('/', (req, res) => {
  res.send('Server Quản Lý Tài Chính đang chạy ổn định 🚀');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server đang lắng nghe tại port http://localhost:${PORT}`);
});
