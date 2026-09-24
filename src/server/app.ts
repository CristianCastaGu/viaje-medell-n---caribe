import express, { Express } from 'express';
import {
  ActivityItem,
  Announcement,
  ItineraryDay,
  Lodging,
  Place,
  Poll,
  Suggestion,
  TransportLeg,
} from '../types';
import * as store from './tripStore.js';

// Palabra secreta del grupo y contraseña del admin.
// Pueden sobreescribirse por variables de entorno (recomendado si el
// repo es público), pero por defecto usan las que pidió el usuario.
const GROUP_SECRET = process.env.TRIP_GROUP_SECRET || 'Desapareceresopcional';
const ADMIN_PASSWORD = process.env.TRIP_ADMIN_PASSWORD || 'adminSabana';

const DEFAULT_AVATARS = ['🌴', '🌺', '☕', '🌊', '🧗', '🦜', '🏖️', '🕶️', '🛶', '🎒'];

function newId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).substring(2, 6)}`;
}

/**
 * Crea y configura el Express app con todas las rutas /api/trip/*.
 * No hace app.listen() ni monta Vite/estáticos — eso lo maneja quien
 * lo use (server.ts en local, api/[...path].ts en Vercel).
 */
export function createApiApp(): Express {
  const app = express();
  app.use(express.json());

  // Envuelve cada handler async para mandar errores inesperados como 500
  // en vez de tumbar el proceso o colgar la respuesta.
  const wrap =
    (fn: (req: express.Request, res: express.Response) => Promise<void>) =>
    (req: express.Request, res: express.Response) => {
      fn(req, res).catch((err) => {
        console.error('API error:', err);
        res.status(500).json({ error: 'Error interno del servidor. Intenta de nuevo.' });
      });
    };

  // Get full state
  app.get(
    '/api/trip/state',
    wrap(async (req, res) => {
      const state = await store.getFullState();
      res.json(state);
    })
  );

  // Group Auth / Join
  app.post(
    '/api/trip/auth-group',
    wrap(async (req, res) => {
      const { secretWord, name, avatar } = req.body || {};

      if (!secretWord || String(secretWord).trim().toLowerCase() !== GROUP_SECRET.toLowerCase()) {
        res.status(401).json({
          error: 'Palabra secreta incorrecta. Pídesela al organizador del viaje.',
        });
        return;
      }

      const trimmedName = (name || '').trim();
      if (!trimmedName) {
        res.status(400).json({ error: 'Debes ingresar un nombre o apodo para el viaje.' });
        return;
      }

      let traveler = await store.findTravelerByName(trimmedName);
      const isNewTraveler = !traveler;

      if (!traveler) {
        const chosenAvatar = avatar || DEFAULT_AVATARS[Math.floor(Math.random() * DEFAULT_AVATARS.length)];
        traveler = await store.createTraveler({
          id: newId('usr'),
          name: trimmedName,
          avatar: chosenAvatar,
          joinedAt: new Date().toISOString(),
        });
      }

      const state = await store.getFullState();
      res.json({ success: true, traveler, state, isNewTraveler });
    })
  );

  // Admin Auth
  app.post(
    '/api/trip/auth-admin',
    wrap(async (req, res) => {
      const { password } = req.body || {};
      if (password === ADMIN_PASSWORD) {
        res.json({ success: true, role: 'admin' });
        return;
      }
      res.status(401).json({ error: 'Contraseña de administrador incorrecta.' });
    })
  );

  // Itinerary update (Admin)
  app.post(
    '/api/trip/itinerary',
    wrap(async (req, res) => {
      const updatedDay: ItineraryDay = req.body;
      if (!updatedDay || !updatedDay.dayNumber) {
        res.status(400).json({ error: 'Datos de itinerario incompletos.' });
        return;
      }
      const itinerary = await store.upsertItineraryDay(updatedDay);
      res.json({ success: true, itinerary });
    })
  );

  // Add Suggestion (Group)
  app.post(
    '/api/trip/suggestions',
    wrap(async (req, res) => {
      const { title, category, description, estimatedCostCOP, dayNumber, city, proposerId, proposerName } =
        req.body || {};

      if (!title || !proposerName) {
        res.status(400).json({ error: 'Título y autor son obligatorios.' });
        return;
      }

      const newSuggestion: Suggestion = {
        id: newId('sug'),
        dayNumber: dayNumber ? Number(dayNumber) : undefined,
        city,
        proposerId: proposerId || 'guest',
        proposerName,
        title: String(title).trim(),
        category: category || 'otro',
        description: (description || '').trim(),
        estimatedCostCOP: estimatedCostCOP ? Number(estimatedCostCOP) : undefined,
        status: 'pendiente',
        createdAt: new Date().toISOString(),
      };

      const suggestions = await store.insertSuggestion(newSuggestion);
      res.json({ success: true, suggestion: newSuggestion, suggestions });
    })
  );

  // Update Suggestion (Admin Approve / Discard)
  app.patch(
    '/api/trip/suggestions/:id',
    wrap(async (req, res) => {
      const { id } = req.params;
      const { status, adminNote, addToItinerary, targetDayNumber } = req.body || {};

      let suggestion = await store.getSuggestion(id);
      if (!suggestion) {
        res.status(404).json({ error: 'Sugerencia no encontrada.' });
        return;
      }

      let finalAdminNote = adminNote !== undefined ? adminNote : suggestion.adminNote;

      // Si se aprueba y se pide integrar al itinerario del día:
      if (status === 'aprobada' && addToItinerary) {
        const dayNum = targetDayNumber || suggestion.dayNumber || 1;
        const targetDay = await store.getItineraryDay(dayNum);
        if (targetDay) {
          const catMap: Record<string, ActivityItem['category']> = {
            restaurante: 'comida',
            actividad: 'visita',
            hospedaje: 'hospedaje',
            'transporte alterno': 'transporte',
            'rumba/noche': 'rumba',
            otro: 'visita',
          };

          const newAct: ActivityItem = {
            id: newId('act-sug'),
            time: 'Por definir (Sugerido)',
            title: suggestion.title,
            description: `${suggestion.description} (Propuesto por ${suggestion.proposerName})`,
            category: catMap[suggestion.category] || 'visita',
            costEstimateCOP: suggestion.estimatedCostCOP,
            location: suggestion.city || targetDay.city,
          };

          targetDay.activities.push(newAct);
          await store.upsertItineraryDay(targetDay);
          finalAdminNote = (finalAdminNote ? finalAdminNote + ' | ' : '') + `Integrado al Día ${dayNum}`;
        }
      }

      suggestion = await store.updateSuggestion(id, {
        status: status || suggestion.status,
        adminNote: finalAdminNote,
      });

      const state = await store.getFullState();
      res.json({ success: true, suggestion, state });
    })
  );

  // Polls: Create
  app.post(
    '/api/trip/polls',
    wrap(async (req, res) => {
      const { question, description, options, createdBy, creatorRole } = req.body || {};
      if (!question || !Array.isArray(options) || options.length < 2) {
        res.status(400).json({ error: 'La encuesta debe tener una pregunta y al menos dos opciones.' });
        return;
      }

      const state = await store.getFullState();
      const isAdmin = creatorRole === 'admin';
      const autoApprove = state.config.autoApprovePolls;
      const status = isAdmin || autoApprove ? 'activa' : 'pendiente';

      const newPoll: Poll = {
        id: newId('poll'),
        question: String(question).trim(),
        description: description ? String(description).trim() : undefined,
        createdBy: createdBy || 'Viajero anónimo',
        creatorRole: isAdmin ? 'admin' : 'traveler',
        status,
        createdAt: new Date().toISOString(),
        options: options.map((opt: string, idx: number) => ({
          id: `opt-${idx + 1}-${Date.now().toString(36)}`,
          text: String(opt).trim(),
          votes: [] as string[],
        })),
      };

      const polls = await store.insertPoll(newPoll);
      res.json({ success: true, poll: newPoll, polls });
    })
  );

  // Polls: Vote
  app.post(
    '/api/trip/polls/:id/vote',
    wrap(async (req, res) => {
      const { id } = req.params;
      const { optionId, travelerName } = req.body || {};

      if (!travelerName || !optionId) {
        res.status(400).json({ error: 'Opción y nombre de votante requeridos.' });
        return;
      }

      const poll = await store.getPoll(id);
      if (!poll) {
        res.status(404).json({ error: 'Encuesta no encontrada.' });
        return;
      }
      if (poll.status !== 'activa') {
        res.status(400).json({ error: 'Esta encuesta ya no está activa.' });
        return;
      }

      const newOptions = poll.options.map((opt) => ({
        ...opt,
        votes: opt.votes.filter((name) => name !== travelerName),
      }));
      const target = newOptions.find((o) => o.id === optionId);
      if (target) target.votes.push(travelerName);

      const updatedPoll = await store.updatePollOptions(id, newOptions);
      const polls = await store.listPolls();
      res.json({ success: true, poll: updatedPoll, polls });
    })
  );

  // Polls: Update status (Admin)
  app.patch(
    '/api/trip/polls/:id',
    wrap(async (req, res) => {
      const { id } = req.params;
      const { status } = req.body || {};

      const poll = await store.getPoll(id);
      if (!poll) {
        res.status(404).json({ error: 'Encuesta no encontrada.' });
        return;
      }

      const updatedPoll = status ? await store.updatePollStatus(id, status) : poll;
      const polls = await store.listPolls();
      res.json({ success: true, poll: updatedPoll, polls });
    })
  );

  // Loans: Create
  app.post(
    '/api/trip/loans',
    wrap(async (req, res) => {
      const { lender, borrower, amount, concept } = req.body || {};
      const numAmount = Number(amount);

      if (!lender || !borrower) {
        res.status(400).json({ error: 'Prestamista y deudor son obligatorios.' });
        return;
      }
      if (lender === borrower) {
        res.status(400).json({ error: 'No puedes registrar un préstamo a ti mismo.' });
        return;
      }
      if (!numAmount || numAmount <= 0) {
        res.status(400).json({ error: 'El monto debe ser mayor a 0.' });
        return;
      }
      if (!concept || !String(concept).trim()) {
        res.status(400).json({ error: 'El motivo o concepto es obligatorio (ej. taxi, cena).' });
        return;
      }

      const newLoan = {
        id: newId('loan'),
        lender: String(lender).trim(),
        borrower: String(borrower).trim(),
        amount: Math.round(numAmount),
        concept: String(concept).trim(),
        createdAt: new Date().toISOString(),
        settled: false,
      };

      const loans = await store.insertLoan(newLoan);
      res.json({ success: true, loan: newLoan, loans });
    })
  );

  // Loans: Delete
  app.delete(
    '/api/trip/loans/:id',
    wrap(async (req, res) => {
      const { id } = req.params;
      const { deleted, loans } = await store.deleteLoan(id);
      if (!deleted) {
        res.status(404).json({ error: 'Registro de préstamo no encontrado.' });
        return;
      }
      res.json({ success: true, loans });
    })
  );

  // Loans: Toggle settle
  app.patch(
    '/api/trip/loans/:id/settle',
    wrap(async (req, res) => {
      const { id } = req.params;
      const loan = await store.toggleSettleLoan(id);
      if (!loan) {
        res.status(404).json({ error: 'Registro de préstamo no encontrado.' });
        return;
      }
      const loans = await store.listLoans();
      res.json({ success: true, loan, loans });
    })
  );

  // ---------------- Lugares / Hospedaje / Transporte (admin) ----------------
  // Nota: igual que el resto de rutas de admin de este archivo, no llevan
  // verificación de contraseña en el servidor — la barrera real hoy es a
  // quién se le pasa el enlace. Ver la nota de seguridad del README.

  app.post(
    '/api/trip/places',
    wrap(async (req, res) => {
      const { city, name, category, description, lat, lng } = req.body || {};
      if (!city || !name) {
        res.status(400).json({ error: 'Ciudad y nombre son obligatorios.' });
        return;
      }
      const place: Place = {
        id: newId('pl'),
        city,
        name: String(name).trim(),
        category: category || 'imperdible',
        description: (description || '').trim(),
        lat: lat !== undefined && lat !== '' ? Number(lat) : undefined,
        lng: lng !== undefined && lng !== '' ? Number(lng) : undefined,
      };
      const places = await store.insertPlace(place);
      res.json({ success: true, place, places });
    })
  );

  app.delete(
    '/api/trip/places/:id',
    wrap(async (req, res) => {
      const deleted = await store.deletePlace(req.params.id);
      if (!deleted) {
        res.status(404).json({ error: 'Lugar no encontrado.' });
        return;
      }
      res.json({ success: true, places: await store.listPlaces() });
    })
  );

  app.post(
    '/api/trip/lodging',
    wrap(async (req, res) => {
      const { city, name, fromDate, toDate, pricePerNightCOP, isEstimated, notes } = req.body || {};
      if (!city || !name || !fromDate || !toDate) {
        res.status(400).json({ error: 'Ciudad, nombre y fechas de entrada/salida son obligatorios.' });
        return;
      }
      const lodging: Lodging = {
        id: newId('lg'),
        city,
        name: String(name).trim(),
        fromDate,
        toDate,
        pricePerNightCOP: Number(pricePerNightCOP) || 0,
        isEstimated: isEstimated !== false,
        notes: (notes || '').trim(),
      };
      const list = await store.insertLodging(lodging);
      res.json({ success: true, lodging, list });
    })
  );

  app.delete(
    '/api/trip/lodging/:id',
    wrap(async (req, res) => {
      const deleted = await store.deleteLodging(req.params.id);
      if (!deleted) {
        res.status(404).json({ error: 'Hospedaje no encontrado.' });
        return;
      }
      res.json({ success: true, list: await store.listLodging() });
    })
  );

  app.post(
    '/api/trip/transport',
    wrap(async (req, res) => {
      const { fromCity, toCity, date, time, mode, priceCOP, isEstimated, colorCity, notes } =
        req.body || {};
      if (!fromCity || !toCity || !date) {
        res.status(400).json({ error: 'Origen, destino y fecha son obligatorios.' });
        return;
      }
      const leg: TransportLeg = {
        id: newId('tr'),
        fromCity: String(fromCity).trim(),
        toCity: String(toCity).trim(),
        date,
        time: (time || '').trim(),
        mode: mode || 'bus',
        priceCOP: Number(priceCOP) || 0,
        isEstimated: isEstimated !== false,
        colorCity: colorCity || 'med',
        notes: (notes || '').trim(),
      };
      const legs = await store.insertTransportLeg(leg);
      res.json({ success: true, leg, legs });
    })
  );

  app.delete(
    '/api/trip/transport/:id',
    wrap(async (req, res) => {
      const deleted = await store.deleteTransportLeg(req.params.id);
      if (!deleted) {
        res.status(404).json({ error: 'Tramo de transporte no encontrado.' });
        return;
      }
      res.json({ success: true, legs: await store.listTransportLegs() });
    })
  );

  // ---------------- Avisos del grupo (admin) ----------------

  app.post(
    '/api/trip/announcements',
    wrap(async (req, res) => {
      const { text } = req.body || {};
      if (!text || !String(text).trim()) {
        res.status(400).json({ error: 'El aviso no puede estar vacío.' });
        return;
      }
      const announcement: Announcement = {
        id: newId('ann'),
        text: String(text).trim(),
        createdAt: new Date().toISOString(),
      };
      const announcements = await store.insertAnnouncement(announcement);
      res.json({ success: true, announcement, announcements });
    })
  );

  app.delete(
    '/api/trip/announcements/:id',
    wrap(async (req, res) => {
      const deleted = await store.deleteAnnouncement(req.params.id);
      if (!deleted) {
        res.status(404).json({ error: 'Aviso no encontrado.' });
        return;
      }
      res.json({ success: true, announcements: await store.listAnnouncements() });
    })
  );

  // Admin Config Update
  app.post(
    '/api/trip/config',
    wrap(async (req, res) => {
      const { autoApprovePolls, tripName } = req.body || {};
      const config = await store.updateConfig({ autoApprovePolls, tripName });
      res.json({ success: true, config });
    })
  );

  // Reset to Defaults (Admin)
  app.post(
    '/api/trip/reset',
    wrap(async (req, res) => {
      const { password } = req.body || {};
      if (password !== ADMIN_PASSWORD) {
        res.status(401).json({ error: 'Contraseña no válida.' });
        return;
      }
      const state = await store.resetTripData();
      res.json({ success: true, state });
    })
  );

  return app;
}
