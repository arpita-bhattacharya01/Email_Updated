// middleware/authenticate.js
import jwt from 'jsonwebtoken';
import asyncHandler from 'express-async-handler';

export const authenticate = asyncHandler(async (req, res, next) => {
  const token = req.cookies.accessToken;
  if (!token) {
    res.status(401);
    throw new Error('Not authenticated');
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401);
    throw new Error('Invalid or expired token');
  }
});
