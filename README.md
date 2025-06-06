# JAMS

## Proje Yapısı
- backend/   → Express.js sunucu kodları  
- client/    → React.js ön yüz kodları  

## Kurulum ve Çalıştırma

### Backend
```bash
cd backend  
npm install  
cp .env.example .env  
npm run dev       # geliştirme  
npm start         # üretim
```

### Client
```bash
cd client  
npm install  
npm start         # http://localhost:3001 (veya farklı port)
```

## İleride
- Nginx ters-proxy konfigürasyonunu backend’e yönlendirin.
