import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Chat from './pages/Chat';
import './App.css';

function AppContent() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="loading-screen">
        <div className="loading-content">
          <h1>🏠 The Penthouse</h1>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return user ? <Chat /> : <Login />;
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
