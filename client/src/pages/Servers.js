import { useEffect, useState } from 'react'
import api from '../services/api'

export default function Servers() {
  const [servers, setServers] = useState([])
  const [output, setOutput] = useState('')
  const [form, setForm] = useState({name:'',ip:'',type:'Linux'})

  const handleAdd = e => {
    e.preventDefault()
    api.post('/servers', form)
      .then(r=>{
        setServers(s=>[...s,r.data])
        setForm({name:'',ip:'',type:'Linux'})
      })
  }

  useEffect(() => {
    api.get('/servers').then(res => setServers(res.data))
  }, [])

  const ping = async id => {
    const res = await api.post(`/servers/${id}/ping`)
    setServers(s =>
      s.map(x => (x._id===id ? { ...x, status: res.data.alive ? 'up' : 'down' } : x))
    )
  }

  const run = async (id,key) => {
    const res = await api.post(`/servers/${id}/script`, { key })
    setOutput(res.data.output)
  }

  return (
    <div>
      <h2>Yeni Sunucu Ekle</h2>
      <form onSubmit={handleAdd}>
        <input placeholder="Ad" value={form.name}
          onChange={e=>setForm(f=>({...f,name:e.target.value}))} required/>
        <input placeholder="IP" value={form.ip}
          onChange={e=>setForm(f=>({...f,ip:e.target.value}))} required/>
        <select value={form.type}
          onChange={e=>setForm(f=>({...f,type:e.target.value}))}>
          <option>Linux</option><option>Windows</option><option>Other</option>
        </select>
        <button type="submit">Ekle</button>
      </form>

      <h2>Sunucular</h2>
      <table>
        <thead>
          <tr><th>Ad</th><th>IP</th><th>Durum</th><th>İşlemler</th></tr>
        </thead>
        <tbody>
          {servers.map(s => (
            <tr key={s._id}>
              <td>{s.name}</td>
              <td>{s.ip}</td>
              <td>{s.status}</td>
              <td>
                <button onClick={()=>ping(s._id)}>Ping</button>
                <button onClick={()=>run(s._id,'restartApp')}>Restart</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {output && <pre>{output}</pre>}
    </div>
  )
}
