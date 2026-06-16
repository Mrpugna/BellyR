const TODAY = '2026-06-15';
const state = {
  pets: [],
  bookings: [],
  careLogs: [],
  payments: [],
  selectedCareIndex: 0,
  calendarDate: new Date('2026-06-01T00:00:00'),
  careDrafts: {},
  settings: {business_name:'BellyRub', business_subtitle:'Pet Staycation', manager_name:'May Kanya', manager_role:'Staycation manager', capacity:18, care_deadline:'17:00'},
  editingPetId: null,
  deletingPetId: null,
  editingBookingId: null,
  deletingBookingId: null,
};

const services = [
  {icon:'ON', name:'Overnight stay', bookings:'24 bookings', value:'&#3647;96,000', share:'52%', width:88},
  {icon:'DC', name:'Daycare', bookings:'31 bookings', value:'&#3647;55,800', share:'30%', width:61},
  {icon:'GR', name:'Grooming add-ons', bookings:'18 services', value:'&#3647;22,320', share:'12%', width:39},
  {icon:'EX', name:'Extra care', bookings:'12 services', value:'&#3647;12,300', share:'6%', width:23},
];

const pageMeta = {
  dashboard:{eyebrow:'Monday, 15 June', title:'Good morning, May', action:'Add new pet'},
  calendar:{eyebrow:'Booking management', title:'Stay calendar', action:'New booking'},
  care:{eyebrow:'Owner communication', title:'Daily care log', action:'New update'},
  finance:{eyebrow:'Business performance', title:'Reports & financials', action:'Add payment'},
};

