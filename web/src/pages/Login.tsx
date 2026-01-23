import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import './Login.css';

export default function Login() {
    const { login, register } = useAuth();
    const [isRegister, setIsRegister] = useState(false);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [displayName, setDisplayName] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            if (isRegister) {
                await register(username, password, displayName || undefined);
            } else {
                await login(username, password);
            }
        } catch (err: any) {
            setError(err.response?.data?.error || 'Something went wrong');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-container">
            <div className="login-card">
                <div className="login-header">
                    <h1>🏠 The Penthouse</h1>
                    <p>Your private hangout spot</p>
                </div>

                <form onSubmit={handleSubmit} className="login-form">
                    <div className="form-group">
                        <label htmlFor="username">Username</label>
                        <input
                            id="username"
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="Enter username"
                            required
                            minLength={3}
                            maxLength={20}
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="password">Password</label>
                        <input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Enter password"
                            required
                            minLength={6}
                        />
                    </div>

                    {isRegister && (
                        <div className="form-group">
                            <label htmlFor="displayName">Display Name (optional)</label>
                            <input
                                id="displayName"
                                type="text"
                                value={displayName}
                                onChange={(e) => setDisplayName(e.target.value)}
                                placeholder="How should we call you?"
                            />
                        </div>
                    )}

                    {error && <div className="error-message">{error}</div>}

                    <button type="submit" className="submit-btn" disabled={loading}>
                        {loading ? 'Please wait...' : isRegister ? 'Create Account' : 'Enter The Penthouse'}
                    </button>
                </form>

                <div className="toggle-mode">
                    <span>{isRegister ? 'Already have an account?' : "Don't have an account?"}</span>
                    <button type="button" onClick={() => setIsRegister(!isRegister)}>
                        {isRegister ? 'Sign in' : 'Create one'}
                    </button>
                </div>
            </div>
        </div>
    );
}
