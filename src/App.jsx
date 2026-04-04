import AdminPharmacyPanel from './components/AdminPharmacyPanel';
import LoginPage from './components/LoginPage';
import PatientDashboard from './components/PatientDashboard';
import { useAuth } from './hooks/useAuth';

function App() {
  const auth = useAuth();

  if (!auth.isAuthenticated) {
    return <LoginPage onLogin={auth.login} />;
  }

  if (auth.user?.role === 'Admin') {
    return <AdminPharmacyPanel session={auth.session} onLogout={auth.logout} />;
  }

  return <PatientDashboard session={auth.session} onLogout={auth.logout} />;
}

export default App;