function escapeHtml(value='') {
  return String(value).replace(/[&<>'"]/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
}

function formatBaht(value) {
  return `฿${Number(value || 0).toLocaleString('en-US', {maximumFractionDigits: 0})}`;
}

function avatarClass(name) {
  const known = ['coco','milo','luna','bento','mochi','nala'];
  const key = String(name).toLowerCase();
  return known.includes(key) ? `avatar-${key}` : 'avatar-milo';
}

function avatar(pet) {
  const name = pet.name || pet.pet_name || '';
  return `<div class="avatar ${avatarClass(name)}">${escapeHtml(name.slice(0,2).toUpperCase())}</div>`;
}

function normalizePet(row) {
  return {
    id: row.id,
    name: row.name,
    breed: row.breed,
    age: row.age || 'Age not set',
    sex: row.sex || 'Not set',
    foodGrams: row.food_grams || 'Not set',
    mealsPerDay: row.meals_per_day || 'Not set',
    health: row.health_notes || 'No health notes added',
    vaccine: row.vaccine_record || 'Record pending',
    owner: row.owner_name,
    contact: row.owner_contact || 'Contact pending',
    temperament: row.temperament,
    status: row.status,
    stay: row.service_type,
    dates: row.stay_dates,
    note: row.notes || 'No additional notes',
  };
}

function ownerChannel(contact) {
  return String(contact).toLowerCase().includes('ig:') ? 'Instagram' : 'LINE';
}

async function fetchJson(path, options={}) {
  const response = await fetch(path, options);
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || 'Request failed');
  return payload;
}

async function api(path, options={}) {
  try {
    return await fetchJson(path, options);
  } catch (error) {
    if (path.startsWith('/api/')) {
      return fetchJson(`/.netlify/functions/api${path.slice(4)}`, options);
    }
    throw error;
  }
}

async function loadData() {
  try {
    const [pets, bookings, careLogs, financials, settings] = await Promise.all([
      api('/api/pets'), api('/api/bookings'), api('/api/care-logs'), api('/api/financials'), api('/api/settings'),
    ]);
    state.pets = pets.map(normalizePet);
    state.bookings = bookings;
    state.careLogs = careLogs;
    state.payments = financials.payments;
    state.settings = settings;
    renderAll();
  } catch (error) {
    showToast(`Could not load database: ${error.message}`);
  }
}

function renderAll() {
  renderPets(document.querySelector('#pet-search').value, document.querySelector('#pet-filter').value);
  renderStats();
  renderCalendar();
  renderCarePets();
  renderFinance();
  applySettings();
}

function applySettings() {
  const settings=state.settings;
  document.querySelector('#brand-name').textContent=settings.business_name;
  document.querySelector('#brand-subtitle').textContent=settings.business_subtitle;
  document.querySelector('#brand-mark').textContent=settings.business_name.slice(0,1).toUpperCase();
  document.querySelector('#manager-name').textContent=settings.manager_name;
  document.querySelector('#manager-role').textContent=settings.manager_role;
  document.querySelector('#manager-avatar').textContent=settings.manager_name.split(/\s+/).map(part=>part[0]).join('').slice(0,2).toUpperCase();
  document.querySelector('.yellow small b').textContent=`Send before ${settings.care_deadline}`;
  document.title=`${settings.business_name} ${settings.business_subtitle}`;
}

function renderStats() {
  const checkedIn = state.pets.filter(p => p.status === 'Checked in').length;
  const checkout = state.pets.filter(p => p.status === 'Checking out').length;
  const inCare = checkedIn;
  const due = carePetData().filter(p => !p.done).length;
  document.querySelector('#stat-care').textContent = inCare;
  document.querySelector('#stat-arriving').textContent = checkedIn;
  document.querySelector('#stat-arriving-note').textContent = checkedIn;
  document.querySelector('#stat-checkout').textContent = checkout;
  document.querySelector('#stat-care-due').textContent = due;
  document.querySelector('#care-due-count').textContent = `${due} due`;
  document.querySelector('#nav-booking-count').textContent = state.bookings.length;
  document.querySelector('#nav-care-count').textContent = due;
  const capacity=Number(state.settings.capacity)||18;
  document.querySelector('#capacity-label').textContent = `${inCare} of ${capacity} spots filled`;
  document.querySelector('#capacity-progress').style.width = `${Math.min(100, Math.round((inCare/capacity)*100))}%`;
}

function renderPets(query='', status='all') {
  const filtered = state.pets.filter(p => `${p.name} ${p.breed} ${p.owner}`.toLowerCase().includes(query.toLowerCase()) && (status === 'all' || p.status === status));
  document.querySelector('#pet-list').innerHTML = filtered.length ? filtered.map(p => {
    const temperamentClass = p.temperament.toLowerCase().replaceAll(' ', '-');
    const statusClass = p.status === 'Checking out' ? 'checkout' : '';
    return `<div class="pet-row" title="Health: ${escapeHtml(p.health)}. Vaccine: ${escapeHtml(p.vaccine)}. Notes: ${escapeHtml(p.note)}"><div class="pet-identity">${avatar(p)}<div><strong>${escapeHtml(p.name)}</strong><span>${escapeHtml(p.breed)} &middot; ${escapeHtml(p.age)} &middot; ${escapeHtml(p.sex)}</span><small><b>Food:</b> ${escapeHtml(p.foodGrams)}g per meal &middot; ${escapeHtml(p.mealsPerDay)}x daily</small><small><b>Health:</b> ${escapeHtml(p.health)} &middot; ${escapeHtml(p.note)}</small></div></div><div class="stay-cell"><strong>${escapeHtml(p.stay)}</strong><span>${escapeHtml(p.dates)}</span><small>Vaccine: ${escapeHtml(p.vaccine)}</small></div><div class="owner-cell"><div><strong>${escapeHtml(p.owner)}</strong><span>${escapeHtml(p.contact)}</span></div></div><div><span class="temperament ${temperamentClass}">${escapeHtml(p.temperament)}</span></div><div><span class="status-pill ${statusClass}">${escapeHtml(p.status)}</span></div><div class="pet-actions"><button class="row-action edit-pet" data-id="${p.id}" aria-label="Edit ${escapeHtml(p.name)}">Edit</button><button class="row-action delete delete-pet" data-id="${p.id}" aria-label="Delete ${escapeHtml(p.name)}">Delete</button></div></div>`;
  }).join('') : '<div class="empty-state">No pets match that search.</div>';
}

const serviceTypeOptions = ['Daycare', 'Overnight', 'Daycare + Bath', 'Overnight + Bath'];
const bookingStatusOptions = ['Checked-in', 'Checked-out'];

function bookingClass(status) {
  if (status === 'Checked-out') return 'checkout';
  return 'checked';
}

function bookingCoversDate(booking, date) {
  return booking.check_in <= date && booking.check_out >= date;
}

function bookingDateLabel(booking, date) {
  if (booking.check_in === date && booking.check_out === date) return 'Same day';
  if (booking.check_in === date) return 'Check-in';
  if (booking.check_out === date) return 'Check-out';
  return 'Stay';
}

function bookingDatesAreValid(booking) {
  return booking.check_in && booking.check_out && booking.check_out >= booking.check_in;
}

function renderCalendar() {
  const year = state.calendarDate.getFullYear();
  const month = state.calendarDate.getMonth();
  document.querySelector('#calendar-month').textContent = state.calendarDate.toLocaleDateString('en-US', {month:'long', year:'numeric'});
  const firstDay = new Date(year, month, 1);
  const mondayOffset = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const previousDays = new Date(year, month, 0).getDate();
  const cells = [];
  for (let i = 0; i < 42; i += 1) {
    const dayNumber = i - mondayOffset + 1;
    const muted = dayNumber < 1 || dayNumber > daysInMonth;
    const displayDay = dayNumber < 1 ? previousDays + dayNumber : dayNumber > daysInMonth ? dayNumber - daysInMonth : dayNumber;
    const cellDate = muted ? '' : `${year}-${String(month + 1).padStart(2,'0')}-${String(dayNumber).padStart(2,'0')}`;
    const dayBookings = state.bookings.filter(item => cellDate && bookingDatesAreValid(item) && bookingCoversDate(item, cellDate));
    cells.push(`<div class="calendar-day ${muted?'muted':''} ${cellDate===TODAY?'today':''} ${dayBookings.length?'has-booking':''}"><span class="date-num">${displayDay}</span>${dayBookings.slice(0,2).map(item => `<button class="booking-chip ${bookingClass(item.status)} edit-booking-chip" data-id="${item.id}" type="button" aria-label="Edit ${escapeHtml(item.pet_name)} booking">${escapeHtml(item.pet_name)} · ${escapeHtml(bookingDateLabel(item, cellDate))}</button>`).join('')}${dayBookings.length>2?`<span class="more-bookings">+${dayBookings.length-2} more</span>`:''}</div>`);
  }
  document.querySelector('#calendar-grid').innerHTML = cells.join('');
  const todayBookings = state.bookings.filter(item => bookingDatesAreValid(item) && (item.check_in === TODAY || item.check_out === TODAY));
  document.querySelector('#schedule-arrivals').textContent = state.bookings.filter(item => bookingDatesAreValid(item) && item.check_in === TODAY).length;
  document.querySelector('#schedule-departures').textContent = state.bookings.filter(item => bookingDatesAreValid(item) && item.check_out === TODAY).length;
  document.querySelector('#schedule-list').innerHTML = todayBookings.length ? todayBookings.map(item => `<div class="schedule-item"><div class="schedule-time">${item.check_in===TODAY?'IN':'OUT'}</div><div><strong>${escapeHtml(item.pet_name)}</strong><p>${escapeHtml(item.service_type)} · ${escapeHtml(item.check_in)} to ${escapeHtml(item.check_out)}</p><span class="status-pill ${bookingClass(item.status)}">${escapeHtml(item.status)}</span><div class="booking-actions"><button class="row-action edit-booking" data-id="${item.id}" type="button">Edit</button><button class="row-action delete delete-booking" data-id="${item.id}" type="button">Delete</button></div></div></div>`).join('') : '<div class="empty-state">No bookings for today.</div>';
}

function carePetData() {
  return state.pets.filter(p => ['Checked in','Checking out'].includes(p.status)).map(p => ({
    ...p,
    platform: ownerChannel(p.contact),
    done: state.careLogs.some(log => log.pet_name === p.name && careDateInBangkok(log.sent_at) === TODAY),
  }));
}

function careDateInBangkok(isoDate) {
  const parts = new Intl.DateTimeFormat('en-CA', {timeZone:'Asia/Bangkok', year:'numeric', month:'2-digit', day:'2-digit'}).formatToParts(new Date(isoDate));
  const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function renderCarePets() {
  const carePets = carePetData();
  if (state.selectedCareIndex >= carePets.length) state.selectedCareIndex = 0;
  document.querySelector('#care-pets').innerHTML = carePets.map((p,i) => `<div class="care-pet-item ${i===state.selectedCareIndex?'active':''}" data-index="${i}">${avatar(p)}<div><strong>${escapeHtml(p.name)}</strong><span>${p.done?'Update sent':'Update due'} &middot; Owner: ${escapeHtml(p.owner)}</span></div><span class="platform ${p.platform==='Instagram'?'ig':''} ${p.done?'care-done':''}">${p.done?'Sent':p.platform}</span></div>`).join('');
  updateCareHeader(carePets[state.selectedCareIndex]);
  renderStats();
}

function updateCareHeader(pet) {
  if (!pet) return;
  document.querySelector('#care-pet-name').textContent = pet.name;
  document.querySelector('#care-owner').textContent = `For ${pet.owner} via ${pet.platform}`;
  const headerAvatar = document.querySelector('.care-form-header .avatar');
  headerAvatar.className = `avatar ${avatarClass(pet.name)}`;
  headerAvatar.textContent = pet.name.slice(0,2).toUpperCase();
  document.querySelector('.line-logo').textContent = pet.platform === 'LINE' ? 'LINE' : 'IG';
  document.querySelector('.upload-preview span').textContent = pet.name.slice(0,2).toUpperCase();
}

function readCareDraft() {
  const carePets = carePetData();
  const pet = carePets[state.selectedCareIndex];
  if (!pet) return;
  state.careDrafts[pet.name] = {
    meal: document.querySelector('.segmented .selected').textContent.trim(),
    mood: document.querySelector('.mood-options .selected').dataset.mood,
    checked: [...document.querySelectorAll('.check-grid input:checked')].map(input => input.nextElementSibling.textContent.trim()),
    note: document.querySelector('#care-note').value,
  };
}

function loadCareDraft(pet) {
  if (!pet) return;
  const draft = state.careDrafts[pet.name] || {
    meal: 'All eaten',
    mood: 'Happy',
    checked: ['Morning walk', 'Playtime', 'Pee', 'Nap'],
    note: `${pet.name} had a lovely day with us. Meals, mood, activities, and toilet breaks are recorded above.`,
  };
  document.querySelectorAll('.segmented button').forEach(button => button.classList.toggle('selected', button.textContent.trim() === draft.meal));
  document.querySelectorAll('.mood-options button').forEach(button => button.classList.toggle('selected', button.dataset.mood === draft.mood));
  document.querySelectorAll('.check-grid input').forEach(input => { input.checked = draft.checked.includes(input.nextElementSibling.textContent.trim()); });
  document.querySelector('#care-note').value = draft.note;
  document.querySelector('#preview-copy').textContent = draft.note;
}

function renderFinance() {
  const paid = state.payments.filter(p => p.status === 'Paid');
  const pending = state.payments.filter(p => p.status === 'Pending');
  const paidTotal = paid.reduce((sum,p) => sum + Number(p.amount), 0);
  const pendingTotal = pending.reduce((sum,p) => sum + Number(p.amount), 0);
  const occupied = state.pets.filter(p => p.status === 'Checked in').length;
  const capacity=Number(state.settings.capacity)||18;
  document.querySelector('#finance-revenue').textContent = formatBaht(paidTotal);
  document.querySelector('#finance-occupancy').textContent = `${Math.round((occupied/capacity)*100)}%`;
  document.querySelector('#finance-occupancy-note').textContent = `${occupied} of ${capacity} spots today`;
  document.querySelector('#finance-paid-count').textContent = paid.length;
  document.querySelector('#finance-paid-total').textContent = `${formatBaht(paidTotal)} collected`;
  document.querySelector('#finance-pending-count').textContent = pending.length;
  document.querySelector('#finance-pending-total').textContent = `${formatBaht(pendingTotal)} outstanding`;
  const revenue=[{m:'Jan',v:58,label:'112k'},{m:'Feb',v:68,label:'131k'},{m:'Mar',v:64,label:'124k'},{m:'Apr',v:76,label:'148k'},{m:'May',v:84,label:'162k'},{m:'Jun',v:97,label:'186k'}];
  document.querySelector('#revenue-chart').innerHTML=revenue.map((r,i)=>`<div class="chart-col"><i style="height:${r.v}%" data-value="&#3647;${r.label}" ${i===revenue.length-1?'class="current"':''}></i><span>${r.m}</span></div>`).join('');
  document.querySelector('#service-list').innerHTML=services.map(s=>`<div class="service-row"><div class="service-icon">${s.icon}</div><div><strong>${s.name}</strong><span>${s.bookings}</span><div class="service-progress"><i style="width:${s.width}%"></i></div></div><div class="service-value"><strong>${s.value}</strong><span>${s.share}</span></div></div>`).join('');
  document.querySelector('#payment-list').innerHTML = state.payments.length ? state.payments.map(p=>`<div class="payment-row"><div><strong>${escapeHtml(p.customer)}</strong><br><span>${escapeHtml(p.pet_name)}</span></div><span>${escapeHtml(p.service)}</span><strong>${formatBaht(p.amount)}</strong><span class="payment-status ${p.status==='Pending'?'pending':''}">${escapeHtml(p.status)}</span></div>`).join('') : '<div class="empty-state">No payments recorded.</div>';
}

function showToast(message) {
  const toast=document.querySelector('#toast');
  toast.querySelector('span').textContent=message;
  toast.classList.add('show');
  clearTimeout(showToast.timer);
  showToast.timer=setTimeout(()=>toast.classList.remove('show'),2600);
}

function switchPage(page) {
  document.querySelectorAll('.nav-item[data-page]').forEach(b=>b.classList.toggle('active',b.dataset.page===page));
  document.querySelectorAll('.page').forEach(p=>p.classList.toggle('active',p.id===`${page}-page`));
  document.querySelector('#page-eyebrow').textContent=pageMeta[page].eyebrow;
  document.querySelector('#page-title').textContent=pageMeta[page].title;
  document.querySelector('#primary-action span').textContent=pageMeta[page].action;
  document.querySelector('.sidebar').classList.remove('open');
}

const petModal = document.querySelector('#modal-backdrop');
const workflowModal = document.querySelector('#workflow-modal');
const editPetModal = document.querySelector('#edit-pet-modal');
const deletePetModal = document.querySelector('#delete-pet-modal');
const settingsModal = document.querySelector('#settings-modal');

function closeModal(modal) { modal.classList.remove('open'); }

function petFormFields(pet) {
  const option=(value,current)=>`<option ${value===current?'selected':''}>${escapeHtml(value)}</option>`;
  return `<div class="form-row"><label>Pet name<input name="name" required value="${escapeHtml(pet.name)}"></label><label>Breed<input name="breed" required value="${escapeHtml(pet.breed)}"></label></div><div class="form-row"><label>Age<input name="age" value="${escapeHtml(pet.age)}"></label><label>Sex<select name="sex">${option('Female',pet.sex)}${option('Male',pet.sex)}${option('Not set',pet.sex)}</select></label></div><div class="form-row"><label>Food per meal (grams)<input name="food_grams" type="number" min="1" value="${Number(pet.foodGrams)||''}"></label><label>Meals per day<input name="meals_per_day" type="number" min="1" max="6" value="${Number(pet.mealsPerDay)||''}"></label></div><label>Health notes<input name="health_notes" value="${escapeHtml(pet.health)}"></label><label>Vaccine record<input name="vaccine_record" value="${escapeHtml(pet.vaccine)}"></label><div class="form-row"><label>Owner name<input name="owner_name" required value="${escapeHtml(pet.owner)}"></label><label>Owner contact<input name="owner_contact" value="${escapeHtml(pet.contact)}"></label></div><div class="form-row"><label>Temperament<select name="temperament">${['Friendly','Shy','Reactive','Needs solo care'].map(v=>option(v,pet.temperament)).join('')}</select></label><label>Status<select name="status">${['Checked in','Checking out'].map(v=>option(v,pet.status)).join('')}</select></label></div><div class="form-row"><label>Service type<select name="service_type">${serviceTypeOptions.map(v=>option(v,pet.stay)).join('')}</select></label><label>Stay dates<input name="stay_dates" value="${escapeHtml(pet.dates)}"></label></div><label>Additional notes<input name="notes" value="${escapeHtml(pet.note)}"></label><button class="primary-button form-submit" type="submit">Save changes</button>`;
}

function openEditPet(petId) {
  const pet=state.pets.find(item=>item.id===petId);
  if(!pet) return;
  state.editingPetId=petId;
  document.querySelector('#edit-pet-form').innerHTML=petFormFields(pet);
  editPetModal.classList.add('open');
}

function openDeletePet(petId) {
  const pet=state.pets.find(item=>item.id===petId);
  if(!pet) return;
  state.deletingPetId=petId;
  document.querySelector('#delete-pet-title').textContent=`Delete ${pet.name}?`;
  document.querySelector('#delete-pet-confirmation').value='';
  document.querySelector('#delete-pet-confirmation').placeholder=pet.name;
  deletePetModal.classList.add('open');
}

function openSettings() {
  const form=document.querySelector('#settings-form');
  Object.entries(state.settings).forEach(([key,value])=>{const field=form.elements.namedItem(key);if(field)field.value=value;});
  settingsModal.classList.add('open');
}


function openEditBooking(bookingId) {
  const booking = state.bookings.find((item) => item.id === bookingId);
  if (!booking) return;
  state.editingBookingId = bookingId;
  const form = document.querySelector('#workflow-form');
  const petOptions = state.pets.map(p => `<option ${p.name===booking.pet_name?'selected':''}>${escapeHtml(p.name)}</option>`).join('');
  document.querySelector('#workflow-eyebrow').textContent = 'Booking calendar';
  document.querySelector('#workflow-title').textContent = `Edit ${booking.pet_name} booking`;
  document.querySelector('#workflow-description').textContent = 'Update the check-in date, check-out date, service type, or booking status.';
  form.dataset.type = 'edit-booking';
  form.innerHTML = `<label>Pet<select name="pet_name" required>${petOptions}</select></label><div class="form-row"><label>Check-in<input type="date" name="check_in" value="${booking.check_in}" required></label><label>Check-out<input type="date" name="check_out" value="${booking.check_out}" required></label></div><label>Service type<select name="service_type">${serviceTypeOptions.map(v=>`<option ${v===booking.service_type?'selected':''}>${v}</option>`).join('')}</select></label><label>Booking status<select name="status">${bookingStatusOptions.map(v=>`<option ${v===booking.status?'selected':''}>${v}</option>`).join('')}</select></label><div class="modal-actions booking-edit-actions"><button class="danger-button delete-booking-from-edit" type="button">Delete booking</button><button class="primary-button form-submit" type="submit">Save booking changes</button></div>`;
  workflowModal.classList.add('open');
}


function openDeleteBooking(bookingId) {
  const booking = state.bookings.find((item) => item.id === bookingId);
  if (!booking) return;
  state.deletingBookingId = bookingId;
  document.querySelector('#workflow-eyebrow').textContent = 'Booking calendar';
  document.querySelector('#workflow-title').textContent = `Delete ${booking.pet_name} booking?`;
  document.querySelector('#workflow-description').textContent = `${booking.check_in} to ${booking.check_out} · ${booking.service_type} · ${booking.status}`;
  const form = document.querySelector('#workflow-form');
  form.dataset.type = 'delete-booking';
  form.innerHTML = `<p class="delete-warning">This removes the booking from the calendar. Pet profile and financial records will not be deleted.</p><div class="modal-actions"><button class="ghost-button workflow-cancel" type="button">Cancel</button><button class="danger-button" type="submit">Delete booking</button></div>`;
  workflowModal.classList.add('open');
}

function openWorkflow(type) {
  const form = document.querySelector('#workflow-form');
  const petOptions = state.pets.map(p => `<option>${escapeHtml(p.name)}</option>`).join('');
  if (type === 'booking') {
    document.querySelector('#workflow-eyebrow').textContent = 'Booking calendar';
    document.querySelector('#workflow-title').textContent = 'Add a booking';
    document.querySelector('#workflow-description').textContent = 'Create a stay and assign its current booking status.';
    form.dataset.type = 'booking';
    form.innerHTML = `<label>Pet<select name="pet_name" required>${petOptions}</select></label><div class="form-row"><label>Check-in<input type="date" name="check_in" value="${TODAY}" required></label><label>Check-out<input type="date" name="check_out" value="${TODAY}" required></label></div><label>Service type<select name="service_type">${serviceTypeOptions.map(v=>`<option>${v}</option>`).join('')}</select></label><label>Booking status<select name="status">${bookingStatusOptions.map(v=>`<option>${v}</option>`).join('')}</select></label><button class="primary-button form-submit" type="submit">Save booking</button>`;
  } else {
    document.querySelector('#workflow-eyebrow').textContent = 'Financial record';
    document.querySelector('#workflow-title').textContent = 'Add a payment';
    document.querySelector('#workflow-description').textContent = 'Record a paid or pending customer payment.';
    form.dataset.type = 'payment';
    form.innerHTML = `<div class="form-row"><label>Customer<input name="customer" required placeholder="Customer name"></label><label>Pet<select name="pet_name" required>${petOptions}</select></label></div><label>Service<input name="service" required placeholder="e.g. Overnight stay"></label><div class="form-row"><label>Amount (THB)<input type="number" min="1" step="1" name="amount" required></label><label>Status<select name="status"><option>Paid</option><option>Pending</option></select></label></div><button class="primary-button form-submit" type="submit">Save payment</button>`;
  }
  workflowModal.classList.add('open');
}

document.querySelectorAll('.nav-item[data-page]').forEach(btn=>btn.addEventListener('click',()=>switchPage(btn.dataset.page)));
document.querySelector('.mobile-menu').addEventListener('click',()=>document.querySelector('.sidebar').classList.toggle('open'));
document.querySelector('#pet-search').addEventListener('input',e=>renderPets(e.target.value,document.querySelector('#pet-filter').value));
document.querySelector('#pet-filter').addEventListener('change',e=>renderPets(document.querySelector('#pet-search').value,e.target.value));
document.querySelector('.global-search input').addEventListener('input', e => {
  switchPage('dashboard');
  document.querySelector('#pet-search').value = e.target.value;
  renderPets(e.target.value, document.querySelector('#pet-filter').value);
});

document.querySelector('#primary-action').addEventListener('click',()=>{
  const page=document.querySelector('.page.active').id;
  if(page==='dashboard-page') petModal.classList.add('open');
  else if(page==='calendar-page') openWorkflow('booking');
  else if(page==='finance-page') openWorkflow('payment');
  else { document.querySelector('#care-note').focus(); showToast('Care update form is ready'); }
});

document.querySelector('.modal-close').addEventListener('click',()=>closeModal(petModal));
document.querySelector('.workflow-close').addEventListener('click',()=>closeModal(workflowModal));
document.querySelector('.edit-pet-close').addEventListener('click',()=>closeModal(editPetModal));
document.querySelector('.delete-pet-close').addEventListener('click',()=>closeModal(deletePetModal));
document.querySelector('.delete-pet-cancel').addEventListener('click',()=>closeModal(deletePetModal));
document.querySelector('.settings-close').addEventListener('click',()=>closeModal(settingsModal));
[petModal, workflowModal, editPetModal, deletePetModal, settingsModal].forEach(modal => modal.addEventListener('click', e => {if(e.target===modal) closeModal(modal);}));

document.querySelector('#pet-list').addEventListener('click',e=>{
  const edit=e.target.closest('.edit-pet');
  const remove=e.target.closest('.delete-pet');
  if(edit) openEditPet(Number(edit.dataset.id));
  if(remove) openDeletePet(Number(remove.dataset.id));
});

document.querySelector('#pet-form').addEventListener('submit', async e => {
  e.preventDefault();
  const data=new FormData(e.target);
  try {
    const saved = await api('/api/pets',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:data.get('name'),breed:data.get('breed'),age:data.get('age'),sex:data.get('sex'),food_grams:Number(data.get('foodGrams'))||null,meals_per_day:Number(data.get('mealsPerDay'))||null,health_notes:data.get('healthNotes'),owner_name:data.get('owner'),owner_contact:data.get('contact'),temperament:data.get('temperament')})});
    state.pets.push(normalizePet(saved));
    renderAll();
    closeModal(petModal);
    e.target.reset();
    showToast('Pet profile saved to database');
  } catch(error) { showToast(error.message); }
});

