import { joinUrl, resolveServiceBaseUrl } from '../config/env';
import { extractResourcesFromPayload, formatFhirDate } from './fhir';
import { httpRequest, ServiceError } from './httpClient';

const APPOINTMENT_ENDPOINT = '/fhir/Appointment';

const getAppointmentsBaseUrl = () => {
  try {
    return resolveServiceBaseUrl('appointments');
  } catch (error) {
    throw new Error(
      'Configuracion faltante para citas. Define VITE_API_GATEWAY_URL o VITE_APPOINTMENTS_SERVICE_URL.',
    );
  }
};

const getParticipantDisplay = (participant, fallback) => {
  return participant?.actor?.display || participant?.actor?.reference || fallback;
};

const normalizeAppointment = (resource) => {
  const participants = Array.isArray(resource.participant) ? resource.participant : [];
  const patientParticipant = participants.find((item) => item?.actor?.reference?.startsWith('Patient/'));
  const practitionerParticipant = participants.find((item) =>
    item?.actor?.reference?.startsWith('Practitioner/'),
  );

  return {
    id: resource.id ?? 'sin-id',
    resourceType: resource.resourceType,
    status: resource.status ?? 'unknown',
    description: resource.description ?? 'Sin descripcion clinica',
    start: resource.start,
    end: resource.end,
    patientName: getParticipantDisplay(patientParticipant, 'Paciente no identificado'),
    practitionerName: getParticipantDisplay(practitionerParticipant, 'Profesional no asignado'),
    startLabel: formatFhirDate(resource.start),
  };
};

const buildQueryString = (queryParams) => {
  const params = new URLSearchParams();

  Object.entries(queryParams).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      params.append(key, value);
    }
  });

  const query = params.toString();
  return query ? `?${query}` : '';
};

export function buildFhirAppointmentResource({
  patientId,
  patientName,
  practitionerId,
  practitionerName,
  start,
  end,
  reason,
}) {
  if (!patientId || !practitionerId || !start || !end) {
    throw new Error('patientId, practitionerId, start y end son obligatorios para Appointment FHIR.');
  }

  return {
    resourceType: 'Appointment',
    status: 'booked',
    description: reason || 'Cita generada desde portal EPS',
    start,
    end,
    participant: [
      {
        actor: {
          reference: `Patient/${patientId}`,
          display: patientName || patientId,
        },
        status: 'accepted',
      },
      {
        actor: {
          reference: `Practitioner/${practitionerId}`,
          display: practitionerName || practitionerId,
        },
        status: 'accepted',
      },
    ],
  };
}

export async function getAppointments({ patientId, date } = {}) {
  const query = buildQueryString({ patient: patientId, date });
  const appointmentsBaseUrl = getAppointmentsBaseUrl();

  try {
    const payload = await httpRequest(joinUrl(appointmentsBaseUrl, `${APPOINTMENT_ENDPOINT}${query}`));
    const resources = extractResourcesFromPayload(payload, 'Appointment');
    return resources.map(normalizeAppointment);
  } catch (error) {
    if (error instanceof ServiceError) {
      throw new Error(`No se pudieron obtener las citas: ${error.message}`);
    }

    throw new Error('Error inesperado consultando el microservicio de citas.');
  }
}

export async function createAppointment(appointmentInput) {
  const appointmentsBaseUrl = getAppointmentsBaseUrl();

  try {
    const appointmentResource = buildFhirAppointmentResource(appointmentInput);
    const payload = await httpRequest(joinUrl(appointmentsBaseUrl, APPOINTMENT_ENDPOINT), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: appointmentResource,
    });

    const [createdAppointment] = extractResourcesFromPayload(payload, 'Appointment');
    return normalizeAppointment(createdAppointment ?? appointmentResource);
  } catch (error) {
    if (error instanceof ServiceError) {
      throw new Error(`No se pudo registrar la cita: ${error.message}`);
    }

    if (error instanceof Error) {
      throw error;
    }

    throw new Error('Error inesperado registrando cita medica.');
  }
}
