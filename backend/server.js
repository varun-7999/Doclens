import 'dotenv/config';
import cors from 'cors';
import dns from 'node:dns';
import express from 'express';
import documentRoutes from './src/routes/documentRoutes.js';
import queryRoutes from './src/routes/queryRoutes.js';

// Some local networks/VPNs expose a stub resolver on 127.0.0.1 that refuses
// SRV lookups, which breaks mongodb+srv:// connections. Force public resolvers
// before the Mongo driver performs its SRV/TXT lookup.
const dnsServers = (process.env.DNS_SERVERS || '8.8.8.8,1.1.1.1')
  .split(',')
  .map((server) => server.trim())
  .filter(Boolean);
dns.setServers(dnsServers);

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use('/api/documents', documentRoutes);
app.use('/api/query', queryRoutes);

app.get('/api/health', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'doculens-ai-backend'
  });
});

app.listen(port, () => {
  console.log(`DocuLens backend listening on port ${port}`);
});