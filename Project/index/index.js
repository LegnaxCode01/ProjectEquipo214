$(document).ready(function() {
    // Comprobar si hay un usuario en sesión
    function checkUserSession() {
        // Intentar obtener información de sesión del almacenamiento local
        let userInfo = null;
        try {
            const storedInfo = sessionStorage.getItem('user_info');
            if (storedInfo) {
                userInfo = JSON.parse(storedInfo);
            }
        } catch (e) {
            console.error("Error al leer sessionStorage:", e);
        }
        
        // Si tenemos información de usuario almacenada localmente, mostrar interfaz de usuario autenticado
        if (userInfo && userInfo.authenticated) {
            // Mostrar elementos para usuarios autenticados
            $('#clasesItem, #cuestionarioItem, #dudasItem').show();
            $('#rankingLink').show();
            
            // Mostrar botón de salir y ocultar botón de acceder
            $('#loginItem').hide();
            $('#logoutItem').show();
            
            // Mostrar mensaje de bienvenida
            $('#welcomeText').text('¡Hola, ' + userInfo.username + '!');
            $('#welcomeItem').show();
            
            // Intentar también verificar con el backend (pero no dependemos de esto)
            verifyBackendSession();
        } else {
            // Sin información de usuario, mostrar interfaz para no autenticados
            $('#clasesItem, #cuestionarioItem, #dudasItem').hide();
            $('#rankingLink').hide();
            $('#loginItem').show();
            $('#logoutItem').hide();
            $('#welcomeItem').hide();
        }
    }
    
    // Función que intenta verificar la sesión con el backend (pero no bloqueante)
    function verifyBackendSession() {
        // Obtener session_key de sessionStorage si existe
        let sessionKey = '';
        try {
            const storedInfo = sessionStorage.getItem('user_info');
            if (storedInfo) {
                const userInfo = JSON.parse(storedInfo);
                if (userInfo && userInfo.session_key) {
                    sessionKey = userInfo.session_key;
                }
            }
        } catch (e) {
            console.error("Error al leer sessionStorage:", e);
        }
        
        console.log("Verificando sesión con el backend. Session key guardada:", sessionKey);
        
        // Construir la URL con session_key como parámetro si existe
        let authUrl = 'http://localhost:8000/api/check-auth/';
        if (sessionKey) {
            authUrl += '?session_key=' + encodeURIComponent(sessionKey);
        }
        
        $.ajax({
            url: authUrl,
            method: 'GET',
            crossDomain: true,
            xhrFields: {
                withCredentials: true
            },
            success: function(response) {
                console.log("Respuesta del backend:", response);
                
                // Si el backend confirma la autenticación, actualizar la información local
                if (response.isAuthenticated) {
                    const storedInfo = sessionStorage.getItem('user_info');
                    let userInfo = storedInfo ? JSON.parse(storedInfo) : {};
                    
                    // Actualizar la información con los datos del backend
                    userInfo = {
                        ...userInfo,
                        username: response.username,
                        user_id: response.user_id,
                        authenticated: true,
                        is_staff: response.is_staff || false,
                        is_superuser: response.is_superuser || false,
                        session_key: response.session_id || '',
                        timestamp: new Date().getTime()
                    };
                    
                    // Guardar información actualizada
                    sessionStorage.setItem('user_info', JSON.stringify(userInfo));
                    
                    // Actualizar la interfaz para reflejar los cambios
                    $('#welcomeText').text('¡Hola, ' + userInfo.username + '!');
                } else {
                    console.log("Backend reporta no autenticado:", response.debug_info);
                }
            },
            error: function(xhr, status, error) {
                console.log("El backend no está disponible o la sesión no se reconoce:", error);
                // No hacemos nada, seguimos usando la información local
            }
        });
    }
    
    // Manejar el evento de cerrar sesión
    $('#logoutBtn').on('click', function(e) {
        e.preventDefault();
        
        // Limpiar sessionStorage
        sessionStorage.removeItem('user_info');
        
        // Intentar cerrar sesión en el backend también
        $.ajax({
            url: 'http://localhost:8000/api/logout/',
            method: 'POST',
            crossDomain: true,
            xhrFields: {
                withCredentials: true
            },
            complete: function() {
                // Siempre actualizamos la interfaz, sin importar la respuesta
                checkUserSession();
            }
        });
    });
    
    // Comprobar el estado de la sesión al cargar la página
    checkUserSession();
}); 