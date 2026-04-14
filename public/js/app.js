/**
 * Aplicación principal - Dra. Karen Fajardo
 * Sistema de Gestión de Fisioterapia
 */

// ===== ESTADO DE LA APLICACIÓN =====
const state = {
    currentPage: 'dashboard',
    patients: [],
    appointments: [],
    treatments: [],
    payments: [],
    reminders: [],
    filters: {
        appointments: 'all',
        payments: 'all'
    }
};

// ===== UTILIDADES =====
const api = {
    async get(url) {
        const response = await fetch(url);
        if (response.status === 401) {
            window.location.href = '/login.html';
            return null;
        }
        if (!response.ok) {
            const error = await response.json().catch(() => ({ error: 'Error del servidor' }));
            throw error;
        }
        return response.json();
    },

    async post(url, data) {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (response.status === 401) {
            window.location.href = '/login.html';
            return null;
        }
        if (!response.ok) {
            const error = await response.json().catch(() => ({ error: 'Error del servidor' }));
            throw error;
        }
        return response.json();
    },

    async put(url, data) {
        const response = await fetch(url, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (response.status === 401) {
            window.location.href = '/login.html';
            return null;
        }
        if (!response.ok) {
            const error = await response.json().catch(() => ({ error: 'Error del servidor' }));
            throw error;
        }
        return response.json();
    },

    async patch(url, data) {
        const response = await fetch(url, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (response.status === 401) {
            window.location.href = '/login.html';
            return null;
        }
        if (!response.ok) {
            const error = await response.json().catch(() => ({ error: 'Error del servidor' }));
            throw error;
        }
        return response.json();
    },

    async delete(url) {
        const response = await fetch(url, { method: 'DELETE' });
        if (response.status === 401) {
            window.location.href = '/login.html';
            return null;
        }
        if (!response.ok) {
            const error = await response.json().catch(() => ({ error: 'Error del servidor' }));
            throw error;
        }
        return response.json();
    }
};

function formatDate(dateString) {
    if (!dateString) return '';
    
    // Extraer solo la parte de la fecha (YYYY-MM-DD) de cualquier formato
    let datePart;
    if (dateString.includes('T')) {
        // Es un timestamp ISO: "2026-04-14T00:00:00.000Z"
        datePart = dateString.split('T')[0];
    } else {
        // Es solo fecha: "2026-04-14"
        datePart = dateString.substring(0, 10);
    }
    
    // Verificar que es una fecha válida
    if (!/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
        // Formato desconocido, usar comportamiento normal
        return new Date(dateString).toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }
    
    // Crear fecha interpretándola como fecha LOCAL (no UTC)
    // Esto evita que se desplace un día atrás por la conversión de timezone
    const [year, month, day] = datePart.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    
    return date.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function formatTime(timeString) {
    return timeString;
}

function formatCurrency(amount) {
    // Formato para colones costarricenses (CRC)
    return `₡${parseFloat(amount).toLocaleString('es-CR', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
    })}`;
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ===== NAVEGACIÓN =====
function initNavigation() {
    const navItems = document.querySelectorAll('.nav-item, .bottom-nav-item');
    const menuToggle = document.getElementById('menuToggle');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.createElement('div');
    overlay.className = 'overlay';
    document.body.appendChild(overlay);
    
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const page = item.dataset.page;
            navigateToPage(page);
            
            // Cerrar sidebar en móvil
            if (window.innerWidth < 1024) {
                sidebar.classList.remove('active');
                overlay.classList.remove('active');
            }
        });
    });
    
    menuToggle.addEventListener('click', () => {
        sidebar.classList.toggle('active');
        overlay.classList.toggle('active');
    });
    
    overlay.addEventListener('click', () => {
        sidebar.classList.remove('active');
        overlay.classList.remove('active');
    });
}

function navigateToPage(page) {
    // Actualizar estado
    state.currentPage = page;
    
    // Actualizar navegación
    document.querySelectorAll('.nav-item, .bottom-nav-item').forEach(item => {
        item.classList.toggle('active', item.dataset.page === page);
    });
    
    // Mostrar página
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(`${page}-page`).classList.add('active');
    
    // Cargar datos de la página
    loadPageData(page);
}

async function loadPageData(page) {
    switch (page) {
        case 'dashboard':
            await loadDashboard();
            break;
        case 'patients':
            await loadPatients();
            break;
        case 'appointments':
            await loadAppointments();
            break;
        case 'treatments':
            await loadTreatments();
            break;
        case 'clinical-history':
            await loadClinicalHistory();
            break;
        case 'payments':
            await loadPayments();
            break;
    }
}

// ===== DASHBOARD =====
async function loadDashboard() {
    try {
        // Cargar estadísticas en paralelo
        const [patients, todayAppointments, allAppointments, paymentSummary] = await Promise.all([
            api.get('/api/patients'),
            api.get('/api/appointments/today'),
            api.get('/api/appointments?status=pendiente'),
            api.get('/api/payments/summary')
        ]);
        
        // Actualizar contadores
        document.getElementById('totalPatients').textContent = patients?.length || 0;
        document.getElementById('todayAppointments').textContent = todayAppointments?.length || 0;
        document.getElementById('pendingAppointments').textContent = allAppointments?.length || 0;
        document.getElementById('pendingPayments').textContent = formatCurrency(paymentSummary?.totalPending || 0);
        
        // Mostrar citas de hoy
        const todayList = document.getElementById('todayAppointmentsList');
        if (todayAppointments && todayAppointments.length > 0) {
            todayList.innerHTML = todayAppointments.map(apt => `
                <div class="appointment-item">
                    <span class="appointment-time">${formatTime(apt.time)}</span>
                    <div class="appointment-patient">
                        <div class="appointment-patient-name">${escapeHtml(apt.patient_name)}</div>
                    </div>
                    <span class="status-badge ${apt.status}">${apt.status}</span>
                </div>
            `).join('');
        } else {
            todayList.innerHTML = '<p class="empty-message">No hay citas programadas para hoy</p>';
        }
        
        // Mostrar próximas citas pendientes
        const upcomingList = document.getElementById('upcomingAppointmentsList');
        if (allAppointments && allAppointments.length > 0) {
            const upcoming = allAppointments.slice(0, 5);
            upcomingList.innerHTML = upcoming.map(apt => `
                <div class="appointment-item">
                    <span class="appointment-time">${formatDate(apt.date)} ${formatTime(apt.time)}</span>
                    <div class="appointment-patient">
                        <div class="appointment-patient-name">${escapeHtml(apt.patient_name)}</div>
                    </div>
                    <span class="status-badge ${apt.status}">${apt.status}</span>
                </div>
            `).join('');
        } else {
            upcomingList.innerHTML = '<p class="empty-message">No hay citas próximas</p>';
        }
    } catch (error) {
        console.error('Error cargando dashboard:', error);
    }
}

