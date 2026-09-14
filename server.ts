import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { INITIAL_TRIP_STATE } from './src/defaultData';
import { TripState, Suggestion, Poll, Loan, ItineraryDay, ActivityItem } from './src/types';

const app = express();
const PORT = 3000;

app.use(express.json());

// Persistent state file path
const DATA_DIR = path.join(process.cwd(), 'data');
const STATE_FILE = path.join(DATA_DIR, 'trip-state.json');

function loadState(): TripState {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(STATE_FILE)) {
      const data = fs.readFileSync(STATE_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('Error reading trip state file, using initial:', err);
  }
  return JSON.parse(JSON.stringify(INITIAL_TRIP_STATE));
}

let tripState: TripState = loadState();

function saveState() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(STATE_FILE, JSON.stringify(tripState, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving trip state file:', err);
  }
}

// Ensure saved immediately once
saveState();

// Group Secret Word and Admin Password
const GROUP_SECRET = 'Desapareceresopcional';
const ADMIN_PASSWORD = 'adminSabana';

// ---------------- API ROUTES ----------------

// Get full state
app.get('/api/trip/state', (req, res) => {
  res.json(tripState);
});

// Group Auth / Join
app.post('/api/trip/auth-group', (req, res) => {
  const { secretWord, name, avatar } = req.body || {};

  if (!secretWord || secretWord.trim().toLowerCase() !== GROUP_SECRET.toLowerCase()) {
    return res.status(401).json({
      error: 'Palabra secreta incorrecta. Pídesela al organizador del viaje.',
    });
  }

  const trimmedName = (name || '').trim();
  if (!trimmedName) {
    return res.status(400).json({ error: 'Debes ingresar un nombre o apodo para el viaje.' });
  }

  // Check if traveler already exists
  let traveler = tripState.travelers.find(
    (t) => t.name.toLowerCase() === trimmedName.toLowerCase()
  );

  const defaultAvatars = ['🌴', '🌺', '☕', '🌊', '🧗', '🦜', '🏖️', '🕶️', '🛶', '🎒'];
  const chosenAvatar = avatar || defaultAvatars[Math.floor(Math.random() * defaultAvatars.length)];

  if (!traveler) {
    traveler = {
      id: 'usr-' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
      name: trimmedName,
      avatar: chosenAvatar,
      joinedAt: new Date().toISOString(),
    };
    tripState.travelers.push(traveler);
    saveState();
  }

  return res.json({
    success: true,
    traveler,
    state: tripState,
  });
});

// Admin Auth
app.post('/api/trip/auth-admin', (req, res) => {
  const { password } = req.body || {};
  if (password === ADMIN_PASSWORD) {
    return res.json({ success: true, role: 'admin' });
  }
  return res.status(401).json({ error: 'Contraseña de administrador incorrecta.' });
});

// Itinerary update (Admin)
app.post('/api/trip/itinerary', (req, res) => {
  const updatedDay: ItineraryDay = req.body;
  if (!updatedDay || !updatedDay.dayNumber) {
    return res.status(400).json({ error: 'Datos de itinerario incompletos.' });
  }

  const index = tripState.itinerary.findIndex((d) => d.dayNumber === updatedDay.dayNumber);
  if (index >= 0) {
    tripState.itinerary[index] = updatedDay;
  } else {
    tripState.itinerary.push(updatedDay);
    tripState.itinerary.sort((a, b) => a.dayNumber - b.dayNumber);
  }

  saveState();
  return res.json({ success: true, itinerary: tripState.itinerary });
});