document.querySelector('#workflow-form').addEventListener('submit', async e => {
  e.preventDefault();
  const data=Object.fromEntries(new FormData(e.target));
  try {
    if(e.target.dataset.type==='delete-booking') {
      const booking=state.bookings.find(item=>item.id===state.deletingBookingId);
      await api(`/api/bookings/${state.deletingBookingId}`,{method:'DELETE'});
      state.bookings=state.bookings.filter(item=>item.id!==state.deletingBookingId);
      renderCalendar();
      renderStats();
      showToast(`${booking?.pet_name || 'Booking'} booking deleted`);
    } else if(e.target.dataset.type==='booking' || e.target.dataset.type==='edit-booking') {
      if (!bookingDatesAreValid(data)) throw new Error('Check-out date must be the same as or after check-in date');
      const editing=e.target.dataset.type==='edit-booking';
      const saved=await api(editing?`/api/bookings/${state.editingBookingId}`:'/api/bookings',{method:editing?'PUT':'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
      if(editing){const index=state.bookings.findIndex(item=>item.id===state.editingBookingId);state.bookings[index]=saved;}else{state.bookings.push(saved);}
      renderCalendar();
      renderStats();
      showToast(editing?'Booking updated':'Booking saved to calendar');
    } else {
      const saved=await api('/api/payments',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
      state.payments.unshift(saved);
      renderFinance();
      showToast('Payment saved to financials');
    }
    closeModal(workflowModal);
  } catch(error) { showToast(error.message); }
});

document.querySelector('#edit-pet-form').addEventListener('submit',async e=>{
  e.preventDefault();
  const data=Object.fromEntries(new FormData(e.target));
  data.food_grams=Number(data.food_grams)||null;
  data.meals_per_day=Number(data.meals_per_day)||null;
  try {
    const saved=await api(`/api/pets/${state.editingPetId}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
    const index=state.pets.findIndex(p=>p.id===state.editingPetId);
    state.pets[index]=normalizePet(saved);
    renderAll();
    closeModal(editPetModal);
    showToast(`${saved.name} updated`);
  } catch(error) { showToast(error.message); }
});

document.querySelector('#delete-pet-form').addEventListener('submit',async e=>{
  e.preventDefault();
  const pet=state.pets.find(item=>item.id===state.deletingPetId);
  if(!pet) return;
  if(document.querySelector('#delete-pet-confirmation').value.trim()!==pet.name) {
    showToast(`Type ${pet.name} to confirm deletion`);
    return;
  }
  try {
    await api(`/api/pets/${pet.id}`,{method:'DELETE'});
    state.pets=state.pets.filter(item=>item.id!==pet.id);
    state.selectedCareIndex=0;
    renderAll();
    closeModal(deletePetModal);
    showToast(`${pet.name}'s profile was deleted`);
  } catch(error) { showToast(error.message); }
});

document.querySelector('#settings-form').addEventListener('submit',async e=>{
  e.preventDefault();
  const data=Object.fromEntries(new FormData(e.target));
  data.capacity=Number(data.capacity);
  try {
    state.settings=await api('/api/settings',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
    applySettings();
    renderStats();
    renderFinance();
    closeModal(settingsModal);
    showToast('Settings saved');
  } catch(error) { showToast(error.message); }
});

document.querySelectorAll('.segmented button').forEach(btn=>btn.addEventListener('click',()=>{btn.parentElement.querySelectorAll('button').forEach(b=>b.classList.remove('selected'));btn.classList.add('selected');}));
document.querySelectorAll('.mood-options button').forEach(btn=>btn.addEventListener('click',()=>{btn.parentElement.querySelectorAll('button').forEach(b=>b.classList.remove('selected'));btn.classList.add('selected');}));
document.querySelector('#care-note').addEventListener('input',e=>document.querySelector('#preview-copy').textContent=e.target.value);

document.querySelector('#send-update').addEventListener('click',async()=>{
  const carePets=carePetData();
  const pet=carePets[state.selectedCareIndex];
  if(!pet) return;
  const checked=[...document.querySelectorAll('.check-grid input:checked')].map(input=>input.nextElementSibling.textContent.trim());
  const payload={pet_name:pet.name,meal_status:document.querySelector('.segmented .selected').textContent.trim(),mood:document.querySelector('.mood-options .selected').dataset.mood,pee:checked.includes('Pee'),poo:checked.includes('Poo'),notes:document.querySelector('#care-note').value,channel:pet.platform};
  try {
    const saved=await api('/api/care-logs',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
    state.careLogs.unshift(saved);
    renderCarePets();
    showToast(`Care update saved for ${pet.name}`);
  } catch(error) { showToast(error.message); }
});

document.querySelector('#care-pets').addEventListener('click',e=>{
  const item=e.target.closest('.care-pet-item');
  if(!item) return;
  readCareDraft();
  state.selectedCareIndex=Number(item.dataset.index);
  renderCarePets();
  loadCareDraft(carePetData()[state.selectedCareIndex]);
});


document.querySelector('#schedule-list').addEventListener('click',e=>{
  const edit=e.target.closest('.edit-booking');
  const remove=e.target.closest('.delete-booking');
  if(edit) openEditBooking(Number(edit.dataset.id));
  if(remove) openDeleteBooking(Number(remove.dataset.id));
});
document.querySelector('#calendar-grid').addEventListener('click',e=>{
  const button=e.target.closest('.edit-booking-chip');
  if(button) openEditBooking(Number(button.dataset.id));
});
document.querySelector('#workflow-form').addEventListener('click',e=>{
  if(e.target.closest('.workflow-cancel')) closeModal(workflowModal);
  if(e.target.closest('.delete-booking-from-edit')) openDeleteBooking(state.editingBookingId);
});

document.querySelector('.month-prev').addEventListener('click',()=>{state.calendarDate.setMonth(state.calendarDate.getMonth()-1);renderCalendar();});
document.querySelector('.month-next').addEventListener('click',()=>{state.calendarDate.setMonth(state.calendarDate.getMonth()+1);renderCalendar();});
document.querySelector('#calendar-today').addEventListener('click',()=>{state.calendarDate=new Date(`${TODAY}T00:00:00`);renderCalendar();});

document.querySelector('#export-report').addEventListener('click',()=>{
  const csv=['Customer,Pet,Service,Amount,Status',...state.payments.map(p=>[p.customer,p.pet_name,p.service,p.amount,p.status].map(value=>`"${String(value).replaceAll('"','""')}"`).join(','))].join('\n');
  const link=document.createElement('a');
  link.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));
  link.download='bellyrub-payments.csv';
  link.click();
  URL.revokeObjectURL(link.href);
  showToast('Payment report exported');
});

document.querySelector('#choose-photos').addEventListener('click',()=>document.querySelector('#care-photos').click());
document.querySelector('#care-photos').addEventListener('change',e=>{
  const count=Math.min(e.target.files.length,6);
  document.querySelector('#photo-status').textContent=count ? `${count} photo${count===1?'':'s'} selected` : 'Up to 6 photos';
  if(e.target.files.length>6) showToast('Only the first 6 photos will be used');
});
document.querySelector('.top-actions .icon-button').addEventListener('click',()=>showToast('No new notifications'));
document.querySelector('#settings-button').addEventListener('click',openSettings);
document.querySelector('.text-button').addEventListener('click',()=>showToast('All service categories are already shown'));

loadData();
