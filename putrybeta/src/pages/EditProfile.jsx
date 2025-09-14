import { useEffect, useState } from 'react'
import { supabase } from '../services/supabase'

export default function EditProfile(){
  const [profile,setProfile]=useState({username:'',full_name:'',bio:'',avatar_url:'',role:'member',badge:1})
  useEffect(()=>{ load() },[])

  async function load(){
    const { data: { user } } = await supabase.auth.getUser()
    if(!user) return
    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    setProfile(data||profile)
  }

  async function update(e){
    e.preventDefault()
    const { data: { user } } = await supabase.auth.getUser()
    if(!user) return alert('Not signed in')
    const updates = { id: user.id, username: profile.username, full_name: profile.full_name, bio: profile.bio, avatar_url: profile.avatar_url, role: profile.role, badge: profile.badge, updated_at: new Date() }
    await supabase.from('profiles').upsert(updates)
    alert('Profile updated')
  }

  async function uploadAvatar(e){
    const file = e.target.files[0]
    if(!file) return
    const fileName = `${Date.now()}_${file.name}`
    const { data, error } = await supabase.storage.from('avatars').upload(fileName, file)
    if(error){ alert(error.message); return }
    const url = supabase.storage.from('avatars').getPublicUrl(fileName).data.publicUrl
    setProfile(prev=>({...prev, avatar_url: url}))
  }

  return (<div className="max-w-md mx-auto">
    <h2 className="text-xl font-bold mb-4">Edit Profile</h2>
    <form onSubmit={update} className="space-y-3">
      <input className="w-full p-2 rounded bg-gray-900" placeholder="Username" value={profile.username||''} onChange={e=>setProfile({...profile,username:e.target.value})} />
      <input className="w-full p-2 rounded bg-gray-900" placeholder="Full name" value={profile.full_name||''} onChange={e=>setProfile({...profile,full_name:e.target.value})} />
      <textarea className="w-full p-2 rounded bg-gray-900" placeholder="Bio" value={profile.bio||''} onChange={e=>setProfile({...profile,bio:e.target.value})} />
      <div className="flex items-center gap-3">
        <input type="file" onChange={uploadAvatar} />
        {profile.avatar_url && <img src={profile.avatar_url} className="w-12 h-12 rounded-full" />}
      </div>
      <div className="flex gap-2">
        <select value={profile.role} onChange={e=>setProfile({...profile,role:e.target.value})} className="p-2 bg-gray-900 rounded">
          <option value="member">member</option>
          <option value="moderator">moderator</option>
          <option value="admin">admin</option>
        </select>
        <input type="number" min="1" max="6" value={profile.badge||1} onChange={e=>setProfile({...profile,badge:parseInt(e.target.value||1)})} className="p-2 bg-gray-900 rounded w-24" />
      </div>
      <button className="px-4 py-2 bg-pink-500 rounded">Save</button>
    </form>
  </div>)
}