// ===== PACIENTES =====
async function loadPatients() {
    try {
        const patients = await api.get('/api/patients');
        state.patients = patients || [];
        renderPatients();
    } catch (error) {
        console.error('Error cargando pacientes:', error);
    }
}

function renderPatients() {
    const list = document.getElementById('patientsList');
    const searchTerm = document.getElementById('patientSearch')?.value.toLowerCase() || '';
    
    const filtered = state.patients.filter(p => 
        p.name.toLowerCase().includes(searchTerm) ||
        (p.email && p.email.toLowerCase().includes(searchTerm)) ||
        (p.phone && p.phone.includes(searchTerm))
    );
    
    if (filtered.length === 0) {
        list.innerHTML = '<p class="empty-message">No se encontraron pacientes</p>';
        return;
    }
    
    list.innerHTML = filtered.map(patient => `
        <div class="card" data-id="${patient.id}">
            <div class="card-header">
                <div class="card-title">${escapeHtml(patient.name)}</div>
                <div class="card-actions">
                    <button class="btn btn-small btn-outline" onclick="editPatient(${patient.id})">
                        <svg viewBox="0 0 24 24" width="16" height="16">
                            <path fill="currentColor" d="M3 17.25V21h3.75L17.81 9.94l-3.75 3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                        </svg>
                    </button>
                    <button class="btn btn-small btn-danger" onclick="deletePatient(${patient.id})">
                        <svg viewBox="0 0 24 24" width="16" height="16">
                            <path fill="currentColor" d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                        </svg>
                    </button>
                </div>
            </div>
            <div class="card-body">
                ${patient.cedula ? `<p><strong>Cédula:</strong> ${escapeHtml(patient.cedula)}</p>` : ''}
                ${patient.gender ? `<p><strong>Género:</strong> ${escapeHtml(patient.gender)}</p>` : ''}
                ${patient.phone ? `<p><strong>Teléfono:</strong> ${escapeHtml(patient.phone)}</p>` : ''}
                ${patient.email ? `<p><strong>Email:</strong> ${escapeHtml(patient.email)}</p>` : ''}
                ${patient.age ? `<p><strong>Edad:</strong> ${patient.age} años</p>` : ''}
                <p><strong>Citas:</strong> ${patient.total_appointments} | <strong>Tratamientos:</strong> ${patient.total_treatments}</p>
            </div>
            <div class="card-footer">
                <button class="btn btn-small btn-primary" onclick="viewPatientDetail(${patient.id})">
                    Ver Historial
                </button>
            </div>
        </div>
    `).join('');
}

function showPatientForm(patient = null) {
    const isEdit = patient !== null;

    showModal(
        isEdit ? 'Editar Paciente' : 'Nuevo Paciente',
        `
            <form id="patientForm">
                <div class="form-group">
                    <label for="patientName">Nombre completo *</label>
                    <input type="text" id="patientName" value="${isEdit ? escapeHtml(patient.name) : ''}" required>
                </div>
                <div class="form-group">
                    <label for="patientCedula">Cédula</label>
                    <input type="text" id="patientCedula" value="${isEdit ? escapeHtml(patient.cedula || '') : ''}">
                </div>
                <div class="form-group">
                    <label for="patientGender">Género</label>
                    <select id="patientGender">
                        <option value="">Seleccione...</option>
                        <option value="masculino" ${isEdit && patient.gender === 'masculino' ? 'selected' : ''}>Masculino</option>
                        <option value="femenino" ${isEdit && patient.gender === 'femenino' ? 'selected' : ''}>Femenino</option>
                        <option value="otro" ${isEdit && patient.gender === 'otro' ? 'selected' : ''}>Otro</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="patientMaritalStatus">Estado civil</label>
                    <select id="patientMaritalStatus">
                        <option value="">Seleccione...</option>
                        <option value="soltero" ${isEdit && patient.marital_status === 'soltero' ? 'selected' : ''}>Soltero/a</option>
                        <option value="casado" ${isEdit && patient.marital_status === 'casado' ? 'selected' : ''}>Casado/a</option>
                        <option value="divorciado" ${isEdit && patient.marital_status === 'divorciado' ? 'selected' : ''}>Divorciado/a</option>
                        <option value="viudo" ${isEdit && patient.marital_status === 'viudo' ? 'selected' : ''}>Viudo/a</option>
                        <option value="union_libre" ${isEdit && patient.marital_status === 'union_libre' ? 'selected' : ''}>Unión libre</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="patientAddress">Dirección</label>
                    <input type="text" id="patientAddress" value="${isEdit ? escapeHtml(patient.address || '') : ''}">
                </div>
                <div class="form-group">
                    <label for="patientPhone">Teléfono</label>
                    <input type="tel" id="patientPhone" value="${isEdit ? escapeHtml(patient.phone || '') : ''}">
                </div>
                <div class="form-group">
                    <label for="patientEmail">Email</label>
                    <input type="email" id="patientEmail" value="${isEdit ? escapeHtml(patient.email || '') : ''}">
                </div>
                <div class="form-group">
                    <label for="patientAge">Edad</label>
                    <input type="number" id="patientAge" value="${isEdit ? patient.age || '' : ''}" min="0" max="150">
                </div>
                <div class="form-group">
                    <label for="patientNotes">Notas</label>
                    <textarea id="patientNotes" rows="3">${isEdit ? escapeHtml(patient.notes || '') : ''}</textarea>
                </div>
                <div class="form-actions">
                    <button type="button" class="btn btn-outline" onclick="closeModal()">Cancelar</button>
                    <button type="submit" class="btn btn-primary">${isEdit ? 'Actualizar' : 'Guardar'}</button>
                </div>
            </form>
        `
    );

    document.getElementById('patientForm').addEventListener('submit', async (e) => {
        e.preventDefault();

        const data = {
            name: document.getElementById('patientName').value,
            cedula: document.getElementById('patientCedula').value,
            gender: document.getElementById('patientGender').value,
            marital_status: document.getElementById('patientMaritalStatus').value,
            address: document.getElementById('patientAddress').value,
            phone: document.getElementById('patientPhone').value,
            email: document.getElementById('patientEmail').value,
            age: document.getElementById('patientAge').value,
            notes: document.getElementById('patientNotes').value
        };

        try {
            if (isEdit) {
                await api.put(`/api/patients/${patient.id}`, data);
                showNotification('Paciente actualizado exitosamente');
            } else {
                await api.post('/api/patients', data);
                showNotification('Paciente creado exitosamente');
            }
            closeModal();
            await loadPatients();
        } catch (error) {
            console.error('Error al guardar paciente:', error);
            const message = error.details || error.message || 'Error al guardar paciente';
            showNotification(message, 'error');
        }
    });
}

