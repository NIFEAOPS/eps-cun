import { useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { getAppointments } from '../services/appointmentsService';
import { getMedicationInventory, simulateGs1Scan } from '../services/medicationsService';

const getTodayDate = () => new Date().toISOString().slice(0, 10);

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

function AdminPharmacyPanel({ session, onLogout }) {
  const [inventory, setInventory] = useState([]);
  const [appointmentsQueue, setAppointmentsQueue] = useState([]);

  const [inventoryLoading, setInventoryLoading] = useState(true);
  const [inventoryError, setInventoryError] = useState('');

  const [queueLoading, setQueueLoading] = useState(true);
  const [queueError, setQueueError] = useState('');

  const [scanInput, setScanInput] = useState('');
  const [scanLoading, setScanLoading] = useState(false);
  const [scanError, setScanError] = useState('');
  const [scanSuccess, setScanSuccess] = useState('');

  useEffect(() => {
    let ignore = false;

    const loadAdminData = async () => {
      setInventoryLoading(true);
      setQueueLoading(true);
      setInventoryError('');
      setQueueError('');

      const [inventoryResult, queueResult] = await Promise.allSettled([
        getMedicationInventory(),
        getAppointments({ date: getTodayDate() }),
      ]);

      if (ignore) {
        return;
      }

      if (inventoryResult.status === 'fulfilled') {
        setInventory(inventoryResult.value);
      } else {
        setInventoryError(
          inventoryResult.reason?.message ?? 'No fue posible cargar inventario de farmacia.',
        );
      }

      if (queueResult.status === 'fulfilled') {
        setAppointmentsQueue(queueResult.value);
      } else {
        setQueueError(queueResult.reason?.message ?? 'No fue posible cargar cola de citas.');
      }

      setInventoryLoading(false);
      setQueueLoading(false);
    };

    loadAdminData();

    return () => {
      ignore = true;
    };
  }, []);

  const criticalStockCount = useMemo(
    () => inventory.filter((item) => Number(item.stock) <= 20 || item.status.toLowerCase().includes('critical'))
      .length,
    [inventory],
  );

  const totalStock = useMemo(
    () => inventory.reduce((total, item) => total + Number(item.stock || 0), 0),
    [inventory],
  );

  const executeScan = async (medicationId) => {
    if (!medicationId) {
      setScanError('Debes indicar un ID de medicamento para escaneo GS1.');
      return;
    }

    setScanLoading(true);
    setScanError('');
    setScanSuccess('');

    try {
      const result = await simulateGs1Scan({
        medicationId,
        operatorId: session.user.id,
      });

      setInventory((currentInventory) =>
        currentInventory.map((item) =>
          item.id === medicationId
            ? {
                ...item,
                status: result.status,
              }
            : item,
        ),
      );

      setScanSuccess(
        `Escaneo GS1 procesado para ${medicationId}. DataMatrix: ${result.gs1DataMatrix}`,
      );
      setScanInput('');
    } catch (error) {
      setScanError(error?.message ?? 'No fue posible registrar el evento de trazabilidad GS1.');
    } finally {
      setScanLoading(false);
    }
  };

  return (
    <main className="screen-shell">
      <header className="hero-strip">
        <div>
          <p className="eyebrow">Admin Farmacia</p>
          <h1>Pharmacy Command Center</h1>
          <p className="subtitle">
            Operador: {session.user.fullName} | Rol: {session.user.role}
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
          <p className="stat-label">Productos en inventario</p>
          <p className="stat-value">{inventory.length}</p>
        </article>
        <article className="stat-card">
          <p className="stat-label">Stock total</p>
          <p className="stat-value">{totalStock}</p>
        </article>
        <article className="stat-card">
          <p className="stat-label">Alertas criticas</p>
          <p className="stat-value">{criticalStockCount}</p>
        </article>
        <article className="stat-card">
          <p className="stat-label">Citas hoy</p>
          <p className="stat-value">{appointmentsQueue.length}</p>
        </article>
      </section>

      <section className="panel-grid admin-grid stagger-grid">
        <article className="panel-card">
          <h2>Inventario y trazabilidad</h2>
          <p className="kpi">Alertas de stock critico: {criticalStockCount}</p>
          {inventoryLoading && <p className="message">Cargando inventario...</p>}
          {inventoryError && <p className="message error">{inventoryError}</p>}
          {!inventoryLoading && !inventoryError && inventory.length === 0 && (
            <p className="message">No hay medicamentos en inventario.</p>
          )}

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Medicamento</th>
                  <th>Stock</th>
                  <th>Estado</th>
                  <th>GS1</th>
                </tr>
              </thead>
              <tbody>
                {inventory.map((item) => (
                  <tr
                    key={item.id}
                    className={
                      Number(item.stock) <= 20 || String(item.status).toLowerCase().includes('critical')
                        ? 'critical-row'
                        : ''
                    }
                  >
                    <td>{item.id}</td>
                    <td>{item.name}</td>
                    <td>{item.stock}</td>
                    <td>
                      <span className={`status-pill ${resolveStatusTone(item.status)}`}>{item.status}</span>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="small"
                        onClick={() => executeScan(item.id)}
                        disabled={scanLoading}
                      >
                        Simular scan
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>

        <article className="panel-card">
          <h2>Queue de citas del dia</h2>
          {queueLoading && <p className="message">Cargando cola de citas...</p>}
          {queueError && <p className="message error">{queueError}</p>}
          {!queueLoading && !queueError && appointmentsQueue.length === 0 && (
            <p className="message">Sin citas activas para hoy.</p>
          )}

          <ul className="data-list">
            {appointmentsQueue.map((appointment) => (
              <li key={appointment.id}>
                <p className="title">{appointment.patientName}</p>
                <div className="meta-row">
                  <p className="meta">
                    {appointment.startLabel} | {appointment.description}
                  </p>
                  <span className={`status-pill ${resolveStatusTone(appointment.status)}`}>
                    {appointment.status}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </article>
      </section>

      <section className="panel-card">
        <h2>Terminal GS1 DataMatrix</h2>
        <p className="subtitle">Simula lectura de codigo de barras y envia evento al microservicio B.</p>

        <div className="inline-row">
          <input
            type="text"
            placeholder="Ej: RX-9920-XJ"
            value={scanInput}
            onChange={(event) => setScanInput(event.target.value)}
          />
          <button type="button" onClick={() => executeScan(scanInput)} disabled={scanLoading}>
            {scanLoading ? 'Procesando...' : 'Enviar escaneo GS1'}
          </button>
        </div>

        {scanError && <p className="message error">{scanError}</p>}
        {scanSuccess && <p className="message success">{scanSuccess}</p>}
      </section>
    </main>
  );
}

AdminPharmacyPanel.propTypes = {
  session: PropTypes.shape({
    user: PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
      fullName: PropTypes.string.isRequired,
      role: PropTypes.string.isRequired,
    }).isRequired,
  }).isRequired,
  onLogout: PropTypes.func.isRequired,
};

export default AdminPharmacyPanel;
