import express from 'express';
import prisma from '../prisma.js';
import auth from '../middlewares/auth.js';

const router = express.Router();

// 1. Lấy danh sách danh mục (Bao gồm danh mục của User và danh mục Hệ thống)
router.get('/', auth, async (req, res) => {
  const userId = req.user.id;
  const { type } = req.query; // Có thể lọc theo loại: 'income' hoặc 'expense' (nếu truyền query param)

  try {
    const whereCondition = {
      OR: [
        { userId },
        { isSystem: true }
      ]
    };

    // Nếu có truyền type từ client thì thêm điều kiện lọc theo type
    if (type) {
      whereCondition.type = type;
    }

    const categories = await prisma.category.findMany({
      where: whereCondition,
      orderBy: [
        { isSystem: 'desc' }, // Đặt danh mục hệ thống lên trước (hoặc tùy chỉnh)
        { name: 'asc' }
      ]
    });

    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: 'Lỗi khi lấy danh sách danh mục: ' + error.message });
  }
});

// 2. Lấy chi tiết một danh mục theo ID
router.get('/:id', auth, async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;

  try {
    const category = await prisma.category.findFirst({
      where: {
        id,
        OR: [
          { userId },
          { isSystem: true }
        ]
      }
    });

    if (!category) {
      return res.status(404).json({ error: 'Không tìm thấy danh mục' });
    }

    res.json(category);
  } catch (error) {
    res.status(500).json({ error: 'Lỗi khi lấy thông tin danh mục: ' + error.message });
  }
});

// 3. Tạo danh mục mới (Người dùng tự tạo -> isSystem: false)
router.post('/', auth, async (req, res) => {
  const userId = req.user.id;
  const { name, type, icon } = req.body;

  // Validate dữ liệu đầu vào
  if (!name || !type) {
    return res.status(400).json({ error: 'Tên danh mục và loại danh mục là bắt buộc' });
  }

  try {
    const newCategory = await prisma.category.create({
      data: {
        userId,
        name,
        type,
        icon: icon || null,
        isSystem: false // Mặc định do user tạo thì không phải danh mục hệ thống
      }
    });

    res.status(201).json(newCategory);
  } catch (error) {
    res.status(500).json({ error: 'Lỗi khi tạo danh mục: ' + error.message });
  }
});

// 4. Cập nhật danh mục (Chỉ cho phép sửa danh mục do chính User tạo)
router.put('/:id', auth, async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;
  const { name, type, icon } = req.body;

  try {
    // Kiểm tra sự tồn tại và quyền sở hữu
    const existingCategory = await prisma.category.findFirst({
      where: { id, userId, isSystem: false }
    });

    if (!existingCategory) {
      return res.status(404).json({ error: 'Không tìm thấy danh mục hoặc bạn không có quyền chỉnh sửa danh mục hệ thống' });
    }

    const updatedCategory = await prisma.category.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(type && { type }),
        ...(icon !== undefined && { icon })
      }
    });

    res.json(updatedCategory);
  } catch (error) {
    res.status(500).json({ error: 'Lỗi khi cập nhật danh mục: ' + error.message });
  }
});

// 5. Xóa danh mục (Chỉ cho phép xóa danh mục do chính User tạo)
router.delete('/:id', auth, async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;

  try {
    // Kiểm tra danh mục có tồn tại và thuộc về user không (không cho xóa danh mục system)
    const existingCategory = await prisma.category.findFirst({
      where: { id, userId, isSystem: false }
    });

    if (!existingCategory) {
      return res.status(404).json({ error: 'Không tìm thấy danh mục hoặc bạn không có quyền xóa danh mục này' });
    }

    // Tùy chọn: Kiểm tra xem danh mục có đang được sử dụng ở giao dịch nào không trước khi xóa
    const transactionCount = await prisma.transaction.count({
      where: { categoryId: id }
    });

    if (transactionCount > 0) {
      return res.status(400).json({ 
        error: `Không thể xóa danh mục này vì đang chứa ${transactionCount} giao dịch.` 
      });
    }

    await prisma.category.delete({
      where: { id }
    });

    res.json({ message: 'Đã xóa danh mục thành công' });
  } catch (error) {
    res.status(500).json({ error: 'Lỗi khi xóa danh mục: ' + error.message });
  }
});

export default router;