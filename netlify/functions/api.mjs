import { getStore } from '@netlify/blobs';

const TODAY = '2026-06-15';
const defaultData = {
  nextIds: { pets: 7, bookings: 4, careLogs: 1, payments: 5 },
  settings: {
    id: 1,
    business_name: 'BellyRub',
    business_subtitle: 'Pet Staycation',
    manager_name: 'May Kanya',
    manager_role: 'Staycation manager',
    capacity: 18,
    care_deadline: '17:00',
  },
  pets: [
    { id: 1, name: 'Coco', breed: 'Golden Retriever', age: '4 years', sex: 'Female', food_grams: 180, meals_per_day: 2, health_notes: 'Chicken allergy', vaccine_record: 'Up to date', owner_name: 'Ploy S.', owner_contact: 'LINE: ploy.p', temperament: 'Friendly', status: 'Checked in', service_type: 'Overnight stay', stay_dates: '13-17 Jun', notes: 'Loves people; no chicken treats.', created_at: '2026-06-15T00:00:00.000Z' },
    { id: 2, name: 'Milo', breed: 'French Bulldog', age: '2 years', sex: 'Male', food_grams: 110, meals_per_day: 2, health_notes: 'Sensitive breathing', vaccine_record: 'Up to date', owner_name: 'Ben T.', owner_contact: '089-445-2210', temperament: 'Friendly', status: 'Arriving today', service_type: 'Daycare', stay_dates: 'Today, 10:30', notes: 'Keep cool during outdoor play.', created_at: '2026-06-15T00:00:00.000Z' },
    { id: 3, name: 'Luna', breed: 'Shiba Inu', age: '3 years', sex: 'Female', food_grams: 130, meals_per_day: 2, health_notes: 'No known conditions', vaccine_record: 'Due 28 Jun', owner_name: 'Mina K.', owner_contact: 'LINE: minak', temperament: 'Shy', status: 'Checked in', service_type: 'Overnight stay', stay_dates: '14-18 Jun', notes: 'Needs a little time to warm up.', created_at: '2026-06-15T00:00:00.000Z' },
    { id: 4, name: 'Bento', breed: 'Beagle', age: '6 years', sex: 'Male', food_grams: 145, meals_per_day: 2, health_notes: 'Daily joint support', vaccine_record: 'Up to date', owner_name: 'Jay P.', owner_contact: 'IG: @jayandbento', temperament: 'Friendly', status: 'Checking out', service_type: 'Overnight stay', stay_dates: '12-15 Jun', notes: 'Tablet with dinner at 6 PM.', created_at: '2026-06-15T00:00:00.000Z' },
    { id: 5, name: 'Mochi', breed: 'Pomeranian', age: '1 year', sex: 'Female', food_grams: 65, meals_per_day: 3, health_notes: 'No known conditions', vaccine_record: 'Up to date', owner_name: 'Fern L.', owner_contact: 'LINE: fern.lee', temperament: 'Reactive', status: 'Checked in', service_type: 'Solo care', stay_dates: '15-16 Jun', notes: 'Solo play only; reactive to large dogs.', created_at: '2026-06-15T00:00:00.000Z' },
    { id: 6, name: 'Nala', breed: 'Thai Ridgeback', age: '5 years', sex: 'Female', food_grams: 200, meals_per_day: 2, health_notes: 'Hip dysplasia', vaccine_record: 'Up to date', owner_name: 'Chris W.', owner_contact: '081-203-8851', temperament: 'Needs solo care', status: 'Arriving today', service_type: 'Overnight + bath', stay_dates: 'Today, 14:00', notes: 'Short gentle walks only.', created_at: '2026-06-15T00:00:00.000Z' },
  ],
  bookings: [
    { id: 1, pet_name: 'Coco', check_in: '2026-06-13', check_out: '2026-06-17', service_type: 'Overnight', status: 'Checked-in' },
    { id: 2, pet_name: 'Milo', check_in: TODAY, check_out: TODAY, service_type: 'Daycare', status: 'Confirmed' },
    { id: 3, pet_name: 'Nala', check_in: TODAY, check_out: '2026-06-18', service_type: 'Overnight + bath', status: 'Confirmed' },
  ],
  careLogs: [],
  payments: [
    { id: 1, customer: 'Ploy S.', pet_name: 'Coco', service: 'Overnight stay', amount: 4800, status: 'Paid' },
    { id: 2, customer: 'Chris W.', pet_name: 'Nala', service: 'Stay + grooming', amount: 3250, status: 'Pending' },
    { id: 3, customer: 'Mina K.', pet_name: 'Luna', service: 'Overnight stay', amount: 5200, status: 'Paid' },
    { id: 4, customer: 'Ben T.', pet_name: 'Milo', service: 'Daycare', amount: 850, status: 'Paid' },
  ],
};

