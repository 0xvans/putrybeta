import { useState } from 'react'
import { supabase } from '../services/supabase'
import { useNavigate } from 'react-router-dom'

export default function Register(){
  const [email,setEmail]=useState(''), [password,setPassword]=useState(''), [username,setUsername]=useState('')
  const nav = useNavigate()
  async function submit(e){
    e.preventDefault()
    const { data, error } = await supabase.auth.signUp({ email, password })
    if(error){ alert(error.message); return }
    // create empty profile (supabase auth trigger could do this instead)
    if(data.user){
      await supabase.from('profiles').upsert({ id: data.user.id, username, full_name: '', bio: '', badge: 1 })
    }
    nav('/login')
    alert('Registered. Please check your email to confirm if required.')
  }
  return (<div className="max-w-md mx-auto">
    <h2 className="text-xl font-bold mb-4">Register</h2>
    <form onSubmit={submit} className="space-y-3">
      <input className="w-full p-2 rounded bg-gray-900" placeholder="Username" value={username} onChange={e=>setUsername(e.target.value)} />
      <input className="w-full p-2 rounded bg-gray-900" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} />
      <input className="w-full p-2 rounded bg-gray-900" placeholder="Password" type="password" value={password} onChange={e=>setPassword(e.target.value)} />
      <button className="px-4 py-2 bg-pink-500 rounded">Register</button>
    </form>
  </div>) }