// Add Suggestion (Group)
app.post('/api/trip/suggestions', (req, res) => {
  const { title, category, description, estimatedCostCOP, dayNumber, city, proposerId, proposerName } = req.body;
  if (!title || !proposerName) {
    return res.status(400).json({ error: 'Título y autor son obligatorios.' });
  }

  const newSuggestion: Suggestion = {
    id: 'sug-' + Date.now().toString(36) + Math.random().toString(36).substring(2, 5),
    dayNumber: dayNumber ? Number(dayNumber) : undefined,
    city,
    proposerId: proposerId || 'guest',
    proposerName,
    title: title.trim(),
    category: category || 'actividad',
    description: (description || '').trim(),
    estimatedCostCOP: estimatedCostCOP ? Number(estimatedCostCOP) : undefined,
    status: 'pendiente',
    createdAt: new Date().toISOString(),
  };

  tripState.suggestions.unshift(newSuggestion);
  saveState();
  return res.json({ success: true, suggestion: newSuggestion, suggestions: tripState.suggestions });
});

// Update Suggestion (Admin Approve / Discard)
app.patch('/api/trip/suggestions/:id', (req, res) => {
  const { id } = req.params;
  const { status, adminNote, addToItinerary, targetDayNumber } = req.body;

  const suggestion = tripState.suggestions.find((s) => s.id === id);
  if (!suggestion) {
    return res.status(404).json({ error: 'Sugerencia no encontrada.' });
  }

  if (status) suggestion.status = status;
  if (adminNote !== undefined) suggestion.adminNote = adminNote;

  // If approved and requested to integrate directly into day itinerary:
  if (status === 'aprobada' && addToItinerary) {
    const dayNum = targetDayNumber || suggestion.dayNumber || 1;
    const targetDay = tripState.itinerary.find((d) => d.dayNumber === dayNum);
    if (targetDay) {
      const catMap: Record<string, any> = {
        restaurante: 'comida',
        actividad: 'visita',
        hospedaje: 'hospedaje',
        'transporte alterno': 'transporte',
        'rumba/noche': 'rumba',
        otro: 'visita',
      };

      const newAct: ActivityItem = {
        id: 'act-sug-' + Date.now().toString(36),
        time: 'Por definir (Sugerido)',
        title: suggestion.title,
        description: `${suggestion.description} (Propuesto por ${suggestion.proposerName})`,
        category: catMap[suggestion.category] || 'visita',
        costEstimateCOP: suggestion.estimatedCostCOP,
        location: suggestion.city || targetDay.city,
      };

      targetDay.activities.push(newAct);
      suggestion.adminNote = (suggestion.adminNote ? suggestion.adminNote + ' | ' : '') + `Integrado al Día ${dayNum}`;
    }
  }

  saveState();
  return res.json({ success: true, suggestion, state: tripState });
});

// Polls: Create
app.post('/api/trip/polls', (req, res) => {
  const { question, description, options, createdBy, creatorRole } = req.body;
  if (!question || !Array.isArray(options) || options.length < 2) {
    return res.status(400).json({ error: 'La encuesta debe tener una pregunta y al menos dos opciones.' });
  }

  const isAdmin = creatorRole === 'admin';
  const autoApprove = tripState.config.autoApprovePolls;
  const status = isAdmin || autoApprove ? 'activa' : 'pendiente';

  const newPoll: Poll = {
    id: 'poll-' + Date.now().toString(36) + Math.random().toString(36).substring(2, 5),
    question: question.trim(),
    description: description ? description.trim() : undefined,
    createdBy: createdBy || 'Viajero anónimo',
    creatorRole: isAdmin ? 'admin' : 'traveler',
    status,
    createdAt: new Date().toISOString(),
    options: options.map((opt: string, idx: number) => ({
      id: `opt-${idx + 1}-${Date.now().toString(36)}`,
      text: opt.trim(),
      votes: [],
    })),
  };

  tripState.polls.unshift(newPoll);
  saveState();
  return res.json({ success: true, poll: newPoll, polls: tripState.polls });
});

