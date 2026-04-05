const BASE_URL = import.meta.env.VITE_API_URL || 'https://joga-craque-backend-production.up.railway.app';

const API = {
  async get(url) {
    const r = await fetch(`${BASE_URL}${url}`)
    if (!r.ok) throw new Error(await r.text())
    return r.json()
  },
  async post(url, data) {
    const r = await fetch(`${BASE_URL}${url}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    if (!r.ok) throw new Error(await r.text())
    return r.json()
  }
}
export default API