async function editPatient(id) {
    const patient = state.patients.find(p => p.id === id);
    if (patient) {
        showPatientForm(patient);
    }
}

async function deletePatient(id) {
    if (confirm('¿Está seguro de eliminar este paciente? Esta acción no se puede deshacer.')) {
        try {
            await api.delete(`/api/patients/${id}`);
            showNotification('Paciente eliminado');
            await loadPatients();
        } catch (error) {
            showNotification('Error al eliminar paciente', 'error');
        }
    }
}

async function viewPatientDetail(id) {
    try {
        const patient = await api.get(`/api/patients/${id}`);
        if (!patient) return;
        
        showModal(
            `Historial - ${patient.name}`,
            `
                <div class="patient-detail">
                    <div class="mb-3">
                        <h3>Información Personal</h3>
                        ${patient.cedula ? `<p><strong>Cédula:</strong> ${escapeHtml(patient.cedula)}</p>` : '<p><strong>Cédula:</strong> N/A</p>'}
                        ${patient.gender ? `<p><strong>Género:</strong> ${escapeHtml(patient.gender)}</p>` : '<p><strong>Género:</strong> N/A</p>'}
                        ${patient.marital_status ? `<p><strong>Estado civil:</strong> ${escapeHtml(patient.marital_status)}</p>` : '<p><strong>Estado civil:</strong> N/A</p>'}
                        ${patient.address ? `<p><strong>Dirección:</strong> ${escapeHtml(patient.address)}</p>` : '<p><strong>Dirección:</strong> N/A</p>'}
                        <p><strong>Teléfono:</strong> ${escapeHtml(patient.phone || 'N/A')}</p>
                        <p><strong>Email:</strong> ${escapeHtml(patient.email || 'N/A')}</p>
                        <p><strong>Edad:</strong> ${patient.age || 'N/A'} años</p>
                        ${patient.notes ? `<p><strong>Notas:</strong> ${escapeHtml(patient.notes)}</p>` : ''}
                    </div>

                    <div class="mb-3">
                        <h3>Historial Clínico</h3>
                        ${patient.clinicalHistory && patient.clinicalHistory.length > 0
                            ? patient.clinicalHistory.map(h => `
                                <div class="card mb-2">
                                    <div class="card-body">
                                        ${h.diagnosis ? `<p><strong>Diagnóstico:</strong> ${escapeHtml(h.diagnosis)}</p>` : ''}
                                        ${h.symptoms ? `<p><strong>Síntomas:</strong> ${escapeHtml(h.symptoms)}</p>` : ''}
                                        ${h.observations ? `<p><strong>Observaciones:</strong> ${escapeHtml(h.observations)}</p>` : ''}
                                        <p class="text-muted mt-2">${formatDate(h.created_at)}</p>
                                    </div>
                                </div>
                            `).join('')
                            : '<p class="text-muted">Sin registros</p>'
                        }
                    </div>

                    <div class="mb-3">
                        <h3>Tratamientos</h3>
                        ${patient.treatments && patient.treatments.length > 0
                            ? patient.treatments.map(t => `
                                <div class="card mb-2">
                                    <div class="card-body">
                                        <p><strong>${escapeHtml(t.description)}</strong></p>
                                        ${t.session_notes ? `<p>${escapeHtml(t.session_notes)}</p>` : ''}
                                        ${t.progress ? `<p><strong>Progreso:</strong> ${escapeHtml(t.progress)}</p>` : ''}
                                        <p class="text-muted mt-2">${formatDate(t.session_date)}</p>
                                    </div>
                                </div>
                            `).join('')
                            : '<p class="text-muted">Sin tratamientos</p>'
                        }
                    </div>

                    <div>
                        <h3>Citas</h3>
                        ${patient.appointments && patient.appointments.length > 0
                            ? patient.appointments.map(a => `
                                <div class="appointment-item mb-2">
                                    <span class="appointment-time">${formatDate(a.date)} ${formatTime(a.time)}</span>
                                    <span class="status-badge ${a.status}">${a.status}</span>
                                </div>
                            `).join('')
                            : '<p class="text-muted">Sin citas</p>'
                        }
                    </div>
                </div>
            `
        );
    } catch (error) {
        showNotification('Error al cargar historial', 'error');
    }
}

// ===== CITAS =====
async function loadAppointments() {
    try {
        const status = state.filters.appointments;
        const url = status === 'all' 
            ? '/api/appointments'
            : `/api/appointments?status=${status}`;
        
        const appointments = await api.get(url);
        state.appointments = appointments || [];
        renderAppointments();
    } catch (error) {
        console.error('Error cargando citas:', error);
    }
}

function renderAppointments() {
    const list = document.getElementById('appointmentsList');
    
    if (state.appointments.length === 0) {
        list.innerHTML = '<p class="empty-message">No se encontraron citas</p>';
        return;
    }
    
    list.innerHTML = state.appointments.map(apt => `
        <div class="card" data-id="${apt.id}">
            <div class="card-header">
                <div>
                    <div class="card-title">${escapeHtml(apt.patient_name)}</div>
                    <div class="card-subtitle">${formatDate(apt.date)} a las ${formatTime(apt.time)}</div>
                </div>
                <span class="status-badge ${apt.status}">${apt.status}</span>
            </div>
            ${apt.notes ? `<div class="card-body">${escapeHtml(apt.notes)}</div>` : ''}
            <div class="card-footer">
                <button class="btn btn-small btn-outline" onclick="editAppointment(${apt.id})">Editar</button>
                ${apt.status === 'pendiente' ? `
                    <button class="btn btn-small btn-secondary" onclick="updateAppointmentStatus(${apt.id}, 'completada')">Completar</button>
                    <button class="btn btn-small btn-danger" onclick="updateAppointmentStatus(${apt.id}, 'cancelada')">Cancelar</button>
                ` : ''}
                <button class="btn btn-small btn-danger" onclick="deleteAppointment(${apt.id})">Eliminar</button>
            </div>
        </div>
    `).join('');
}

