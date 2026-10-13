
/* =========================================
   LUXE EVENT - COMPLETE FRONTEND JAVASCRIPT
   Node.js + Express + MongoDB
========================================= */

const API = '/api';

let allEvents = [];
let activeEventId = null;
let toastTimer = null;
let lastFocusedElement = null;

const $ = (id) => document.getElementById(id);

// =========================================
// 1. API REQUEST
// =========================================

async function apiRequest(url, options = {}) {
    let response;

    try {
        response = await fetch(API + url, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            }
        });
    } catch (error) {
        throw new Error('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้');
    }

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(data.error || 'เกิดข้อผิดพลาด');
    }

    return data;
}

// =========================================
// 2. HELPER FUNCTIONS
// =========================================

function escapeHTML(value) {
    return String(value ?? '').replace(
        /[&<>"']/g,
        char => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        })[char]
    );
}

function formatDate(date, time) {
    if (!date) return '-';

    const parts = date.split('-').map(Number);

    if (parts.length !== 3) return date;

    const d = new Date(
        parts[0],
        parts[1] - 1,
        parts[2]
    );

    if (Number.isNaN(d.getTime())) return date;

    const formatted = d.toLocaleDateString('th-TH', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    });

    return formatted + (time ? ` · ${time} น.` : '');
}

function showToast(message, isError = false) {
    const toast = $('toast');

    clearTimeout(toastTimer);

    toast.textContent = message;
    toast.className =
        `toast show ${isError ? 'error' : ''}`;

    toastTimer = setTimeout(() => {
        toast.classList.remove('show');
    }, 3500);
}

function openModal(id) {
    lastFocusedElement = document.activeElement;

    $(id).hidden = false;
    document.body.classList.add('modal-open');

    const input = $(id).querySelector(
        'input:not([type="hidden"]), button'
    );

    input?.focus();
}

function closeModals() {
    document.querySelectorAll('.modal-backdrop')
        .forEach(modal => {
            modal.hidden = true;
        });

    document.body.classList.remove('modal-open');
    activeEventId = null;

    lastFocusedElement?.focus();
}

// แก้ไขปุ่ม Processing ให้กลับเป็นข้อความเดิม
function setSubmitBusy(form, busy) {
    const button = form.querySelector(
        '[type="submit"]'
    );

    if (!button) return;

    if (busy) {
        button.dataset.originalText =
            button.textContent.trim();

        button.disabled = true;
        button.textContent = 'Processing...';

    } else {
        button.disabled = false;

        button.textContent =
            button.dataset.originalText || 'Save';
    }
}

function getEventById(id) {
    return allEvents.find(event => event._id === id);
}

// =========================================
// 3. LOAD EVENTS FROM MONGODB
// =========================================

async function loadEvents() {
    console.log('Loading events from MongoDB...');

    try {
        allEvents = await apiRequest('/events');

        console.log('EVENT DATA:', allEvents);
        console.log('TOTAL EVENTS:', allEvents.length);

        updateStats();
        renderEvents();

    } catch (error) {
        console.error('Load Events Error:', error);

        showToast(error.message, true);

        $('eventsGrid').replaceChildren();
        $('resultCount').textContent = '0 EVENTS';

        $('emptyState').hidden = false;

        $('emptyState').querySelector('h3')
            .textContent = 'Unable to Load Events';

        $('emptyState').querySelector('p')
            .textContent =
            'กรุณาตรวจสอบ Backend และ MongoDB';
    }
}

// =========================================
// 4. DASHBOARD STATISTICS
// =========================================

function updateStats() {
    const totalEvents = allEvents.length;

    const totalRegistrations = allEvents.reduce(
        (sum, event) =>
            sum + (event.registeredCount || 0),
        0
    );

    const availableSeats = allEvents.reduce(
        (sum, event) =>
            sum + Math.max(
                0,
                event.capacity - (event.registeredCount || 0)
            ),
        0
    );

    $('totalEvents').textContent =
        totalEvents.toLocaleString();

    $('totalRegistrations').textContent =
        totalRegistrations.toLocaleString();

    $('availableSeats').textContent =
        availableSeats.toLocaleString();
}

// =========================================
// 5. DISPLAY EVENT CARDS
// =========================================

function renderEvents() {
    const search = $('searchInput')
        .value.trim().toLowerCase();

    const filter = $('filterSelect').value;

    const filtered = allEvents.filter(event => {
        const searchText =
            `${event.title} ${event.location}`
                .toLowerCase();

        const isFull =
            event.registeredCount >= event.capacity;

        const matchesSearch =
            searchText.includes(search);

        const matchesFilter =
            filter === 'all' ||
            (filter === 'available' && !isFull) ||
            (filter === 'full' && isFull);

        return matchesSearch && matchesFilter;
    });

    const grid = $('eventsGrid');
    grid.replaceChildren();

    $('resultCount').textContent =
        `${filtered.length} EVENTS`;

    $('emptyState').hidden = filtered.length > 0;

    $('emptyState').querySelector('h3')
        .textContent = 'No Events Found';

    $('emptyState').querySelector('p')
        .textContent =
        'ยังไม่มีกิจกรรมที่ตรงกับการค้นหาของคุณ';

    filtered.forEach((event, index) => {
        grid.appendChild(createEventCard(event, index));
    });
}

