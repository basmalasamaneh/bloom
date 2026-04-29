import React, { useState, useEffect, useRef, useCallback } from 'react';
import { FaUserPlus, FaCheck, FaEllipsisH } from 'react-icons/fa';
import UserProfile from './UserProfile';
import Footer from './Footer';
import Header from '../components/Header';
import AdminHeader from './admin/AdminHeader';

// Backend base
const API_BASE = 'http://localhost:5000/api/community';
const API_ORIGIN = (() => {
  try { return new URL(API_BASE).origin; } catch { return ''; }
})();

const normalizeMediaUrl = (url) => {
  if (!url) return url;
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith('/')) return `${API_ORIGIN}${url}`;
  return url;
};
const AUTH_BASE = 'http://localhost:5000/api/auth';
const TOKEN_KEY = 'token'; 
const ADMIN_EMAIL = ((process.env.REACT_APP_ADMIN_EMAIL || 'admin@gmail.com') + '').trim().toLowerCase();
const ADMIN_BASE = `${API_ORIGIN}/api/admin`;
const EVENTS_STORAGE_KEY = 'community_upcoming_events';
const DEFAULT_EVENTS = [
  {
    id: 'event-1',
    date: 'May 15',
    title: 'Community Garden Day',
    description: 'Join us for a day of planting and learning'
  },
  {
    id: 'event-2',
    date: 'May 22',
    title: "Nature Walk & Photography",
    description: "Explore local trails and capture nature's beauty"
  }
];

const COMMUNITY_FOCUS_KEY = "bloom:communityFocusPost";
const COMMUNITY_FOCUS_EVENT = "bloom:focusPost";

