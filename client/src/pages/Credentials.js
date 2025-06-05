import { useEffect, useState } from 'react'
import api from '../services/api'

export default function Credentials() {
  const [creds, setCreds] = useState([])
  const [detail, setDetail] = useState(null)
  const [form, setForm] = useState({title:'',username:'',password:'',url:'',notes:''})

  const handleAdd = e => {
    e.preventDefault()
    api.post('/credentials', form)
      .then(r=>{
        setCreds(c=>[...c,r.data])
        setForm({title:'',username:'',password:'',url:'',notes:''})
      })
  }

  useEffect(() => {
    api.get('/credentials').then(res => setCreds(res.data))
  }, [])

  const view = id => {
    api.get(`/credentials/${id}`).then(res => setDetail(res.data))
  }

  return (
    <div>
      <h2>Yeni Kimlik Bilgisi Ekle</h2>
      <form onSubmit={handleAdd}>
        <input placeholder="Başlık" value={form.title}
          onChange={e=>setForm(f=>({...f,title:e.target.value}))} required/>
        <input placeholder="Kullanıcı Adı" value={form.username}
          onChange={e=>setForm(f=>({...f,username:e.target.value}))}/>
        <input placeholder="Parola" type="password" value={form.password}
          onChange={e=>setForm(f=>({...f,password:e.target.value}))} required/>
        <input placeholder="URL" value={form.url}
          onChange={e=>setForm(f=>({...f,url:e.target.value}))}/>
        <button type="submit">Ekle</button>
      </form>

      <h2>Güvenli Kimlik Bilgileri</h2>
      <ul>
        {creds.map(c => (
          <li key={c.id}>
            {c.title} {' '}
            <button onClick={() => view(c.id)}>Görüntüle</button>
          </li>
        ))}
      </ul>
      {detail && (
        <div>
          <h3>{detail.title}</h3>
          <p>Kullanıcı: {detail.username}</p>
          <p>Parola: {detail.password}</p>
          <p>URL: {detail.url}</p>
          <button onClick={() => setDetail(null)}>Kapat</button>
        </div>
      )}
    </div>
  )
}
