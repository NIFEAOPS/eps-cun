import { useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { createAppointment, getAppointments } from '../services/appointmentsService';
import { getMedicationInventory } from '../services/medicationsService';

const initialAppointmentForm = {
  practitionerId: 'DOC-100',
  practitionerName: 'Dr. Julian Valles',
  start: '',
  end: '',
  reason: '',
};

const resolveStatusTone = (value = '') => {
  const normalized = String(value).toLowerCase();

  if (normalized.includes('critical') || normalized.includes('cancel') || normalized.includes('error')) {
    return 'danger';
  }

  if (normalized.includes('booked') || normalized.includes('pending') || normalized.includes('active')) {
    return 'warning';
  }

  if (normalized.includes('complete') || normalized.includes('accepted') || normalized.includes('dispensed')) {
    return 'success';
  }

  return 'neutral';
};

function PatientDashboard({ session, onLogout }) {
  const [appointments, setAppointments] = useState([]);
  const [medications, setMedications] = useState([]);

  const [appointmentsLoading, setAppointmentsLoading] = useState(true);
  const [appointmentsError, setAppointmentsError] = useState('');

  const [medicationsLoading, setMedicationsLoading] = useState(true);
  const [medicationsError, setMedicationsError] = useState('');

  const [formState, setFormState] = useState(initialAppointmentForm);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState('');

  const medicationAlerts = useMemo(
    () =>
      medications.filter(
        (item) => Number(item.stock) <= 20 || String(item.status).toLowerCase().includes('critical'),
      ).length,
    [medications],
  );

  const nextAppointment = appointments[0]?.startLabel ?? 'Sin agenda';

  useEffect(() => {
    let ignore = false;

    const loadDashboardData = async () => {
      setAppointmentsLoading(true);
      setMedicationsLoading(true);
      setAppointmentsError('');
      setMedicationsError('');

      const [appointmentsResult, medicationsResult] = await Promise.allSettled([
        getAppointments({ patientId: session.user.id }),
        getMedicationInventory({ patientId: session.user.id }),
      ]);

      if (ignore) {
        return;
      }

      if (appointmentsResult.status === 'fulfilled') {
        setAppointments(appointmentsResult.value);
      } else {
        setAppointmentsError(
          appointmentsResult.reason?.message ?? 'No fue posible cargar las citas del paciente.',
        );
      }

      if (medicationsResult.status === 'fulfilled') {
        setMedications(medicationsResult.value);
      } else {
        setMedicationsError(
          medicationsResult.reason?.message ?? 'No fue posible cargar el estado de medicamentos.',
        );
      }

      setAppointmentsLoading(false);
      setMedicationsLoading(false);
    };

    loadDashboardData();

    return () => {
      ignore = true;
    };
  }, [session.user.id]);

  const onChangeField = (event) => {
    const { name, value } = event.target;
    setFormState((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const onCreateAppointment = async (event) => {
    event.preventDefault();
    setSubmitLoading(true);
    setSubmitError('');
    setSubmitSuccess('');

    try {
      const created = await createAppointment({
        patientId: session.user.id,
        patientName: session.user.fullName,
        practitionerId: formState.practitionerId,
        practitionerName: formState.practitionerName,
        start: formState.start,
        end: formState.end,
        reason: formState.reason,
      });

      setAppointments((current) => [created, ...current]);
      setSubmitSuccess('Cita registrada y sincronizada con el microservicio de citas.');
      setFormState(initialAppointmentForm);
    } catch (error) {
      setSubmitError(error?.message ?? 'No fue posible registrar la cita en este momento.');
    } finally {
      setSubmitLoading(false);
    }
  };

  return (
    <main className="screen-shell">
      <header className="hero-strip">
        <div>
          <p className="eyebrow">Paciente</p>
          <h1>Portal de continuidad asistencial</h1>
          <p className="subtitle">
            {session.user.fullName} | ID: {session.user.id}
          </p>
        </div>
        <div className="top-actions">
          <button className="secondary" onClick={onLogout}>
            Cerrar sesion
          </button>
        </div>
      </header>

      <section className="metrics-grid">
        <article className="stat-card">
          <p className="stat-label">Citas activas</p>
          <p className="stat-value">{appointments.length}</p>
        </article>
        <article className="stat-card">
          <p className="stat-label">Medicamentos monitoreados</p>
          <p className="stat-value">{medications.length}</p>
        </article>
        <article className="stat-card">
          <p className="stat-label">Alertas de medicacion</p>
          <p className="stat-value">{medicationAlerts}</p>
        </article>
        <article className="stat-card">
          <p className="stat-label">Proxima cita</p>
          <p className="stat-value stat-value-small">{nextAppointment}</p>
        </article>
      </section>

      <section className="panel-grid stagger-grid">
        <article className="panel-card">
          <h2>Appointments (FHIR Appointment)</h2>
          {appointmentsLoading && <p className="message">Cargando citas...</p>}
          {appointmentsError && <p className="message error">{appointmentsError}</p>}
          {!appointmentsLoading && !appointmentsError && appointments.length === 0 && (
            <p className="message">No hay citas activas.</p>
          )}
          <ul className="data-list">
            {appointments.map((appointment) => (
              <li key={appointment.id}>
                <p className="title">{appointment.description}</p>
                <div className="meta-row">
                  <p className="meta">
                    {appointment.startLabel} | {appointment.practitionerName}
                  </p>
                  <span className={`status-pill ${resolveStatusTone(appointment.status)}`}>
                    {appointment.status}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </article>

        <article className="panel-card">
          <h2>Medication Tracking</h2>
          {medicationsLoading && <p className="message">Cargando trazabilidad...</p>}
          {medicationsError && <p className="message error">{medicationsError}</p>}
          {!medicationsLoading && !medicationsError && medications.length === 0 && (
            <p className="message">No se encontraron medicamentos asociados.</p>
          )}
          <ul className="data-list">
            {medications.map((medication) => (
              <li key={medication.id}>
                <p className="title">{medication.name}</p>
                <div className="meta-row">
                  <p className="meta">Stock: {medication.stock}</p>
                  <span className={`status-pill ${resolveStatusTone(medication.status)}`}>
                    {medication.status}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </article>
      </section>

      <section className="panel-card elevated">
        <h2>Nueva cita medica</h2>
        <form className="inline-form appointment-form" onSubmit={onCreateAppointment}>
          <label>
            Profesional
            <input
              name="practitionerName"
              value={formState.practitionerName}
              onChange={onChangeField}
              required
            />
          </label>
          <label>
            Practitioner ID
            <input
              name="practitionerId"
              value={formState.practitionerId}
              onChange={onChangeField}
              required
            />
          </label>
          <label>
            Inicio
            <input
              type="datetime-local"
              name="start"
              value={formState.start}
              onChange={onChangeField}
              required
            />
          </label>
          <label>
            Fin
            <input
              type="datetime-local"
              name="end"
              value={formState.end}
              onChange={onChangeField}
              required
            />
          </label>
          <label className="span-2">
            Motivo
            <input name="reason" value={formState.reason} onChange={onChangeField} required />
          </label>
          <button disabled={submitLoading} type="submit">
            {submitLoading ? 'Registrando...' : 'Crear Appointment'}
          </button>
        </form>

        {submitError && <p className="message error">{submitError}</p>}
        {submitSuccess && <p className="message success">{submitSuccess}</p>}
      </section>
    </main>
  );
}

PatientDashboard.propTypes = {
  session: PropTypes.shape({
    user: PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
      fullName: PropTypes.string.isRequired,
    }).isRequired,
  }).isRequired,
  onLogout: PropTypes.func.isRequired,
};

export default PatientDashboard;
