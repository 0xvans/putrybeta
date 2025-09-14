import { Routes, Route, Link } from 'react-router-dom'
import Feed from './pages/Feed'
import Login from './pages/Login'
import Register from './pages/Register'
import Profile from './pages/Profile'
import EditProfile from './pages/EditProfile'
import Admin from './pages/Admin'

export default function App(){
  return (
    <div className="min-h-screen bg-black text-white">
      <header className="py-4 px-6 border-b border-gray-800 flex items-center justify-between">
        <Link to="/" className="text-2xl font-bold text-pink-400">Putry Agency</Link>
        <nav className="space-x-4">
          <Link to="/login" className="text-sm text-gray-300">Login</Link>
          <Link to="/register" className="text-sm text-gray-300">Register</Link>
          <Link to="/edit-profile" className="text-sm text-gray-300">Edit Profile</Link>
        </nav>
      </header>
      <main className="p-6 max-w-3xl mx-auto">
        <Routes>
          <Route path="/" element={<Feed/>} />
          <Route path="/login" element={<Login/>} />
          <Route path="/register" element={<Register/>} />
          <Route path="/profile/:username" element={<Profile/>} />
          <Route path="/edit-profile" element={<EditProfile/>} />
          <Route path="/admin" element={<Admin/>} />
        </Routes>
      </main>
    </div>
  )
}