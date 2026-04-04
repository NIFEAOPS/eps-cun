import { useEffect, useState } from 'react';
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
      <header className="screen-header">
        <div>
          <p className="eyebrow">Paciente</p>
          <h1>{session.user.fullName}</h1>
          <p className="subtitle">ID: {session.user.id}</p>
        </div>
        <button className="secondary" onClick={onLogout}>
          Cerrar sesion
        </button>
      </header>

      <section className="panel-grid">
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
                <p className="meta">
                  {appointment.startLabel} | {appointment.practitionerName} | estado: {appointment.status}
                </p>
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
                <p className="meta">
                  Stock: {medication.stock} | estado: {medication.status}
                </p>
              </li>
            ))}
          </ul>
        </article>
      </section>

      <section className="panel-card">
        <h2>Nueva cita medica</h2>
        <form className="inline-form" onSubmit={onCreateAppointment}>
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
          <label>
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
