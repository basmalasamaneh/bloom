// =======================
// FILE: /routes/authRoutes.js
// =======================
import express from 'express'
import { registerFarmer, loginFarmer } from '../controllers/authController.js'
import auth from '../middleware/authMiddleware.js'
import { supabase } from '../config/supabaseClient.js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const router = express.Router()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const uploadsDir = path.join(__dirname, '..', 'uploads')

const ensureDir = (dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
}

ensureDir(uploadsDir)

const persistDataUrl = (dataUrl, subDir = '') => {
  try {
    const m = dataUrl.match(/^data:(.+);base64,(.*)$/)
    if (!m) return null
    const mime = m[1]
    const b64 = m[2]
    const ext = (mime && mime.includes('/')) ? mime.split('/')[1].replace('jpeg', 'jpg') : 'bin'
    const relDir = subDir ? `${subDir}/` : ''
    const dirPath = subDir ? path.join(uploadsDir, subDir) : uploadsDir
    ensureDir(dirPath)
    const fname = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
    const fullPath = path.join(dirPath, fname)
    fs.writeFileSync(fullPath, Buffer.from(b64, 'base64'))
    return `/uploads/${relDir}${fname}`
  } catch (e) {
    console.warn('persistDataUrl failed:', e?.message)
    return null
  }
}

// Register a new farmer
router.post('/register', registerFarmer)

// Login farmer
router.post('/login', loginFarmer)

