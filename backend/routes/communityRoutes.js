import express from 'express';
import auth from '../middleware/authMiddleware.js';
import {
  createPost,
  getFeed,
  toggleLike,
  addComment,
  getCommentsForPost,
  toggleCommentLike,
  deleteComment,
  deletePost,
  updatePost,
  toggleFollow,
  getNotifications,
  getUserPosts,
  votePoll,
  markNotificationRead,
} from '../controllers/postcontroller.js';
import { createReport } from '../controllers/reportController.js';

const router = express.Router();

// posts
router.post('/posts', auth, createPost);
router.get('/posts', auth, getFeed); // ?tab=all|followed&limit&offset
router.post('/posts/:postId/like', auth, toggleLike);
router.post('/posts/:postId/comments', auth, addComment);
router.get('/posts/:postId/comments', auth, getCommentsForPost);
router.delete('/posts/:postId', auth, deletePost);
router.put('/posts/:postId', auth, updatePost);
router.delete('/comments/:commentId', auth, deleteComment);
router.post('/comments/:commentId/like', auth, toggleCommentLike);

// follow
router.post('/users/:userId/follow', auth, toggleFollow);
router.get('/users/:userId/posts', auth, getUserPosts);

// notifications
router.get('/notifications', auth, getNotifications);
router.post('/notifications/:id/read', auth, markNotificationRead);

// poll voting
router.post('/polls/:pollId/vote', auth, votePoll);

// reports
router.post('/reports', auth, createReport);

export default router;
