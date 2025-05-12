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
        var password = $(this).val().trim();
        
        if (password === "") {
            showError('password', "La contraseña no puede estar vacía.");
        } else {
            // Validar requisitos de contraseña
            var hasUpperCase = /[A-Z]/.test(password);
            var hasNumber = /[0-9]/.test(password);
            var hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
            var isLongEnough = password.length >= 8;
            
            if (!isLongEnough || !hasUpperCase || !hasNumber || !hasSpecialChar) {
                var errorMsg = "La contraseña debe tener al menos 8 caracteres, una mayúscula, un número y un carácter especial.";
                showError('password', errorMsg);
            } else {
                clearError('password');
            }
        }
    });

    // Validación del formulario al enviar
    $("#registroForm").on("submit", function(event) {
        event.preventDefault();
        clearAllErrors();
        
        var username = $("#username").val().trim();
        var password = $("#password").val().trim();
        let isValid = true;
        
        // Validaciones personalizadas para el usuario
        if (username === "") {
            showError('username', "Por favor, ingrese un nombre de usuario.");
            isValid = false;
        } else if (username.length < 3) {
            showError('username', "El nombre de usuario debe tener al menos 3 caracteres.");
            isValid = false;
        } else if (!username.match(/^[a-zA-Z0-9]+$/)) {
            showError('username', "El usuario solo puede contener letras mayúsculas, minúsculas y números.");
            isValid = false;
        }
        
        // Validaciones personalizadas para la contraseña
        if (password === "") {
            showError('password', "Por favor, ingrese una contraseña.");
            isValid = false;
        } else {
            // Validar requisitos de contraseña
            var hasUpperCase = /[A-Z]/.test(password);
            var hasNumber = /[0-9]/.test(password);
            var hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
            var isLongEnough = password.length >= 8;
            
            if (!isLongEnough) {
                showError('password', "La contraseña debe tener al menos 8 caracteres.");
                isValid = false;
            } else if (!hasUpperCase) {
                showError('password', "La contraseña debe contener al menos una letra mayúscula.");
                isValid = false;
            } else if (!hasNumber) {
                showError('password', "La contraseña debe contener al menos un número.");
                isValid = false;
            } else if (!hasSpecialChar) {
                showError('password', "La contraseña debe contener al menos un carácter especial.");
                isValid = false;
            }
        }
        
        if (!isValid) {
            return;
        }

        // Hacer la petición al backend
        $.ajax({
            url: 'http://localhost:8000/api/register/',
            method: 'POST',
            contentType: 'application/json',
            xhrFields: {
                withCredentials: true // Esto permite enviar/recibir cookies
            },
            data: JSON.stringify({
                username: username,
                password: password
            }),
            success: function(response) {
                showAlert(response.message, 'success');
                
                // Redirigir después de 1 segundo
                setTimeout(function() {
                    window.location.href = "login.html";
                }, 1000);
            },
            error: function(xhr) {
                var error = xhr.responseJSON ? xhr.responseJSON.error : "Error al registrar usuario";
                showAlert(error);
            }
        });
    });
});