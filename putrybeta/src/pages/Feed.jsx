import { useEffect, useState } from 'react'
import { supabase } from '../services/supabase'
import { Link } from 'react-router-dom'

export default function Feed(){
  const [posts,setPosts]=useState([])
  const [content,setContent]=useState('')
  const [profile, setProfile] = useState(null)

  useEffect(()=>{ load(); getProfile(); },[])

  async function getProfile(){
    const { data: { user } } = await supabase.auth.getUser()
    if(!user) return
    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    setProfile(data)
  }

  async function load(){
    const { data } = await supabase.from('posts').select('id,content,created_at,user_id').order('created_at',{ascending:false}).limit(50)
    setPosts(data||[])
  }

  async function post(){
    if(!profile) return alert('Only moderator/admin can post (demo).')
    // check role
    if(!(profile.role==='admin'||profile.role==='moderator')) return alert('Anda tidak memiliki izin post.')
    await supabase.from('posts').insert({ content, user_id: profile.id })
    setContent(''); load();
  }

  return (<div>
    <h2 className="text-2xl font-bold mb-4">Feed</h2>
    <div className="mb-4">
      <textarea className="w-full p-3 bg-gray-900 rounded" placeholder="Tulis..." value={content} onChange={e=>setContent(e.target.value)} />
      <div className="flex justify-end mt-2">
        <button onClick={post} className="px-4 py-2 bg-pink-500 rounded">Post</button>
      </div>
    </div>
    <div className="space-y-4">
      {posts.map(p=> (
        <div key={p.id} className="p-4 bg-gray-900 rounded">
          <div className="flex items-center justify-between">
            <Link to={'/profile/'+(p.user_id)} className="font-bold text-pink-300">User</Link>
            <span className="text-xs text-gray-400">{new Date(p.created_at).toLocaleString()}</span>
          </div>
          <p className="mt-2">{p.content}</p>
        </div>
      ))}
    </div>
  </div>) }