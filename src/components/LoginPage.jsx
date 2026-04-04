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
      <section className="auth-card">
        <div>
          <p className="eyebrow">Clinical Sanctuary</p>
          <h1>Plataforma EPS y Farmacias</h1>
          <p className="subtitle">Autenticacion JWT stateless via API Gateway con control RBAC.</p>
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
            {loading ? 'Autenticando...' : 'Ingresar'}
          </button>
        </form>

        {error && <p className="message error">{error}</p>}
        {success && <p className="message success">{success}</p>}

        <p className="legal-note">
          Proteccion de datos personales aplicada segun Ley 1581. Evita ingresar informacion sensible en
          campos no clinicos.
        </p>
      </section>
    </main>
  );
}

LoginPage.propTypes = {
  onLogin: PropTypes.func.isRequired,
};

export default LoginPage;