function showAppointmentForm(appointment = null) {
    const isEdit = appointment !== null;
    
    // Obtener lista de pacientes para el select
    const patientOptions = state.patients.map(p => 
        `<option value="${p.id}" ${isEdit && appointment.patient_id === p.id ? 'selected' : ''}>${escapeHtml(p.name)}</option>`
    ).join('');
    
    showModal(
        isEdit ? 'Editar Cita' : 'Nueva Cita',
        `
            <form id="appointmentForm">
                <div class="form-group">
                    <label for="appointmentPatient">Paciente *</label>
                    <select id="appointmentPatient" required>
                        <option value="">Seleccione un paciente</option>
                        ${patientOptions}
                    </select>
                </div>
                <div class="form-group">
                    <label for="appointmentDate">Fecha *</label>
                    <input type="date" id="appointmentDate" value="${isEdit ? appointment.date : ''}" required>
                </div>
                <div class="form-group">
                    <label for="appointmentTime">Hora *</label>
                    <input type="time" id="appointmentTime" value="${isEdit ? appointment.time : ''}" required>
                </div>
                <div class="form-group">
                    <label for="appointmentNotes">Notas</label>
                    <textarea id="appointmentNotes" rows="3">${isEdit ? escapeHtml(appointment.notes || '') : ''}</textarea>
                </div>
                <div class="form-actions">
                    <button type="button" class="btn btn-outline" onclick="closeModal()">Cancelar</button>
                    <button type="submit" class="btn btn-primary">${isEdit ? 'Actualizar' : 'Guardar'}</button>
                </div>
            </form>
        `
    );
    
    document.getElementById('appointmentForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const data = {
            patient_id: document.getElementById('appointmentPatient').value,
            date: document.getElementById('appointmentDate').value,
            time: document.getElementById('appointmentTime').value,
            notes: document.getElementById('appointmentNotes').value
        };
        
        try {
            if (isEdit) {
                await api.put(`/api/appointments/${appointment.id}`, data);
                showNotification('Cita actualizada exitosamente');
            } else {
                await api.post('/api/appointments', data);
                showNotification('Cita creada exitosamente');
            }
            closeModal();
            await loadAppointments();
        } catch (error) {
            showNotification('Error al guardar cita', 'error');
        }
    });
}

async function editAppointment(id) {
    const appointment = state.appointments.find(a => a.id === id);
    if (appointment) {
        showAppointmentForm(appointment);
    }
}

async function updateAppointmentStatus(id, status) {
    try {
        await api.patch(`/api/appointments/${id}/status`, { status });
        showNotification(`Cita marcada como ${status}`);
        await loadAppointments();
    } catch (error) {
        showNotification('Error al actualizar estado', 'error');
    }
}

async function deleteAppointment(id) {
    if (confirm('¿Está seguro de eliminar esta cita?')) {
        try {
            await api.delete(`/api/appointments/${id}`);
            showNotification('Cita eliminada');
            await loadAppointments();
        } catch (error) {
            showNotification('Error al eliminar cita', 'error');
        }
    }
}

// ===== TRATAMIENTOS =====
async function loadTreatments() {
    try {
        const treatments = await api.get('/api/treatments');
        state.treatments = treatments || [];
        renderTreatments();
    } catch (error) {
        console.error('Error cargando tratamientos:', error);
    }
}

function renderTreatments() {
    const list = document.getElementById('treatmentsList');
    
    if (state.treatments.length === 0) {
        list.innerHTML = '<p class="empty-message">No se encontraron tratamientos</p>';
        return;
    }
    
    list.innerHTML = state.treatments.map(t => `
        <div class="card" data-id="${t.id}">
            <div class="card-header">
                <div>
                    <div class="card-title">${escapeHtml(t.patient_name)}</div>
                    <div class="card-subtitle">${formatDate(t.session_date)}</div>
                </div>
                <div class="card-actions">
                    <button class="btn btn-small btn-outline" onclick="editTreatment(${t.id})">
                        <svg viewBox="0 0 24 24" width="16" height="16">
                            <path fill="currentColor" d="M3 17.25V21h3.75L17.81 9.94l-3.75 3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                        </svg>
                    </button>
                    <button class="btn btn-small btn-danger" onclick="deleteTreatment(${t.id})">
                        <svg viewBox="0 0 24 24" width="16" height="16">
                            <path fill="currentColor" d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                        </svg>
                    </button>
                </div>
            </div>
            <div class="card-body">
                <p><strong>${escapeHtml(t.description)}</strong></p>
                ${t.session_notes ? `<p>${escapeHtml(t.session_notes)}</p>` : ''}
                ${t.progress ? `<p><strong>Progreso:</strong> ${escapeHtml(t.progress)}</p>` : ''}
                ${t.next_steps ? `<p><strong>Próximos pasos:</strong> ${escapeHtml(t.next_steps)}</p>` : ''}
            </div>
        </div>
    `).join('');
}

