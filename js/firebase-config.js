// ============================================
// Local REST-API Authentication Config
// ============================================

class LocalApiAuth {
  constructor() {
    this.currentUser = JSON.parse(localStorage.getItem('nutri_user') || 'null');
    this.listeners = [];
  }

  onAuthStateChanged(callback) {
    this.listeners.push(callback);
    // Run callback asynchronously so code registers listeners first
    setTimeout(() => callback(this.currentUser), 50);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  _triggerListeners(user) {
    this.listeners.forEach(l => l(user));
  }

  async signInWithEmailAndPassword(email, password) {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();
    if (!res.ok) {
      const err = new Error(data.error || 'Login failed');
      err.code = 'auth/invalid-login-credentials';
      throw err;
    }

    localStorage.setItem('nutri_token', data.token);
    this.currentUser = { email: data.user.email, displayName: data.user.displayName };
    localStorage.setItem('nutri_user', JSON.stringify(this.currentUser));
    this._triggerListeners(this.currentUser);
    return { user: this.currentUser };
  }

  async createUserWithEmailAndPassword(email, password, name) {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name: name || email.split('@')[0] })
    });

    const data = await res.json();
    if (!res.ok) {
      const err = new Error(data.error || 'Registration failed');
      err.code = 'auth/email-already-in-use';
      throw err;
    }

    localStorage.setItem('nutri_token', data.token);
    this.currentUser = { email: data.user.email, displayName: data.user.displayName };
    localStorage.setItem('nutri_user', JSON.stringify(this.currentUser));
    this._triggerListeners(this.currentUser);
    
    return {
      user: {
        ...this.currentUser,
        updateProfile: async (profile) => {
          this.currentUser.displayName = profile.displayName;
          localStorage.setItem('nutri_user', JSON.stringify(this.currentUser));
          this._triggerListeners(this.currentUser);
        }
      }
    };
  }

  async signInWithPopup(provider) {
    throw new Error('Google Sign-In is not supported with local server authentication.');
  }

  async signOut() {
    this.currentUser = null;
    localStorage.removeItem('nutri_token');
    localStorage.removeItem('nutri_user');
    this._triggerListeners(null);
    return Promise.resolve();
  }
}

let auth = new LocalApiAuth();
let googleProvider = {};