const store = getStore('bellyrub-data');

function json(payload, status = 200) {
  return Response.json(payload, { status, headers: { 'Cache-Control': 'no-store' } });
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

async function loadData() {
  const saved = await store.get('data.json', { type: 'json' });
  if (saved) return saved;
  const fresh = clone(defaultData);
  await saveData(fresh);
  return fresh;
}

async function saveData(data) {
  await store.setJSON('data.json', data);
}

async function readBody(req) {
  try { return await req.json(); } catch { return null; }
}

function missingFields(data, fields) {
  return fields.filter((field) => !String(data?.[field] ?? '').trim());
}

function nextId(data, collection) {
  const id = data.nextIds[collection] ?? 1;
  data.nextIds[collection] = id + 1;
  return id;
}

function financials(data) {
  const paid_revenue = data.payments.filter((item) => item.status === 'Paid').reduce((sum, item) => sum + Number(item.amount), 0);
  const pending_revenue = data.payments.filter((item) => item.status === 'Pending').reduce((sum, item) => sum + Number(item.amount), 0);
  return { paid_revenue, pending_revenue, payments: [...data.payments].sort((a, b) => b.id - a.id) };
}

function routePath(req) {
  const path = new URL(req.url).pathname;
  return path.replace(/^\/\.netlify\/functions\/api/, '/api');
}

export default async (req) => {
  const path = routePath(req);
  const method = req.method;
  const data = await loadData();

  if (method === 'GET' && path === '/api/health') return json({ status: 'ok', service: 'bellyrub-api', storage: 'netlify-blobs' });
  if (method === 'GET' && path === '/api/pets') return json([...data.pets].sort((a, b) => a.id - b.id));
  if (method === 'GET' && path === '/api/bookings') return json([...data.bookings].sort((a, b) => `${a.check_in}-${a.id}`.localeCompare(`${b.check_in}-${b.id}`)));
  if (method === 'GET' && path === '/api/care-logs') return json([...data.careLogs].sort((a, b) => b.id - a.id));
  if (method === 'GET' && path === '/api/financials') return json(financials(data));
  if (method === 'GET' && path === '/api/settings') return json(data.settings);
  if (method === 'GET' && path === '/api') return json({ name: 'BellyRub API', storage: 'Netlify Blobs' });

  if (method === 'POST' && path === '/api/pets') {
    const body = await readBody(req);
    const missing = missingFields(body, ['name', 'breed', 'owner_name']);
    if (missing.length) return json({ error: 'Missing required fields', fields: missing }, 422);
    const pet = { id: nextId(data, 'pets'), name: body.name, breed: body.breed, age: body.age || '', sex: body.sex || '', food_grams: body.food_grams ?? null, meals_per_day: body.meals_per_day ?? null, health_notes: body.health_notes || '', vaccine_record: body.vaccine_record || 'Record pending', owner_name: body.owner_name, owner_contact: body.owner_contact || '', temperament: body.temperament || 'Friendly', status: body.status || 'Arriving today', service_type: body.service_type || 'Booking pending', stay_dates: body.stay_dates || 'Dates not set', notes: body.notes || '', created_at: new Date().toISOString() };
    data.pets.push(pet); await saveData(data); return json(pet, 201);
  }

  const petMatch = path.match(/^\/api\/pets\/(\d+)$/);
  if (petMatch && method === 'PUT') {
    const id = Number(petMatch[1]);
    const body = await readBody(req);
    const missing = missingFields(body, ['name', 'breed', 'owner_name']);
    if (missing.length) return json({ error: 'Missing required fields', fields: missing }, 422);
    const index = data.pets.findIndex((pet) => pet.id === id);
    if (index === -1) return json({ error: 'Pet not found' }, 404);
    const oldName = data.pets[index].name;
    const updated = { ...data.pets[index], name: body.name, breed: body.breed, age: body.age || '', sex: body.sex || '', food_grams: body.food_grams ?? null, meals_per_day: body.meals_per_day ?? null, health_notes: body.health_notes || '', vaccine_record: body.vaccine_record || 'Record pending', owner_name: body.owner_name, owner_contact: body.owner_contact || '', temperament: body.temperament || 'Friendly', status: body.status || 'Arriving today', service_type: body.service_type || 'Booking pending', stay_dates: body.stay_dates || 'Dates not set', notes: body.notes || '' };
    data.pets[index] = updated;
    if (oldName !== updated.name) {
      data.bookings.forEach((item) => { if (item.pet_name === oldName) item.pet_name = updated.name; });
      data.careLogs.forEach((item) => { if (item.pet_name === oldName) item.pet_name = updated.name; });
      data.payments.forEach((item) => { if (item.pet_name === oldName) item.pet_name = updated.name; });
    }
    await saveData(data); return json(updated);
  }

  if (petMatch && method === 'DELETE') {
    const id = Number(petMatch[1]);
    const index = data.pets.findIndex((pet) => pet.id === id);
    if (index === -1) return json({ error: 'Pet not found' }, 404);
    const [deleted] = data.pets.splice(index, 1);
    await saveData(data); return json({ deleted: true, id, name: deleted.name });
  }

  if (method === 'POST' && path === '/api/bookings') {
    const body = await readBody(req);
    const missing = missingFields(body, ['pet_name', 'check_in', 'check_out', 'service_type', 'status']);
    if (missing.length) return json({ error: 'Missing required fields', fields: missing }, 422);
    if (body.check_out < body.check_in) return json({ error: 'Check-out must be on or after check-in' }, 422);
    const booking = { id: nextId(data, 'bookings'), pet_name: body.pet_name, check_in: body.check_in, check_out: body.check_out, service_type: body.service_type, status: body.status };
    data.bookings.push(booking); await saveData(data); return json(booking, 201);
  }

  const bookingMatch = path.match(/^\/api\/bookings\/(\d+)$/);
  if (bookingMatch && method === 'PUT') {
    const id = Number(bookingMatch[1]);
    const body = await readBody(req);
    const missing = missingFields(body, ['check_in', 'check_out', 'status']);
    if (missing.length) return json({ error: 'Missing required fields', fields: missing }, 422);
    if (body.check_out < body.check_in) return json({ error: 'Check-out must be on or after check-in' }, 422);
    const index = data.bookings.findIndex((booking) => booking.id === id);
    if (index === -1) return json({ error: 'Booking not found' }, 404);
    data.bookings[index] = {
      ...data.bookings[index],
      pet_name: body.pet_name || data.bookings[index].pet_name,
      check_in: body.check_in,
      check_out: body.check_out,
      service_type: body.service_type || data.bookings[index].service_type,
      status: body.status,
    };
    await saveData(data);
    return json(data.bookings[index]);
  }

  if (bookingMatch && method === 'DELETE') {
    const id = Number(bookingMatch[1]);
    const index = data.bookings.findIndex((booking) => booking.id === id);
    if (index === -1) return json({ error: 'Booking not found' }, 404);
    const [deleted] = data.bookings.splice(index, 1);
    await saveData(data);
    return json({ deleted: true, id, pet_name: deleted.pet_name });
  }

  if (method === 'POST' && path === '/api/care-logs') {
    const body = await readBody(req);
    const missing = missingFields(body, ['pet_name', 'meal_status', 'mood', 'channel']);
    if (missing.length) return json({ error: 'Missing required fields', fields: missing }, 422);
    const log = { id: nextId(data, 'careLogs'), pet_name: body.pet_name, meal_status: body.meal_status, mood: body.mood, pee: Boolean(body.pee), poo: Boolean(body.poo), notes: body.notes || '', channel: body.channel, sent_at: new Date().toISOString() };
    data.careLogs.push(log); await saveData(data); return json(log, 201);
  }

  if (method === 'POST' && path === '/api/payments') {
    const body = await readBody(req);
    const missing = missingFields(body, ['customer', 'pet_name', 'service', 'amount', 'status']);
    if (missing.length) return json({ error: 'Missing required fields', fields: missing }, 422);
    const amount = Number(body.amount);
    if (!Number.isFinite(amount) || amount <= 0) return json({ error: 'Amount must be greater than zero' }, 422);
    const payment = { id: nextId(data, 'payments'), customer: body.customer, pet_name: body.pet_name, service: body.service, amount, status: body.status };
    data.payments.push(payment); await saveData(data); return json(payment, 201);
  }

  if (method === 'PUT' && path === '/api/settings') {
    const body = await readBody(req);
    const missing = missingFields(body, ['business_name', 'business_subtitle', 'manager_name', 'manager_role', 'capacity', 'care_deadline']);
    if (missing.length) return json({ error: 'Missing required fields', fields: missing }, 422);
    const capacity = Number(body.capacity);
    if (!Number.isInteger(capacity) || capacity < 1 || capacity > 500) return json({ error: 'Capacity must be between 1 and 500' }, 422);
    data.settings = { id: 1, business_name: body.business_name, business_subtitle: body.business_subtitle, manager_name: body.manager_name, manager_role: body.manager_role, capacity, care_deadline: body.care_deadline };
    await saveData(data); return json(data.settings);
  }

  return json({ error: 'Endpoint not found' }, 404);
};

export const config = { path: '/api/*' };
