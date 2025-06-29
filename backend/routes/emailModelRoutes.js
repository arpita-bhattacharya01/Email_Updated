import express from 'express';
import {
  createEmail,
  getEmailById as getEmailByIdModel,
  getEmailsByUserId,
  markAsRead,
  starEmail,
  moveToTrash,
  deleteEmail as deleteEmailModel
} from '../models/Email.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();
router.use(protect);

// Model-Based Email Operations

// Create email
router.post('/send', async (req, res) => {
  try {
    const id = await createEmail(req.body);
    res.status(201).json({ success: true, message: 'Email created successfully', id });
  } catch (error) {
    console.error('❌ Create Email Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get all emails by user (put before `/:id`)
router.get('/user/:userId', async (req, res) => {
  try {
    const { folder = 'inbox', isRead, isStarred, search, limit = 20, offset = 0 } = req.query;
    const filters = {
      userId: req.params.userId,
      folder,
      isRead: isRead === 'true' ? true : isRead === 'false' ? false : undefined,
      isStarred: isStarred === 'true' ? true : isStarred === 'false' ? false : undefined,
      search,
      limit: parseInt(limit),
      offset: parseInt(offset)
    };

    const emails = await getEmailsByUserId(filters);
    res.json({ success: true, ...emails });
  } catch (error) {
    console.error('❌ Get Emails Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get email by ID (put after `/user/:userId`)
router.get('/:id', async (req, res) => {
  try {
    const userId = req.user?.id;
    const email = await getEmailByIdModel(req.params.id, userId);
    if (!email) {
      return res.status(404).json({ success: false, message: 'Email not found' });
    }
    res.json({ success: true, email });
  } catch (error) {
    console.error('❌ Get Email Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Mark as read
router.post('/:id/read', async (req, res) => {
  try {
    const success = await markAsRead(req.params.id);
    res.json({ success });
  } catch (error) {
    console.error('❌ Mark Read Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Star email
router.post('/:id/star', async (req, res) => {
  try {
    const success = await starEmail(req.params.id);
    res.json({ success });
  } catch (error) {
    console.error('❌ Star Email Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Move to trash
router.post('/:id/trash', async (req, res) => {
  try {
    const success = await moveToTrash(req.params.id);
    res.json({ success });
  } catch (error) {
    console.error('❌ Trash Email Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Permanently delete
router.delete('/:id', async (req, res) => {
  try {
    const success = await deleteEmailModel(req.params.id);
    res.json({ success });
  } catch (error) {
    console.error('❌ Delete Email Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;

// import express from 'express';
// import {
//   createEmail,
//   getEmailById as getEmailByIdModel,
//   getEmailsByUserId,
//   markAsRead,
//   starEmail,
//   moveToTrash,
//   deleteEmail as deleteEmailModel
// } from '../models/Email.js';
// import { protect } from '../middleware/authMiddleware.js';

// const router = express.Router();
// router.use(protect);

// // 📦 Model-Based Email Operations

// // ✅ Create email
// router.post('/send', async (req, res) => {
//   try {
//     const id = await createEmail(req.body);
//     res.status(201).json({ success: true, message: 'Email created successfully', id });
//   } catch (error) {
//     console.error('❌ Create Email Error:', error);
//     res.status(500).json({ success: false, message: error.message });
//   }
// });

// // ✅ Get all emails by user (put before `/:id`)
// router.get('/user/:userId', async (req, res) => {
//   try {
//     const { folder = 'inbox', isRead, isStarred, search, limit = 20, offset = 0 } = req.query;
//     const filters = {
//       userId: req.params.userId,
//       folder,
//       isRead: isRead === 'true' ? true : isRead === 'false' ? false : undefined,
//       isStarred: isStarred === 'true' ? true : isStarred === 'false' ? false : undefined,
//       search,
//       limit: parseInt(limit),
//       offset: parseInt(offset)
//     };

//     const emails = await getEmailsByUserId(filters);
//     res.json({ success: true, ...emails });
//   } catch (error) {
//     console.error('❌ Get Emails Error:', error);
//     res.status(500).json({ success: false, message: error.message });
//   }
// });

// // ✅ Get email by ID (put after `/user/:userId`)
// router.get('/:id', async (req, res) => {
//   try {
//     const userId = req.user?.id;
//     const email = await getEmailByIdModel(req.params.id, userId);
//     if (!email) {
//       return res.status(404).json({ success: false, message: 'Email not found' });
//     }
//     res.json({ success: true, email });
//   } catch (error) {
//     console.error('❌ Get Email Error:', error);
//     res.status(500).json({ success: false, message: error.message });
//   }
// });

// // ✅ Mark as read
// router.post('/:id/read', async (req, res) => {
//   try {
//     const success = await markAsRead(req.params.id);
//     res.json({ success });
//   } catch (error) {
//     console.error('❌ Mark Read Error:', error);
//     res.status(500).json({ success: false, message: error.message });
//   }
// });

// // ✅ Star email
// router.post('/:id/star', async (req, res) => {
//   try {
//     const success = await starEmail(req.params.id);
//     res.json({ success });
//   } catch (error) {
//     console.error('❌ Star Email Error:', error);
//     res.status(500).json({ success: false, message: error.message });
//   }
// });

// // ✅ Move to trash
// router.post('/:id/trash', async (req, res) => {
//   try {
//     const success = await moveToTrash(req.params.id);
//     res.json({ success });
//   } catch (error) {
//     console.error('❌ Trash Email Error:', error);
//     res.status(500).json({ success: false, message: error.message });
//   }
// });

// // ✅ Permanently delete
// router.delete('/:id', async (req, res) => {
//   try {
//     const success = await deleteEmailModel(req.params.id);
//     res.json({ success });
//   } catch (error) {
//     console.error('❌ Delete Email Error:', error);
//     res.status(500).json({ success: false, message: error.message });
//   }
// });

// export default router;
