const express = require('express');
const fetch   = require('node-fetch');
const cors    = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Your two proxy servers
const SERVERS = [
  'https://tmdb-proxy-1.onrender.com',
  'https://tmdb-proxy-2.onrender.com',
];

// Track active requests per server
const load = { 0: 0, 1: 0 };

function getLeastBusyServer() {
  return load[0] <= load[1] ? 0 : 1;
}

// Forward single /tmdb GET
app.get('/tmdb', async (req, res) => {
  const i = getLeastBusyServer();
  load[i]++;
  try {
    const url = `${SERVERS[i]}/tmdb?path=${encodeURIComponent(req.query.path)}`;
    const r    = await fetch(url);
    const data = await r.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    load[i]--;
  }
});

// Forward batch /tmdb/batch POST
app.post('/tmdb/batch', async (req, res) => {
  const i = getLeastBusyServer();
  load[i]++;
  try {
    const r = await fetch(`${SERVERS[i]}/tmdb/batch`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(req.body)
    });
    const data = await r.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    load[i]--;
  }
});

app.get('/', (req, res) => {
  res.json({
    status: 'Load balancer running ✓',
    load: {
      'server-1': load[0],
      'server-2': load[1],
    }
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Balancer running on port ${PORT}`));
