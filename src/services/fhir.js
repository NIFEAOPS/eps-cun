export function extractResourcesFromPayload(payload, resourceType) {
  if (!payload) {
    return [];
  }

  if (payload.resourceType === resourceType) {
    return [payload];
  }

  if (payload.resourceType === 'Bundle' && Array.isArray(payload.entry)) {
    return payload.entry
      .map((entry) => entry?.resource)
      .filter((resource) => resource?.resourceType === resourceType);
  }

  if (Array.isArray(payload)) {
    return payload.filter((resource) => resource?.resourceType === resourceType);
  }

  if (Array.isArray(payload.items)) {
    return payload.items.filter((resource) => resource?.resourceType === resourceType);
  }

  return [];
}

export function formatFhirDate(isoDateString) {
  if (!isoDateString) {
    return 'Sin fecha';
  }

  const parsedDate = new Date(isoDateString);
  if (Number.isNaN(parsedDate.getTime())) {
    return 'Fecha invalida';
  }

  return parsedDate.toLocaleString('es-CO', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}
