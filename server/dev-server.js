// Local-only dev server that mounts the /api/*.js serverless handlers
// through Express, so `npm run dev` behaves the same as the Vercel deployment.
// Not used in production — Vercel picks up /api/*.js directly.
import 'dotenv/config';
import express from 'express';

import homeStats from '../api/home-stats.js';
import login from '../api/login.js';
import patrols from '../api/patrols.js';
import registrations from '../api/registrations.js';
import announcements from '../api/announcements.js';
import emergencyContacts from '../api/emergency-contacts.js';
import coordinator from '../api/coordinator.js';
import mokad from '../api/mokad.js';
import publicStats from '../api/public/stats.js';
import reminders from '../api/reminders.js';

const app = express();
app.use(express.json());

app.all('/api/home-stats', homeStats);
app.all('/api/login', login);
app.all('/api/patrols', patrols);
app.all('/api/registrations', registrations);
app.all('/api/announcements', announcements);
app.all('/api/emergency-contacts', emergencyContacts);
app.all('/api/coordinator', coordinator);
app.all('/api/mokad', mokad);
app.all('/api/public/stats', publicStats);
app.all('/api/reminders', reminders);

const PORT = process.env.API_PORT || 5174;
app.listen(PORT, () => {
  console.log(`[dev-api] listening on http://localhost:${PORT}`);
});