// Get authenticated farmer's data
router.get('/me', auth, async (req, res) => {
  try {
    // req.user is attached by the auth middleware
    const userId = req.user.id

    const { data, error } = await supabase
      .from('farmer')
      .select('id, name, email, city, village, created_at, avatar, bio, is_expert, expert_verified, expert_field')
      .eq('id', userId)
      .single()

    if (error || !data) {
      return res.status(404).json({ message: 'Farmer not found' })
    }

    const { data: expertRow, error: expertErr } = await supabase
      .from('experts')
      .select('status')
      .eq('farmer_id', userId)
      .maybeSingle()
    if (expertErr) {
      console.warn('Get /me expert status error:', expertErr?.message || expertErr)
    }
    const expertApproved = expertRow?.status === 'approved'

    res.status(200).json({
      farmer: {
        ...data,
        is_expert: Boolean(data.is_expert || expertApproved),
        expert_verified: Boolean(data.expert_verified || expertApproved),
        expert_status: expertRow?.status || null
      }
    })
  } catch (error) {
    console.error('Get /me Error:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

// Update current user's profile (bio, avatar)
router.put('/me', auth, async (req, res) => {
  try {
    const userId = req.user.id
    const { bio, avatar, name, city, village } = req.body || {}

    const updates = {}
    if (typeof name === 'string' && name.trim()) updates.name = name.trim()
    if (typeof bio === 'string') updates.bio = bio
    if (typeof city === 'string') updates.city = city.trim()
    if (typeof village === 'string') updates.village = village.trim()

    // If avatar is a data URL, persist to /uploads and save relative path
    if (typeof avatar === 'string' && avatar.startsWith('data:')) {
      const persisted = persistDataUrl(avatar)
      if (persisted) updates.avatar = persisted
    } else if (typeof avatar === 'string' && avatar.trim()) {
      updates.avatar = avatar.trim()
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: 'No valid fields to update' })
    }

    const { data, error } = await supabase
      .from('farmer')
      .update(updates)
      .eq('id', userId)
      .select('id, name, email, city, village, created_at, avatar, bio')
      .single()
    if (error) return res.status(400).json({ message: 'Update failed', error: error.message })

    res.status(200).json({ message: 'Profile updated', farmer: data })
  } catch (error) {
    console.error('PUT /me Error:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

// Submit expert verification request
router.post('/verification/request', auth, async (req, res) => {
  try {
    const userId = req.user.id
    const {
      expertise,
      yearsOfExperience,
      documentType,
      documentDataUrl,
      documentFileName,
      documentMimeType
    } = req.body || {}

    const expertiseField = typeof expertise === 'string' ? expertise.trim() : ''
    const years = parseInt(yearsOfExperience, 10)
    const allowedDocTypes = ['degree', 'certificate', 'license']

    if (!expertiseField) return res.status(400).json({ message: 'Expertise is required' })
    if (!Number.isFinite(years) || years < 1) {
      return res.status(400).json({ message: 'Years of experience must be at least 1' })
    }
    if (!allowedDocTypes.includes(documentType)) {
      return res.status(400).json({ message: 'Invalid document type' })
    }
    if (typeof documentDataUrl !== 'string' || !documentDataUrl.startsWith('data:')) {
      return res.status(400).json({ message: 'Document data is required' })
    }

    const { data: existingExpert, error: existingError } = await supabase
      .from('experts')
      .select('id, status')
      .eq('farmer_id', userId)
      .maybeSingle()
    if (existingError) throw existingError
    if (existingExpert?.status === 'approved') {
      return res.status(409).json({ message: 'Account already verified' })
    }
    if (existingExpert?.status === 'pending') {
      return res.status(409).json({ message: 'Verification request already pending' })
    }

    const fileUrl = persistDataUrl(documentDataUrl, 'verification')
    if (!fileUrl) return res.status(500).json({ message: 'Failed to store document' })

    const { data: requestRow, error: requestError } = await supabase
      .from('expert_verification_requests')
      .insert([{
        farmer_id: userId,
        expertise_field: expertiseField,
        years_of_experience: years,
        status: 'pending'
      }])
      .select()
      .single()
    if (requestError) throw requestError

    const mimeMatch = documentDataUrl.match(/^data:(.+);base64,/)
    const mimeType = documentMimeType || (mimeMatch ? mimeMatch[1] : null)

    const { error: docError } = await supabase
      .from('expert_verification_documents')
      .insert([{
        request_id: requestRow.id,
        doc_type: documentType,
        file_url: fileUrl,
        file_name: documentFileName || null,
        mime_type: mimeType || null
      }])
    if (docError) throw docError

    const { error: expertError } = await supabase
      .from('experts')
      .upsert([{
        farmer_id: userId,
        specialization: expertiseField,
        certificate_url: fileUrl,
        experience_years: years,
        status: 'pending'
      }], { onConflict: 'farmer_id' })
    if (expertError) throw expertError

    res.status(201).json({ message: 'Verification request submitted', request: requestRow })
  } catch (error) {
    console.error('POST /verification/request Error:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

// Get a specific user's public profile by id
router.get('/users/:id', auth, async (req, res) => {
  try {
    const viewerId = req.user?.id
    const userId = parseInt(req.params.id, 10)
    if (!Number.isFinite(userId)) return res.status(400).json({ message: 'Invalid user id' })

    // Basic profile
    const { data: farmer, error } = await supabase
      .from('farmer')
      .select('id, name, email, city, village, created_at, avatar, bio, is_expert, expert_verified, expert_field')
      .eq('id', userId)
      .single()
    if (error || !farmer) return res.status(404).json({ message: 'Farmer not found' })

    const { data: expertRow, error: expertErr } = await supabase
      .from('experts')
      .select('status')
      .eq('farmer_id', userId)
      .maybeSingle()
    if (expertErr) {
      console.warn('GET /users/:id expert status error:', expertErr?.message || expertErr)
    }
    const expertApproved = expertRow?.status === 'approved'

    // Followers and following counts
    const [{ count: followersCount }, { count: followingCount }] = await Promise.all([
      supabase.from('followers').select('*', { count: 'exact', head: true }).eq('following_id', userId),
      supabase.from('followers').select('*', { count: 'exact', head: true }).eq('follower_id', userId),
    ])

    // Is the viewer following this user?
    let isFollowing = false
    if (viewerId && viewerId !== userId) {
      const { data: rel } = await supabase
        .from('followers')
        .select('id')
        .eq('follower_id', viewerId)
        .eq('following_id', userId)
        .maybeSingle()
      isFollowing = !!rel
    }

    res.json({
      farmer: {
        ...farmer,
        is_expert: Boolean(farmer.is_expert || expertApproved),
        expert_verified: Boolean(farmer.expert_verified || expertApproved),
        expert_status: expertRow?.status || null,
        followers: followersCount || 0,
        following: followingCount || 0,
        isFollowing,
      },
    })
  } catch (err) {
    console.error('GET /users/:id error:', err)
    res.status(500).json({ message: 'Server error' })
  }
})

export default router
