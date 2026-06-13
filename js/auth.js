// ============================================
// Nutri Tracker — Auth (auth.js)
// Email/Password + Google Sign-In
// ============================================

document.addEventListener('DOMContentLoaded', () => {
  // Check if already logged in
  auth.onAuthStateChanged(user => {
    if (user) {
      window.location.href = 'dashboard.html';
    }
  });

  // Tab switching
  const loginTab = document.getElementById('loginTab');
  const signupTab = document.getElementById('signupTab');
  const loginForm = document.getElementById('loginForm');
  const signupForm = document.getElementById('signupForm');
  const authError = document.getElementById('authError');

  loginTab.addEventListener('click', () => {
    loginTab.classList.add('active');
    signupTab.classList.remove('active');
    loginForm.style.display = 'flex';
    signupForm.style.display = 'none';
    hideError();
  });

  signupTab.addEventListener('click', () => {
    signupTab.classList.add('active');
    loginTab.classList.remove('active');
    signupForm.style.display = 'flex';
    loginForm.style.display = 'none';
    hideError();
  });

  // Login form
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    const btn = loginForm.querySelector('button[type="submit"]');

    if (!email || !password) {
      showError('Please fill in all fields');
      return;
    }

    btn.disabled = true;
    btn.innerHTML = '<div class="spinner" style="width:20px;height:20px;border-width:2px;margin:0 auto;"></div>';

    try {
      await auth.signInWithEmailAndPassword(email, password);
      // onAuthStateChanged will redirect
    } catch (err) {
      showError(getFirebaseErrorMessage(err.code));
      btn.disabled = false;
      btn.textContent = 'Sign In';
    }
  });

  // Signup form
  signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('signupName').value.trim();
    const email = document.getElementById('signupEmail').value.trim();
    const password = document.getElementById('signupPassword').value;
    const confirm = document.getElementById('signupConfirm').value;
    const btn = signupForm.querySelector('button[type="submit"]');

    if (!name || !email || !password || !confirm) {
      showError('Please fill in all fields');
      return;
    }

    if (password.length < 6) {
      showError('Password must be at least 6 characters');
      return;
    }

    if (password !== confirm) {
      showError('Passwords do not match');
      return;
    }

    btn.disabled = true;
    btn.innerHTML = '<div class="spinner" style="width:20px;height:20px;border-width:2px;margin:0 auto;"></div>';

    try {
      const cred = await auth.createUserWithEmailAndPassword(email, password, name);
      await cred.user.updateProfile({ displayName: name });
      // onAuthStateChanged will redirect
    } catch (err) {
      showError(getFirebaseErrorMessage(err.code));
      btn.disabled = false;
      btn.textContent = 'Create Account';
    }
  });

  // Google Sign-In
  document.getElementById('googleBtn').addEventListener('click', async () => {
    try {
      await auth.signInWithPopup(googleProvider);
    } catch (err) {
      if (err.code !== 'auth/popup-closed-by-user') {
        showError(getFirebaseErrorMessage(err.code));
      }
    }
  });

  // Error helpers
  function showError(msg) {
    authError.textContent = msg;
    authError.classList.add('visible');
  }

  function hideError() {
    authError.classList.remove('visible');
  }

  function getFirebaseErrorMessage(code) {
    const messages = {
      'auth/email-already-in-use': 'This email is already registered. Try signing in instead.',
      'auth/invalid-email': 'Please enter a valid email address.',
      'auth/user-disabled': 'This account has been disabled.',
      'auth/user-not-found': 'No account found with this email.',
      'auth/wrong-password': 'Incorrect password. Please try again.',
      'auth/weak-password': 'Password should be at least 6 characters.',
      'auth/too-many-requests': 'Too many attempts. Please wait a moment and try again.',
      'auth/network-request-failed': 'Network error. Check your connection.',
      'auth/popup-blocked': 'Popup was blocked. Please allow popups for this site.',
      'auth/operation-not-allowed': 'This sign-in method is not enabled.',
      'auth/invalid-credential': 'Invalid credentials. Please check your email and password.',
      'auth/invalid-login-credentials': 'Invalid email or password. Please try again.'
    };
    return messages[code] || 'An error occurred. Please try again.';
  }
});
