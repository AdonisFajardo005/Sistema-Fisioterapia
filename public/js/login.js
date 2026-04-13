/**
 * Script de login
 */

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const loginError = document.getElementById('loginError');
    
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        
        // Mostrar estado de carga
        const btnText = loginForm.querySelector('.btn-text');
        const btnLoading = loginForm.querySelector('.btn-loading');
        btnText.style.display = 'none';
        btnLoading.style.display = 'inline-block';
        
        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                // Redirigir al dashboard
                window.location.href = '/';
            } else {
                loginError.textContent = data.error;
                loginError.style.display = 'block';
            }
        } catch (error) {
            loginError.textContent = 'Error de conexión';
            loginError.style.display = 'block';
        } finally {
            btnText.style.display = 'inline-block';
            btnLoading.style.display = 'none';
        }
    });
});