function showTreatmentForm(treatment = null) {
    const isEdit = treatment !== null;
    
    const patientOptions = state.patients.map(p => 
        `<option value="${p.id}" ${isEdit && treatment.patient_id === p.id ? 'selected' : ''}>${escapeHtml(p.name)}</option>`
    ).join('');
    
    showModal(
        isEdit ? 'Editar Tratamiento' : 'Nuevo Tratamiento',
        `
            <form id="treatmentForm">
                <div class="form-group">
                    <label for="treatmentPatient">Paciente *</label>
                    <select id="treatmentPatient" required>
                        <option value="">Seleccione un paciente</option>
                        ${patientOptions}
                    </select>
                </div>
                <div class="form-group">
                    <label for="treatmentDescription">Descripción *</label>
                    <textarea id="treatmentDescription" rows="2" required>${isEdit ? escapeHtml(treatment.description) : ''}</textarea>
                </div>
                <div class="form-group">
                    <label for="treatmentNotes">Notas de sesión</label>
                    <textarea id="treatmentNotes" rows="3">${isEdit ? escapeHtml(treatment.session_notes || '') : ''}</textarea>
                </div>
                <div class="form-group">
                    <label for="treatmentProgress">Progreso</label>
                    <textarea id="treatmentProgress" rows="2">${isEdit ? escapeHtml(treatment.progress || '') : ''}</textarea>
                </div>
                <div class="form-group">
                    <label for="treatmentNextSteps">Próximos pasos</label>
                    <textarea id="treatmentNextSteps" rows="2">${isEdit ? escapeHtml(treatment.next_steps || '') : ''}</textarea>
                </div>
                <div class="form-group">
                    <label for="treatmentDate">Fecha de sesión</label>
                    <input type="datetime-local" id="treatmentDate" value="${isEdit ? treatment.session_date?.slice(0, 16) : new Date().toISOString().slice(0, 16)}">
                </div>
                <div class="form-actions">
                    <button type="button" class="btn btn-outline" onclick="closeModal()">Cancelar</button>
                    <button type="submit" class="btn btn-primary">${isEdit ? 'Actualizar' : 'Guardar'}</button>
                </div>
            </form>
        `
    );
    
    document.getElementById('treatmentForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const data = {
            patient_id: document.getElementById('treatmentPatient').value,
            description: document.getElementById('treatmentDescription').value,
            session_notes: document.getElementById('treatmentNotes').value,
            progress: document.getElementById('treatmentProgress').value,
            next_steps: document.getElementById('treatmentNextSteps').value,
            session_date: document.getElementById('treatmentDate').value
        };
        
        try {
            if (isEdit) {
                await api.put(`/api/treatments/${treatment.id}`, data);
                showNotification('Tratamiento actualizado');
            } else {
                await api.post('/api/treatments', data);
                showNotification('Tratamiento registrado');
            }
            closeModal();
            await loadTreatments();
        } catch (error) {
            showNotification('Error al guardar tratamiento', 'error');
        }
    });
}

async function editTreatment(id) {
    const treatment = state.treatments.find(t => t.id === id);
    if (treatment) {
        showTreatmentForm(treatment);
    }
}

async function deleteTreatment(id) {
    if (confirm('¿Está seguro de eliminar este tratamiento?')) {
        try {
            await api.delete(`/api/treatments/${id}`);
            showNotification('Tratamiento eliminado');
            await loadTreatments();
        } catch (error) {
            showNotification('Error al eliminar tratamiento', 'error');
        }
    }
}

// ===== HISTORIAL CLÍNICO =====
async function loadClinicalHistory() {
    try {
        renderClinicalHistoryPatientList();
    } catch (error) {
        console.error('Error cargando historial clínico:', error);
    }
}

function renderClinicalHistoryPatientList() {
    const list = document.getElementById('clinicalHistoryPatientList');
    const searchTerm = document.getElementById('clinicalHistoryPatientSearch')?.value.toLowerCase() || '';

    const filtered = state.patients.filter(p =>
        p.name.toLowerCase().includes(searchTerm) ||
        (p.email && p.email.toLowerCase().includes(searchTerm)) ||
        (p.phone && p.phone.includes(searchTerm))
    );

    if (filtered.length === 0) {
        list.innerHTML = '<p class="empty-message">No se encontraron pacientes</p>';
        return;
    }

    list.innerHTML = filtered.map(patient => `
        <div class="card" data-id="${patient.id}">
            <div class="card-header">
                <div class="card-title">${escapeHtml(patient.name)}</div>
            </div>
            <div class="card-body">
                ${patient.phone ? `<p><strong>Teléfono:</strong> ${escapeHtml(patient.phone)}</p>` : ''}
                ${patient.email ? `<p><strong>Email:</strong> ${escapeHtml(patient.email)}</p>` : ''}
                ${patient.age ? `<p><strong>Edad:</strong> ${patient.age} años</p>` : ''}
            </div>
            <div class="card-footer">
                <button class="btn btn-small btn-primary" onclick="viewClinicalHistory(${patient.id})">
                    Ver Historial Clínico
                </button>
                <button class="btn btn-small btn-secondary" onclick="createClinicalHistory(${patient.id})">
                    Crear/Actualizar Historial
                </button>
            </div>
        </div>
    `).join('');
}

async function viewClinicalHistory(patientId) {
    try {
        const patient = state.patients.find(p => p.id === patientId);
        if (!patient) return;

        const history = await api.get(`/api/clinical-history/patient/${patientId}`);
        
        let historyContent = '';
        if (history && history.length > 0) {
            historyContent = history.map(h => `
                <div class="card mb-3">
                    <div class="card-header">
                        <div class="card-title">Registro del ${formatDate(h.created_at)}</div>
                        <div class="card-actions">
                            <button class="btn btn-small btn-outline" onclick="editClinicalHistory(${h.id}, ${patientId})">
                                <svg viewBox="0 0 24 24" width="16" height="16">
                                    <path fill="currentColor" d="M3 17.25V21h3.75L17.81 9.94l-3.75 3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                                </svg>
                            </button>
                        </div>
                    </div>
                    <div class="card-body">
                        ${h.consultation_reason ? `<div class="mb-2"><strong>Motivo de Consulta:</strong><p>${escapeHtml(h.consultation_reason)}</p></div>` : ''}
                        ${h.personal_history ? `<div class="mb-2"><strong>Antecedentes Personales:</strong><p>${escapeHtml(h.personal_history)}</p></div>` : ''}
                        ${h.pathological_history ? `<div class="mb-2"><strong>Antecedentes Patológicos:</strong><p>${escapeHtml(h.pathological_history)}</p></div>` : ''}
                        ${h.pain_scale !== null && h.pain_scale !== undefined ? `<div class="mb-2"><strong>Escala de Dolor:</strong><p>${h.pain_scale}/10</p></div>` : ''}
                        ${h.nutrition ? `<div class="mb-2"><strong>Nutrición:</strong><p>${escapeHtml(h.nutrition)}</p></div>` : ''}
                        ${h.hydration ? `<div class="mb-2"><strong>Hidratación:</strong><p>${escapeHtml(h.hydration)}</p></div>` : ''}
                        ${h.sleep ? `<div class="mb-2"><strong>Sueño:</strong><p>${escapeHtml(h.sleep)}</p></div>` : ''}
                        ${h.physical_activity ? `<div class="mb-2"><strong>Actividad Física:</strong><p>${escapeHtml(h.physical_activity)}</p></div>` : ''}
                        ${h.surgeries ? `<div class="mb-2"><strong>Cirugías:</strong><p>${escapeHtml(h.surgeries)}</p></div>` : ''}
                        ${h.previous_injuries ? `<div class="mb-2"><strong>Lesiones Anteriores:</strong><p>${escapeHtml(h.previous_injuries)}</p></div>` : ''}
                        ${h.diagnosis ? `<div class="mb-2"><strong>Diagnóstico:</strong><p>${escapeHtml(h.diagnosis)}</p></div>` : ''}
                        ${h.symptoms ? `<div class="mb-2"><strong>Síntomas:</strong><p>${escapeHtml(h.symptoms)}</p></div>` : ''}
                        ${h.observations ? `<div class="mb-2"><strong>Observaciones:</strong><p>${escapeHtml(h.observations)}</p></div>` : ''}
                    </div>
                </div>
            `).join('');
        } else {
            historyContent = '<p class="empty-message">No hay registros en el historial clínico</p>';
        }

        showModal(
            `Historial Clínico - ${patient.name}`,
            `
                <div class="clinical-history-view">
                    ${historyContent}
                </div>
            `
        );
    } catch (error) {
        console.error('Error al cargar historial clínico:', error);
        showNotification('Error al cargar historial clínico', 'error');
    }
}