// =========================================
// 6. CREATE EVENT CARD
// =========================================

function createEventCard(event, index) {
    const registered = event.registeredCount || 0;
    const capacity = event.capacity || 1;

    const isFull = registered >= capacity;

    const percentage = Math.min(
        100,
        (registered / capacity) * 100
    );

    const symbols = ['✦', '✧', '♛', '✳'];
    const styleIndex = index % 4;

    const card = document.createElement('article');

    card.className = 'event-card';
    card.dataset.eventId = event._id;

    card.innerHTML = `
    <div class="event-cover cover-${styleIndex}">
      <span class="event-badge ${isFull ? 'full' : ''}">
        ${isFull ? 'FULLY BOOKED' : 'REGISTRATION OPEN'}
      </span>

      <span class="cover-art">
        ${symbols[styleIndex]}
      </span>
    </div>

    <div class="event-body">

      <div class="event-date">
        ✦ ${escapeHTML(formatDate(event.date, event.time))}
      </div>

      <h3>${escapeHTML(event.title)}</h3>

      <p class="event-description">
        ${escapeHTML(event.description)}
      </p>

      <div class="event-location">
        ♧ ${escapeHTML(event.location)}
      </div>

      <div class="seat-info">
        <span>REGISTERED ATTENDEES</span>
        <strong>${registered} / ${capacity}</strong>
      </div>

      <div class="progress">
        <div class="progress-fill"
             style="width: ${percentage}%">
        </div>
      </div>

      <div class="card-actions">

        <button
          class="btn btn-gold register-btn"
          data-action="register"
          ${isFull ? 'disabled' : ''}
        >
          ${isFull ? 'Fully Booked' : 'Register Now ↗'}
        </button>

        <button
          class="btn btn-outline btn-small"
          data-action="attendees"
        >
          Guests
        </button>

        <button
          class="btn btn-outline btn-small"
          data-action="edit"
        >
          Edit
        </button>

        <button
          class="btn btn-danger btn-small"
          data-action="delete"
        >
          Delete
        </button>

      </div>
    </div>
  `;

    return card;
}

// =========================================
// 7. EVENT CARD BUTTONS
// =========================================

$('eventsGrid').addEventListener('click', e => {
    const button = e.target.closest('[data-action]');

    if (!button) return;

    const card = button.closest('[data-event-id]');

    if (!card) return;

    const id = card.dataset.eventId;
    const action = button.dataset.action;

    if (action === 'register') {
        openRegisterModal(id);
    }

    if (action === 'attendees') {
        showAttendees(id);
    }

    if (action === 'edit') {
        openEditEvent(id);
    }

    if (action === 'delete') {
        deleteEvent(id);
    }
});

// =========================================
// 8. CREATE NEW EVENT
// =========================================

function openCreateEvent() {
    $('eventForm').reset();

    $('eventId').value = '';
    $('eventModalTitle').textContent = 'Create Event';

    openModal('eventModal');
}

// =========================================
// 9. EDIT EVENT
// =========================================

function openEditEvent(id) {
    const event = getEventById(id);

    if (!event) return;

    $('eventId').value = event._id;
    $('eventTitle').value = event.title;
    $('eventDescription').value = event.description;
    $('eventDate').value = event.date;
    $('eventTime').value = event.time;
    $('eventLocation').value = event.location;
    $('eventCapacity').value = event.capacity;

    $('eventModalTitle').textContent = 'Edit Event';

    openModal('eventModal');
}

// =========================================
// 10. SAVE EVENT - POST / PUT
// =========================================

$('eventForm').addEventListener('submit', async e => {
    e.preventDefault();

    const form = e.currentTarget;
    const id = $('eventId').value;

    const data = {
        title: $('eventTitle').value.trim(),
        description: $('eventDescription').value.trim(),
        date: $('eventDate').value,
        time: $('eventTime').value,
        location: $('eventLocation').value.trim(),
        capacity: Number($('eventCapacity').value)
    };

    setSubmitBusy(form, true);

    try {
        if (id) {
            await apiRequest(`/events/${id}`, {
                method: 'PUT',
                body: JSON.stringify(data)
            });

        } else {
            await apiRequest('/events', {
                method: 'POST',
                body: JSON.stringify(data)
            });
        }

        closeModals();

        showToast(
            id
                ? 'แก้ไขกิจกรรมสำเร็จ ✦'
                : 'สร้างกิจกรรมสำเร็จ ✦'
        );

        await loadEvents();

    } catch (error) {
        showToast(error.message, true);

    } finally {
        setSubmitBusy(form, false);
    }
});

// =========================================
// 11. DELETE EVENT
// =========================================

