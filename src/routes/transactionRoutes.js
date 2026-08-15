import express from 'express';
import prisma from '../prisma.js';
import auth from '../middlewares/auth.js'

const router = express.Router();

// Lấy danh sách giao dịch (có phân trang)
router.get('/', auth, async (req, res) => {
  const userId = req.user.id;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;

  try {
    const transactions = await prisma.transaction.findMany({
      where: { userId },
      orderBy: { date: 'desc' },
      take: limit,
      skip: (page - 1) * limit,
      include: { category: true, wallet: true }
    });
    res.json(transactions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Tạo giao dịch mới (Bảo vệ tính toàn vẹn số dư)
router.post('/', auth, async (req, res) => {
  const userId = req.user.id;
  const { type, amount, categoryId, walletId, sourceWalletId, targetWalletId, date, note } = req.body;

  const numAmount = parseFloat(amount);
  if (!numAmount || numAmount <= 0) {
    return res.status(400).json({ error: 'Số tiền phải lớn hơn 0' });
  }

  try {
    // Sử dụng DB Transaction để khóa và cập nhật đồng thời
    const result = await prisma.$transaction(async (tx) => {
      const newTx = await tx.transaction.create({
        data: {
          userId,
          type,
          amount: numAmount,
          categoryId: type !== 'transfer' ? categoryId : null,
          walletId: type !== 'transfer' ? walletId : null,
          sourceWalletId: type === 'transfer' ? sourceWalletId : null,
          targetWalletId: type === 'transfer' ? targetWalletId : null,
          date: date ? new Date(date) : new Date(),
          note
        }
      });

      if (type === 'expense') {
        await tx.wallet.update({
          where: { id: walletId },
          data: { currentBalance: { decrement: numAmount } }
        });
      } else if (type === 'income') {
        await tx.wallet.update({
          where: { id: walletId },
          data: { currentBalance: { increment: numAmount } }
        });
      } else if (type === 'transfer') {
        await tx.wallet.update({
          where: { id: sourceWalletId },
          data: { currentBalance: { decrement: numAmount } }
        });
        await tx.wallet.update({
          where: { id: targetWalletId },
          data: { currentBalance: { increment: numAmount } }
        });
      }

      return newTx;
    });

    res.status(201).json(result);
  } catch (error) {
    res.status(500).json({ error: 'Lỗi khi xử lý giao dịch: ' + error.message });
  }
});

export default router;
