$(document).ready(function() {
    let userRating = 0;
    const apiUrl = 'http://localhost:8000/api/evaluations/';
    let currentEvaluationId = null;
    // Variables para controlar permisos
    let isAdmin = false;
    let currentUserId = null;
    
    // Intentar obtener información de sesión del almacenamiento local
    try {
        const storedInfo = sessionStorage.getItem('user_info');
        if (storedInfo) {
            const userInfo = JSON.parse(storedInfo);
            // Comprobar si el usuario existe y está autenticado
            if (userInfo && userInfo.authenticated) {
                // Guardar el ID del usuario actual
                currentUserId = userInfo.user_id;
                // Verificar si tiene rol de administrador desde la sesión
                if (userInfo.is_staff || userInfo.is_superuser) {
                    isAdmin = true;
                }
            }
        }
    } catch (e) {
        console.error("Error al leer sessionStorage:", e);
    }
    
    // También intentar verificar con el backend
    try {
        fetch('http://localhost:8000/api/check-auth/', {
            method: 'GET',
            credentials: 'include'
        })
        .then(response => {
            if (response.ok) {
                return response.json();
            }
            throw new Error('Error verificando la autenticación');
        })
        .then(data => {
            // Si el usuario está autenticado, actualizar isAdmin y currentUserId
            if (data.isAuthenticated) {
                currentUserId = data.user_id;
                // Comprobar si el usuario tiene rol de admin en el backend
                if (data.is_staff || data.is_superuser) {
                    isAdmin = true;
                }
                
                // Actualizar el sessionStorage con la información más reciente
                const userInfo = {
                    authenticated: true,
                    user_id: data.user_id,
                    username: data.username,
                    is_staff: data.is_staff,
                    is_superuser: data.is_superuser
                };
                sessionStorage.setItem('user_info', JSON.stringify(userInfo));
            }
        })
        .catch(error => {
            console.error("Error al verificar autenticación con el backend:", error);
        });
    } catch (error) {
        console.error("Error al verificar autenticación con el backend:", error);
    }
    
    // Mostrar mensaje en consola para confirmar el rol del usuario
    console.log("Estado de administrador:", isAdmin ? "Es administrador" : "No es administrador");
    console.log("ID del usuario actual:", currentUserId);
    
    // Ocultar el formulario de evaluación si es administrador
    if (isAdmin) {
        // Ocultar la tarjeta del formulario de evaluación y mostrar un mensaje
        $('.evaluation-card').html('<div class="card-body text-center">' +
            '<div class="alert alert-info">Los administradores no pueden enviar evaluaciones.</div>' +
        '</div>');
    }
    
    // Configuración global de AJAX
    $.ajaxSetup({
        crossDomain: true,
        xhrFields: {
            withCredentials: true // Cambiado a true para enviar cookies
        }
    });
    
    // Cargar evaluaciones al inicio
    loadEvaluations();

    // Manejo de estrellas en UI
    $('.star').hover(
        function() {
            const rating = $(this).data('rating');
            updateStars(rating);
        },
        function() {
            updateStars(userRating);
        }
    );

    $('.star').click(function() {
        userRating = $(this).data('rating');
        updateStars(userRating);
        // Quitar mensaje de error cuando el usuario selecciona una calificación
        $('#ratingError').hide();
        $('.rating-stars').removeClass('is-invalid');
    });

    function updateStars(rating) {
        $('.star').each(function() {
            const starRating = $(this).data('rating');
            $(this).toggleClass('active', starRating <= rating);
        });
    }

    // Función para mostrar mensajes toast
    function showToast(message, type = 'success') {
        // Eliminar toasts anteriores
        $('.toast-container').remove();
        
        // Crear contenedor para toast si no existe
        if ($('.toast-container').length === 0) {
            $('body').append('<div class="toast-container position-fixed bottom-0 end-0 p-3"></div>');
        }
        
        // Definir clases según el tipo
        let bgClass = 'bg-success';
        let icon = 'check-circle';
        
        if (type === 'error') {
            bgClass = 'bg-danger';
            icon = 'exclamation-circle';
        } else if (type === 'info') {
            bgClass = 'bg-info';
            icon = 'info-circle';
        }
        
        // Crear y mostrar el toast
        const toastId = 'toast-' + Date.now();
        const toastHtml = `
            <div id="${toastId}" class="toast align-items-center ${bgClass} text-white border-0" role="alert" aria-live="assertive" aria-atomic="true">
                <div class="d-flex">
                    <div class="toast-body">
                        <i class="fas fa-${icon} me-2"></i> ${message}
                    </div>
                    <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
                </div>
            </div>
        `;
        
        $('.toast-container').append(toastHtml);
        
        // Inicializar y mostrar el toast
        const toastElement = new bootstrap.Toast(document.getElementById(toastId), {
            delay: 3000
        });
        toastElement.show();
    }

    // Validación y envío del formulario
    $('#evaluationForm').submit(function(e) {
        e.preventDefault();
        
        // Verificar si es administrador - los administradores no pueden enviar reseñas
        if (isAdmin) {
            showToast('Los administradores no pueden enviar reseñas', 'error');
            return;
        }
        
        // Limpiar mensajes de error previos
        resetValidationErrors();
        
        // Hacer validación
        const errors = validateForm();
        
        if (errors.length === 0) {
            const evaluationData = {
                rating: userRating,
                comment: $('#comentario').val().trim()
            };

            // Determinar si es una creación o actualización
            if (currentEvaluationId) {
                updateEvaluation(currentEvaluationId, evaluationData);
            } else {
                createEvaluation(evaluationData);
            }
        } else {
            // Mostrar errores
            displayErrors(errors);
        }
    });

    // Validar el formulario
    function validateForm() {
        const errors = [];
        const comment = $('#comentario').val().trim();
        
        // Validación de calificación
        if (userRating === 0) {
            errors.push('Debes seleccionar una calificación para el sitio');
            $('#ratingError').text('Por favor, selecciona una calificación').show();
            $('.rating-stars').addClass('is-invalid');
        }
        
        // Validación de comentario
        if (!comment) {
            errors.push('El campo de comentarios no puede estar vacío');
            $('#commentError').text('Por favor, escribe un comentario').show();
            $('#comentario').addClass('is-invalid');
        } else if (comment.length < 5) {
            errors.push('El comentario debe tener al menos 5 caracteres');
            $('#commentError').text('El comentario es demasiado corto').show();
            $('#comentario').addClass('is-invalid');
        } else if (comment.length > 500) {
            errors.push('El comentario no debe exceder los 500 caracteres');
            $('#commentError').text(`El comentario es demasiado largo (${comment.length}/500)`).show();
            $('#comentario').addClass('is-invalid');
        }
        
        return errors;
    }

    // Mostrar errores en la UI
    function displayErrors(errors) {
        if (errors.length > 0) {
            const errorList = $('#errorList');
            errorList.empty();
            
            errors.forEach(error => {
                errorList.append(`<li><i class="fas fa-exclamation-circle me-2"></i>${error}</li>`);
            });
            
            $('#formErrorMessages').removeClass('d-none');
            
            // Hacer scroll al mensaje de error
            $('html, body').animate({
                scrollTop: $("#formErrorMessages").offset().top - 100
            }, 300);
        }
    }

    // Resetear errores de validación
    function resetValidationErrors() {
        $('.is-invalid').removeClass('is-invalid');
        $('.error-message').hide();
        $('#formErrorMessages').addClass('d-none');
        $('#errorList').empty();
    }

    // Función para cargar evaluaciones
    function loadEvaluations() {
        $.ajax({
            url: apiUrl,
            type: 'GET',
            success: function(response) {
                renderEvaluations(response.evaluations);
                displayAverage(response.average, response.count);
            },
            error: function() {
                $('#evaluationsList').html(`
                    <div class="alert alert-danger">
                        <i class="fas fa-exclamation-circle me-2"></i>
                        Error al cargar evaluaciones
                    </div>
                `);
            }
        });
    }

    // Mostrar el promedio de calificaciones
    function displayAverage(average, count) {
        if (count === 0) {
            $('#averageRating').html('★★★★★'.replace(/★/g, '☆'));
            $('#numericAverage').text('Sin calificaciones');
            return;
        }

        const fullStars = Math.floor(average);
        const halfStar = average - fullStars >= 0.5;
        let stars = '★'.repeat(fullStars);
        
        if (halfStar) {
            stars += '½';
        }
        
        stars += '☆'.repeat(5 - fullStars - (halfStar ? 1 : 0));
        
        $('#averageRating').html(stars);
        $('#numericAverage').text(`${average.toFixed(1)} de 5 (${count} evaluaciones)`);
    }

    // Renderizar la lista de evaluaciones
    function renderEvaluations(evaluations) {
        const evaluationsList = $('#evaluationsList');
        evaluationsList.empty();
        
        // Mostrar mensaje si no hay evaluaciones
        if (!evaluations || evaluations.length === 0) {
            evaluationsList.append(`
                <div class="text-center py-4">
                    <p class="mb-0">No hay evaluaciones disponibles</p>
                </div>
            `);
            return;
        }
        
        evaluations.forEach((eval) => {
            const stars = '★'.repeat(eval.rating) + '☆'.repeat(5 - eval.rating);
            const username = eval.username ? eval.username : 'Anónimo';
            
            // Determinar si el usuario actual puede editar/eliminar esta evaluación
            // Los administradores NO pueden editar/eliminar reseñas
            const canEdit = !isAdmin && (currentUserId && eval.user === currentUserId);
            
            evaluationsList.append(`
                <div class="card evaluation-card mb-3" data-id="${eval.id}">
                    <div class="card-body">
                        <div class="d-flex justify-content-between align-items-center">
                            <div>
                            <div class="rating-stars">${stars}</div>
                                <small class="text-muted d-block mt-1">
                                    <i class="fas fa-user me-1"></i>${username}
                                </small>
                            </div>
                            <small class="text-muted">
                                <i class="far fa-calendar-alt me-1"></i>${eval.date}
                            </small>
                        </div>
                        <p class="card-text mt-2">${eval.comment}</p>
                        ${canEdit ? `
                        <div class="d-flex">
                            <button class="btn btn-modify btn-sm modify-btn" data-id="${eval.id}">
                                <i class="fas fa-edit me-1"></i> Modificar
                            </button>
                            <button class="btn btn-danger btn-sm delete-btn" data-id="${eval.id}">
                                <i class="fas fa-trash me-1"></i> Eliminar
                            </button>
                        </div>
                        ` : ''}
                    </div>
                </div>
            `);
        });
        
        // Eventos para botones
        $('.modify-btn').click(function() {
            const id = $(this).data('id');
            prepareUpdateForm(id, evaluations);
        });
        
        $('.delete-btn').click(function() {
            const id = $(this).data('id');
            // Eliminar directamente sin confirmación
            deleteEvaluation(id);
        });
    }

    // Confirmación de eliminación
    function confirmDelete(id) {
        // Crear modal de confirmación
        const modalId = 'deleteConfirmModal';
        
        // Eliminar modal anterior si existe
        $(`#${modalId}`).remove();
        
        // Crear modal de confirmación
        const modalHtml = `
            <div class="modal fade" id="${modalId}" tabindex="-1" aria-hidden="true">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header bg-danger text-white">
                            <h5 class="modal-title">Confirmar eliminación</h5>
                            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body">
                            <p>¿Estás seguro de que deseas eliminar esta evaluación?</p>
                            <p class="mb-0 text-muted"><small>Esta acción no se puede deshacer.</small></p>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
                            <button type="button" class="btn btn-danger" id="confirmDeleteBtn">
                                <i class="fas fa-trash me-1"></i> Eliminar
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        $('body').append(modalHtml);
        
        // Mostrar modal
        const modalElement = new bootstrap.Modal(document.getElementById(modalId));
        modalElement.show();
        
        // Configurar acción de confirmación
        $('#confirmDeleteBtn').click(function() {
                deleteEvaluation(id);
            modalElement.hide();
        });
    }

    // Resetear el formulario
    function resetForm() {
        userRating = 0;
        currentEvaluationId = null;
        updateStars(0);
        $('#comentario').val('');
        resetValidationErrors();
        $('#evaluationForm button[type="submit"]').html('<i class="fas fa-paper-plane me-2"></i>Enviar Evaluación');
    }

    // Preparar formulario para actualizar
    function prepareUpdateForm(id, evaluations) {
        // Verificar que no sea administrador
        if (isAdmin) {
            showToast('Los administradores no pueden modificar reseñas', 'error');
            return;
        }
        
        const evaluation = evaluations.find(e => e.id === id);
        if (!evaluation) return;
        
        // Limpiar errores
        resetValidationErrors();
        
        // Rellenar el formulario con datos existentes
        userRating = evaluation.rating;
        updateStars(userRating);
        $('#comentario').val(evaluation.comment);
        currentEvaluationId = id;
        
        // Hacer scroll al formulario
        $('html, body').animate({
            scrollTop: $("#evaluationForm").offset().top - 100
        }, 500);
        
        // Cambiar texto del botón
        $('#evaluationForm button[type="submit"]').html('<i class="fas fa-save me-2"></i>Actualizar Evaluación');
        
        // No mostrar mensaje informativo
    }

    // Funciones AJAX
    function createEvaluation(data) {
        // Añadir el ID del usuario si está en sessionStorage
        try {
            const userInfo = JSON.parse(sessionStorage.getItem('user_info'));
            if (userInfo && userInfo.authenticated && userInfo.user_id) {
                data.user = userInfo.user_id;
            }
        } catch (e) {
            console.error("Error al leer sessionStorage:", e);
        }
        
        $.ajax({
            url: apiUrl,
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify(data),
            success: function(response) {
                resetForm();
                loadEvaluations();
                // No mostrar mensaje de creación exitosa
            },
            error: function(xhr) {
                let errorMsg = 'Usted ya ha realizado una evaluación';
                if (xhr.responseJSON && xhr.responseJSON.error) {
                    errorMsg = xhr.responseJSON.error;
                }
                showToast(errorMsg, 'error');
            }
        });
    }

    function updateEvaluation(id, data) {
        // Verificar que no sea administrador
        if (isAdmin) {
            showToast('Los administradores no pueden modificar reseñas', 'error');
            return;
        }
        
        $.ajax({
            url: `${apiUrl}${id}/`,
            type: 'PUT',
            contentType: 'application/json',
            data: JSON.stringify(data),
            success: function() {
                resetForm();
                loadEvaluations();
                // No mostrar mensaje de actualización exitosa
            },
            error: function(xhr) {
                let errorMsg = 'Error al actualizar la evaluación';
                if (xhr.responseJSON && xhr.responseJSON.error) {
                    errorMsg = xhr.responseJSON.error;
                }
                if (xhr.status === 403) {
                    errorMsg = 'No tienes permiso para modificar esta evaluación';
                }
                showToast(errorMsg, 'error');
            }
        });
    }

    function deleteEvaluation(id) {
        // Verificar que no sea administrador
        if (isAdmin) {
            showToast('Los administradores no pueden eliminar reseñas', 'error');
            return;
        }
        
        $.ajax({
            url: `${apiUrl}${id}/`,
            type: 'DELETE',
            success: function() {
                loadEvaluations();
                // No mostrar mensaje de eliminación exitosa
            },
            error: function(xhr) {
                let errorMsg = 'Error al eliminar la evaluación';
                if (xhr.responseJSON && xhr.responseJSON.error) {
                    errorMsg = xhr.responseJSON.error;
                }
                if (xhr.status === 403) {
                    errorMsg = 'No tienes permiso para eliminar esta evaluación';
                }
                showToast(errorMsg, 'error');
            }
        });
    }
});