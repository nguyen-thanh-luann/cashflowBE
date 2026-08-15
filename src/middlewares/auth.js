import jwt from 'jsonwebtoken';

export default function (req, res, next) {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ error: 'Không tìm thấy Token. Truy cập bị từ chối.' });
  }

  try {
    const verified = jwt.verify(token, process.env.JWT_SECRET);
    req.user = verified; // Gắn thông tin userId vào request
    next();
  } catch (err) {
    res.status(400).json({ error: 'Token không hợp lệ hoặc đã hết hạn.' });
  }
};