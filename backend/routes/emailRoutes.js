// ✅ backend/routes/emailRoutes.js
import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import emailControllerRoutes from './emailControllerRoutes.js';
import emailModelRoutes from './emailModelRoutes.js';

const router = express.Router();

// ✅ Apply global auth middleware to all routes
router.use(protect);

// ✅ Controller-Based Routes
// Base Path: /api/emails/
router.use('/', emailControllerRoutes);

// ✅ Model-Based Routes
// Base Path: /api/emails/model/
router.use('/model', emailModelRoutes);

export default router;


// ✅ backend/routes/emailRoutes.js
// import express from 'express';
// import { protect } from '../middleware/authMiddleware.js';
// import emailControllerRoutes from './emailControllerRoutes.js';
// import emailModelRoutes from './emailModelRoutes.js';

// const router = express.Router();

// // ✅ Apply global auth middleware
// router.use(protect);

// /**
//  * 📦 Controller-Based Routes
//  * Base Path: /api/emails/
//  */
// router.use('/', emailControllerRoutes);

// /**
//  * 🧠 Model-Based Routes
//  * Base Path: /api/emails/model/
//  */
// router.use('/model', emailModelRoutes);

// export default router;
