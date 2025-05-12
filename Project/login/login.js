$(document).ready(function() {
    // Función para mostrar mensaje de error
    function showError(field, message) {
        // Limpiar el error anterior
        clearError(field);
        
        // Marcar el campo como inválido
        $("#" + field).addClass('border-danger');
        
        // Mostrar el mensaje de error
        $("#" + field + "-error").text(message).show();
    }
    
    // Función para limpiar mensajes de error
    function clearError(field) {
        $("#" + field).removeClass('border-danger');
        $("#" + field + "-error").text('').hide();
    }
    
    // Limpiar todos los mensajes de error
    function clearAllErrors() {
        clearError('username');
        clearError('password');
        $('#alertMessages').empty();
    }
    
    // Función para mostrar mensajes de alerta globales
    function showAlert(message, type = 'danger') {
        $('#alertMessages').html(`
            <div class="alert alert-${type}" role="alert">
                ${message}
            </div>
        `);
        
        // Ocultar automáticamente después de 5 segundos
        setTimeout(function() {
            $('#alertMessages .alert').fadeOut(function() {
                $(this).remove();
            });
        }, 5000);
    }
    
    // Validar entrada de usuario en tiempo real
    $("#username").on("input", function(e) {
        var input = $(this).val();
        // Eliminar caracteres no permitidos en tiempo real
        var sanitized = input.replace(/[^a-zA-Z0-9]/g, '');
        
        if (input !== sanitized) {
            $(this).val(sanitized);
            showError('username', "El usuario solo puede contener letras mayúsculas, minúsculas y números.");
        } else {
            clearError('username');
        }
    });
    
    // Validar entrada de contraseña en tiempo real
    $("#password").on("input", function() {
        if ($(this).val().trim() === "") {
            showError('password', "La contraseña no puede estar vacía.");
        } else {
            clearError('password');
        }
    });

    // Validación del formulario al enviar
    $("#loginForm").on("submit", function(event) {
        event.preventDefault();
        clearAllErrors();
        
        var username = $("#username").val().trim();
        var password = $("#password").val().trim();
        let isValid = true;
        
        // Validaciones personalizadas para el usuario
        if (username === "") {
            showError('username', "Por favor, ingrese un nombre de usuario.");
            isValid = false;
        } else if (!username.match(/^[a-zA-Z0-9]+$/)) {
            showError('username', "El usuario solo puede contener letras mayúsculas, minúsculas y números.");
            isValid = false;
        }
        
        // Validaciones personalizadas para la contraseña
        if (password === "") {
            showError('password', "Por favor, ingrese una contraseña.");
            isValid = false;
        }
        
        if (!isValid) {
            return;
        }

        // Mostrar mensaje de carga
        showAlert("Iniciando sesión...", "info");

        console.log("Enviando datos de inicio de sesión:", { username, password: "********" });

        // Hacer la petición al backend
        $.ajax({
            url: 'http://localhost:8000/api/login/',
            method: 'POST',
            contentType: 'application/json',
            crossDomain: true,
            xhrFields: {
                withCredentials: true // Esto permite enviar/recibir cookies
            },
            beforeSend: function(xhr) {
                // Asegurar que no haya encabezados que puedan causar problemas CORS
                xhr.setRequestHeader('Accept', 'application/json');
            },
            data: JSON.stringify({
                username: username,
                password: password
            }),
            success: function(response) {
                console.log("Inicio de sesión exitoso:", response);
                showAlert("Inicio de sesión exitoso", 'success');
                
                // Guardar información de sesión localmente para garantizar el funcionamiento
                // aunque las cookies no funcionen correctamente
                const sessionData = {
                    username: username, 
                    user_id: response.user_id,
                    authenticated: true,
                    timestamp: new Date().getTime(),
                    is_staff: response.is_staff || false,
                    is_superuser: response.is_superuser || false,
                    session_key: response.session_key || ''
                };
                
                console.log("Guardando datos de sesión:", sessionData);
                sessionStorage.setItem('user_info', JSON.stringify(sessionData));
                
                // Verificar si la cookie se estableció correctamente
                console.log("Cookies después del login:", document.cookie);
                
                // Redirigir después de un breve retraso
                setTimeout(function() {
                    window.location.href = "index.html";
                }, 1000);
            },
            error: function(xhr, status, error) {
                console.error("Error en inicio de sesión:", { xhr, status, error });
                var errorMsg = xhr.responseJSON ? xhr.responseJSON.error : "Error al iniciar sesión";
                showAlert(errorMsg);
            }
        });
    });
});