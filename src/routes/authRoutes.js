import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../prisma.js';

const router = express.Router();

// Đăng ký tài khoản
router.post('/register', async (req, res) => {
  const { email, password, name } = req.body;
  try {
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) return res.status(400).json({ error: 'Email đã tồn tại' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        // Tự tạo sẵn ví tiền mặc định cho người dùng mới
        wallets: {
          create: [
            { name: 'Tiền mặt', icon: '💵', currentBalance: 0, initialBalance: 0 },
            { name: 'Tài khoản Ngân hàng', icon: '🏦', currentBalance: 0, initialBalance: 0 }
          ]
        }
      }
    });

    res.status(201).json({ message: 'Tạo tài khoản thành công', userId: newUser.id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Đăng nhập lấy Token
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(400).json({ error: 'Email hoặc mật khẩu không đúng' });

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) return res.status(400).json({ error: 'Email hoặc mật khẩu không đúng' });

    const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;