function createClinicalHistory(patientId) {
    const patient = state.patients.find(p => p.id === patientId);
    if (!patient) return;

    showClinicalHistoryForm(patientId);
}

async function editClinicalHistory(historyId, patientId) {
    try {
        const history = await api.get(`/api/clinical-history/${historyId}`);
        if (history) {
            showClinicalHistoryForm(patientId, history);
        }
    } catch (error) {
        console.error('Error al cargar registro:', error);
        showNotification('Error al cargar registro', 'error');
    }
}

function showClinicalHistoryForm(patientId, history = null) {
    const isEdit = history !== null;
    const patient = state.patients.find(p => p.id === patientId);

    // Generar opciones para escala de dolor (0-10)
    let painScaleOptions = '<option value="">Seleccione</option>';
    for (let i = 0; i <= 10; i++) {
        painScaleOptions += `<option value="${i}" ${isEdit && history.pain_scale === i ? 'selected' : ''}>${i}</option>`;
    }

    showModal(
        isEdit ? 'Editar Historial Clínico' : `Nuevo Historial Clínico - ${patient.name}`,
        `
            <form id="clinicalHistoryForm">
                <input type="hidden" id="clinicalHistoryPatientId" value="${patientId}">
                ${isEdit ? `<input type="hidden" id="clinicalHistoryId" value="${history.id}">` : ''}
                
                <div class="form-group">
                    <label for="consultationReason">Motivo de Consulta *</label>
                    <textarea id="consultationReason" rows="2" required>${isEdit ? escapeHtml(history.consultation_reason || '') : ''}</textarea>
                </div>
                
                <div class="form-group">
                    <label for="personalHistory">Antecedentes Personales</label>
                    <textarea id="personalHistory" rows="3">${isEdit ? escapeHtml(history.personal_history || '') : ''}</textarea>
                </div>
                
                <div class="form-group">
                    <label for="pathologicalHistory">Antecedentes Patológicos</label>
                    <textarea id="pathologicalHistory" rows="3">${isEdit ? escapeHtml(history.pathological_history || '') : ''}</textarea>
                </div>
                
                <div class="form-group">
                    <label for="painScale">Escala de Dolor (0-10)</label>
                    <select id="painScale">
                        ${painScaleOptions}
                    </select>
                </div>
                
                <div class="form-group">
                    <label for="nutrition">Nutrición</label>
                    <textarea id="nutrition" rows="2">${isEdit ? escapeHtml(history.nutrition || '') : ''}</textarea>
                </div>
                
                <div class="form-group">
                    <label for="hydration">Hidratación</label>
                    <textarea id="hydration" rows="2">${isEdit ? escapeHtml(history.hydration || '') : ''}</textarea>
                </div>
                
                <div class="form-group">
                    <label for="sleep">Sueño</label>
                    <textarea id="sleep" rows="2">${isEdit ? escapeHtml(history.sleep || '') : ''}</textarea>
                </div>
                
                <div class="form-group">
                    <label for="physicalActivity">Actividad Física</label>
                    <textarea id="physicalActivity" rows="2">${isEdit ? escapeHtml(history.physical_activity || '') : ''}</textarea>
                </div>
                
                <div class="form-group">
                    <label for="surgeries">Cirugías</label>
                    <textarea id="surgeries" rows="2">${isEdit ? escapeHtml(history.surgeries || '') : ''}</textarea>
                </div>
                
                <div class="form-group">
                    <label for="previousInjuries">Lesiones Anteriores</label>
                    <textarea id="previousInjuries" rows="2">${isEdit ? escapeHtml(history.previous_injuries || '') : ''}</textarea>
                </div>
                
                <div class="form-group">
                    <label for="diagnosis">Diagnóstico</label>
                    <textarea id="diagnosis" rows="2">${isEdit ? escapeHtml(history.diagnosis || '') : ''}</textarea>
                </div>
                
                <div class="form-group">
                    <label for="symptoms">Síntomas</label>
                    <textarea id="symptoms" rows="2">${isEdit ? escapeHtml(history.symptoms || '') : ''}</textarea>
                </div>
                
                <div class="form-group">
                    <label for="observations">Observaciones</label>
                    <textarea id="observations" rows="3">${isEdit ? escapeHtml(history.observations || '') : ''}</textarea>
                </div>
                
                <div class="form-actions">
                    <button type="button" class="btn btn-outline" onclick="closeModal()">Cancelar</button>
                    <button type="submit" class="btn btn-primary">${isEdit ? 'Actualizar' : 'Guardar'}</button>
                </div>
            </form>
        `
    );

    document.getElementById('clinicalHistoryForm').addEventListener('submit', async (e) => {
        e.preventDefault();

        const data = {
            patient_id: document.getElementById('clinicalHistoryPatientId').value,
            consultation_reason: document.getElementById('consultationReason').value,
            personal_history: document.getElementById('personalHistory').value,
            pathological_history: document.getElementById('pathologicalHistory').value,
            pain_scale: document.getElementById('painScale').value,
            nutrition: document.getElementById('nutrition').value,
            hydration: document.getElementById('hydration').value,
            sleep: document.getElementById('sleep').value,
            physical_activity: document.getElementById('physicalActivity').value,
            surgeries: document.getElementById('surgeries').value,
            previous_injuries: document.getElementById('previousInjuries').value,
            diagnosis: document.getElementById('diagnosis').value,
            symptoms: document.getElementById('symptoms').value,
            observations: document.getElementById('observations').value
        };

        try {
            if (isEdit) {
                const historyId = document.getElementById('clinicalHistoryId').value;
                await api.put(`/api/clinical-history/${historyId}`, data);
                showNotification('Historial clínico actualizado exitosamente');
            } else {
                await api.post('/api/clinical-history', data);
                showNotification('Historial clínico registrado exitosamente');
            }
            closeModal();
            // Recargar la vista si está abierta
            viewClinicalHistory(patientId);
        } catch (error) {
            console.error('Error al guardar historial clínico:', error);
            showNotification('Error al guardar historial clínico', 'error');
        }
    });
}