async function deleteEvent(id) {
    const event = getEventById(id);

    if (!event) return;

    const confirmed = confirm(
        `ต้องการลบกิจกรรม "${event.title}" ใช่หรือไม่?\n` +
        'รายชื่อผู้ลงทะเบียนจะถูกลบด้วย'
    );

    if (!confirmed) return;

    try {
        await apiRequest(`/events/${id}`, {
            method: 'DELETE'
        });

        showToast('ลบกิจกรรมสำเร็จ ✦');

        await loadEvents();

    } catch (error) {
        showToast(error.message, true);
    }
}

// =========================================
// 12. OPEN REGISTRATION MODAL
// =========================================

function openRegisterModal(id) {
    const event = getEventById(id);

    if (!event) return;

    $('registerForm').reset();

    $('registerEventId').value = id;
    $('registerEventName').textContent = event.title;

    openModal('registerModal');
}

// =========================================
// 13. REGISTER ATTENDEE
// =========================================

$('registerForm').addEventListener('submit', async e => {
    e.preventDefault();

    const form = e.currentTarget;

    const eventId = $('registerEventId').value;

    const data = {
        name: $('attendeeName').value.trim(),
        email: $('attendeeEmail').value.trim()
    };

    setSubmitBusy(form, true);

    try {
        await apiRequest(
            `/events/${eventId}/register`,
            {
                method: 'POST',
                body: JSON.stringify(data)
            }
        );

        closeModals();

        showToast(
            'ลงทะเบียนสำเร็จ! See you at the event ✦'
        );

        await loadEvents();

    } catch (error) {
        showToast(error.message, true);

    } finally {
        setSubmitBusy(form, false);
    }
});

// =========================================
// 14. VIEW ATTENDEES
// =========================================

async function showAttendees(eventId) {
    const event = getEventById(eventId);

    if (!event) return;

    const alreadyOpen = !$('attendeesModal').hidden;

    activeEventId = eventId;

    $('attendeesEventName').textContent = event.title;
    $('attendeesList').textContent = 'Loading guests...';

    if (!alreadyOpen) {
        openModal('attendeesModal');
    }

    try {
        const registrations = await apiRequest(
            `/events/${eventId}/registrations`
        );

        if (activeEventId !== eventId) return;

        renderAttendees(registrations);

    } catch (error) {
        $('attendeesList').textContent = error.message;
        showToast(error.message, true);
    }
}

// =========================================
// 15. RENDER ATTENDEE LIST
// =========================================

function renderAttendees(registrations) {
    const list = $('attendeesList');

    list.replaceChildren();

    if (registrations.length === 0) {
        const message = document.createElement('p');

        message.className = 'list-empty';
        message.textContent =
            'ยังไม่มีผู้ลงทะเบียนกิจกรรมนี้';

        list.appendChild(message);
        return;
    }

    registrations.forEach((person, index) => {
        const row = document.createElement('div');

        row.className = 'attendee-row';

        const info = document.createElement('div');

        const name = document.createElement('strong');
        name.textContent = `${index + 1}. ${person.name}`;

        const email = document.createElement('small');
        email.textContent = person.email;

        info.append(name, email);

        const button = document.createElement('button');

        button.className = 'btn btn-danger btn-small';
        button.textContent = 'Cancel';

        button.addEventListener('click', () => {
            cancelRegistration(person._id);
        });

        row.append(info, button);
        list.appendChild(row);
    });
}

// =========================================
// 16. CANCEL REGISTRATION
// =========================================

async function cancelRegistration(registrationId) {
    if (!confirm('ต้องการยกเลิกการลงทะเบียนนี้?')) {
        return;
    }

    const eventId = activeEventId;

    try {
        await apiRequest(
            `/registrations/${registrationId}`,
            {
                method: 'DELETE'
            }
        );

        showToast('ยกเลิกการลงทะเบียนสำเร็จ');

        await loadEvents();

        if (eventId && activeEventId === eventId) {
            await showAttendees(eventId);
        }

    } catch (error) {
        showToast(error.message, true);
    }
}

// =========================================
// 17. BUTTON EVENT LISTENERS
// =========================================

// Create Event buttons
$('createBtn').addEventListener(
    'click',
    openCreateEvent
);

$('heroCreateBtn').addEventListener(
    'click',
    openCreateEvent
);

$('sectionCreateBtn').addEventListener(
    'click',
    openCreateEvent
);

// Search Events
$('searchInput').addEventListener(
    'input',
    renderEvents
);

// Filter Events
$('filterSelect').addEventListener(
    'change',
    renderEvents
);

// =========================================
// 18. CLOSE MODALS
// =========================================

document.querySelectorAll('.modal-backdrop')
    .forEach(backdrop => {

        backdrop.addEventListener('click', e => {
            if (
                e.target === backdrop ||
                e.target.closest('[data-close]')
            ) {
                closeModals();
            }
        });

    });

// Escape key closes popup
document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
        closeModals();
    }
});

// =========================================
// 19. START APPLICATION
// =========================================

console.log('LUXE EVENT Frontend Loaded!');

loadEvents();