const CommunityWebsite = ({ useAdminHeader = false }) => {
  // State management
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [newPost, setNewPost] = useState('');
  const [commentInputs, setCommentInputs] = useState({});
  const [commentPosting, setCommentPosting] = useState({});
  const [commentErrors, setCommentErrors] = useState({});
  const [replyInputs, setReplyInputs] = useState({});
  const [activeTab, setActiveTab] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showNewPostModal, setShowNewPostModal] = useState(false);
  
  // New states for media, location, and poll
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState('');
  const [locationQuery, setLocationQuery] = useState('');
  const [locationResults, setLocationResults] = useState([]);
  const [searchingLocation, setSearchingLocation] = useState(false);
  const locationSearchTimer = useRef(null);
  const [showPollModal, setShowPollModal] = useState(false);
  const [pollTitle, setPollTitle] = useState('');
  const [pollChoices, setPollChoices] = useState(['', '']);
  const [mediaType, setMediaType] = useState(null);
  const [pendingAction, setPendingAction] = useState(null);
  const [postMenuOpen, setPostMenuOpen] = useState(null);
  const [editingPost, setEditingPost] = useState(null);
  const [userVotes, setUserVotes] = useState({});
  const [sharingPost, setSharingPost] = useState(null);
  const [shareCaption, setShareCaption] = useState('');
  const [showReplies, setShowReplies] = useState({});
  const [viewingProfile, setViewingProfile] = useState(null);
  const [expandedComments, setExpandedComments] = useState({});
  const [expandedReports, setExpandedReports] = useState({});
  const [followingMembers, setFollowingMembers] = useState({});
  const [notifications, setNotifications] = useState([]);
  const [pendingFocusPost, setPendingFocusPost] = useState(null);
  const [me, setMe] = useState(null);
  const [upcomingEvents, setUpcomingEvents] = useState(DEFAULT_EVENTS);
  const [eventDrafts, setEventDrafts] = useState([]);
  const [editingEvents, setEditingEvents] = useState(false);

  const isAdminUser = useAdminHeader || (me?.email || '').toLowerCase() === ADMIN_EMAIL;
  const effectiveTab = isAdminUser ? 'all' : activeTab;
  
  // Refs for file inputs
  const photoInputRef = useRef(null);
  const videoInputRef = useRef(null);
  const highlightTimeoutRef = useRef(null);

  // --- Helper: fetch with JWT attached ---
  const fetchWithAuth = async (url, options = {}) => {
    const token = localStorage.getItem(TOKEN_KEY);
    const headers = {
      ...(options.headers || {}),
    };
    if (!headers['Content-Type'] && !(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(url, { ...options, headers });
    const text = await res.text();
    let data = null;
    try { data = text ? JSON.parse(text) : {}; } catch (e) { data = { message: text }; }
    if (!res.ok) {
      const err = new Error(data.message || 'Request failed');
      err.status = res.status;
      err.body = data;
      throw err;
    }
    return data;
  };

  const scrollToPost = useCallback((postId) => {
    if (typeof window === 'undefined' || !postId) return;
    const target = document.getElementById(`post-card-${postId}`);
    if (!target) return;
    if (highlightTimeoutRef.current) {
      clearTimeout(highlightTimeoutRef.current);
    }
    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    target.classList.add('highlighted');
    highlightTimeoutRef.current = window.setTimeout(() => {
      target.classList.remove('highlighted');
    }, 2600);
    setPendingFocusPost(null);
  }, []);
// To Do : addd for every comonant the backend connection
  // --- Load feed from backend ---
  const loadFeed = async (tab) => {
    setLoading(true);
    setError(null);
    try {
      const targetTab = isAdminUser ? 'all' : (tab || activeTab);
      const url = `${API_BASE}/posts?tab=${targetTab}&limit=50`;
      const [data, reportsData] = await Promise.all([
        fetchWithAuth(url),
        isAdminUser
          ? fetchWithAuth(`${ADMIN_BASE}/reports`).catch(() => [])
          : Promise.resolve([])
      ]);
      const reportsList = Array.isArray(reportsData) ? reportsData : [];
      const reportDetailsByPost = {};
      const reportCounts = reportsList.reduce((acc, report) => {
        if (report?.target_type === 'post' && report?.target_id) {
          const key = Number(report.target_id);
          if (Number.isFinite(key)) {
            acc[key] = (acc[key] || 0) + 1;
            if (!reportDetailsByPost[key]) reportDetailsByPost[key] = [];
            reportDetailsByPost[key].push({
              id: report.id,
              reason: report.reason,
              description: report.description,
              status: report.status,
              created_at: report.created_at,
              reporter: report.reporter
            });
          }
        }
        return acc;
      }, {});
      // normalize posts: backend returns posts with farmer: {id,name,email}
      const normalized = (data.posts || []).map(p => {
        const reportCountFromAdmin = reportCounts[p.id];
        const fallbackReportCount = [
          p.report_count,
          p.reports_count,
          p.reportCount,
          p.reports,
        ].find((value) => Number.isFinite(Number(value)));
        const reportCount = Number.isFinite(reportCountFromAdmin)
          ? reportCountFromAdmin
          : (fallbackReportCount != null ? Number(fallbackReportCount) : 0);
        const isReported = Boolean(p.is_reported || p.reported) || reportCount > 0;
        const isFirstPost = Boolean(p.is_first_post || p.first_post || p.isFirstPost || p.firstPost);

        return ({
        id: p.id,
        author_id: p.author_id,
        author: p.farmer?.name || 'Unknown',
        avatar: normalizeMediaUrl(p.farmer?.avatar) || (p.author_id === me?.id ? '🌻' : '👤'),
        content: p.content,
        created_at: p.created_at,
        timestamp: formatTimestamp(p.created_at),
        likes: p.likes_count || p.likes || 0,
        likes_count: p.likes_count || p.likes || 0,
        comments_count: (p.comments_count ?? ((Array.isArray(p.comments) ? p.comments.length : 0))) || 0,
        comments: (p.comments || []).map(c => ({
          id: c.id,
          author_id: c.author_id,
          author: c.author?.name || c.author_name || 'User',
          text: c.text,
          timestamp: formatTimestamp(c.created_at),
          likes: c.likes || 0,
          userLiked: false,
          replies: [] // your backend returns flat comments; replies support can be added later
        })),
        userLiked: false, // optional: you can ask backend to return whether current user liked
        isFollowed: false,
        media: p.media_url ? { url: normalizeMediaUrl(p.media_url), type: p.media_type } : p.media,
        location: p.location,
        poll: p.poll_id ? { 
          id: p.poll_id,
          title: p.poll?.title,
          choices: p.poll?.choices || [],
          totalVotes: (Array.isArray(p.poll?.choices) ? p.poll.choices.reduce((s, ch) => s + (ch.votes_count || 0), 0) : 0),
          endDate: p.poll?.end_at
        } : p.poll,
        reportCount,
        isReported,
        isFirstPost,
        reportDetails: reportDetailsByPost[p.id] || [],
        // If backend joined original_post, map it; else fallback to id only
        originalPost: p.original_post ? {
          id: p.original_post.id,
          author_id: p.original_post.author_id,
          author: p.original_post.farmer?.name || 'Unknown',
          avatar: normalizeMediaUrl(p.original_post.farmer?.avatar) || '👤',
          content: p.original_post.content,
          media: p.original_post.media_url ? { url: normalizeMediaUrl(p.original_post.media_url), type: p.original_post.media_type } : null,
          timestamp: formatTimestamp(p.original_post.created_at),
          poll: p.original_post.poll ? {
            id: p.original_post.poll.id,
            title: p.original_post.poll.title,
            choices: Array.isArray(p.original_post.poll.choices) ? p.original_post.poll.choices : [],
            totalVotes: (Array.isArray(p.original_post.poll.choices) ? p.original_post.poll.choices.reduce((s, ch) => s + (ch.votes_count || 0), 0) : 0),
            endDate: p.original_post.poll.end_at
          } : undefined
        } : (p.original_post_id ? { id: p.original_post_id } : p.originalPost)
        });
      });
      const sorted = isAdminUser
        ? [...normalized].sort((a, b) => {
            const ra = a.reportCount || 0;
            const rb = b.reportCount || 0;
            if (rb !== ra) return rb - ra;
            const da = parseServerDate(a.created_at);
            const db = parseServerDate(b.created_at);
            return db - da;
          })
        : normalized;
      setPosts(sorted);
    } catch (err) {
      console.error('Failed to load feed:', err);
      setError('Failed to load posts. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // --- Load notifications from backend ---
  const loadNotifications = async () => {
    try {
      const data = await fetchWithAuth(`${API_BASE}/notifications`);
      const payload = data.notifications || [];
      setNotifications(payload.filter((n) => !n.is_read));
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("bloom:notifications-refresh"));
      }
    } catch (err) {
      console.error('Load notifications failed:', err);
    }
  };

  const markNotificationRead = async (notificationId) => {
    if (!notificationId) return;
    try {
      await fetchWithAuth(`${API_BASE}/notifications/${notificationId}/read`, { method: 'POST' });
      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event("bloom:notifications-refresh"));
      }
    } catch (err) {
      console.error('Failed to mark notification read:', err);
    }
  };

  // Robust timestamp parse for DB strings that may lack timezone
  const parseServerDate = (ts) => {
    if (!ts) return new Date();
    if (ts instanceof Date) return ts;
    if (typeof ts === 'string') {
      // If timestamp includes explicit timezone (Z or +/-HH:MM), respect it
      if (/[zZ]|[+\-]\d{2}:?\d{2}$/.test(ts)) {
        const dTz = new Date(ts);
        if (!isNaN(dTz)) return dTz;
      }
      // Treat naive timestamps as UTC to avoid off-by-timezone errors
      const norm = ts.includes('T') ? ts : ts.replace(' ', 'T');
      const dUtc = new Date(norm + 'Z');
      if (!isNaN(dUtc)) return dUtc;
      // Fallback: try local parse
      const dLocal = new Date(norm);
      if (!isNaN(dLocal)) return dLocal;
    }
    const d = new Date(ts);
    return isNaN(d) ? new Date() : d;
  };

  // Format timestamp to relative time
  const formatTimestamp = (timestamp) => {
    const now = new Date();
    const postDate = parseServerDate(timestamp);
    const diffInSeconds = Math.floor((now - postDate) / 1000);

    // Guard against small clock skews and fresh posts
    if (Math.abs(diffInSeconds) < 300) return 'Just now';
    if (diffInSeconds < 3600) {
      const m = Math.floor(diffInSeconds / 60);
      return `${m} minute${m === 1 ? '' : 's'} ago`;
    }
    if (diffInSeconds < 86400) {
      const h = Math.floor(diffInSeconds / 3600);
      return `${h} hour${h === 1 ? '' : 's'} ago`;
    }
    if (diffInSeconds < 604800) {
      const d = Math.floor(diffInSeconds / 86400);
      return `${d} day${d === 1 ? '' : 's'} ago`;
    }
    return postDate.toLocaleDateString();
  };

  useEffect(() => {
    try {
      const saved = localStorage.getItem(EVENTS_STORAGE_KEY);
      if (!saved) return;
      const parsed = JSON.parse(saved);
      if (!Array.isArray(parsed)) return;
      const normalized = parsed.map((event, index) => ({
        id: event?.id || `event-${index}-${Date.now()}`,
        date: typeof event?.date === 'string' ? event.date : '',
        title: typeof event?.title === 'string' ? event.title : '',
        description: typeof event?.description === 'string' ? event.description : ''
      }));
      setUpcomingEvents(normalized);
    } catch (e) {
      // ignore invalid saved events
    }
  }, []);

  // initial load
  useEffect(() => {
    // load current user profile
    (async () => {
      try {
        const data = await fetchWithAuth(`${AUTH_BASE}/me`);
        if (data && data.farmer) setMe(data.farmer);
      } catch (e) {
        // ignore; user may not be logged yet
      }
    })();
    loadFeed('all');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = localStorage.getItem(COMMUNITY_FOCUS_KEY);
    if (stored) {
      localStorage.removeItem(COMMUNITY_FOCUS_KEY);
      setPendingFocusPost(Number(stored));
    }
    const handler = (event) => {
      const postId = Number(event?.detail?.postId);
      if (!postId) return;
      setPendingFocusPost(postId);
      localStorage.removeItem(COMMUNITY_FOCUS_KEY);
    };
    window.addEventListener(COMMUNITY_FOCUS_EVENT, handler);
    return () => {
      window.removeEventListener(COMMUNITY_FOCUS_EVENT, handler);
    };
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!me?.id) return;
    loadNotifications();
  }, [me]);

  useEffect(() => {
    if (!isAdminUser) return;
    if (activeTab !== 'all') setActiveTab('all');
  }, [isAdminUser, activeTab]);

  useEffect(() => {
    if (!pendingFocusPost) return;
    if (!posts.find((p) => Number(p.id) === Number(pendingFocusPost))) return;
    scrollToPost(pendingFocusPost);
  }, [pendingFocusPost, posts, scrollToPost]);

  // reload when tab changes (Followed vs All)
  useEffect(() => {
    loadFeed(effectiveTab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, isAdminUser]);

  // --- Create post (calls backend) ---
  const handleCreatePost = async () => {
    if (!(newPost.trim() || selectedMedia || selectedLocation || (pollTitle && pollChoices.some(c => c.trim())) || sharingPost)) {
      return;
    }

    // build payload
    const payload = {
      content: newPost || shareCaption,
      media_url: selectedMedia?.url || null,
      media_type: mediaType || null,
      location: selectedLocation?.name || null,
      poll: pollTitle ? { 
        title: pollTitle, 
        choices: pollChoices.filter(c => c.trim())
      } : null,
      original_post_id: sharingPost?.id || null
    };

    try {
      if (editingPost) {
        const data = await fetchWithAuth(`${API_BASE}/posts/${editingPost.id}`, {
          method: 'PUT',
          body: JSON.stringify({
            content: newPost,
            location: selectedLocation?.name || null
          })
        });
        const updated = data.post || { id: editingPost.id, content: newPost, location: selectedLocation?.name || null };
        setPosts(prev => prev.map(p => p.id === editingPost.id ? { ...p, content: updated.content, location: updated.location } : p));
        // reset UI after save
        setShowNewPostModal(false);
        setPendingAction(null);
        setSharingPost(null);
        setShareCaption('');
        setEditingPost(null);
        setNewPost('');
        setSelectedMedia(null);
        setSelectedLocation(null);
        setPollTitle('');
        setPollChoices(['', '']);
        setMediaType(null);
        return;
      }
      const data = await fetchWithAuth(`${API_BASE}/posts`, {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      
      if (data.post) {
        // prep post shape similar to loadFeed mapping
        const p = data.post;
        const newP = {
          id: p.id,
          author_id: p.author_id,
          author: p.farmer?.name || 'You',
          avatar: p.farmer?.avatar || '🌻',
          content: p.content,
          timestamp: formatTimestamp(p.created_at),
          likes: p.likes_count || 0,
          likes_count: p.likes_count || 0,
          comments_count: 0,
          comments: [],
          userLiked: false,
          isFollowed: true,
          reportCount: Number(p.report_count || p.reports_count || p.reportCount || p.reports || 0),
          isReported: Boolean(p.is_reported || p.reported),
          isFirstPost: Boolean(p.is_first_post || p.first_post || p.isFirstPost || p.firstPost),
          reportDetails: [],
          media: p.media_url ? { url: normalizeMediaUrl(p.media_url), type: p.media_type } : null,
          location: p.location,
          poll: p.poll ? {
            id: p.poll.id,
            title: p.poll.title,
            choices: Array.isArray(p.poll.choices) ? p.poll.choices : [],
            totalVotes: (Array.isArray(p.poll.choices) ? p.poll.choices.reduce((s, ch) => s + (ch.votes_count || 0), 0) : 0),
            endDate: p.poll.end_at
          } : (p.poll_id && pollTitle ? {
            id: p.poll_id,
            title: pollTitle,
            choices: pollChoices.filter(c => c.trim()).map(txt => ({ choice_text: txt, votes_count: 0 })),
            totalVotes: 0,
            endDate: undefined
          } : null),
          originalPost: p.original_post_id ? (
            sharingPost ? {
              id: sharingPost.id,
              author_id: sharingPost.author_id,
              author: sharingPost.author,
              avatar: sharingPost.avatar,
              content: sharingPost.content,
              media: sharingPost.media || null,
              timestamp: sharingPost.timestamp
            } : { id: p.original_post_id }
          ) : null
        };
        setPosts([newP, ...posts]);
      } else {
        // fallback: reload feed
        loadFeed(effectiveTab);
      }

      // reset UI
      setNewPost('');
      setSelectedMedia(null);
      setSelectedLocation(null);
      setPollTitle('');
      setPollChoices(['', '']);
      setMediaType(null);
      setSharingPost(null);
      setShareCaption('');
      setShowNewPostModal(false);
      setPendingAction(null);
    } catch (err) {
      console.error('Create post failed:', err);
      setError('Unable to create post: ' + (err.message || 'Server error'));
    }
  };

  // --- Like/unlike a post ---
  const handleLikePost = async (postId) => {
    try {
      const data = await fetchWithAuth(`${API_BASE}/posts/${postId}/like`, { method: 'POST' });
      // backend returns { liked: true/false } (and maybe like object)
      setPosts(prev => prev.map(p => {
        if (p.id === postId) {
          const liked = data.liked ?? !p.userLiked;
          const prevCount = p.likes_count ?? p.likes ?? 0;
          const delta = liked === p.userLiked ? 0 : (liked ? 1 : -1);
          const likesCount = Math.max(prevCount + delta, 0);
          return { ...p, userLiked: liked, likes: likesCount, likes_count: likesCount };
        }
        return p;
      }));
      loadNotifications();
    } catch (err) {
      console.error('Like failed:', err);
      setError('Failed to like post. Please try again.');
    }
  };

  // --- Add comment ---
  const handleAddComment = async (postId) => {
    const text = (commentInputs[postId] || '').trim();
    if (!text) return;
    // prevent duplicate submissions
    if (commentPosting[postId]) return;
    setCommentErrors(prev => ({ ...prev, [postId]: '' }));
    setCommentPosting(prev => ({ ...prev, [postId]: true }));
    try {
      const data = await fetchWithAuth(`${API_BASE}/posts/${postId}/comments`, {
        method: 'POST',
        body: JSON.stringify({ text })
      });
      
      if (data.comment) {
        // map to your comment shape
        const c = {
          id: data.comment.comment_id || data.comment.id,
          author: data.comment.author?.name || me?.name || 'User',
          author_id: me?.id || data.comment.farmer_id || data.comment.author_id,
          text: data.comment.text,
          timestamp: formatTimestamp(data.comment.created_at),
          likes: data.comment.likes_count || data.comment.likes || 0,
          userLiked: false,
          replies: []
        };
        // append locally and bump comments_count, then refresh from backend to ensure consistency
        setPosts(prev => prev.map(p => p.id === postId
          ? ({
              ...p,
              comments: [...(p.comments || []), c],
              comments_count: p.comments_count 
            })
          : p
        ));
        setCommentInputs(prev => ({ ...prev, [postId]: '' }));
        // fetch full comments list
        await loadComments(postId);
        await loadNotifications();
      } else {
        // fallback: reload feed
        await loadFeed(effectiveTab);
      }
    } catch (err) {
      console.error('Add comment failed:', err);
      const msg = 'Unable to add comment: ' + (err?.message || 'Server error');
      setError(msg);
      setCommentErrors(prev => ({ ...prev, [postId]: msg }));
    }
    finally {
      setCommentPosting(prev => ({ ...prev, [postId]: false }));
    }
  };

  // --- Load comments for a post from backend ---
  const loadComments = async (postId) => {
    try {
      const data = await fetchWithAuth(`${API_BASE}/posts/${postId}/comments`);
      // Build nested tree from flat list with parent_comment_id
      const flat = (data.comments || []).map(c => ({
        id: c.id,
        parent_comment_id: c.parent_comment_id || null,
        author: c.author?.name || 'User',
        author_id: c.author_id,
        avatar: normalizeMediaUrl(c.author?.avatar),
        text: c.text,
        timestamp: formatTimestamp(c.created_at),
        likes: c.likes_count || 0,
        userLiked: !!c.userLiked,
        replies: []
      }));

      const byId = new Map();
      flat.forEach(c => byId.set(c.id, c));
      const roots = [];
      flat.forEach(c => {
        const parentId = c.parent_comment_id;
        if (parentId && byId.has(parentId)) {
          const parent = byId.get(parentId);
          parent.replies = parent.replies || [];
          parent.replies.push(c);
        } else {
          roots.push(c);
        }
      });

      setPosts(prev => prev.map(p => p.id === postId ? ({ ...p, comments: roots, comments_count: (data.comments || []).length }) : p));
    } catch (err) {
      console.error('Load comments failed:', err);
      setError('Failed to load comments: ' + (err.message || 'Server error'));
    }
  };

  // --- Like/unlike a comment (persists to backend) ---
  const handleLikeComment = async (postId, commentId) => {
    // Find comment to see if it's a local-only reply
    const post = posts.find(p => p.id === postId);
    const comment = (post?.comments || []).find(c => c.id === commentId);
    if (comment && comment.local) {
      // For local-only replies, toggle locally
      setPosts(prev => prev.map(p => {
        if (p.id !== postId) return p;
        const newComments = (p.comments || []).map(c => {
          if (c.id === commentId) {
            return { ...c, userLiked: !c.userLiked, likes: (c.likes || 0) + (c.userLiked ? -1 : 1) };
          }
          const newReplies = (c.replies || []).map(r => r.id === commentId
            ? ({ ...r, userLiked: !r.userLiked, likes: (r.likes || 0) + (r.userLiked ? -1 : 1) })
            : r);
          return { ...c, replies: newReplies };
        });
        return { ...p, comments: newComments };
      }));
      loadNotifications();
      return;
    }

    try {
      const data = await fetchWithAuth(`${API_BASE}/comments/${commentId}/like`, { method: 'POST' });
      const liked = !!data.liked;
      const serverCount = (typeof data.likes_count === 'number') ? data.likes_count : undefined;
      setPosts(prev => prev.map(p => {
        if (p.id !== postId) return p;
        const newComments = (p.comments || []).map(c => {
          if (c.id === commentId) {
            const delta = liked === c.userLiked ? 0 : (liked ? 1 : -1);
            const newLikes = (serverCount !== undefined) ? serverCount : Math.max((c.likes || 0) + delta, 0);
            return { ...c, userLiked: liked, likes: newLikes };
          }
          const newReplies = (c.replies || []).map(r => {
            if (r.id !== commentId) return r;
            const delta = liked === r.userLiked ? 0 : (liked ? 1 : -1);
            const newLikes = (serverCount !== undefined) ? serverCount : Math.max((r.likes || 0) + delta, 0);
            return { ...r, userLiked: liked, likes: newLikes };
          });
          return { ...c, replies: newReplies };
        });
        return { ...p, comments: newComments };
      }));
    } catch (err) {
      console.error('Like comment failed:', err);
      setError('Failed to like comment. Please try again.');
    }
  };

  // --- Add reply to comment (persist to backend) ---
  const handleAddReply = async (postId, commentId) => {
    const key = `${postId}-${commentId}`;
    const replyText = (replyInputs[key] || '').trim();
    if (!replyText) return;
    try {
      const data = await fetchWithAuth(`${API_BASE}/posts/${postId}/comments`, {
        method: 'POST',
        body: JSON.stringify({ text: replyText, parent_comment_id: commentId })
      });
      setPosts(prev => prev.map(p => p.id === postId ? ({
        ...p,
        comments_count: ((p.comments_count ?? ((p.comments ? p.comments.length : 0))) + 1)
      }) : p));
      setReplyInputs(prev => ({ ...prev, [key]: '' }));
      setShowReplies(prev => ({ ...prev, [key]: true }));
      await loadComments(postId);
    } catch (err) {
      console.error('Add reply failed:', err);
      setError('Unable to add reply: ' + (err.message || 'Server error'));
    }
  };

  // --- Toggle replies visibility ---
  const toggleReplies = (postId, commentId) => {
    const key = `${postId}-${commentId}`;
    setShowReplies(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // --- Follow / unfollow user (calls backend toggleFollow endpoint) ---
  const handleFollowMember = async (memberIdOrName) => {
    // Try to find userId from posts by name if it's a string
    let userId = memberIdOrName;
    if (typeof userId !== 'number') {
      const found = posts.find(p => p.author === memberIdOrName);
      if (found) userId = found.author_id;
    }
    if (!userId) {
      setError('Cannot follow: user id not found');
      return;
    }

    try {
      const data = await fetchWithAuth(`${API_BASE}/users/${userId}/follow`, { method: 'POST' });
      // data.following is boolean
      const following = data.following ?? true;
      // update local followingMembers and posts
      setFollowingMembers(prev => ({ ...prev, [userId]: following }));
      setPosts(prev => prev.map(p => p.author_id === userId ? ({ ...p, isFollowed: following }) : p));
    } catch (err) {
      console.error('Follow failed:', err);
      setError('Failed to follow user. Please try again.');
    }
  };

  // --- Poll support: vote (calls backend) ---
  const handleVotePoll = async (pollId, choiceId) => {
    try {
      if (!Number.isInteger(pollId) || !Number.isInteger(choiceId)) {
        // The immediate UI may not have choice IDs yet; refresh and ask to retry
        setError('Loading poll options, please try again.');
        return;
      }
      const prevChoiceId = userVotes[pollId];
      const data = await fetchWithAuth(`${API_BASE}/polls/${pollId}/vote`, {
        method: 'POST',
        body: JSON.stringify({ choiceId })
      });
      // reflect selected choice locally so UI shows selection immediately
      setUserVotes(prev => ({ ...prev, [pollId]: choiceId }));

      // Update only the affected poll locally (avoid full feed reload)
      setPosts(prevPosts => prevPosts.map(p => {
        const updatePoll = (pollObj) => {
          if (!pollObj || pollObj.id !== pollId) return null;
          const choices = Array.isArray(pollObj.choices) ? pollObj.choices.map(c => ({ ...c })) : [];
          let totalVotes = pollObj.totalVotes || 0;
          if (prevChoiceId === undefined) {
            // first vote: increment selected and total
            const idx = choices.findIndex(c => c.id === choiceId);
            if (idx >= 0) choices[idx].votes_count = (choices[idx].votes_count || 0) + 1;
            totalVotes = totalVotes + 1;
          } else if (prevChoiceId !== choiceId) {
            // changed vote: decrement previous and increment new
            const prevIdx = choices.findIndex(c => c.id === prevChoiceId);
            if (prevIdx >= 0) choices[prevIdx].votes_count = Math.max((choices[prevIdx].votes_count || 0) - 1, 0);
            const idx = choices.findIndex(c => c.id === choiceId);
            if (idx >= 0) choices[idx].votes_count = (choices[idx].votes_count || 0) + 1;
            // totalVotes unchanged
          } // else same choice -> no change

          return { ...pollObj, choices, totalVotes };
        };

        // Update either a direct poll or an originalPost poll
        if (p.poll && p.poll.id === pollId) {
          const newPoll = updatePoll(p.poll);
          if (!newPoll) return p;
          return { ...p, poll: newPoll };
        }
        if (p.originalPost && p.originalPost.poll && p.originalPost.poll.id === pollId) {
          const newPoll = updatePoll(p.originalPost.poll);
          if (!newPoll) return p;
          return { ...p, originalPost: { ...p.originalPost, poll: newPoll } };
        }
        return p;
      }));
    } catch (err) {
      console.error('Vote failed:', err);
      setError('Vote failed: ' + (err.message || 'Server error'));
    }
  };

  // --- Helpers used by UI ---
  const toggleExpandComments = async (postId) => {
    const willExpand = !expandedComments[postId];
    setExpandedComments(prev => ({ ...prev, [postId]: willExpand }));
    if (willExpand) {
      const post = posts.find(p => p.id === postId);
      if (!post || !post.comments || post.comments.length === 0) {
        await loadComments(postId);
      }
    }
  };

  // --- Delete a comment (persists to backend) ---
  const handleDeleteComment = async (postId, commentId) => {
    try {
      await fetchWithAuth(`${API_BASE}/comments/${commentId}`, { method: 'DELETE' });
      setPosts(prev => prev.map(p => {
        if (p.id !== postId) return p;
        const remaining = (p.comments || []).filter(c => c.id !== commentId);
        const currentCount = p.comments_count ?? ((p.comments ? p.comments.length : 0));
        return { ...p, comments: remaining, comments_count: Math.max(currentCount - 1, 0) };
      }));
    } catch (err) {
      console.error('Delete comment failed:', err);
      setError('Unable to delete comment: ' + (err.message || 'Server error'));
    }
  };

  const openProfile = (user) => {
    setViewingProfile({
      id: user.author_id,
      name: user.author,
      avatar: user.avatar,
    });
  };
  // Backwards-compatible wrapper: accept { name, avatar } or { author, author_id, avatar }
  const handleViewProfile = (user) => {
    let id = user.author_id ?? user.id ?? null;
    let name = user.author ?? user.name;
    let avatar = user.avatar;
    // If user clicked on a generic "You" avatar, map to current user
    if ((!id || name === 'You') && me?.id) {
      id = me.id;
      if (name === 'You' || !name) name = me.name || 'You';
      if (!avatar) avatar = me.avatar;
    }
    if (!id && name && Array.isArray(posts)) {
      // Try matching a post authored by this user
      const foundPost = posts.find(p => p.author === name && p.author_id);
      if (foundPost) {
        id = foundPost.author_id;
        if (!avatar) avatar = foundPost.avatar;
      }
      // Try matching a comment by this user
      if (!id) {
        for (const p of posts) {
          const comments = Array.isArray(p.comments) ? p.comments : [];
          const foundComment = comments.find(c => c.author === name && c.author_id);
          if (foundComment) {
            id = foundComment.author_id;
            if (!avatar) avatar = foundComment.avatar;
            break;
          }
          // Try replies
          for (const c of comments) {
            const replies = Array.isArray(c.replies) ? c.replies : [];
            const foundReply = replies.find(r => r.author === name && r.author_id);
            if (foundReply) {
              id = foundReply.author_id;
              if (!avatar) avatar = foundReply.avatar;
              break;
            }
          }
          if (id) break;
        }
      }
    }
    openProfile({ author_id: id, author: name, avatar });
  };
  const handleCloseProfile = () => setViewingProfile(null);

  // Photo/video handlers
  const handlePhotoClick = () => { setPendingAction('photo'); setShowNewPostModal(true); };
  const handleVideoClick = () => { setPendingAction('video'); setShowNewPostModal(true); };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setSelectedMedia({ type: 'photo', url: reader.result, name: file.name });
      setMediaType('photo');
    };
    reader.readAsDataURL(file);
  };
  
  const handleVideoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setSelectedMedia({ type: 'video', url: reader.result, name: file.name });
      setMediaType('video');
    };
    reader.readAsDataURL(file);
  };

  // Location & Poll helpers
  const handleLocationClick = () => { setPendingAction('location'); setShowNewPostModal(true); };
  const handleLocationSelect = (location) => { setSelectedLocation(location); setShowLocationModal(false); };
  const handlePollClick = () => { setPendingAction('poll'); setShowNewPostModal(true); };
  const addPollChoice = () => setPollChoices(prev => [...prev, '']);
  const updatePollChoice = (index, value) => {
    const cp = [...pollChoices]; cp[index] = value; setPollChoices(cp);
  };
  const removePollChoice = (index) => { 
    if (pollChoices.length > 2) { 
      const cp = [...pollChoices]; 
      cp.splice(index, 1); 
      setPollChoices(cp); 
    } 
  };
  const savePoll = () => { 
    if (pollTitle.trim() && pollChoices.some(c => c.trim())) 
      setShowPollModal(false); 
  };

  // Handle sharing a post
  const handleSharePost = (post) => {
    setSharingPost(post);
    setShareCaption('');
    setShowNewPostModal(true);
  };

  // --- Post options menu actions ---
  const togglePostMenu = (postId) => {
    setPostMenuOpen(prev => prev === postId ? null : postId);
  };

  const toggleReportDetails = (postId) => {
    setExpandedReports(prev => ({ ...prev, [postId]: !prev[postId] }));
  };

  const createEventDraft = () => ({
    id: `event-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    date: '',
    title: '',
    description: ''
  });

  const startEditEvents = () => {
    setEventDrafts(upcomingEvents.map(event => ({ ...event })));
    setEditingEvents(true);
  };

  const cancelEditEvents = () => {
    setEditingEvents(false);
    setEventDrafts([]);
  };

  const addEventDraft = () => {
    setEventDrafts(prev => [...prev, createEventDraft()]);
  };

  const updateEventDraft = (eventId, field, value) => {
    setEventDrafts(prev => prev.map(event => (
      event.id === eventId ? { ...event, [field]: value } : event
    )));
  };

  const removeEventDraft = (eventId) => {
    setEventDrafts(prev => prev.filter(event => event.id !== eventId));
  };

  const saveEvents = () => {
    const normalized = eventDrafts.map(event => ({
      id: event.id || createEventDraft().id,
      date: (event.date || '').trim(),
      title: (event.title || '').trim(),
      description: (event.description || '').trim()
    })).filter(event => event.date || event.title || event.description);
    setUpcomingEvents(normalized);
    setEditingEvents(false);
    setEventDrafts([]);
    try {
      localStorage.setItem(EVENTS_STORAGE_KEY, JSON.stringify(normalized));
    } catch (e) {
      // ignore storage errors
    }
  };

  const handleDeletePost = async (postId) => {
    try {
      const post = posts.find(p => p.id === postId);
      const canDelete = isAdminUser || (post && post.author_id === me?.id);
      if (!canDelete) {
        setError('You are not allowed to delete this post.');
        return;
      }
      // optional confirmation
      // if (!window.confirm('Delete this post?')) return;
      await fetchWithAuth(`${API_BASE}/posts/${postId}`, { method: 'DELETE' });
      setPosts(prev => prev.filter(p => p.id !== postId));
      setPostMenuOpen(null);
    } catch (err) {
      console.error('Delete post failed:', err);
      setError('Unable to delete post: ' + (err.message || 'Server error'));
    }
  };

  const handleReportPost = async (postId) => {
    try {
      const post = posts.find(p => p.id === postId);
      if (!post) return;
      if (post.author_id === me?.id) {
        setError('You cannot report your own post.');
        return;
      }
      const reason = window.prompt('Why are you reporting this post?');
      if (!reason) return;
      const description = window.prompt('Additional details (optional):');

      await fetchWithAuth(`${API_BASE}/reports`, {
        method: 'POST',
        body: JSON.stringify({
          targetType: 'post',
          targetId: postId,
          reason,
          description: description || ''
        })
      });
      setPostMenuOpen(null);
      alert('Thanks for the report. Our team will review it.');
      setPosts(prev => prev.map(p => (
        p.id === postId
          ? { ...p, isReported: true, reportCount: (p.reportCount || 0) + 1 }
          : p
      )));
    } catch (err) {
      console.error('Report post failed:', err);
      setError('Unable to report post: ' + (err.message || 'Server error'));
    }
  };

  const handleStartEditPost = (post) => {
    setPostMenuOpen(null);
    setEditingPost(post);
    setSharingPost(null);
    setShareCaption('');
    // prefill location chip from the post
    const locName = (post.location && post.location.name) ? post.location.name : (typeof post.location === 'string' ? post.location : '');
    setSelectedLocation(locName ? { name: locName } : null);
    setSelectedMedia(null);
    setPollTitle('');
    setPollChoices(['', '']);
    setNewPost(post.content || '');
    setShowNewPostModal(true);
  };

  // Prefill current location (reverse geocode via backend)
  const prefillCurrentLocation = async () => {
    try {
      setLocationError('');
      if (!('geolocation' in navigator)) {
        setLocationError('Geolocation not supported');
        return;
      }
      setLocating(true);
      const getPos = () => new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 10000 });
      });
      const pos = await getPos();
      const { latitude, longitude } = pos.coords || {};
      if (typeof latitude !== 'number' || typeof longitude !== 'number') {
        setLocationError('Unable to detect location');
        return;
      }
      const url = `${API_BASE}/geo/reverse?lat=${encodeURIComponent(latitude)}&lon=${encodeURIComponent(longitude)}`;
      const data = await fetchWithAuth(url);
      if (data && data.name) {
        setSelectedLocation({ name: data.name, lat: data.lat, lon: data.lon, address: data.address });
      } else {
        setLocationError('Unable to fetch address');
      }
    } catch (e) {
      setLocationError('Location error: ' + (e?.message || 'Unknown'));
    } finally {
      setLocating(false);
    }
  };

  // Forward geocode: search by text
  const searchLocations = async (q) => {
    try {
      setSearchingLocation(true);
      const url = `${API_BASE}/geo/search?q=${encodeURIComponent(q)}`;
      const data = await fetchWithAuth(url);
      setLocationResults(data.results || []);
    } catch (e) {
      setLocationResults([]);
    } finally {
      setSearchingLocation(false);
    }
  };

  const onLocationInput = (e) => {
    const val = e.target.value;
    setLocationQuery(val);
    if (locationSearchTimer.current) clearTimeout(locationSearchTimer.current);
    if (!val.trim()) {
      setLocationResults([]);
      return;
    }
    locationSearchTimer.current = setTimeout(() => searchLocations(val.trim()), 350);
  };

  // Trigger pending action when modal opens
  useEffect(() => {
    if (showNewPostModal && pendingAction) {
      switch (pendingAction) {
        case 'photo': setTimeout(() => photoInputRef.current?.click(), 80); break;
        case 'video': setTimeout(() => videoInputRef.current?.click(), 80); break;
        case 'location':
          setTimeout(() => setShowLocationModal(true), 80);
          // If no location selected yet, try to prefill from device
          if (!selectedLocation) {
            setTimeout(() => { prefillCurrentLocation(); }, 120);
          }
          break;
        case 'poll': setTimeout(() => setShowPollModal(true), 80); break;
        default: break;
      }
      setPendingAction(null);
    }
  }, [showNewPostModal, pendingAction]);

  // Filter posts by tab and search term
  const filteredPosts = posts.filter(post => {
    const q = searchTerm.trim().toLowerCase();
    const matchesSearch = !q || ((post.content || '').toLowerCase().includes(q) || (post.author || '').toLowerCase().includes(q));
    if (!isAdminUser) {
      const isReported = post.isReported || post.reported || (post.reportCount || 0) > 0;
      const isFirstPost = post.isFirstPost || post.first_post || post.firstPost;
      if (isReported || isFirstPost) return false;
    }
    if (effectiveTab === 'followed') return matchesSearch && post.isFollowed;
    return matchesSearch;
  });

  // Get user notifications (from backend or fallback to local)
  const getUserNotifications = () => {
    if (notifications.length > 0) {
      return notifications.map(n => ({
        id: n.id,
        type: n.type,
        message: n.message,
        timestamp: formatTimestamp(n.created_at),
        postId: n.metadata?.post_id,
        preview: n.metadata?.preview || ''
      }));
    }
    
    // Fallback to local notifications
    const localNotifications = [];
    posts.forEach(post => {
      if (post.author === 'You' || post.author_name === 'You') {
        if ((post.likes || 0) > 0) {
          localNotifications.push({
            id: `like-${post.id}`,
            type: 'like',
            message: `${post.likes} ${(post.likes === 1) ? 'person' : 'people'} liked your post`,
            timestamp: post.timestamp,
            postId: post.id,
            preview: (post.content || '').substring(0, 50) + '...'
          });
        }
        (post.comments || []).forEach(comment => {
          localNotifications.push({
            id: `comment-${comment.id}`,
            type: 'comment',
            message: `${comment.author} commented: "${(comment.text || '').substring(0, 30)}${(comment.text || '').length > 30 ? '...' : ''}"`,
            timestamp: comment.timestamp,
            postId: post.id,
            preview: (post.content || '').substring(0, 50) + '...'
          });
        });
      }
    });
    return localNotifications;
  };

  const userNotifications = getUserNotifications();

  return (
    <>
      <style>{`
        /* Bloom Website Color Guide CSS */
        .community-website {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          color: #333333;
          background-color: #FAF9F6;
          min-height: 100vh;
          display: flex;
          flex-direction: column;
        }

        /* Header with new style */
        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
          padding: 1.5rem 2rem;
          background: #1B4332;
          backdrop-filter: blur(10px);
          border-radius: 20px;
          box-shadow: 0 10px 30px rgba(46, 139, 87, 0.15);
          border: 1px solid rgba(46, 139, 87, 0.2);
          animation: slideDown 0.5s ease-out;
          position: relative;
          z-index: 100;
        }

        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        /* Modern Search Bar Styles */
        .search-container {
          position: relative;
          flex-grow: 1;
          max-width: 500px;
          margin: 0 20px;
        }

        .search-bar {
          width: 100%;
          padding: 12px 50px 12px 20px;
          border: none;
          border-radius: 50px;
          background: rgba(255, 255, 255, 0.15);
          backdrop-filter: blur(10px);
          color: white;
          font-size: 16px;
          outline: none;
          transition: all 0.3s ease;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
        }

        .search-bar::placeholder {
          color: rgba(255, 255, 255, 0.7);
        }

        .search-bar:focus {
          background: rgba(255, 255, 255, 0.25);
          box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.2), 0 8px 25px rgba(0, 0, 0, 0.15);
          transform: translateY(-2px);
        }

        .search-icon {
          position: absolute;
          right: 15px;
          top: 50%;
          transform: translateY(-50%);
          color: rgba(255, 255, 255, 0.8);
          font-size: 18px;
          pointer-events: none;
          transition: color 0.3s ease;
        }

        .search-bar:focus + .search-icon {
          color: white;
        }

        /* Notification Dropdown - Fixed to appear above all content */
        .notification-dropdown {
          position: fixed;
          top: 80px;
          right: 20px;
          width: 380px;
          max-height: 500px;
          background: white;
          border-radius: 16px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.25);
          overflow: hidden;
          z-index: 9999;
          animation: slideDownFade 0.3s ease-out;
        }

        @keyframes slideDownFade {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .notification-header {
          padding: 20px;
          border-bottom: 1px solid #E8F3E8;
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: linear-gradient(135deg, #1B4332, #2E8B57);
          color: white;
        }

        .notification-header h3 {
          margin: 0;
          color: white;
          font-size: 18px;
          font-weight: 600;
        }

        .notification-count {
          background: rgba(255, 255, 255, 0.2);
          color: white;
          padding: 4px 10px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: bold;
          backdrop-filter: blur(10px);
        }

        .notification-list {
          max-height: 400px;
          overflow-y: auto;
        }

        .notification-item {
          padding: 16px 20px;
          border-bottom: 1px solid #F0F9F0;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: flex-start;
          gap: 12px;
          position: relative;
        }

        .notification-item:hover {
          background-color: #F8FBF8;
          transform: translateX(4px);
        }

        .notification-item:last-child {
          border-bottom: none;
        }

        .notification-icon {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
          flex-shrink: 0;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }

        .notification-icon.like {
          background: linear-gradient(135deg, #FF6B6B, #FF8E8E);
        }

        .notification-icon.comment {
          background: linear-gradient(135deg, #4ECDC4, #6EE7E0);
        }

        .notification-content {
          flex-grow: 1;
          min-width: 0;
        }

        .notification-message {
          font-size: 14px;
          color: #1B4332;
          margin-bottom: 4px;
          line-height: 1.4;
          font-weight: 500;
        }

        .notification-preview {
          font-size: 12px;
          color: #4F6F52;
          margin-bottom: 4px;
          font-style: italic;
        }

        .notification-time {
          font-size: 11px;
          color: #8CA88C;
        }

        .notification-empty {
          padding: 40px 20px;
          text-align: center;
          color: #4F6F52;
        }

        .notification-empty-icon {
          font-size: 48px;
          margin-bottom: 10px;
          opacity: 0.5;
        }

        .notification-empty-text {
          font-size: 14px;
        }

        /* Add cursor pointer to clickable user elements */
        .author-avatar, .author-info h4, 
        .comment-avatar, .comment-header h5,
        .reply-avatar, .reply-header h6,
        .member-avatar, .member-info h4,
        .user-avatar {
          cursor: pointer;
          transition: opacity 0.2s;
        }
        
        .author-avatar:hover, .author-info h4:hover,
        .comment-avatar:hover, .comment-header h5:hover,
        .reply-avatar:hover, .reply-header h6:hover,
        .member-avatar:hover, .member-info h4:hover,
        .user-avatar:hover {
          opacity: 0.8;
        }

        /* Profile modal styles */
        .profile-modal {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }
        
        .profile-container {
          width: 90%;
          max-width: 800px;
          max-height: 90vh;
          overflow-y: auto;
          background-color: white;
          border-radius: 12px;
          box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
        }

        /* Header content styles */
        .header-container {
          max-width: 1200px;
          margin: 0 auto;
          display: flex;
          justify-content: space-between;
          align-items: center;
          width: 100%;
        }

        .logo {
          display: flex;
          align-items: center;
          color: #FFFFFF;
        }

        .logo-icon {
          font-size: 32px;
          margin-right: 12px;
          color: #F2C94C;
          filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2));
          transition: transform 0.3s ease;
        }

        .logo-icon:hover {
          transform: rotate(15deg) scale(1.1);
        }

        .logo-text {
          font-size: 22px;
          font-weight: bold;
          letter-spacing: 0.5px;
        }

        .nav-actions {
          display: flex;
          align-items: center;
          gap: 15px;
          position: relative;
        }

        .notification-btn {
          background: none;
          border: none;
          color: white;
          font-size: 20px;
          cursor: pointer;
          position: relative;
          transition: all 0.2s;
        }

        .notification-btn:hover {
          transform: scale(1.1);
        }

        .notification-btn::after {
          content: '';
          position: absolute;
          top: 0;
          right: 0;
          width: 8px;
          height: 8px;
          background-color: #F2C94C;
          border-radius: 50%;
          animation: pulse 2s infinite;
        }

        .user-avatar {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background-color: #E8F3E8;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          cursor: pointer;
          transition: transform 0.2s;
        }

        .user-avatar:hover {
          transform: scale(1.1);
        }

        /* Main Content */
        .main-content {
          flex-grow: 1;
          padding: 20px 0;
        }

        .content-container {
          max-width: 1200px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: 280px 1fr 280px;
          gap: 20px;
          padding: 0 20px;
        }

        /* Sidebar */
        .sidebar, .right-sidebar {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .sidebar-card {
          background-color: white;
          border-radius: 12px;
          padding: 20px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
        }

        .sidebar-card h3 {
          margin-top: 0;
          margin-bottom: 20px;
          color: #1B4332;
          font-size: 18px;
          font-weight: 600;
        }

        .sidebar-card p {
          margin-bottom: 15px;
          font-size: 14px;
          line-height: 1.5;
        }

        .community-stats {
          display: flex;
          justify-content: space-between;
          margin-top: 20px;
        }

        .stat {
          text-align: center;
        }

        .stat-number {
          display: block;
          font-size: 20px;
          font-weight: bold;
          color: #2E8B57;
        }

        .stat-label {
          font-size: 12px;
          color: #4F6F52;
        }

        .guidelines-list {
          padding-left: 20px;
          margin: 0;
        }

        .guidelines-list li {
          margin-bottom: 8px;
          font-size: 14px;
          color: #4F6F52;
        }

        .event-item {
          display: flex;
          margin-bottom: 15px;
          padding-bottom: 15px;
          border-bottom: 1px solid #E8F3E8;
        }

        .event-item:last-child {
          margin-bottom: 0;
          padding-bottom: 0;
          border-bottom: none;
        }

        .event-date {
          background-color: #2E8B57;
          color: white;
          padding: 8px;
          border-radius: 8px;
          margin-right: 15px;
          text-align: center;
          min-width: 50px;
          font-weight: bold;
        }

        .event-details h4 {
          margin: 0 0 5px 0;
          font-size: 14px;
          color: #1B4332;
        }

        .event-details p {
          margin: 0;
          font-size: 12px;
          color: #4F6F52;
        }

        .events-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
        }

        .events-actions {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
        }

        .events-btn {
          background: #2E8B57;
          color: #fff;
          border: none;
          border-radius: 6px;
          padding: 6px 10px;
          font-size: 12px;
          cursor: pointer;
        }

        .events-btn.save {
          background: #1B4332;
        }

        .events-btn.cancel {
          background: #6b7280;
        }

        .events-editor {
          margin-top: 12px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .event-editor-item {
          background: #FAF9F6;
          border: 1px dashed #E8F3E8;
          border-radius: 10px;
          padding: 10px;
        }

        .event-input,
        .event-textarea {
          width: 100%;
          border: 1px solid #E8F3E8;
          border-radius: 6px;
          padding: 6px 8px;
          font-size: 12px;
          color: #1B4332;
          margin-bottom: 6px;
          background: #fff;
        }

        .event-textarea {
          resize: vertical;
          min-height: 60px;
        }

        .event-remove {
          background: #b45309;
          color: #fff;
          border: none;
          border-radius: 6px;
          padding: 4px 8px;
          font-size: 12px;
          cursor: pointer;
        }

        .events-empty {
          margin-top: 10px;
          font-size: 12px;
          color: #4F6F52;
        }

        /* Fixed Simplified Member Cards */
        .suggested-members-container {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .member-suggestion {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px;
          border-radius: 10px;
          transition: all 0.3s ease;
          background: linear-gradient(135deg, #FFFFFF 0%, #F8FBF8 100%);
          border: 1px solid #E8F3E8;
          min-height: 52px;
        }

        .member-suggestion:hover {
          background: linear-gradient(135deg, #F8FBF8 0%, #F0F9F0 100%);
          transform: translateY(-1px);
          box-shadow: 0 3px 8px rgba(46, 139, 87, 0.1);
        }

        .member-left {
          display: flex;
          align-items: center;
          gap: 10px;
          flex: 1;
          min-width: 0;
          overflow: hidden;
        }

        .member-avatar {
          width: 32px;
          height: 32px;
          min-width: 32px;
          min-height: 32px;
          max-width: 32px;
          max-height: 32px;
          border-radius: 50%;
          background-color: #E8F3E8;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
          position: relative;
          overflow: hidden;
          border: 2px solid #2E8B57;
          flex-shrink: 0;
          box-shadow: 0 2px 4px rgba(46, 139, 87, 0.15);
          transition: all 0.3s ease;
        }

        .member-avatar:hover {
          transform: scale(1.05);
          box-shadow: 0 3px 8px rgba(46, 139, 87, 0.25);
        }

        .member-avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          position: absolute;
          top: 0;
          left: 0;
        }

        .member-info {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 2px;
          flex: 1;
          min-width: 0;
        }

        .member-name-row {
          display: flex;
          align-items: center;
          gap: 6px;
          width: 100%;
        }

        .member-name {
          font-size: 13px;
          color: #1B4332;
          font-weight: 600;
          margin: 0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          flex: 1;
        }

        .member-badges {
          display: flex;
          gap: 4px;
          flex-shrink: 0;
        }

        .member-badge {
          display: inline-flex;
          align-items: center;
          padding: 1px 4px;
          border-radius: 6px;
          font-size: 8px;
          font-weight: 600;
          color: white;
          white-space: nowrap;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
        }

        .badge-expert {
          background: linear-gradient(135deg, #2E8B57, #1B4332);
        }

        .badge-new {
          background: linear-gradient(135deg, #6FCF97, #4CAF50);
        }

        .follow-btn {
          background: linear-gradient(135deg, #2E8B57, #6FCF97);
          color: white;
          border: none;
          padding: 5px 10px;
          border-radius: 14px;
          font-size: 11px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          white-space: nowrap;
          flex-shrink: 0;
          box-shadow: 0 2px 4px rgba(46, 139, 87, 0.25);
          display: flex;
          align-items: center;
          gap: 3px;
          margin-left: 8px;
        }

        .follow-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 3px 6px rgba(46, 139, 87, 0.35);
          background: linear-gradient(135deg, #6FCF97, #2E8B57);
        }

        .follow-btn.following {
          background: linear-gradient(135deg, #E8F3E8, #D4EED4);
          color: #2E8B57;
          border: 1px solid #2E8B57;
        }

        .follow-btn.following:hover {
          background: linear-gradient(135deg, #F0F9F0, #E8F3E8);
        }

        /* Active Members Section */
        .active-members-section {
          margin-top: 0;
        }

        .active-members-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 12px;
        }

        .active-members-header h3 {
          margin: 0;
          font-size: 16px;
          color: #1B4332;
          font-weight: 600;
        }

        .view-all-link {
          font-size: 12px;
          color: #2E8B57;
          text-decoration: none;
          font-weight: 500;
          transition: color 0.2s;
        }

        .view-all-link:hover {
          color: #1B4332;
          text-decoration: underline;
        }

        .active-member-item {
          display: flex;
          align-items: center;
          padding: 8px;
          border-radius: 10px;
          transition: all 0.2s ease;
          background-color: #FAF9F6;
          margin-bottom: 6px;
        }

        .active-member-item:hover {
          background-color: #F0F9F0;
          transform: translateX(3px);
        }

        .active-member-item:last-child {
          margin-bottom: 0;
        }

        .active-member-avatar {
          width: 32px;
          height: 32px;
          min-width: 32px;
          min-height: 32px;
          max-width: 32px;
          max-height: 32px;
          border-radius: 50%;
          background-color: #E8F3E8;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
          margin-right: 10px;
          position: relative;
          overflow: hidden;
          border: 2px solid #2E8B57;
          flex-shrink: 0;
        }

        .active-member-avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          position: absolute;
          top: 0;
          left: 0;
        }

        .active-member-info {
          flex-grow: 1;
          min-width: 0;
        }

        .active-member-name {
          font-size: 12px;
          color: #1B4332;
          font-weight: 600;
          margin-bottom: 2px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .active-status {
          font-size: 9px;
          color: #2E8B57;
          display: flex;
          align-items: center;
          gap: 3px;
        }

        .active-dot {
          width: 4px;
          height: 4px;
          background-color: #2E8B57;
          border-radius: 50%;
          animation: pulse 2s infinite;
        }

        /* Feed */
        .feed {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .create-post-card {
          background-color: white;
          border-radius: 12px;
          padding: 15px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
        }

        .create-post-header {
          display: flex;
          align-items: center;
          margin-bottom: 10px;
        }

        .create-post-header input {
          flex-grow: 1;
          padding: 10px 15px;
          border: 1px solid #E8F3E8;
          border-radius: 25px;
          margin-left: 10px;
          font-size: 14px;
          background-color: #FAF9F6;
          cursor: pointer;
        }

        .create-post-actions {
          display: flex;
          justify-content: space-around;
          border-top: 1px solid #E8F3E8;
          padding-top: 10px;
        }

        .action-btn {
          background: none;
          border: none;
          color: #4F6F52;
          font-size: 14px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 5px;
          transition: color 0.3s;
        }

        .action-btn:hover {
          color: #2E8B57;
        }

        .action-btn.liked {
          color: #F4D6CC;
        }

        .feed-tabs {
          display: flex;
          background-color: white;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
        }

        .tab {
          flex: 1;
          padding: 12px;
          background: none;
          border: none;
          font-size: 14px;
          font-weight: 500;
          color: #4F6F52;
          cursor: pointer;
          transition: all 0.3s;
        }

        .tab.active {
          background-color: #2E8B57;
          color: white;
        }

        .tab:hover:not(.active) {
          background-color: #E8F3E8;
        }

        .posts-container {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .post-card {
          background-color: white;
          border-radius: 12px;
          padding: 15px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
        }
        .post-card.highlighted {
          box-shadow: 0 0 0 3px rgba(111, 207, 151, 0.45), 0 6px 18px rgba(0, 0, 0, 0.08);
          transition: box-shadow 0.3s ease;
        }

        .post-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 15px;
        }

        .post-author {
          display: flex;
          align-items: center;
        }

        .author-avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background-color: #E8F3E8;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          margin-right: 10px;
        }

        .author-info h4 {
          margin: 0 0 3px 0;
          font-size: 16px;
          color: #1B4332;
        }

        .author-info span {
          font-size: 12px;
          color: #4F6F52;
        }

        .author-meta {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .report-badge {
          font-size: 11px;
          font-weight: 600;
          color: #7a1b1b;
          background: #fdecea;
          border: 1px solid #f5c2c7;
          padding: 2px 6px;
          border-radius: 999px;
          cursor: pointer;
          appearance: none;
          line-height: 1.2;
        }

        .report-details {
          margin-top: 12px;
          padding: 10px 12px;
          background: #fff7ed;
          border: 1px solid #fed7aa;
          border-radius: 10px;
        }

        .report-details-title {
          font-size: 12px;
          font-weight: 600;
          color: #7c2d12;
          margin-bottom: 6px;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }

        .report-detail-item {
          padding: 6px 0;
          border-top: 1px dashed #f3c7a3;
        }

        .report-detail-item:first-child {
          border-top: none;
        }

        .report-detail-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 12px;
          color: #7c2d12;
          gap: 8px;
        }

        .report-detail-reason {
          font-weight: 600;
        }

        .report-detail-meta {
          color: #9a3412;
          font-size: 11px;
        }

        .report-detail-desc {
          font-size: 12px;
          color: #7c2d12;
          margin-top: 4px;
        }

        .report-detail-reporter {
          font-size: 11px;
          color: #9a3412;
          margin-top: 4px;
        }

        .post-options {
          background: none;
          border: none;
          font-size: 20px;
          color: #4F6F52;
          cursor: pointer;
        }

        .post-content {
          margin-bottom: 15px;
          line-height: 1.5;
        }

        .post-media {
          margin-bottom: 15px;
          border-radius: 8px;
          overflow: hidden;
        }

        .post-media img {
          width: 100%;
          height: auto;
          display: block;
        }

        .post-media video {
          width: 100%;
          height: auto;
          display: block;
        }

        .post-location {
          display: flex;
          align-items: center;
          margin-bottom: 15px;
          color: #4F6F52;
          font-size: 14px;
        }

        .post-location-icon {
          margin-right: 5px;
        }

        /* Shared Post Styles */
        .shared-post {
          background-color: #F0F9F0;
          border-radius: 12px;
          padding: 15px;
          margin-bottom: 15px;
          border-left: 4px solid #2E8B57;
        }

        .shared-post-header {
          display: flex;
          align-items: center;
          margin-bottom: 10px;
          font-size: 12px;
          color: #4F6F52;
        }

        .shared-post-header .shared-avatar {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background-color: #E8F3E8;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
          margin-right: 8px;
        }

        .shared-post-content {
          margin-bottom: 10px;
        }

        .shared-post-content p {
          margin: 0;
          font-size: 14px;
          line-height: 1.4;
        }

        .shared-post-media {
          border-radius: 8px;
          overflow: hidden;
          margin-bottom: 10px;
        }

        .shared-post-media img {
          width: 100%;
          height: auto;
          display: block;
        }

        .shared-post-media video {
          width: 100%;
          height: auto;
          display: block;
        }

        /* Enhanced Poll Styles with Theme Colors */
        .post-poll {
          background: linear-gradient(135deg, #E8F3E8 0%, #D4EED4 50%, #C0E5C0 100%);
          border-radius: 16px;
          padding: 20px;
          margin-bottom: 20px;
          box-shadow: 0 4px 15px rgba(27, 67, 50, 0.1);
          position: relative;
          overflow: hidden;
          border: 1px solid rgba(46, 139, 87, 0.1);
        }

        .post-poll::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 4px;
          background: linear-gradient(90deg, #1B4332, #2E8B57, #6FCF97);
        }

        .poll-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }

        .poll-title {
          font-size: 18px;
          font-weight: bold;
          color: #1B4332;
          margin: 0;
        }

        .poll-badge {
          background-color: #2E8B57;
          color: white;
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: bold;
          display: flex;
          align-items: center;
          gap: 5px;
        }

        .poll-choices {
          margin-bottom: 15px;
        }

        .poll-choice {
          position: relative;
          margin-bottom: 12px;
          cursor: pointer;
          transition: transform 0.2s;
        }

        .poll-choice:hover {
          transform: translateY(-2px);
        }

        .poll-choice-content {
          display: flex;
          align-items: center;
          background-color: white;
          border-radius: 12px;
          padding: 15px;
          box-shadow: 0 2px 8px rgba(27, 67, 50, 0.08);
          position: relative;
          overflow: hidden;
          border: 1px solid rgba(46, 139, 87, 0.1);
        }

        .poll-choice-bar {
          position: absolute;
          top: 0;
          left: 0;
          height: 100%;
          background: linear-gradient(90deg, #2E8B57, #6FCF97);
          border-radius: 12px;
          transition: width 0.5s ease;
          z-index: 1;
        }

        .poll-choice-info {
          position: relative;
          z-index: 2;
          display: flex;
          justify-content: space-between;
          align-items: center;
          width: 100%;
        }

        .poll-choice-text {
          font-size: 15px;
          font-weight: 500;
          color: #1B4332;
          flex-grow: 1;
        }

        .poll-choice-stats {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .poll-choice-percentage {
          font-size: 16px;
          font-weight: bold;
          color: #2E8B57;
        }

        .poll-choice-votes {
          font-size: 12px;
          color: #4F6F52;
        }

        /* Leading choice emphasis */
        .poll-choice.leading .poll-choice-text {
          font-weight: 600;
          color: #1f6f4a;
        }
        .poll-choice-leading {
          background: #e8f5ef;
          color: #1f6f4a;
          border: 1px solid #bfe3d2;
          border-radius: 10px;
          padding: 2px 8px;
          font-size: 11px;
          margin-left: 8px;
        }

        .poll-choice-radio {
          width: 20px;
          height: 20px;
          border: 2px solid #2E8B57;
          border-radius: 50%;
          margin-right: 12px;
          position: relative;
          z-index: 2;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .poll-choice-radio.selected {
          background-color: #2E8B57;
        }

        .poll-choice-radio.selected::after {
          content: '✓';
          color: white;
          font-size: 12px;
        }

        .poll-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-top: 15px;
          border-top: 1px solid rgba(46, 139, 87, 0.2);
        }

        .poll-total-votes {
          font-size: 14px;
          color: #4F6F52;
          display: flex;
          align-items: center;
          gap: 5px;
        }

        .poll-end-date {
          font-size: 12px;
          color: #4F6F52;
        }

        .poll-vote-btn {
          background: linear-gradient(135deg, #2E8B57, #6FCF97);
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 25px;
          font-size: 14px;
          font-weight: bold;
          cursor: pointer;
          transition: all 0.3s;
          box-shadow: 0 2px 8px rgba(46, 139, 87, 0.3);
        }

        .poll-vote-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(46, 139, 87, 0.4);
        }

        .poll-vote-btn:disabled {
          background: #ccc;
          cursor: not-allowed;
          transform: none;
          box-shadow: none;
        }

        .post-actions {
          display: flex;
          justify-content: space-around;
          padding: 10px 0;
          border-top: 1px solid #E8F3E8;
          border-bottom: 1px solid #E8F3E8;
        }

        /* Enhanced Comments Section */
        .comments-section {
          margin-top: 15px;
        }

        .comment {
          display: flex;
          margin-bottom: 15px;
        }

        .comment-avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background-color: #E8F3E8;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
          margin-right: 10px;
          flex-shrink: 0;
        }

        .comment-content {
          flex-grow: 1;
          background-color: #E8F3E8;
          padding: 10px;
          border-radius: 12px;
        }

        .comment-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 5px;
        }

        .comment-header h5 {
          margin: 0;
          font-size: 14px;
          color: #1B4332;
        }

        .comment-header span {
          font-size: 11px;
          color: #4F6F52;
        }

        .comment-content p {
          margin: 0 0 8px 0;
          font-size: 14px;
        }

        .comment-actions {
          display: flex;
          gap: 15px;
          font-size: 12px;
        }

        .comment-action {
          background: none;
          border: none;
          color: #4F6F52;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 4px;
          transition: color 0.3s;
        }

        .comment-action:hover {
          color: #2E8B57;
        }

        .comment-action.liked {
          color: #F4D6CC;
        }

        .comment-replies {
          margin-left: 42px;
          margin-top: 10px;
        }

        .reply {
          display: flex;
          margin-bottom: 10px;
        }

        .reply-avatar {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background-color: #D4EED4;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
          margin-right: 8px;
          flex-shrink: 0;
        }

        .reply-content {
          flex-grow: 1;
          background-color: #F0F9F0;
          padding: 8px;
          border-radius: 10px;
        }

        .reply-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 4px;
        }

        .reply-header h6 {
          margin: 0;
          font-size: 13px;
          color: #1B4332;
        }

        .reply-header span {
          font-size: 10px;
          color: #4F6F52;
        }

        .reply-content p {
          margin: 0 0 6px 0;
          font-size: 13px;
        }

        .reply-actions {
          display: flex;
          gap: 12px;
          font-size: 11px;
        }

        .reply-action {
          background: none;
          border: none;
          color: #4F6F52;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 3px;
          transition: color 0.3s;
        }

        .reply-action:hover {
          color: #2E8B57;
        }

        .reply-action.liked {
          color: #F4D6CC;
        }

        .add-comment {
          display: flex;
          align-items: center;
          margin-top: 15px;
        }

        .add-comment input {
          flex-grow: 1;
          padding: 8px 12px;
          border: 1px solid #E8F3E8;
          border-radius: 20px;
          margin-left: 10px;
          font-size: 14px;
        }

        .add-comment button {
          background-color: #2E8B57;
          color: white;
          border: none;
          padding: 8px 15px;
          border-radius: 20px;
          margin-left: 10px;
          font-size: 14px;
          cursor: pointer;
          transition: background-color 0.3s;
        }

        .add-comment button:hover {
          background-color: #6FCF97;
        }

        .add-reply {
          display: flex;
          align-items: center;
          margin-top: 8px;
          margin-left: 42px;
        }

        .add-reply input {
          flex-grow: 1;
          padding: 6px 10px;
          border: 1px solid #D4EED4;
          border-radius: 15px;
          margin-left: 8px;
          font-size: 13px;
        }

        .add-reply button {
          background-color: #2E8B57;
          color: white;
          border: none;
          padding: 6px 12px;
          border-radius: 15px;
          margin-left: 8px;
          font-size: 13px;
          cursor: pointer;
          transition: background-color 0.3s;
        }

        .add-reply button:hover {
          background-color: #6FCF97;
        }

        .no-posts {
          text-align: center;
          padding: 40px 20px;
          background-color: white;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
        }

        .no-posts-icon {
          font-size: 48px;
          margin-bottom: 15px;
        }

        .no-posts h3 {
          margin: 0 0 10px 0;
          color: #1B4332;
        }

        .no-posts p {
          margin: 0;
          color: #4F6F52;
        }

        /* See More Comments Button */
        .see-more-comments {
          display: flex;
          justify-content: center;
          margin: 10px 0;
        }

        .see-more-btn {
          background: none;
          border: none;
          color: #2E8B57;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          padding: 8px 16px;
          border-radius: 20px;
          transition: all 0.3s;
          display: flex;
          align-items: center;
          gap: 5px;
        }

        .see-more-btn:hover {
          background-color: #E8F3E8;
          transform: translateY(-1px);
        }

        .see-more-btn-icon {
          font-size: 12px;
          transition: transform 0.3s;
        }

        .see-more-btn:hover .see-more-btn-icon {
          transform: rotate(180deg);
        }

        /* Modal */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .modal {
          background-color: white;
          border-radius: 12px;
          width: 90%;
          max-width: 600px;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px;
          border-bottom: 1px solid #E8F3E8;
        }

        .modal-header h2 {
          margin: 0;
          color: #1B4332;
        }

        .close-btn {
          background: none;
          border: none;
          font-size: 24px;
          color: #4F6F52;
          cursor: pointer;
        }

        .modal-content {
          padding: 20px;
        }

        .create-post-form {
          display: flex;
          margin-bottom: 20px;
        }

        .create-post-form textarea {
          flex-grow: 1;
          padding: 15px;
          border: 1px solid #E8F3E8;
          border-radius: 12px;
          margin-left: 10px;
          font-size: 16px;
          min-height: 150px;
          resize: none;
          font-family: inherit;
        }

        .modal-actions {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-top: 1px solid #E8F3E8;
          padding-top: 15px;
        }

        .action-buttons {
          display: flex;
          gap: 15px;
        }

        .post-actions {
          display: flex;
          gap: 10px;
        }

        .cancel-btn {
          background: none;
          border: none;
          padding: 8px 15px;
          border-radius: 20px;
          font-size: 14px;
          color: #4F6F52;
          cursor: pointer;
        }

        .post-btn {
          background-color: #2E8B57;
          color: white;
          border: none;
          padding: 8px 20px;
          border-radius: 20px;
          font-size: 14px;
          font-weight: bold;
          cursor: pointer;
          transition: background-color 0.3s;
        }

        .post-btn:hover {
          background-color: #6FCF97;
        }

        /* Media Preview */
        .media-preview {
          margin: 15px 0;
          border-radius: 8px;
          overflow: hidden;
          position: relative;
        }

        .media-preview img {
          width: 100%;
          height: auto;
          display: block;
        }

        .media-preview video {
          width: 100%;
          height: auto;
          display: block;
        }

        .remove-media {
          position: absolute;
          top: 10px;
          right: 10px;
          background-color: rgba(0, 0, 0, 0.5);
          color: white;
          border: none;
          border-radius: 50%;
          width: 30px;
          height: 30px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }

        /* Location Modal */
        .location-map {
          height: 300px;
          background-color: #E8F3E8;
          border-radius: 8px;
          margin-bottom: 15px;
          position: relative;
          overflow: hidden;
        }

        .map-placeholder {
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          color: #4F6F52;
        }

        .map-icon {
          font-size: 48px;
          margin-bottom: 10px;
        }

        .location-search {
          display: flex;
          margin-bottom: 15px;
        }

        .location-search input {
          flex-grow: 1;
          padding: 10px;
          border: 1px solid #E8F3E8;
          border-radius: 4px 0 0 4px;
        }

        .location-search button {
          background-color: #2E8B57;
          color: white;
          border: none;
          padding: 0 15px;
          border-radius: 0 4px 4px 0;
          cursor: pointer;
        }

        .suggested-locations {
          max-height: 150px;
          overflow-y: auto;
        }

        .location-item {
          padding: 10px;
          border-bottom: 1px solid #E8F3E8;
          cursor: pointer;
          display: flex;
          align-items: center;
        }

        .location-item:hover {
          background-color: #F0F9F0;
        }

        .location-item-icon {
          margin-right: 10px;
        }

        .selected-location {
          background-color: #E8F3E8;
          padding: 10px;
          border-radius: 8px;
          margin-bottom: 15px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .selected-location-info {
          display: flex;
          align-items: center;
        }

        .selected-location-icon {
          margin-right: 10px;
        }

        .remove-location {
          background: none;
          border: none;
          color: #4F6F52;
          cursor: pointer;
        }

        /* Poll Modal */
        .poll-form {
          margin-bottom: 20px;
        }

        .form-group {
          margin-bottom: 15px;
        }

        .form-group label {
          display: block;
          margin-bottom: 5px;
          font-weight: bold;
          color: #1B4332;
        }

        .form-group input {
          width: 100%;
          padding: 10px;
          border: 1px solid #E8F3E8;
          border-radius: 4px;
        }

        .poll-choices {
          margin-bottom: 15px;
        }

        .poll-choice-item {
          display: flex;
          margin-bottom: 10px;
        }

        .poll-choice-item input {
          flex-grow: 1;
          padding: 10px;
          border: 1px solid #E8F3E8;
          border-radius: 4px;
        }

        .remove-choice {
          background: none;
          border: none;
          color: #4F6F52;
          margin-left: 10px;
          cursor: pointer;
        }

        .add-choice {
          background: none;
          border: 1px dashed #2E8B57;
          color: #2E8B57;
          padding: 8px;
          border-radius: 4px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
        }

        .add-choice:hover {
          background-color: #F0F9F0;
        }

        .selected-poll {
          background-color: #E8F3E8;
          padding: 15px;
          border-radius: 8px;
          margin-bottom: 15px;
        }

        .selected-poll-title {
          font-weight: bold;
          margin-bottom: 10px;
          color: #1B4332;
        }

        .selected-poll-choices {
          margin-bottom: 10px;
        }

        .selected-poll-choice {
          margin-bottom: 5px;
          color: #4F6F52;
        }

        .remove-poll {
          background: none;
          border: none;
          color: #4F6F52;
          cursor: pointer;
        }

        /* Loading State */
        .loading-container {
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 40px;
        }

        .loading-spinner {
          border: 4px solid rgba(46, 139, 87, 0.1);
          border-radius: 50%;
          border-top: 4px solid #2E8B57;
          width: 40px;
          height: 40px;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        /* Error State */
        .error-container {
          background-color: #fff5f5;
          border: 1px solid #fed7d7;
          border-radius: 8px;
          padding: 16px;
          margin-bottom: 20px;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .error-icon {
          color: #e53e3e;
          font-size: 20px;
        }

        .error-message {
          color: #e53e3e;
          font-size: 14px;
        }
        {/* Ambient background decoration */
        /* Responsive Design */
        @media (max-width: 1024px) {
          .content-container {
            grid-template-columns: 1fr 300px;
          }
          
          .sidebar {
            display: none;
          }
        }

        @media (max-width: 768px) {
          .content-container {
            grid-template-columns: 1fr;
          }
          
          .right-sidebar {
            display: none;
          }
          
          .header-container {
            flex-direction: column;
            gap: 10px;
          }
          
          .search-container {
            width: 100%;
            margin: 10px 0;
          }

          .notification-dropdown {
            width: 320px;
            right: 10px;
            top: 70px;
          }
        }

        @media (max-width: 480px) {
          .modal {
            width: 95%;
          }

          .notification-dropdown {
            width: 280px;
            right: 5px;
            top: 60px;
          }
        }
      `}</style>

      <div className="community-website">
        {useAdminHeader ? <AdminHeader /> : <Header />}

        {/* Error Message */}
        {error && (
          <div className="error-container">
            <span className="error-icon">⚠️</span>
            <span className="error-message">{error}</span>
            <button onClick={() => setError(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
          </div>
        )}

        {/* Main Content */}
        <main className="main-content">
          <div className="content-container">
            {/* Sidebar */}
            <aside className="sidebar">
              <div className="sidebar-card">
                <h3>About Bloom</h3>
                <p>A community for nature enthusiasts, plant lovers, and environmental advocates. Share your experiences, ask questions, and connect with like-minded individuals.</p>
                <div className="community-stats">
                  <div className="stat">
                    <span className="stat-number">2,847</span>
                    <span className="stat-label">Members</span>
                  </div>
                  <div className="stat">
                    <span className="stat-number">523</span>
                    <span className="stat-label">Online</span>
                  </div>
                </div>
              </div>
              
              <div className="sidebar-card">
                <h3>Community Guidelines</h3>
                <ul className="guidelines-list">
                  <li>Be respectful to all members</li>
                  <li>Share accurate information</li>
                  <li>No spam or self-promotion</li>
                  <li>Keep content nature-focused</li>
                  <li>Report inappropriate content</li>
                </ul>
              </div>
              
              <div className="sidebar-card">
                <div className="events-header">
                  <h3>Upcoming Events</h3>
                  {isAdminUser ? (
                    editingEvents ? (
                      <div className="events-actions">
                        <button className="events-btn" onClick={addEventDraft}>Add</button>
                        <button className="events-btn save" onClick={saveEvents}>Save</button>
                        <button className="events-btn cancel" onClick={cancelEditEvents}>Cancel</button>
                      </div>
                    ) : (
                      <button className="events-btn" onClick={startEditEvents}>Edit</button>
                    )
                  ) : null}
                </div>
                {editingEvents ? (
                  <div className="events-editor">
                    {eventDrafts.length === 0 ? (
                      <div className="events-empty">No events yet. Click Add to create one.</div>
                    ) : null}
                    {eventDrafts.map((event) => (
                      <div key={event.id} className="event-editor-item">
                        <input
                          type="text"
                          className="event-input"
                          placeholder="Date"
                          value={event.date}
                          onChange={(e) => updateEventDraft(event.id, 'date', e.target.value)}
                        />
                        <input
                          type="text"
                          className="event-input"
                          placeholder="Title"
                          value={event.title}
                          onChange={(e) => updateEventDraft(event.id, 'title', e.target.value)}
                        />
                        <textarea
                          className="event-textarea"
                          placeholder="Description"
                          value={event.description}
                          onChange={(e) => updateEventDraft(event.id, 'description', e.target.value)}
                        />
                        <button className="event-remove" onClick={() => removeEventDraft(event.id)}>Remove</button>
                      </div>
                    ))}
                  </div>
                ) : upcomingEvents.length > 0 ? (
                  upcomingEvents.map((event) => (
                    <div key={event.id} className="event-item">
                      <div className="event-date">{event.date}</div>
                      <div className="event-details">
                        <h4>{event.title}</h4>
                        <p>{event.description}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="events-empty">No upcoming events.</div>
                )}
              </div>
            </aside>

            {/* Feed */}
            <div className="feed">
              {/* Create Post */}
              <div className="create-post-card">
                <div className="create-post-header">
                  <div className="user-avatar" onClick={() => handleViewProfile({ name: 'You', avatar: '🌻' })}>🌻</div>
                  <input
                    type="text"
                    placeholder="Share your thoughts with the community..."
                    onClick={() => setShowNewPostModal(true)}
                    readOnly
                  />
                </div>
                <div className="create-post-actions">
                  <button className="action-btn" onClick={handlePhotoClick}>📷 Photo</button>
                  <button className="action-btn" onClick={handleVideoClick}>🎥 Video</button>
                  <button className="action-btn" onClick={handleLocationClick}>📍 Location</button>
                  <button className="action-btn" onClick={handlePollClick}>📊 Poll</button>
                </div>
              </div>

              {/* Tabs */}
              <div className="feed-tabs">
                <button
                  className={`tab ${effectiveTab === 'all' ? 'active' : ''}`}
                  onClick={() => setActiveTab('all')}
                >
                  All Posts
                </button>
                {!isAdminUser ? (
                  <button
                    className={`tab ${effectiveTab === 'followed' ? 'active' : ''}`}
                    onClick={() => setActiveTab('followed')}
                  >
                    For you 
                  </button>
                ) : null}
              </div>

              {/* Posts */}
              <div className="posts-container">
                {loading ? (
                  <div className="loading-container">
                    <div className="loading-spinner"></div>
                  </div>
                ) : filteredPosts.length > 0 ? (
                  filteredPosts.map(post => {
                    const canEditPost = post.author_id === me?.id;
                    const canDeletePost = isAdminUser || canEditPost;
                    const canReportPost = !isAdminUser && !canEditPost;

                    return (
                      <div key={post.id} id={`post-card-${post.id}`} className="post-card">
                        <div className="post-header">
                          <div className="post-author">
                            <div 
                              className="author-avatar" 
                              onClick={() => handleViewProfile({ author: post.author, author_id: post.author_id, avatar: post.avatar })}
                            >
                              {typeof post.avatar === 'string' && (/^https?:\/\//i.test(post.avatar) || post.avatar.startsWith('/')) ? (
                                <img src={post.avatar.startsWith('/') ? `${API_ORIGIN}${post.avatar}` : post.avatar} alt={post.author} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                              ) : (
                                post.avatar
                              )}
                            </div>
                            <div className="author-info">
                              <h4 onClick={() => handleViewProfile({ author: post.author, author_id: post.author_id, avatar: post.avatar })}>
                                {post.author}
                              </h4>
                              <div className="author-meta">
                                <span>{post.timestamp}</span>
                                {isAdminUser && (post.reportCount || 0) > 0 ? (
                                  <button
                                    type="button"
                                    className="report-badge"
                                    onClick={() => toggleReportDetails(post.id)}
                                  >
                                    Reported {post.reportCount}
                                  </button>
                                ) : null}
                              </div>
                            </div>
                          </div>
                          {canEditPost || canDeletePost || canReportPost ? (
                            <div style={{ position: 'relative' }}>
                              <button className="post-options" onClick={() => togglePostMenu(post.id)}>⋯</button>
                              {postMenuOpen === post.id ? (
                                <div style={{ position: 'absolute', right: 0, top: '28px', background: '#fff', border: '1px solid #e4e4e4', borderRadius: '8px', boxShadow: '0 4px 10px rgba(0,0,0,0.08)', zIndex: 5 }}>
                                  {canEditPost ? (
                                    <button style={{ display: 'block', width: '100%', padding: '8px 12px', background: 'transparent', border: 'none', textAlign: 'left', cursor: 'pointer' }} onClick={() => handleStartEditPost(post)}>Edit </button>
                                  ) : null}
                                  {canDeletePost ? (
                                    <button style={{ display: 'block', width: '100%', padding: '8px 12px', background: 'transparent', border: 'none', textAlign: 'left', cursor: 'pointer', color: '#b33' }} onClick={() => handleDeletePost(post.id)}>Delete</button>
                                  ) : null}
                                  {canReportPost ? (
                                    <button style={{ display: 'block', width: '100%', padding: '8px 12px', background: 'transparent', border: 'none', textAlign: 'left', cursor: 'pointer', color: '#b45309' }} onClick={() => handleReportPost(post.id)}>Report</button>
                                  ) : null}
                                </div>
                              ) : null}
                            </div>
                          ) : null}
                        </div>
                      <div className="post-content">
                        <p>{post.content}</p>
                      </div>

                      {isAdminUser && expandedReports[post.id] && (post.reportDetails || []).length > 0 ? (
                        <div className="report-details">
                          <div className="report-details-title">Reports</div>
                          {(post.reportDetails || []).map((report, index) => {
                            const metaText = [
                              report.status,
                              report.created_at ? formatTimestamp(report.created_at) : null
                            ].filter(Boolean).join(' / ');
                            return (
                              <div key={report.id || `report-${post.id}-${index}`} className="report-detail-item">
                                <div className="report-detail-header">
                                  <span className="report-detail-reason">{report.reason || 'Reported'}</span>
                                  {metaText ? <span className="report-detail-meta">{metaText}</span> : null}
                                </div>
                                {report.description ? (
                                  <div className="report-detail-desc">{report.description}</div>
                                ) : null}
                                {report.reporter?.name ? (
                                  <div className="report-detail-reporter">Reporter: {report.reporter.name}</div>
                                ) : null}
                              </div>
                            );
                          })}
                        </div>
                      ) : null}
                      
                      {/* Shared Post Content */}
                      {post.originalPost && (
                        <div className="shared-post">
                          <div className="shared-post-header">
                            <div className="shared-avatar">
                              {typeof post.originalPost.avatar === 'string' && (/^https?:\/\//i.test(post.originalPost.avatar) || post.originalPost.avatar.startsWith('/')) ? (
                                <img src={post.originalPost.avatar.startsWith('/') ? `${API_ORIGIN}${post.originalPost.avatar}` : post.originalPost.avatar} alt={post.originalPost.author} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                              ) : (
                                post.originalPost.avatar
                              )}
                            </div>
                            <span>{post.originalPost.author}</span>
                          </div>
                          <div className="shared-post-content">
                            <p>{post.originalPost.content}</p>
                          </div>
                          {post.originalPost.media && (
                            <div className="shared-post-media">
                              {post.originalPost.media.type === 'photo' ? (
                                <img src={post.originalPost.media.url} alt={post.originalPost.media.name} />
                              ) : (
                                <video controls>
                                  <source src={post.originalPost.media.url} type="video/mp4" />
                                  Your browser does not support the video tag.
                                </video>
                              )}
                            </div>
                          )}
                          {post.originalPost.poll && (
                            <div className="post-poll">
                              <div className="poll-header">
                                <h3 className="poll-title">{post.originalPost.poll.title}</h3>
                                <div className="poll-badge">
                                  📊 POLL
                                </div>
                              </div>
                              <div className="poll-choices">
            {(() => {
              const total = Array.isArray(post.originalPost.poll.choices)
                ? post.originalPost.poll.choices.reduce((s, ch) => s + (ch.votes_count || 0), 0)
                : 0;
              const maxVotes = Math.max(0, ...post.originalPost.poll.choices.map(ch => ch.votes_count || 0));
              return post.originalPost.poll.choices.map((choice, index) => {
                const percentage = total > 0 ? Math.round(((choice.votes_count || 0) / total) * 100) : 0;
                const hasVoted = userVotes[post.originalPost.poll.id] !== undefined;
                const isSelected = userVotes[post.originalPost.poll.id] === choice.id;
                const isLeading = (choice.votes_count || 0) === maxVotes && maxVotes > 0;
                
                return (
                  <div 
                    key={choice.id || index} 
                    className={`poll-choice ${isLeading ? 'leading' : ''}`}
                    onClick={() => (!hasVoted || !isSelected) && handleVotePoll(post.originalPost.poll.id, choice.id)}
                  >
                                    <div className="poll-choice-content">
                                      {hasVoted && (
                                        <div 
                                          className="poll-choice-bar"
                                          style={{ width: `${percentage}%` }}
                                        />
                                      )}
                                      <div className="poll-choice-info">
                                        <div className={`poll-choice-radio ${isSelected ? 'selected' : ''}`} />
                                        <span className="poll-choice-text">{choice.choice_text || choice}</span>
                                        <div className="poll-choice-stats">
                                          <span className="poll-choice-percentage">{percentage}%</span>
                                          <span className="poll-choice-votes">{choice.votes_count || 0} votes</span>
                                          {isLeading && <span className="poll-choice-leading">Leading</span>}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                );
                              });
                            })()}
                              </div>
                              <div className="poll-footer">
                                <div className="poll-total-votes">
                                {(() => {
                                  const t = Array.isArray(post.originalPost.poll.choices)
                                    ? post.originalPost.poll.choices.reduce((s, ch) => s + (ch.votes_count || 0), 0)
                                    : 0;
                                  return <> {t} {t === 1 ? 'vote' : 'votes'}</>;
                                })()}
                                </div>
                                <div className="poll-end-date">
                                  {post.originalPost?.poll?.endDate ? (
                                    <>Ends in {Math.ceil((new Date(post.originalPost.poll.endDate) - new Date()) / (1000 * 60 * 60 * 24))} days</>
                                  ) : null}
                                </div>
                              </div>
                              {userVotes[post.originalPost.poll.id] === undefined && (
                                <div style={{ textAlign: 'center', marginTop: '15px' }}>
                                  <button 
                                    className="poll-vote-btn"
                                    onClick={() => {
                                      // This will be handled by individual choice clicks
                                    }}
                                  >
                                    Vote Now
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                      
                      {/* Post Media */}
                      {post.media && !post.originalPost && (
                        <div className="post-media">
                          {post.media.type === 'photo' ? (
                            <img src={post.media.url} alt={post.media.name} />
                          ) : (
                            <video controls>
                              <source src={post.media.url} type="video/mp4" />
                              Your browser does not support the video tag.
                            </video>
                          )}
                        </div>
                      )}
                      
                      {/* Post Location */}
                      {post.location && !post.originalPost && (
                        <div className="post-location">
                          <span className="post-location-icon">📍</span>
                          <span>{post.location.name || post.location}</span>
                        </div>
                      )}
                      
                      {/* Post Poll */}
                      {post.poll && !post.originalPost && (
                        <div className="post-poll">
                          <div className="poll-header">
                            <h3 className="poll-title">{post.poll.title}</h3>
                            <div className="poll-badge">
                              📊 POLL
                            </div>
                          </div>
                          <div className="poll-choices">
            {(() => {
              const total = Array.isArray(post.poll.choices)
                ? post.poll.choices.reduce((s, ch) => s + (ch.votes_count || 0), 0)
                : 0;
              const maxVotes = Math.max(0, ...post.poll.choices.map(ch => ch.votes_count || 0));
              return post.poll.choices.map((choice, index) => {
                const percentage = total > 0 ? Math.round(((choice.votes_count || 0) / total) * 100) : 0;
                const hasVoted = userVotes[post.poll.id] !== undefined;
                const isSelected = userVotes[post.poll.id] === choice.id;
                const isLeading = (choice.votes_count || 0) === maxVotes && maxVotes > 0;

                return (
                  <div 
                    key={choice.id || index} 
                    className={`poll-choice ${isLeading ? 'leading' : ''}`}
                    onClick={() => (!hasVoted || !isSelected) && handleVotePoll(post.poll.id, choice.id)}
                  >
                                    <div className="poll-choice-content">
                                      {hasVoted && (
                                        <div 
                                          className="poll-choice-bar"
                                          style={{ width: `${percentage}%` }}
                                        />
                                      )}
                                      <div className="poll-choice-info">
                                        <div className={`poll-choice-radio ${isSelected ? 'selected' : ''}`} />
                                        <span className="poll-choice-text">{choice.choice_text || choice}</span>
                                        <div className="poll-choice-stats">
                                          <span className="poll-choice-percentage">{percentage}%</span>
                                          <span className="poll-choice-votes">{choice.votes_count || 0} votes</span>
                                          {isLeading && <span className="poll-choice-leading">Leading</span>}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                );
                              });
                            })()}
                          </div>
                          <div className="poll-footer">
                            <div className="poll-total-votes">
                              {(() => {
                                const t = Array.isArray(post.poll.choices) ? post.poll.choices.reduce((s, ch) => s + (ch.votes_count || 0), 0) : 0;
                                return <>{t} {t === 1 ? 'vote' : 'votes'}</>;
                              })()}
                            </div>
                            <div className="poll-end-date">
                              {post.poll?.endDate ? (
                                <>Ends in {Math.ceil((new Date(post.poll.endDate) - new Date()) / (1000 * 60 * 60 * 24))} days</>
                              ) : null}
                            </div>
                          </div>
                          {userVotes[post.poll.id] === undefined && (
                            <div style={{ textAlign: 'center', marginTop: '15px' }}>
                              <button 
                                className="poll-vote-btn"
                                onClick={() => {
                                  // This will be handled by individual choice clicks
                                }}
                              >
                                Vote Now
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                      
                      <div className="post-actions">
                        <button
                          className={`action-btn ${post.userLiked ? 'liked' : ''}`}
                          onClick={() => handleLikePost(post.id)}
                          aria-label={post.userLiked ? 'Unlike post' : 'Like post'}
                          title={post.userLiked ? 'Unlike post' : 'Like post'}
                        >
                          {post.userLiked ? '❤️' : '🤍'} {post.likes || post.likes_count || 0}
                        </button>
                        <button
  className="action-btn"
  onClick={() => toggleExpandComments(post.id)}
  aria-label={`View comments (${post.comments_count ?? 0})`}
  title={`View comments (${post.comments_count ?? 0})`}
>
  💬 {post.comments_count?? 0}
</button>

                        <button
                          className="action-btn"
                          onClick={() => handleSharePost(post)}
                          aria-label="Share post"
                          title="Share post"
                        >
                          🔄 Share
                        </button>
                      </div>
                      
                      {/* Enhanced Comments Section with Limited Display */}
                      {(expandedComments[post.id] || (post.comments && post.comments.length > 0)) && (
                        <div className="comments-section">
                          {/* Determine which comments to show */}
                          {(() => {
                            const isExpanded = expandedComments[post.id];
                            const allComments = Array.isArray(post.comments) ? post.comments : [];
                            const commentsToShow = isExpanded 
                              ? allComments 
                              : allComments.slice(0, 2); // Show only first 2 comments initially
                            
                            return (
                              <>
                                {commentsToShow.map(comment => (
                                  <div key={comment.id} className="comment">
                                    <div 
                                      className="comment-avatar"
                                      onClick={() => handleViewProfile({ name: comment.author, avatar: comment.author_id === me?.id ? '🌻' : '👤' })}
                                    >
                                      {comment.author_id === me?.id ? '🌻' : '👤'}
                                    </div>
                                    <div className="comment-content">
                                      <div className="comment-header">
                                        <h5 onClick={() => handleViewProfile({ name: comment.author, avatar: comment.author_id === me?.id ? '🌻' : '👤' })}>
                                          {comment.author}
                                        </h5>
                                        <span>{comment.timestamp}</span>
                                      </div>
                                      <p>{comment.text}</p>
                                      <div className="comment-actions">
                                        <button 
                                          className={`comment-action ${comment.userLiked ? 'liked' : ''}`}
                                          onClick={() => handleLikeComment(post.id, comment.id)}
                                          aria-label={comment.userLiked ? 'Unlike comment' : 'Like comment'}
                                          title={comment.userLiked ? 'Unlike comment' : 'Like comment'}
                                        >
                                          {comment.userLiked ? '❤️' : '🤍'} {comment.likes || 0}
                                        </button>
                                        <button 
                                          className="comment-action" 
                                          onClick={() => toggleReplies(post.id, comment.id)}
                                          aria-label={`Toggle replies (${comment.replies ? comment.replies.length : 0})`}
                                          title={`Toggle replies (${comment.replies ? comment.replies.length : 0})`}
                                        >
                                          💬 {comment.replies ? comment.replies.length : 0} {comment.replies && comment.replies.length === 1 ? 'Reply' : 'Replies'}
                                        </button>
                                      </div>
                                      
                                      {/* Show replies */}
                                      {showReplies[`${post.id}-${comment.id}`] && comment.replies && comment.replies.length > 0 && (
                                        <div className="comment-replies">
                                          {comment.replies.map(reply => (
                                            <div key={reply.id} className="reply">
                                              <div 
                                                className="reply-avatar"
                                                onClick={() => handleViewProfile({ name: reply.author, avatar: reply.author_id === me?.id ? '🌻' : '👤' })}
                                              >
                                                {reply.author_id === me?.id ? '🌻' : '👤'}
                                              </div>
                                              <div className="reply-content">
                                                <div className="reply-header">
                                                  <h6 onClick={() => handleViewProfile({ name: reply.author, avatar: reply.author_id === me?.id ? '🌻' : '👤' })}>
                                                    {reply.author}
                                                  </h6>
                                                  <span>{reply.timestamp}</span>
                                                </div>
                                                <p>{reply.text}</p>
                                                <div className="reply-actions">
                                                  <button 
                                                    className={`reply-action ${reply.userLiked ? 'liked' : ''}`}
                                                    onClick={() => handleLikeComment(post.id, reply.id)}
                                                    aria-label={reply.userLiked ? 'Unlike reply' : 'Like reply'}
                                                    title={reply.userLiked ? 'Unlike reply' : 'Like reply'}
                                                  >
                                                    {reply.userLiked ? '❤️' : '🤍'} {reply.likes || 0}
                                                  </button>
                                                  <button className="reply-action" aria-label="Reply to comment" title="Reply to comment">💬 Reply</button>
                                                </div>
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                      
                                      {/* Add reply input */}
                                      {showReplies[`${post.id}-${comment.id}`] && (
                                        <div className="add-reply">
                                          <div className="comment-avatar" onClick={() => handleViewProfile({ name: 'You', avatar: '🌻' })}>🌻</div>
                                          <input
                                            type="text"
                                            placeholder="Write a reply..."
                                            value={replyInputs[`${post.id}-${comment.id}`] || ''}
                                            onChange={(e) => setReplyInputs({
                                              ...replyInputs,
                                              [`${post.id}-${comment.id}`]: e.target.value
                                            })}
                                            onKeyDown={(e) => {
                                              if (e.key === 'Enter') {
                                                e.preventDefault();
                                                handleAddReply(post.id, comment.id);
                                              }
                                            }}
                                          />
                                          <button 
                                            onClick={() => handleAddReply(post.id, comment.id)}
                                            aria-label="Post reply"
                                            title="Post reply"
                                          >
                                            Reply
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                ))}
                                
                                {/* Show "See more" button if there are more comments than displayed */}
                                {post.comments.length > 2 && (
                                  <div className="see-more-comments">
                                    <button 
                                      className="see-more-btn" 
                                      onClick={() => toggleExpandComments(post.id)}
                                    >
                                      {isExpanded ? (
                                        <>
                                          Show less <span className="see-more-btn-icon">▲</span>
                                        </>
                                      ) : (
                                        <>
                                          See {post.comments.length - 2} more comments <span className="see-more-btn-icon">▼</span>
                                        </>
                                      )}
                                    </button>
                                  </div>
                                )}
                              </>
                            );
                          })()}
                          
                          {/* Add new comment */}
                          <div className="add-comment">
                            <div className="comment-avatar" onClick={() => handleViewProfile({ name: 'You', avatar: '🌻' })}>🌻</div>
                            <input
                              type="text"
                              placeholder="Add a comment..."
                              value={commentInputs[post.id] || ''}
                              onChange={(e) => setCommentInputs(prev => ({ ...prev, [post.id]: e.target.value }))}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && !commentPosting[post.id]) {
                                  e.preventDefault();
                                  handleAddComment(post.id);
                                }
                              }}
                            />
                            <button 
                              disabled={!((commentInputs[post.id] || '').trim()) || !!commentPosting[post.id]}
                              onClick={() => handleAddComment(post.id)}
                              aria-label="Post comment"
                              title="Post comment"
                            >
                              {commentPosting[post.id] ? 'Posting...' : 'Post'}
                            </button>
                            {commentErrors[post.id] && (
                              <div className="comment-error" style={{ color: '#c00', fontSize: '12px', marginLeft: '8px' }}>
                                {commentErrors[post.id]}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
                ) : (
                  <div className="no-posts">
                    <div className="no-posts-icon">🌱</div>
                    <h3>No posts found</h3>
                    <p>Try adjusting your search or filters</p>
                  </div>
                )}
              </div>
            </div>

            {/* Right Sidebar - Fixed Layout */}
            {!isAdminUser ? (
            <aside className="right-sidebar">
              <div className="sidebar-card">
                <h3>Suggested Members</h3>
                <div className="suggested-members-container">
                  <div className="member-suggestion">
                    <div className="member-left">
                      <div 
                        className="member-avatar"
                        onClick={() => handleViewProfile({ name: 'Flower Power', avatar: '🌸' })}
                      >
                        <img src="https://picsum.photos/seed/flowerpower/64/64.jpg" alt="Flower Power" />
                      </div>
                      <div className="member-info">
                        <div className="member-name-row">
                          <h4 className="member-name" onClick={() => handleViewProfile({ name: 'Flower Power', avatar: '🌸' })}>
                            Flower Power
                          </h4>
                        </div>
                        <div className="member-badges">
                          <span className="member-badge badge-expert">Expert</span>
                        </div>
                      </div>
                    </div>
                    <button 
                      className={`follow-btn ${followingMembers['Flower Power'] ? 'following' : ''}`}
                      onClick={() => handleFollowMember('Flower Power')}
                    >
                      {followingMembers['Flower Power'] ? (
                        <>
                          <FaCheck /> Following
                        </>
                      ) : (
                        <>
                          <FaUserPlus /> Follow
                        </>
                      )}
                    </button>
                  </div>
                  
                  <div className="member-suggestion">
                    <div className="member-left">
                      <div 
                        className="member-avatar"
                        onClick={() => handleViewProfile({ name: 'Forest Guardian', avatar: '🌲' })}
                      >
                        <img src="https://picsum.photos/seed/forestguardian/64/64.jpg" alt="Forest Guardian" />
                      </div>
                      <div className="member-info">
                        <div className="member-name-row">
                          <h4 className="member-name" onClick={() => handleViewProfile({ name: 'Forest Guardian', avatar: '🌲' })}>
                            Forest Guardian
                          </h4>
                        </div>
                      </div>
                    </div>
                    <button 
                      className={`follow-btn ${followingMembers['Forest Guardian'] ? 'following' : ''}`}
                      onClick={() => handleFollowMember('Forest Guardian')}
                    >
                      {followingMembers['Forest Guardian'] ? (
                        <>
                          <FaCheck /> Following
                        </>
                      ) : (
                        <>
                          <FaUserPlus /> Follow
                        </>
                      )}
                    </button>
                  </div>
                  
                  <div className="member-suggestion">
                    <div className="member-left">
                      <div 
                        className="member-avatar"
                        onClick={() => handleViewProfile({ name: 'Bug Enthusiast', avatar: '🦋' })}
                      >
                        <img src="https://picsum.photos/seed/bugenthusiast/64/64.jpg" alt="Bug Enthusiast" />
                      </div>
                      <div className="member-info">
                        <div className="member-name-row">
                          <h4 className="member-name" onClick={() => handleViewProfile({ name: 'Bug Enthusiast', avatar: '🦋' })}>
                            Bug Enthusiast
                          </h4>
                        </div>
                        <div className="member-badges">
                          <span className="member-badge badge-new">New</span>
                        </div>
                      </div>
                    </div>
                    <button 
                      className={`follow-btn ${followingMembers['Bug Enthusiast'] ? 'following' : ''}`}
                      onClick={() => handleFollowMember('Bug Enthusiast')}
                    >
                      {followingMembers['Bug Enthusiast'] ? (
                        <>
                          <FaCheck /> Following
                        </>
                      ) : (
                        <>
                          <FaUserPlus /> Follow
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="sidebar-card">
                <div className="active-members-section">
                  <div className="active-members-header">
                    <h3>Active People You Follow</h3>
                    <a href="#" className="view-all-link">View all</a>
                  </div>
                  <div className="suggested-members-container">
                    <div className="active-member-item">
                      <div 
                        className="active-member-avatar"
                        onClick={() => handleViewProfile({ name: 'Nature Enthusiast', avatar: '🌿' })}
                      >
                        <img src="https://picsum.photos/seed/natureenthusiast/64/64.jpg" alt="Nature Enthusiast" />
                      </div>
                      <div className="active-member-info">
                        <div className="active-member-name" onClick={() => handleViewProfile({ name: 'Nature Enthusiast', avatar: '🌿' })}>
                          Nature Enthusiast
                        </div>
                        <div className="active-status">
                          <span className="active-dot"></span>
                          Active now
                        </div>
                      </div>
                    </div>
                    
                    <div className="active-member-item">
                      <div 
                        className="active-member-avatar"
                        onClick={() => handleViewProfile({ name: 'Flower Power', avatar: '🌸' })}
                      >
                        <img src="https://picsum.photos/seed/flowerpower/64/64.jpg" alt="Flower Power" />
                      </div>
                      <div className="active-member-info">
                        <div className="active-member-name" onClick={() => handleViewProfile({ name: 'Flower Power', avatar: '🌸' })}>
                          Flower Power
                        </div>
                        <div className="active-status">
                          <span className="active-dot"></span>
                          Active 2h ago
                        </div>
                      </div>
                    </div>
                    
                    <div className="active-member-item">
                      <div 
                        className="active-member-avatar"
                        onClick={() => handleViewProfile({ name: 'Forest Guardian', avatar: '🌲' })}
                      >
                        <img src="https://picsum.photos/seed/forestguardian/64/64.jpg" alt="Forest Guardian" />
                      </div>
                      <div className="active-member-info">
                        <div className="active-member-name" onClick={() => handleViewProfile({ name: 'Forest Guardian', avatar: '🌲' })}>
                          Forest Guardian
                        </div>
                        <div className="active-status">
                          <span className="active-dot"></span>
                          Active yesterday
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </aside>
            ) : null}
          </div>
        </main>

        {/* Footer Component */}
        <Footer />

        {/* New Post Modal */}
        {showNewPostModal && (
          <div className="modal-overlay">
            <div className="modal">
              <div className="modal-header">
                <h2>{editingPost ? 'Edit Post' : (sharingPost ? 'Share Post' : 'Create a Post')}</h2>
                <button className="close-btn" onClick={() => {
                  setShowNewPostModal(false);
                  setPendingAction(null);
                  setSharingPost(null);
                  setShareCaption('');
                }}>✕</button>
              </div>
              <div className="modal-content">
                {/* Show shared post preview if sharing */}
                {sharingPost && (
                  <div className="shared-post" style={{ marginBottom: '20px' }}>
                    <div className="shared-post-header">
                      <div className="shared-avatar">{sharingPost.avatar}</div>
                      <span>{sharingPost.author}</span>
                    </div>
                    <div className="shared-post-content">
                      <p>{sharingPost.content}</p>
                    </div>
                    {sharingPost.media && (
                      <div className="shared-post-media">
                        {sharingPost.media.type === 'photo' ? (
                          <img src={sharingPost.media.url} alt={sharingPost.media.name} />
                        ) : (
                          <video controls>
                            <source src={sharingPost.media.url} type="video/mp4" />
                            Your browser does not support the video tag.
                          </video>
                        )}
                      </div>
                    )}
                  </div>
                )}

                <div className="create-post-form">
                  <div className="user-avatar" onClick={() => handleViewProfile({ name: 'You', avatar: '🌻' })}>🌻</div>
                  <textarea
                    placeholder={sharingPost ? "Add a caption..." : "Share your thoughts with the community..."}
                    value={sharingPost ? shareCaption : newPost}
                    onChange={(e) => sharingPost ? setShareCaption(e.target.value) : setNewPost(e.target.value)}
                  ></textarea>
                </div>
                
                {/* Media Preview */}
                {selectedMedia && !sharingPost && (
                  <div className="media-preview">
                    {selectedMedia.type === 'photo' ? (
                      <img src={selectedMedia.url} alt={selectedMedia.name} />
                    ) : (
                      <video controls>
                        <source src={selectedMedia.url} type="video/mp4" />
                        Your browser does not support the video tag.
                      </video>
                    )}
                    <button className="remove-media" onClick={() => setSelectedMedia(null)}>✕</button>
                  </div>
                )}
                
                {/* Selected Location */}
                {selectedLocation && !sharingPost && (
                  <div className="selected-location">
                    <div className="selected-location-info">
                      <span className="selected-location-icon">📍</span>
                      <span>{selectedLocation.name}</span>
                    </div>
                    <button className="remove-location" onClick={() => setSelectedLocation(null)}>✕</button>
                  </div>
                )}
                
                {/* Selected Poll */}
                {pollTitle && !sharingPost && (
                  <div className="selected-poll">
                    <div className="selected-poll-title">{pollTitle}</div>
                    <div className="selected-poll-choices">
                      {pollChoices.filter(choice => choice.trim()).map((choice, index) => (
                        <div key={index} className="selected-poll-choice">{choice}</div>
                      ))}
                    </div>
                    <button className="remove-poll" onClick={() => {
                      setPollTitle('');
                      setPollChoices(['', '']);
                    }}>✕ Remove Poll</button>
                  </div>
                )}
                
                <div className="modal-actions">
                  <div className="action-buttons">
                    {!sharingPost && (
                      <>
                        <button className="action-btn" onClick={() => {
                          photoInputRef.current?.click();
                        }}>📷 Photo</button>
                        <button className="action-btn" onClick={() => {
                          videoInputRef.current?.click();
                        }}>🎥 Video</button>
                        <button className="action-btn" onClick={() => setShowLocationModal(true)}>📍 Location</button>
                        <button className="action-btn" onClick={() => setShowPollModal(true)}>📊 Poll</button>
                      </>
                    )}
                  </div>
                  <div className="post-actions">
                    <button className="cancel-btn" onClick={() => {
                      setShowNewPostModal(false);
                      setPendingAction(null);
                      setSharingPost(null);
                      setShareCaption('');
                    }}>Cancel</button>
                    <button className="post-btn" onClick={handleCreatePost}>
                      {editingPost ? 'Save' : (sharingPost ? 'Share' : 'Post')}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Location Modal */}
        {showLocationModal && (
          <div className="modal-overlay">
            <div className="modal">
              <div className="modal-header">
                <h2>Add Location</h2>
                <button className="close-btn" onClick={() => setShowLocationModal(false)}>✕</button>
              </div>
              <div className="modal-content">
                <div className="location-map">
                  <div className="map-placeholder">
                    <div className="map-icon">🗺️</div>
                    <p>Map View</p>
                  </div>
                </div>
                <div className="location-search">
                  <input type="text" placeholder="Search for a location..." value={locationQuery} onChange={onLocationInput} />
                  <button onClick={() => locationQuery.trim() && searchLocations(locationQuery.trim())}>Search</button>
                </div>
                {searchingLocation && (
                  <div style={{ fontSize: '12px', color: '#4F6F52', margin: '6px 0' }}>Searching…</div>
                )}
                {!!locationResults.length && (
                  <div className="suggested-locations">
                    {locationResults.map((r, idx) => (
                      <div key={idx} className="location-item" onClick={() => handleLocationSelect({ name: r.name, lat: r.lat, lon: r.lon })}>
                        <span className="location-item-icon">dY"?</span>
                        <span>{r.name}</span>
                      </div>
                    ))}
                  </div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '10px 0' }}>
                  <button className="action-btn" onClick={prefillCurrentLocation} disabled={locating}>
                    {locating ? 'Detecting…' : 'Use my location'}
                  </button>
                  {locationError && (
                    <span style={{ color: '#b33', fontSize: '12px' }}>{locationError}</span>
                  )}
                </div>
                <div className="suggested-locations">
                  <div className="location-item" onClick={() => handleLocationSelect({ name: 'Central Park, New York' })}>
                    <span className="location-item-icon">📍</span>
                    <span>Central Park, New York</span>
                  </div>
                  <div className="location-item" onClick={() => handleLocationSelect({ name: 'Yosemite National Park, California' })}>
                    <span className="location-item-icon">📍</span>
                    <span>Yosemite National Park, California</span>
                  </div>
                  <div className="location-item" onClick={() => handleLocationSelect({ name: 'Royal Botanic Gardens, London' })}>
                    <span className="location-item-icon">📍</span>
                    <span>Royal Botanic Gardens, London</span>
                  </div>
                  <div className="location-item" onClick={() => handleLocationSelect({ name: 'Great Barrier Reef, Australia' })}>
                    <span className="location-item-icon">📍</span>
                    <span>Great Barrier Reef, Australia</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Poll Modal */}
        {showPollModal && (
          <div className="modal-overlay">
            <div className="modal">
              <div className="modal-header">
                <h2>Create a Poll</h2>
                <button className="close-btn" onClick={() => setShowPollModal(false)}>✕</button>
              </div>
              <div className="modal-content">
                <div className="poll-form">
                  <div className="form-group">
                    <label>Poll Question</label>
                    <input
                      type="text"
                      placeholder="Ask a question..."
                      value={pollTitle}
                      onChange={(e) => setPollTitle(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label>Options</label>
                    <div className="poll-choices">
                      {pollChoices.map((choice, index) => (
                        <div key={index} className="poll-choice-item">
                          <input
                            type="text"
                            placeholder={`Option ${index + 1}`}
                            value={choice}
                            onChange={(e) => updatePollChoice(index, e.target.value)}
                          />
                          {pollChoices.length > 2 && (
                            <button className="remove-choice" onClick={() => removePollChoice(index)}>✕</button>
                          )}
                        </div>
                      ))}
                      <button className="add-choice" onClick={addPollChoice}>+ Add Option</button>
                    </div>
                  </div>
                </div>
                <div className="modal-actions">
                  <button className="cancel-btn" onClick={() => setShowPollModal(false)}>Cancel</button>
                  <button className="post-btn" onClick={savePoll}>Save Poll</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Profile Modal */}
        {viewingProfile && (
          <div className="profile-modal">
            <div className="profile-container">
              <div className="modal-header">
                <h2>{viewingProfile.name}'s Profile</h2>
                <button className="close-btn" onClick={handleCloseProfile}>✕</button>
              </div>
              <div className="modal-content">
                <UserProfile
                  userId={viewingProfile.id}
                  userName={viewingProfile.name}
                  userAvatar={viewingProfile.avatar}
                  posts={posts}
                  onBack={() => setViewingProfile(null)}
                  isOwner={me?.id === viewingProfile.id}
                  onProfileUpdated={(updated) => {
                    setPosts((prev) =>
                      prev.map((p) =>
                        p.author_id === updated.id
                          ? { ...p, author: updated.name, avatar: updated.avatar }
                          : p
                      )
                    );
                    setMe((prev) => ({
                      ...prev,
                      name: updated.name,
                      avatar: updated.avatar,
                    }));
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Hidden file inputs */}
        <input
          type="file"
          ref={photoInputRef}
          style={{ display: 'none' }}
          accept="image/*"
          onChange={handlePhotoChange}
        />
        <input
          type="file"
          ref={videoInputRef}
          style={{ display: 'none' }}
          accept="video/*"
          onChange={handleVideoChange}
        />
      </div>
    </>
  );
}; 

export default CommunityWebsite;
