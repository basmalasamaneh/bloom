import { supabase } from '../config/supabaseClient.js'

const ALLOWED_TARGETS = new Set(['user', 'post', 'item'])

export const createReport = async (req, res) => {
  try {
    const reporterId = req.user?.id
    const { targetType, targetId, reason, description } = req.body || {}

    const type = typeof targetType === 'string' ? targetType.trim() : ''
    const id = parseInt(targetId, 10)
    const reasonText = typeof reason === 'string' ? reason.trim() : ''
    const descriptionText = typeof description === 'string' ? description.trim() : null

    if (!ALLOWED_TARGETS.has(type)) {
      return res.status(400).json({ message: 'Invalid report target' })
    }
    if (!Number.isFinite(id)) {
      return res.status(400).json({ message: 'Invalid target id' })
    }
    if (!reasonText) {
      return res.status(400).json({ message: 'Reason is required' })
    }
    if (type === 'user' && reporterId === id) {
      return res.status(400).json({ message: 'You cannot report your own account' })
    }

    const { data, error } = await supabase
      .from('user_reports')
      .insert([{
        reporter_id: reporterId,
        target_type: type,
        target_id: id,
        reason: reasonText,
        description: descriptionText || null
      }])
      .select()
      .single()

    if (error) {
      console.error('createReport supabase error:', error)
      return res.status(400).json({ message: 'Report submission failed' })
    }

    res.status(201).json({ message: 'Report submitted', report: data })
  } catch (error) {
    console.error('createReport error:', error)
    res.status(500).json({ message: 'Server error' })
  }
}
