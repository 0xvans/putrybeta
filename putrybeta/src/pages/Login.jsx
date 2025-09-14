import { useState } from 'react'
import { supabase } from '../services/supabase'
import { useNavigate } from 'react-router-dom'

export default function Login(){
  const [email,setEmail]=useState(''), [password,setPassword]=useState('')
  const nav = useNavigate()
  async function submit(e){
    e.preventDefault()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if(error){ alert(error.message); return }
    nav('/')
  }
  return (<div className="max-w-md mx-auto">
    <h2 className="text-xl font-bold mb-4">Login</h2>
    <form onSubmit={submit} className="space-y-3">
      <input className="w-full p-2 rounded bg-gray-900" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} />
      <input className="w-full p-2 rounded bg-gray-900" placeholder="Password" type="password" value={password} onChange={e=>setPassword(e.target.value)} />
      <button className="px-4 py-2 bg-pink-500 rounded">Login</button>
    </form>
  </div>) }