// Polls: Vote
app.post('/api/trip/polls/:id/vote', (req, res) => {
  const { id } = req.params;
  const { optionId, travelerName } = req.body;

  if (!travelerName || !optionId) {
    return res.status(400).json({ error: 'Opción y nombre de votante requeridos.' });
  }

  const poll = tripState.polls.find((p) => p.id === id);
  if (!poll) {
    return res.status(404).json({ error: 'Encuesta no encontrada.' });
  }

  if (poll.status !== 'activa') {
    return res.status(400).json({ error: 'Esta encuesta ya no está activa.' });
  }

  // Remove traveler previous votes in this poll
  poll.options.forEach((opt) => {
    opt.votes = opt.votes.filter((name) => name !== travelerName);
  });

  // Add vote to target option
  const targetOption = poll.options.find((o) => o.id === optionId);
  if (targetOption) {
    targetOption.votes.push(travelerName);
  }

  saveState();
  return res.json({ success: true, poll, polls: tripState.polls });
});

// Polls: Update status (Admin)
app.patch('/api/trip/polls/:id', (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const poll = tripState.polls.find((p) => p.id === id);
  if (!poll) {
    return res.status(404).json({ error: 'Encuesta no encontrada.' });
  }

  if (status) poll.status = status;

  saveState();
  return res.json({ success: true, poll, polls: tripState.polls });
});

// Loans: Create
app.post('/api/trip/loans', (req, res) => {
  const { lender, borrower, amount, concept } = req.body;
  const numAmount = Number(amount);

  if (!lender || !borrower) {
    return res.status(400).json({ error: 'Prestamista y deudor son obligatorios.' });
  }
  if (lender === borrower) {
    return res.status(400).json({ error: 'No puedes registrar un préstamo a ti mismo.' });
  }
  if (!numAmount || numAmount <= 0) {
    return res.status(400).json({ error: 'El monto debe ser mayor a 0.' });
  }
  if (!concept || !concept.trim()) {
    return res.status(400).json({ error: 'El motivo o concepto es obligatorio (ej. taxi, cena).' });
  }

  const newLoan: Loan = {
    id: 'loan-' + Date.now().toString(36) + Math.random().toString(36).substring(2, 5),
    lender: lender.trim(),
    borrower: borrower.trim(),
    amount: Math.round(numAmount),
    concept: concept.trim(),
    createdAt: new Date().toISOString(),
    settled: false,
  };

  tripState.loans.unshift(newLoan);
  saveState();
  return res.json({ success: true, loan: newLoan, loans: tripState.loans });
});

// Loans: Delete or Settle
app.delete('/api/trip/loans/:id', (req, res) => {
  const { id } = req.params;
  const initialLen = tripState.loans.length;
  tripState.loans = tripState.loans.filter((l) => l.id !== id);

  if (tripState.loans.length === initialLen) {
    return res.status(404).json({ error: 'Registro de préstamo no encontrado.' });
  }

  saveState();
  return res.json({ success: true, loans: tripState.loans });
});

// Loans: Toggle settle
app.patch('/api/trip/loans/:id/settle', (req, res) => {
  const { id } = req.params;
  const loan = tripState.loans.find((l) => l.id === id);
  if (!loan) {
    return res.status(404).json({ error: 'Registro de préstamo no encontrado.' });
  }
  loan.settled = !loan.settled;
  saveState();
  return res.json({ success: true, loan, loans: tripState.loans });
});

// Admin Config Update
app.post('/api/trip/config', (req, res) => {
  const { autoApprovePolls, tripName } = req.body;
  if (autoApprovePolls !== undefined) {
    tripState.config.autoApprovePolls = Boolean(autoApprovePolls);
  }
  if (tripName) {
    tripState.config.tripName = tripName;
  }
  saveState();
  return res.json({ success: true, config: tripState.config });
});

// Reset to Defaults (Admin)
app.post('/api/trip/reset', (req, res) => {
  const { password } = req.body;
  if (password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Contraseña no válida.' });
  }
  tripState = JSON.parse(JSON.stringify(INITIAL_TRIP_STATE));
  saveState();
  return res.json({ success: true, state: tripState });
});

// ---------------- VITE & STATIC SERVING ----------------

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