// ===== PAGOS =====
async function loadPayments() {
    try {
        const status = state.filters.payments;
        const url = status === 'all' 
            ? '/api/payments'
            : `/api/payments?status=${status}`;
        
        const [payments, summary] = await Promise.all([
            api.get(url),
            api.get('/api/payments/summary')
        ]);
        
        state.payments = payments || [];
        
        // Actualizar resumen
        document.getElementById('totalPaid').textContent = formatCurrency(summary?.totalPaid || 0);
        document.getElementById('totalPending').textContent = formatCurrency(summary?.totalPending || 0);
        
        renderPayments();
    } catch (error) {
        console.error('Error cargando pagos:', error);
    }
}

function renderPayments() {
    const list = document.getElementById('paymentsList');
    
    if (state.payments.length === 0) {
        list.innerHTML = '<p class="empty-message">No se encontraron pagos</p>';
        return;
    }
    
    list.innerHTML = state.payments.map(p => `
        <div class="card" data-id="${p.id}">
            <div class="card-header">
                <div>
                    <div class="card-title">${escapeHtml(p.patient_name)}</div>
                    <div class="card-subtitle">
                        ${p.appointment_date ? `${formatDate(p.appointment_date)} a las ${formatTime(p.appointment_time)}` : 'Pago general'}
                    </div>
                </div>
                <span class="status-badge ${p.status}">${p.status}</span>
            </div>
            <div class="card-body">
                <p><strong>Monto:</strong> ${formatCurrency(p.amount)}</p>
                ${p.payment_method ? `<p><strong>Método:</strong> ${escapeHtml(p.payment_method)}</p>` : ''}
                ${p.notes ? `<p><strong>Notas:</strong> ${escapeHtml(p.notes)}</p>` : ''}
                <p class="text-muted">${formatDate(p.created_at)}</p>
            </div>
            <div class="card-footer">
                <button class="btn btn-small btn-outline" onclick="editPayment(${p.id})">Editar</button>
                ${p.status === 'pendiente' ? `
                    <button class="btn btn-small btn-secondary" onclick="updatePaymentStatus(${p.id}, 'pagado')">Marcar pagado</button>
                ` : ''}
                <button class="btn btn-small btn-danger" onclick="deletePayment(${p.id})">Eliminar</button>
            </div>
        </div>
    `).join('');
}

function showPaymentForm(payment = null) {
    const isEdit = payment !== null;
    
    const patientOptions = state.patients.map(p => 
        `<option value="${p.id}" ${isEdit && payment.patient_id === p.id ? 'selected' : ''}>${escapeHtml(p.name)}</option>`
    ).join('');
    
    showModal(
        isEdit ? 'Editar Pago' : 'Nuevo Pago',
        `
            <form id="paymentForm">
                <div class="form-group">
                    <label for="paymentPatient">Paciente *</label>
                    <select id="paymentPatient" required>
                        <option value="">Seleccione un paciente</option>
                        ${patientOptions}
                    </select>
                </div>
                <div class="form-group">
                    <label for="paymentAmount">Monto (₡) *</label>
                    <input type="number" id="paymentAmount" step="1" min="0" placeholder="Ej: 50000" value="${isEdit ? payment.amount : ''}" required>
                </div>
                <div class="form-group">
                    <label for="paymentStatus">Estado</label>
                    <select id="paymentStatus">
                        <option value="pendiente" ${isEdit && payment.status === 'pendiente' ? 'selected' : ''}>Pendiente</option>
                        <option value="pagado" ${isEdit && payment.status === 'pagado' ? 'selected' : ''}>Pagado</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="paymentMethod">Método de pago</label>
                    <select id="paymentMethod">
                        <option value="">Seleccione</option>
                        <option value="efectivo" ${isEdit && payment.payment_method === 'efectivo' ? 'selected' : ''}>Efectivo</option>
                        <option value="tarjeta" ${isEdit && payment.payment_method === 'tarjeta' ? 'selected' : ''}>Tarjeta</option>
                        <option value="transferencia" ${isEdit && payment.payment_method === 'transferencia' ? 'selected' : ''}>Transferencia</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="paymentNotes">Notas</label>
                    <textarea id="paymentNotes" rows="2">${isEdit ? escapeHtml(payment.notes || '') : ''}</textarea>
                </div>
                <div class="form-actions">
                    <button type="button" class="btn btn-outline" onclick="closeModal()">Cancelar</button>
                    <button type="submit" class="btn btn-primary">${isEdit ? 'Actualizar' : 'Guardar'}</button>
                </div>
            </form>
        `
    );
    
    document.getElementById('paymentForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const data = {
            patient_id: document.getElementById('paymentPatient').value,
            amount: document.getElementById('paymentAmount').value,
            status: document.getElementById('paymentStatus').value,
            payment_method: document.getElementById('paymentMethod').value,
            notes: document.getElementById('paymentNotes').value
        };
        
        try {
            if (isEdit) {
                await api.put(`/api/payments/${payment.id}`, data);
                showNotification('Pago actualizado');
            } else {
                await api.post('/api/payments', data);
                showNotification('Pago registrado');
            }
            closeModal();
            await loadPayments();
        } catch (error) {
            showNotification('Error al guardar pago', 'error');
        }
    });
}

async function editPayment(id) {
    const payment = state.payments.find(p => p.id === id);
    if (payment) {
        showPaymentForm(payment);
    }
}

