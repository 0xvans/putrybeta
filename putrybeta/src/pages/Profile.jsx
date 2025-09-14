import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../services/supabase'

export default function Profile(){
  const { username } = useParams()
  const [profile, setProfile] = useState(null)
  const [posts, setPosts] = useState([])

  useEffect(()=>{ if(username) load() },[username])

  async function load(){
    const { data: prof } = await supabase.from('profiles').select('*').eq('username', username).single()
    if(!prof) return setProfile(null)
    setProfile(prof)
    const { data: ps } = await supabase.from('posts').select('*').eq('user_id', prof.id).order('created_at',{ascending:false}).limit(50)
    setPosts(ps||[])
  }

  if(!profile) return <div>Profile not found</div>
  return (<div>
    <div className="flex items-center gap-4 mb-6">
      <div className="w-20 h-20 bg-gray-800 rounded-full flex items-center justify-center">{profile.username?.slice(0,1)}</div>
      <div>
        <h2 className="text-xl font-bold">{profile.full_name||profile.username}</h2>
        <div className="text-sm text-gray-400">@{profile.username}</div>
        <div className="mt-2 text-gray-300">{profile.bio}</div>
      </div>
    </div>
    <h3 className="text-lg font-semibold mb-3">Posts</h3>
    <div className="space-y-3">
      {posts.map(p=>(<div key={p.id} className="p-3 bg-gray-900 rounded"><p>{p.content}</p><div className="text-xs text-gray-400">{new Date(p.created_at).toLocaleString()}</div></div>))}
    </div>
  </div>) }