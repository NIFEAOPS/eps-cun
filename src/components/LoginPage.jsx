import { useState } from 'react';
import PropTypes from 'prop-types';

const initialFormState = {
  email: '',
  password: '',
  role: 'Paciente',
};

function LoginPage({ onLogin }) {
  const [formState, setFormState] = useState(initialFormState);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const onChangeField = (event) => {
    const { name, value } = event.target;
    setFormState((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await onLogin(formState);
      setSuccess('Autenticacion completada correctamente. Redirigiendo...');
    } catch (submitError) {
      setError(submitError?.message ?? 'No fue posible iniciar sesion en este momento.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="login-shell">
      <div className="login-stage">
        <div className="login-layout">
          <section className="brand-panel">
            <div className="eps-badge" aria-label="Sello de red EPS">
              <span aria-hidden="true">+</span>
              <span>Red EPS Integrada</span>
            </div>
            <p className="eyebrow">Portal EPS Colombia</p>
            <h1>Plataforma Distribuida de Gestion EPS y Farmacias</h1>
            <p className="subtitle">
              Operacion clinica unificada con API Gateway, trazabilidad GS1 y servicios desacoplados.
            </p>

            <div className="feature-list">
              <p>Agenda asistencial con estandar FHIR para toda la red EPS.</p>
              <p>Control de acceso por rol para paciente y operador de farmacia.</p>
              <p>Seguimiento de dispensacion y abastecimiento por medicamento.</p>
            </div>

            <div className="demo-grid">
              <div className="demo-chip">
                <span>Paciente demo</span>
                <strong>paciente@eps.co / 123456</strong>
              </div>
              <div className="demo-chip">
                <span>Admin demo</span>
                <strong>admin@eps.co / 123456</strong>
              </div>
            </div>
          </section>

          <section className="auth-card auth-panel">
            <div>
              <p className="eyebrow">Acceso Seguro EPS</p>
              <h2>Iniciar sesion</h2>
              <p className="subtitle">Autenticacion centralizada para operaciones clinicas.</p>
            </div>

            <form className="auth-form" onSubmit={onSubmit}>
              <label>
                Email clinico
                <input
                  type="email"
                  name="email"
                  value={formState.email}
                  onChange={onChangeField}
                  placeholder="name@eps.co"
                  autoComplete="email"
                  required
                />
              </label>

              <label>
                Password
                <input
                  type="password"
                  name="password"
                  value={formState.password}
                  onChange={onChangeField}
                  placeholder="******"
                  autoComplete="current-password"
                  required
                />
              </label>

              <label>
                Rol
                <select name="role" value={formState.role} onChange={onChangeField}>
                  <option value="Paciente">Paciente</option>
                  <option value="Admin">Admin</option>
                </select>
              </label>

              <button type="submit" disabled={loading}>
                {loading ? 'Autenticando...' : 'Ingresar al portal'}
              </button>
            </form>

            {error && <p className="message error">{error}</p>}
            {success && <p className="message success">{success}</p>}

            <p className="legal-note">
              Proteccion de datos personales aplicada segun Ley 1581. Evita ingresar informacion sensible en
              campos no clinicos.
            </p>
          </section>
        </div>

        <p className="login-credit">Desarrollado por Nicolas Alfaro y Nicol Lopez</p>
      </div>
    </main>
  );
}

LoginPage.propTypes = {
  onLogin: PropTypes.func.isRequired,
};

export default LoginPage;
