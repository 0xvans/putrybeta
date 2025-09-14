import { useEffect, useState } from 'react'
import { supabase } from '../services/supabase'

export default function Admin(){
  const [profiles,setProfiles]=useState([])
  useEffect(()=>{ load() },[])
  async function load(){ const { data } = await supabase.from('profiles').select('*').order('updated_at',{ascending:false}); setProfiles(data||[]) }
  async function changeRole(id,role){ await supabase.from('profiles').update({ role }).eq('id', id); load() }
  async function banUser(id,ban){ await supabase.from('profiles').update({ banned: ban }).eq('id', id); load() }
  return (<div>
    <h2 className="text-2xl font-bold mb-4">Admin Dashboard</h2>
    <div className="space-y-3">
      {profiles.map(p=>(
        <div key={p.id} className="p-3 bg-gray-900 rounded flex items-center justify-between">
          <div>
            <div className="font-bold">{p.username} <span className="text-yellow-300">{'⭐'.repeat(p.badge||1)}</span></div>
            <div className="text-sm text-gray-400">{p.full_name} — {p.role}</div>
          </div>
          <div className="flex gap-2">
            <select onChange={e=>changeRole(p.id, e.target.value)} defaultValue={p.role} className="p-1 bg-gray-800 rounded">
              <option value="member">member</option>
              <option value="moderator">moderator</option>
              <option value="admin">admin</option>
            </select>
            <button onClick={()=>banUser(p.id, !p.banned)} className="px-3 py-1 bg-red-600 rounded">{p.banned ? 'Unban' : 'Ban'}</button>
          </div>
        </div>
      ))}
    </div>
  </div>) }