async function updatePaymentStatus(id, status) {
    try {
        await api.patch(`/api/payments/${id}/status`, { status });
        showNotification('Pago marcado como pagado');
        await loadPayments();
    } catch (error) {
        showNotification('Error al actualizar estado', 'error');
    }
}

async function deletePayment(id) {
    if (confirm('¿Está seguro de eliminar este pago?')) {
        try {
            await api.delete(`/api/payments/${id}`);
            showNotification('Pago eliminado');
            await loadPayments();
        } catch (error) {
            showNotification('Error al eliminar pago', 'error');
        }
    }
}

// ===== MODAL =====
function showModal(title, content) {
    const modal = document.getElementById('modal');
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');
    
    modalTitle.textContent = title;
    modalBody.innerHTML = content;
    modal.classList.add('active');
}

function closeModal() {
    document.getElementById('modal').classList.remove('active');
}

// ===== NOTIFICACIONIONES =====
function showNotification(message, type = 'success') {
    // Crear elemento de notificación
    const notification = document.createElement('div');
    notification.className = `notification-toast ${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        bottom: calc(var(--bottom-nav-height) + 20px);
        left: 50%;
        transform: translateX(-50%);
        background: ${type === 'success' ? 'var(--success-color)' : 'var(--danger-color)'};
        color: white;
        padding: 12px 24px;
        border-radius: 8px;
        box-shadow: var(--shadow-lg);
        z-index: 3000;
        animation: slideUp 0.3s ease;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideDown 0.3s ease reverse';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

async function loadNotifications() {
    try {
        const notifications = await api.get('/api/reminders/unread');
        const count = await api.get('/api/reminders/count');
        
        const badge = document.getElementById('notificationBadge');
        if (count && count.unread > 0) {
            badge.textContent = count.unread;
            badge.style.display = 'block';
        } else {
            badge.style.display = 'none';
        }
        
        state.reminders = notifications || [];
        renderNotifications();
    } catch (error) {
        console.error('Error cargando notificaciones:', error);
    }
}

function renderNotifications() {
    const list = document.getElementById('notificationsList');
    
    if (state.reminders.length === 0) {
        list.innerHTML = '<p class="no-notifications">No hay notificaciones</p>';
        return;
    }
    
    list.innerHTML = state.reminders.map(n => `
        <div class="notification-item ${n.is_read ? '' : 'unread'}" data-id="${n.id}">
            <div class="notification-message">${escapeHtml(n.message)}</div>
            <div class="notification-date">${formatDate(n.created_at)}</div>
        </div>
    `).join('');
    
    // Agregar click handlers
    list.querySelectorAll('.notification-item').forEach(item => {
        item.addEventListener('click', async () => {
            const id = item.dataset.id;
            await api.patch(`/api/reminders/${id}/read`);
            await loadNotifications();
        });
    });
}

// ===== TEMA CLARO/OSCURO =====
function initTheme() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-mode');
        updateThemeIcons(true);
    }
}

function toggleTheme() {
    const isDark = document.body.classList.toggle('dark-mode');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    updateThemeIcons(isDark);
}

function updateThemeIcons(isDark) {
    document.querySelector('.sun-icon').style.display = isDark ? 'none' : 'block';
    document.querySelector('.moon-icon').style.display = isDark ? 'block' : 'none';
}

// ===== INICIALIZACIÓN =====
document.addEventListener('DOMContentLoaded', async () => {
    initTheme();
    initNavigation();
    
    // Toggle tema
    document.getElementById('themeToggle').addEventListener('click', toggleTheme);
    
    // Menú de usuario
    document.getElementById('userMenuBtn').addEventListener('click', () => {
        document.getElementById('userMenu').style.display = 
            document.getElementById('userMenu').style.display === 'none' ? 'block' : 'none';
    });
    
    // Cerrar menús al hacer click fuera
    document.addEventListener('click', (e) => {
        if (!e.target.closest('#userMenuBtn') && !e.target.closest('#userMenu')) {
            document.getElementById('userMenu').style.display = 'none';
        }
        if (!e.target.closest('#notificationBtn') && !e.target.closest('#notificationsDropdown')) {
            document.getElementById('notificationsDropdown').style.display = 'none';
        }
    });
    
    // Notificaciones
    document.getElementById('notificationBtn').addEventListener('click', () => {
        const dropdown = document.getElementById('notificationsDropdown');
        dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
    });
    
    document.getElementById('markAllRead').addEventListener('click', async () => {
        await api.patch('/api/reminders/read-all');
        await loadNotifications();
    });
    
    // Logout
    document.getElementById('logoutBtn').addEventListener('click', async () => {
        await api.post('/api/auth/logout');
        window.location.href = '/login.html';
    });
    
    // Botones de agregar
    document.getElementById('addPatientBtn')?.addEventListener('click', () => showPatientForm());
    document.getElementById('addAppointmentBtn')?.addEventListener('click', () => showAppointmentForm());
    document.getElementById('addTreatmentBtn')?.addEventListener('click', () => showTreatmentForm());
    document.getElementById('addPaymentBtn')?.addEventListener('click', () => showPaymentForm());
    
    // Búsqueda de pacientes
    document.getElementById('patientSearch')?.addEventListener('input', () => renderPatients());

    // Búsqueda de pacientes en historial clínico
    document.getElementById('clinicalHistoryPatientSearch')?.addEventListener('input', () => renderClinicalHistoryPatientList());

    // Filtros de citas
    document.querySelectorAll('#appointments-page .filter-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('#appointments-page .filter-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            state.filters.appointments = tab.dataset.status;
            loadAppointments();
        });
    });
    
    // Filtros de pagos
    document.querySelectorAll('#payments-page .filter-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('#payments-page .filter-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            state.filters.payments = tab.dataset.status;
            loadPayments();
        });
    });
    
    // Cerrar modal
    document.getElementById('modalClose').addEventListener('click', closeModal);
    document.getElementById('modal').addEventListener('click', (e) => {
        if (e.target.id === 'modal') closeModal();
    });
    
    // Cargar pacientes para los selects
    await api.get('/api/patients').then(patients => {
        state.patients = patients || [];
    });
    
    // Cargar dashboard inicial
    await loadDashboard();
    await loadNotifications();
    
    // Solicitar permiso para notificaciones del navegador
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
    }
});
