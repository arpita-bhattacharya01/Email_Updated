import express from 'express';
import {
  superAdminSignup,
  superAdminSignin,
  getSuperAdminProfile,
  updateSuperAdminProfile,
  superAdminForgotPassword,
  superAdminResetPassword,
  createAdmin,
  deleteAdmin,
  getDashboardStats,
  finalizeUserStatus,
} from '../controllers/superAdminController.js';
import { protect, authorizeRoles } from '../middleware/authMiddleware.js';

const router = express.Router();

// ✅ Auth
router.post('/signup', superAdminSignup);
router.post('/signin', superAdminSignin);

// ✅ Profile Management
router.get('/me', protect, authorizeRoles('superadmin'), getSuperAdminProfile);
router.put('/me', protect, authorizeRoles('superadmin'), updateSuperAdminProfile);

// ✅ Password Handling
router.post('/forgot-password', superAdminForgotPassword);
router.post('/reset-password/:token', superAdminResetPassword);

// ✅ Super Admin Dashboard Actions
router.get('/dashboard', protect, authorizeRoles('superadmin'), getDashboardStats);
router.post('/create-admin', protect, authorizeRoles('superadmin'), createAdmin);
router.delete('/delete-admin/:adminId', protect, authorizeRoles('superadmin'), deleteAdmin);
router.put('/finalize-user/:userId', protect, authorizeRoles('superadmin'), finalizeUserStatus);

export default router;
