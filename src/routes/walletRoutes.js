import express from 'express';
import prisma from '../prisma.js';
import auth from '../middlewares/auth.js';

const router = express.Router();

// 1. Lấy danh sách tất cả ví tiền của người dùng
router.get('/', auth, async (req, res) => {
  const userId = req.user.id;

  try {
    const wallets = await prisma.wallet.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });

    res.json(wallets);
  } catch (error) {
    res.status(500).json({ error: 'Lỗi khi lấy danh sách ví: ' + error.message });
  }
});

// 2. Lấy chi tiết một ví theo ID
router.get('/:id', auth, async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;

  try {
    const wallet = await prisma.wallet.findFirst({
      where: { id, userId }
    });

    if (!wallet) {
      return res.status(404).json({ error: 'Không tìm thấy ví tiền' });
    }

    res.json(wallet);
  } catch (error) {
    res.status(500).json({ error: 'Lỗi khi lấy thông tin ví: ' + error.message });
  }
});

// 3. Tạo ví mới
router.post('/', auth, async (req, res) => {
  const userId = req.user.id;
  const { name, icon, currency, initialBalance, includeInTotal } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Tên ví là bắt buộc' });
  }

  const numInitialBalance = parseFloat(initialBalance) || 0;

  try {
    const newWallet = await prisma.wallet.create({
      data: {
        userId,
        name,
        icon: icon || null,
        currency: currency || 'VND',
        initialBalance: numInitialBalance,
        currentBalance: numInitialBalance, // Số dư hiện tại ban đầu bằng số dư khởi tạo
        includeInTotal: includeInTotal !== undefined ? Boolean(includeInTotal) : true
      }
    });

    res.status(201).json(newWallet);
  } catch (error) {
    res.status(500).json({ error: 'Lỗi khi tạo ví: ' + error.message });
  }
});

// 4. Cập nhật thông tin ví
router.put('/:id', auth, async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;
  const { name, icon, currency, includeInTotal } = req.body;

  try {
    // Kiểm tra xem ví có thuộc quyền sở hữu của user không
    const existingWallet = await prisma.wallet.findFirst({
      where: { id, userId }
    });

    if (!existingWallet) {
      return res.status(404).json({ error: 'Không tìm thấy ví tiền hoặc bạn không có quyền sửa' });
    }

    const updatedWallet = await prisma.wallet.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(icon !== undefined && { icon }),
        ...(currency && { currency }),
        ...(includeInTotal !== undefined && { includeInTotal: Boolean(includeInTotal) })
      }
    });

    res.json(updatedWallet);
  } catch (error) {
    res.status(500).json({ error: 'Lỗi khi cập nhật ví: ' + error.message });
  }
});

// 5. Xóa ví tiền (Kiểm tra ràng buộc giao dịch)
router.delete('/:id', auth, async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;

  try {
    const existingWallet = await prisma.wallet.findFirst({
      where: { id, userId }
    });

    if (!existingWallet) {
      return res.status(404).json({ error: 'Không tìm thấy ví tiền hoặc bạn không có quyền xóa' });
    }

    // Kiểm tra xem ví này có liên quan đến giao dịch nào không (thu/chi hoặc chuyển tiền)
    const transactionCount = await prisma.transaction.count({
      where: {
        OR: [
          { walletId: id },
          { sourceWalletId: id },
          { targetWalletId: id }
        ]
      }
    });

    if (transactionCount > 0) {
      return res.status(400).json({
        error: `Không thể xóa ví này vì đang có ${transactionCount} giao dịch liên quan.`
      });
    }

    await prisma.wallet.delete({
      where: { id }
    });

    res.json({ message: 'Đã xóa ví thành công' });
  } catch (error) {
    res.status(500).json({ error: 'Lỗi khi xóa ví: ' + error.message });
  }
});

export default router;