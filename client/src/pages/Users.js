import { useEffect, useState, useContext } from 'react'
import api from '../services/api'
import { AuthContext } from '../context/AuthContext'

export default function Users() {
  const [users, setUsers] = useState([])
  const [form, setForm] = useState({name:'',email:'',password:'',role:'Izleyici'})
  const { user: me } = useContext(AuthContext)

  const handleAdd = e => {
    e.preventDefault()
    api.post('/auth/register', form)
      .then(r=>{
        setUsers(u=>[...u,r.data])
        setForm({name:'',email:'',password:'',role:'Izleyici'})
      })
  }

  useEffect(() => {
    api.get('/users')
      .then(res => setUsers(res.data))
      .catch(() => {})
  }, [])

  const updateRole = (id, role) => {
    api.put(`/users/${id}`, { role })
      .then(res => setUsers(u => u.map(x => x._id===id ? res.data : x)))
  }

  const deleteUser = id => {
    api.delete(`/users/${id}`)
      .then(() => setUsers(u => u.filter(x => x._id!==id)))
  }

  return (
    <div>
      <h2>Yeni Kullanıcı Kaydı</h2>
      <form onSubmit={handleAdd}>
        <input placeholder="Ad" value={form.name}
          onChange={e=>setForm(f=>({...f,name:e.target.value}))} required/>
        <input placeholder="E-posta" type="email" value={form.email}
          onChange={e=>setForm(f=>({...f,email:e.target.value}))} required/>
        <input placeholder="Parola" type="password" value={form.password}
          onChange={e=>setForm(f=>({...f,password:e.target.value}))} required/>
        <select value={form.role}
          onChange={e=>setForm(f=>({...f,role:e.target.value}))}>
          <option>Admin</option><option>SistemYonetici</option>
          <option>TeknikDestek</option><option>DepartmanYonetici</option>
          <option>Izleyici</option>
        </select>
        <button type="submit">Kayıt</button>
      </form>

      <h2>Kullanıcı Yönetimi</h2>
      <table>
        <thead>
          <tr><th>Ad</th><th>E-posta</th><th>Rol</th><th>İşlemler</th></tr>
        </thead>
        <tbody>
          {users.map(u => (
            <tr key={u._id}>
              <td>{u.name}</td>
              <td>{u.email}</td>
              <td>
                <select
                  value={u.role}
                  onChange={e => updateRole(u._id, e.target.value)}
                >
                  <option>Admin</option>
                  <option>SistemYonetici</option>
                  <option>TeknikDestek</option>
                  <option>DepartmanYonetici</option>
                  <option>Izleyici</option>
                </select>
              </td>
              <td>
                {u._id !== me.id && (
                  <button onClick={() => deleteUser(u._id)}>
                    Sil
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
