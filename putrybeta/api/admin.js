/**
 * Example Vercel Serverless Function (Node) for admin actions using Supabase service_role key.
 * Save as /api/admin.js and deploy to Vercel. Set environment variable SUPABASE_SERVICE_ROLE_KEY.
 *
 * WARNING: This endpoint MUST be protected. Only allow requests from authenticated admins.
 * In production, validate your request (JWT or API key) and ensure only admins can call this.
 */

const { createClient } = require('@supabase/supabase-js')

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

module.exports = async (req, res) => {
  // Simple auth check - in real app validate a JWT or other admin token
  const adminSecret = process.env.ADMIN_ENDPOINT_SECRET
  if (!adminSecret || req.headers['x-admin-secret'] !== adminSecret) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const { action, user_id, role, ban } = req.body

  try {
    if (action === 'change_role') {
      await supabase.from('profiles').update({ role }).eq('id', user_id)
      return res.status(200).json({ ok: true })
    }
    if (action === 'ban_user') {
      await supabase.from('profiles').update({ banned: ban }).eq('id', user_id)
      return res.status(200).json({ ok: true })
    }
    return res.status(400).json({ error: 'Unknown action' })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
