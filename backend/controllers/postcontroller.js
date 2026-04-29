import { supabase } from '../config/supabaseClient.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Helpers
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const persistDataUrl = (dataUrl) => {
  try {
    const m = dataUrl.match(/^data:(.+);base64,(.*)$/);
    if (!m) return null;
    const mime = m[1];
    const b64 = m[2];
    const ext = (mime && mime.includes('/')) ? mime.split('/')[1].replace('jpeg', 'jpg') : 'bin';
    const fname = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const fullPath = path.join(uploadsDir, fname);
    fs.writeFileSync(fullPath, Buffer.from(b64, 'base64'));
    return `/uploads/${fname}`;
  } catch (e) {
    console.warn('persistDataUrl failed:', e?.message);
    return null;
  }
};

/* -------------------- CREATE POST -------------------- */
export const createPost = async (req, res) => {
  try {
    const author_id = req.user.id;
    const { content, media_url, media_type, location, poll, original_post_id } = req.body || {};

    // Persist media data URL if provided
    let final_media_url = media_url;
    if (typeof media_url === 'string' && media_url.startsWith('data:')) {
      const persisted = persistDataUrl(media_url);
      if (persisted) final_media_url = persisted;
    }

    // Create poll if provided
    let poll_id = null;
    if (poll && poll.title && Array.isArray(poll.choices) && poll.choices.length > 0) {
      const { data: pollRow, error: pollErr } = await supabase
        .from('polls')
        .insert([{ title: poll.title }])
        .select()
        .single();
      if (pollErr) throw pollErr;
      poll_id = pollRow.id;
      const choicesRows = poll.choices.map((choice) => ({ poll_id, choice_text: choice }));
      const { error: choicesErr } = await supabase.from('poll_choices').insert(choicesRows);
      if (choicesErr) throw choicesErr;
    }

    // Insert post
    const { data: post, error } = await supabase
      .from('posts')
      .insert([{ author_id, content, media_url: final_media_url, media_type, location, poll_id, original_post_id }])
      .select(`
        *,
        farmer:author_id(id, name, email, avatar),
        poll:poll_id(*, choices:poll_choices(*)),
        original_post:original_post_id(*, farmer:author_id(id, name, email, avatar), poll:poll_id(*, choices:poll_choices(*)))
      `)
      .single();
    if (error) throw error;

    res.status(201).json({ message: 'Post created successfully', post });
  } catch (err) {
    console.error('createPost error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

/* -------------------- GET FEED -------------------- */
export const getFeed = async (req, res) => {
  try {
    const userId = req.user?.id || null;
    const tab = req.query.tab || 'all';
    const limit = Math.min(parseInt(req.query.limit || '20'), 100);
    const offset = parseInt(req.query.offset || '0');

    let query = supabase
      .from('posts')
      .select(`
        *,
        farmer:author_id(id, name, email, avatar),
        original_post:original_post_id(
          *,
          farmer:author_id(id, name, email, avatar),
          poll:poll_id(
            *,
            choices:poll_choices(*)
          )
        ),
        poll:poll_id(
          *,
          choices:poll_choices(*)
        )
      `)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (tab === 'followed' && userId) {
      const { data: following, error: fErr } = await supabase
        .from('followers')
        .select('following_id')
        .eq('follower_id', userId);
      if (fErr) throw fErr;
      const followingIds = (following || []).map((r) => r.following_id);
      if (followingIds.length === 0) return res.json({ posts: [] });
      query = supabase
        .from('posts')
        .select(`
          *,
          farmer:author_id(id, name, email, avatar),
          original_post:original_post_id(
            *,
            farmer:author_id(id, name, email, avatar),
            poll:poll_id(*, choices:poll_choices(*))
          ),
          poll:poll_id(*, choices:poll_choices(*))
        `)
        .in('author_id', followingIds)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);
    }

    let { data: posts, error } = await query;
    if (error) throw error;
    posts = posts || [];
    const postIds = posts.map((post) => post.id).filter((id) => Number.isFinite(Number(id)));
    const reportCounts = {};

    if (postIds.length > 0) {
      const { data: reports, error: reportsError } = await supabase
        .from('user_reports')
        .select('target_id, status')
        .eq('target_type', 'post')
        .in('target_id', postIds)
        .neq('status', 'dismissed');
      if (reportsError) throw reportsError;

      (reports || []).forEach((report) => {
        const key = Number(report.target_id);
        if (!Number.isFinite(key)) return;
        reportCounts[key] = (reportCounts[key] || 0) + 1;
      });
    }

    if (posts.length > 0) {
      posts = posts.map((post) => ({
        ...post,
        report_count: reportCounts[post.id] || 0,
        is_reported: (reportCounts[post.id] || 0) > 0
      }));
    }

    res.json({ posts });
  } catch (err) {
    console.error('getFeed error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

/* -------------------- TOGGLE LIKE -------------------- */
export const toggleLike = async (req, res) => {
  try {
    const userId = req.user.id;
    const postId = parseInt(req.params.postId, 10);

    const { data: existing } = await supabase
      .from('post_likes')
      .select('*')
      .eq('post_id', postId)
      .eq('user_id', userId)
      .maybeSingle();

    if (existing) {
      await supabase.from('post_likes').delete().eq('id', existing.id);
      const { data: post } = await supabase
        .from('posts')
        .select('likes_count')
        .eq('id', postId)
        .single();
      const newCount = Math.max((post?.likes_count || 1) - 1, 0);
      await supabase.from('posts').update({ likes_count: newCount }).eq('id', postId);
      return res.json({ liked: false, likes_count: newCount });
    }

    await supabase.from('post_likes').insert([{ post_id: postId, user_id: userId }]);
    const { data: postData } = await supabase
      .from('posts')
      .select('likes_count, author_id')
      .eq('id', postId)
      .single();
    const newCount = (postData?.likes_count || 0) + 1;
    await supabase.from('posts').update({ likes_count: newCount }).eq('id', postId);

    if (postData && postData.author_id !== userId) {
      const { data: actor } = await supabase
        .from('farmer')
        .select('name')
        .eq('id', userId)
        .single();
      const actorName = actor?.name || 'Someone';
      await supabase.from('notifications').insert([
        {
          farmer_id: postData.author_id,
          title: 'Post liked',
          message: `${actorName} liked your post.`,
          type: 'like',
          metadata: { post_id: postId, actor_id: userId, actor_name: actorName },
        },
      ]);
    }

    res.json({ liked: true, likes_count: newCount });
  } catch (err) {
    console.error('toggleLike error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

/* -------------------- ADD COMMENT -------------------- */
export const addComment = async (req, res) => {
  try {
    const userId = req.user.id;
    const postId = parseInt(req.params.postId, 10);
    const { text, parent_comment_id } = req.body || {};
    if (!text || !text.trim()) return res.status(400).json({ message: 'Text is required' });

    const { data: inserted, error } = await supabase
      .from('comments')
      .insert([{ post_id: postId, farmer_id: userId, parent_comment_id: parent_comment_id || null, text }])
      .select('*')
      .single();
    if (error) throw error;

    // bump comments_count
    const { data: postRow } = await supabase.from('posts').select('comments_count, author_id').eq('id', postId).single();
    const newCount = (postRow?.comments_count || 0) + 1;
    await supabase.from('posts').update({ comments_count: newCount }).eq('id', postId);

    if (postRow && postRow.author_id !== userId) {
      const { data: actor } = await supabase
        .from('farmer')
        .select('name')
        .eq('id', userId)
        .single();
      const actorName = actor?.name || 'Someone';
      await supabase.from('notifications').insert([
        {
          farmer_id: postRow.author_id,
          title: 'New comment',
          message: `${actorName} commented on your post.`,
          type: 'comment',
          metadata: { post_id: postId, actor_id: userId, actor_name: actorName },
        },
      ]);
    }

    // attach author details
    const { data: author } = await supabase.from('farmer').select('id,name,email,avatar').eq('id', userId).single();
    const comment = {
      id: inserted.comment_id,
      post_id: inserted.post_id,
      parent_comment_id: inserted.parent_comment_id,
      author_id: userId,
      author,
      text: inserted.text,
      created_at: inserted.created_at,
      likes_count: 0,
      userLiked: false,
    };
    res.status(201).json({ message: 'Comment added', comment });
  } catch (err) {
    console.error('addComment error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

/* -------------------- DELETE COMMENT -------------------- */
export const deleteComment = async (req, res) => {
  try {
    const commentId = parseInt(req.params.commentId, 10);
    await supabase.from('comments').delete().eq('comment_id', commentId);
    // We will trust a background recount or separate recount endpoint
    res.json({ message: 'Comment deleted' });
  } catch (err) {
    console.error('deleteComment error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

/* -------------------- GET COMMENTS FOR POST -------------------- */
export const getCommentsForPost = async (req, res) => {
  try {
    const userId = req.user.id;
    const postId = parseInt(req.params.postId, 10);

    const { data: comments, error } = await supabase
      .from('comments')
      .select('comment_id, post_id, farmer_id, parent_comment_id, text, created_at')
      .eq('post_id', postId)
      .order('created_at', { ascending: true });
    if (error) throw error;

    const ids = (comments || []).map(c => c.comment_id);
    let likedSet = new Set();
    if (ids.length > 0) {
      const { data: likedRows } = await supabase
        .from('comment_likes')
        .select('comment_id')
        .eq('user_id', userId)
        .in('comment_id', ids);
      likedSet = new Set((likedRows || []).map(r => r.comment_id));
    }

    let likeCounts = {};
    if (ids.length > 0) {
      const { data: allLikes } = await supabase
        .from('comment_likes')
        .select('comment_id')
        .in('comment_id', ids);
      (allLikes || []).forEach(r => {
        likeCounts[r.comment_id] = (likeCounts[r.comment_id] || 0) + 1;
      });
    }

    const authorIds = Array.from(new Set((comments || []).map(c => c.farmer_id).filter(Boolean)));
    let authorMap = new Map();
    if (authorIds.length > 0) {
      const { data: authors } = await supabase
        .from('farmer')
        .select('id, name, email, avatar')
        .in('id', authorIds);
      (authors || []).forEach(a => authorMap.set(a.id, a));
    }

    const result = (comments || []).map(c => ({
      id: c.comment_id,
      post_id: c.post_id,
      parent_comment_id: c.parent_comment_id || null,
      author: authorMap.get(c.farmer_id) || null,
      author_id: c.farmer_id,
      text: c.text,
      created_at: c.created_at,
      likes_count: likeCounts[c.comment_id] || 0,
      userLiked: likedSet.has(c.comment_id),
    }));

    res.json({ comments: result });
  } catch (err) {
    console.error('getCommentsForPost error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

/* -------------------- TOGGLE COMMENT LIKE -------------------- */
export const toggleCommentLike = async (req, res) => {
  try {
    const userId = req.user.id;
    const commentId = parseInt(req.params.commentId, 10);

    const { data: existing } = await supabase
      .from('comment_likes')
      .select('*')
      .eq('comment_id', commentId)
      .eq('user_id', userId)
      .maybeSingle();

    if (existing) {
      await supabase.from('comment_likes').delete().eq('id', existing.id);
      const { data, count } = await supabase
        .from('comment_likes')
        .select('*', { count: 'exact', head: true })
        .eq('comment_id', commentId);
      return res.json({ liked: false, likes_count: count || 0 });
    }

    await supabase.from('comment_likes').insert([{ comment_id: commentId, user_id: userId }]);
    const { count } = await supabase
      .from('comment_likes')
      .select('*', { count: 'exact', head: true })
      .eq('comment_id', commentId);
    res.json({ liked: true, likes_count: count || 0 });
  } catch (err) {
    console.error('toggleCommentLike error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

/* -------------------- DELETE POST -------------------- */
export const deletePost = async (req, res) => {
  try {
    const postId = parseInt(req.params.postId, 10);
    if (!Number.isInteger(postId)) {
      return res.status(400).json({ message: 'Invalid post id' });
    }

    const { data: post, error: postError } = await supabase
      .from('posts')
      .select('author_id')
      .eq('id', postId)
      .maybeSingle();

    if (postError) throw postError;
    if (!post) return res.status(404).json({ message: 'Post not found' });

    const adminEmail = (process.env.ADMIN_EMAIL || 'admin@gmail.com').trim().toLowerCase();
    const isAdmin = (req.user?.email || '').toLowerCase() === adminEmail;
    if (!isAdmin && post.author_id !== req.user?.id) {
      return res.status(403).json({ message: 'Not allowed' });
    }

    await supabase.from('posts').delete().eq('id', postId);
    res.json({ message: 'Post deleted' });
  } catch (err) {
    console.error('deletePost error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

/* -------------------- UPDATE POST -------------------- */
export const updatePost = async (req, res) => {
  try {
    const postId = parseInt(req.params.postId, 10);
    const { content } = req.body || {};
    const { error } = await supabase.from('posts').update({ content }).eq('id', postId);
    if (error) throw error;
    res.json({ message: 'Post updated' });
  } catch (err) {
    console.error('updatePost error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

/* -------------------- FOLLOW/UNFOLLOW -------------------- */
export const toggleFollow = async (req, res) => {
  try {
    const followerId = req.user.id;
    const followingId = parseInt(req.params.userId, 10);
    if (followerId === followingId) return res.status(400).json({ message: 'Cannot follow yourself' });

    const { data: existing } = await supabase
      .from('followers')
      .select('*')
      .eq('follower_id', followerId)
      .eq('following_id', followingId)
      .maybeSingle();

    if (existing) {
      await supabase.from('followers').delete().eq('id', existing.id);
      return res.json({ following: false });
    }

    await supabase.from('followers').insert([{ follower_id: followerId, following_id: followingId }]);
    const { data: actor } = await supabase
      .from('farmer')
      .select('name')
      .eq('id', followerId)
      .single();
    const actorName = actor?.name || 'Someone';
    await supabase.from('notifications').insert([
      {
        farmer_id: followingId,
        title: 'New follower',
        message: `${actorName} started following you.`,
        type: 'follow',
        metadata: { follower_id: followerId, actor_id: followerId, actor_name: actorName },
      },
    ]);
    res.json({ following: true });
  } catch (err) {
    console.error('toggleFollow error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

/* -------------------- NOTIFICATIONS -------------------- */
export const getNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
      const { data: rows } = await supabase
        .from('notifications')
        .select('*')
        .eq('farmer_id', userId)
        .order('created_at', { ascending: false })
        .limit(100);
    res.json({ notifications: rows || [] });
  } catch (err) {
    console.error('getNotifications error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

export const markNotificationRead = async (req, res) => {
  try {
    const userId = req.user.id;
    const notificationId = parseInt(req.params.id, 10);
    if (!Number.isSafeInteger(notificationId)) {
      return res.status(400).json({ message: "Invalid notification id" });
    }
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId)
      .eq('farmer_id', userId);
    if (error) throw error;
    res.json({ message: "Notification marked as read" });
  } catch (err) {
    console.error('markNotificationRead error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

/* -------------------- USER POSTS -------------------- */
export const getUserPosts = async (req, res) => {
  try {
    const userId = parseInt(req.params.userId, 10);
    if (!userId) return res.status(400).json({ error: 'Invalid user id' });

    const { data: posts, error } = await supabase
      .from('posts')
      .select(`
        *,
        farmer:author_id(id, name, email, avatar),
        poll:poll_id(*, choices:poll_choices(*))
      `)
      .eq('author_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json({ posts });
  } catch (err) {
    console.error('getUserPosts error:', err);
    res.status(500).json({ error: err.message });
  }
};

/* -------------------- POLL VOTE -------------------- */
export const votePoll = async (req, res) => {
  try {
    const userId = req.user.id;
    const pollId = parseInt(req.params.pollId, 10);
    const { choiceId } = req.body || {};
    if (!Number.isInteger(choiceId)) return res.status(400).json({ message: 'choiceId required' });

    // Check existing vote
    const { data: existing } = await supabase
      .from('poll_votes')
      .select('*')
      .eq('poll_id', pollId)
      .eq('farmer_id', userId)
      .maybeSingle();

    if (existing && existing.choice_id === choiceId) {
      return res.json({ voted: true, choiceId });
    }

    if (existing) {
      // Move vote to different choice
      await supabase.from('poll_votes').update({ choice_id: choiceId }).eq('id', existing.id);
    } else {
      await supabase.from('poll_votes').insert([{ poll_id: pollId, choice_id: choiceId, farmer_id: userId }]);
    }

    // Recompute counts
    const { data: choices } = await supabase
      .from('poll_choices')
      .select('id')
      .eq('poll_id', pollId);
    if (choices && choices.length > 0) {
      for (const ch of choices) {
        const { count } = await supabase
          .from('poll_votes')
          .select('*', { count: 'exact', head: true })
          .eq('poll_id', pollId)
          .eq('choice_id', ch.id);
        await supabase.from('poll_choices').update({ votes: count || 0 }).eq('id', ch.id);
      }
    }
    res.json({ voted: true, choiceId });
  } catch (err) {
    console.error('votePoll error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};
