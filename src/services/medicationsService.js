import { joinUrl, resolveServiceBaseUrl } from '../config/env';
import { extractResourcesFromPayload } from './fhir';
import { httpRequest, ServiceError } from './httpClient';

const INVENTORY_ENDPOINT = '/inventory';
const MEDICATION_REQUEST_ENDPOINT = '/fhir/MedicationRequest';
const TRACEABILITY_ENDPOINT = '/traceability/events';

const getMedicationsBaseUrl = () => {
  try {
    return resolveServiceBaseUrl('medications');
  } catch (error) {
    throw new Error(
      'Configuracion faltante para medicamentos. Define VITE_API_GATEWAY_URL o VITE_MEDICATIONS_SERVICE_URL.',
    );
  }
};

const parseInventoryFromCustomPayload = (payload) => {
  const rawItems = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.items)
      ? payload.items
      : Array.isArray(payload?.inventory)
        ? payload.inventory
        : [];

  return rawItems.map((item) => ({
    id: item.id ?? item.medicationId ?? 'sin-id',
    name: item.name ?? item.medicationName ?? 'Medicamento sin nombre',
    status: item.status ?? 'unknown',
    stock: item.stock ?? item.quantity ?? 0,
    patientId: item.patientId ?? null,
    fhirResource: item.resourceType ? item : null,
  }));
};

const parseInventoryFromMedicationRequests = (payload) => {
  const resources = extractResourcesFromPayload(payload, 'MedicationRequest');

  return resources.map((resource) => ({
    id: resource.id ?? 'sin-id',
    name:
      resource.medicationCodeableConcept?.text ||
      resource.medicationReference?.display ||
      'Medicamento sin nombre',
    status: resource.status ?? 'unknown',
    stock: resource.dispenseRequest?.quantity?.value ?? 0,
    patientId:
      resource.subject?.reference?.startsWith('Patient/')
        ? resource.subject.reference.replace('Patient/', '')
        : null,
    fhirResource: resource,
  }));
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

export function buildSimulatedGs1DataMatrix(medicationId) {
  const now = new Date();
  const dateCode = `${now.getUTCFullYear()}${String(now.getUTCMonth() + 1).padStart(2, '0')}${String(
    now.getUTCDate(),
  ).padStart(2, '0')}`;
  const serial = `${Math.floor(Math.random() * 99999999)}`.padStart(8, '0');

  // Simulated GS1 format using AI(01), AI(21), AI(17) for demo traceability workflows.
  return `(01)${medicationId}(21)${serial}(17)${dateCode}`;
}

export async function getMedicationInventory({ patientId } = {}) {
  const query = buildQueryString({ patient: patientId });
  const medicationsBaseUrl = getMedicationsBaseUrl();

  try {
    const payload = await httpRequest(joinUrl(medicationsBaseUrl, `${INVENTORY_ENDPOINT}${query}`));

    const fromFhir = parseInventoryFromMedicationRequests(payload);
    if (fromFhir.length > 0) {
      return fromFhir;
    }

    return parseInventoryFromCustomPayload(payload);
  } catch (inventoryError) {
    if (inventoryError instanceof ServiceError && inventoryError.statusCode === 404) {
      // Fallback for backends exposing only FHIR endpoint.
      try {
        const fhirPayload = await httpRequest(joinUrl(medicationsBaseUrl, `${MEDICATION_REQUEST_ENDPOINT}${query}`));
        return parseInventoryFromMedicationRequests(fhirPayload);
      } catch (fallbackError) {
        if (fallbackError instanceof ServiceError) {
          throw new Error(`No se pudo consultar inventario de medicamentos: ${fallbackError.message}`);
        }

        throw new Error('Error inesperado consultando inventario de medicamentos.');
      }
    }

    if (inventoryError instanceof ServiceError) {
      throw new Error(`No se pudo consultar inventario de medicamentos: ${inventoryError.message}`);
    }

    throw new Error('Error inesperado consultando inventario de medicamentos.');
  }
}

export async function changeMedicationStatus({ medicationId, newStatus, operatorId }) {
  if (!medicationId || !newStatus) {
    throw new Error('medicationId y newStatus son obligatorios para trazabilidad.');
  }

  const gs1DataMatrix = buildSimulatedGs1DataMatrix(medicationId);
  const medicationsBaseUrl = getMedicationsBaseUrl();

  try {
    const payload = await httpRequest(joinUrl(medicationsBaseUrl, TRACEABILITY_ENDPOINT), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: {
        medicationId,
        status: newStatus,
        gs1DataMatrix,
        scannedAt: new Date().toISOString(),
        operatorId: operatorId ?? 'admin-frontend',
      },
    });

    return {
      medicationId,
      status: newStatus,
      gs1DataMatrix,
      payload,
    };
  } catch (error) {
    if (error instanceof ServiceError) {
      throw new Error(`No se pudo actualizar trazabilidad del medicamento: ${error.message}`);
    }

    throw new Error('Error inesperado actualizando trazabilidad de medicamento.');
  }
}

export async function simulateGs1Scan({ medicationId, operatorId }) {
  return changeMedicationStatus({
    medicationId,
    newStatus: 'dispensed',
    operatorId,
  });
}
