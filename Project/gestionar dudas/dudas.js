// API URL base
const API_BASE_URL = 'http://localhost:8000/api';

// Función para obtener todas las dudas
async function fetchDoubts() {
    try {
        const response = await fetch(`${API_BASE_URL}/doubts/`, {
            credentials: 'include'
        });
        if (!response.ok) {
            throw new Error('Error al cargar las dudas');
        }
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error:', error);
        throw error;
    }
}

// Función para buscar dudas
async function searchDoubts(query) {
    try {
        const response = await fetch(`${API_BASE_URL}/doubts/search/?query=${encodeURIComponent(query)}`, {
            credentials: 'include'
        });
        if (!response.ok) {
            throw new Error('Error al buscar dudas');
        }
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error:', error);
        throw error;
    }
}

// Función para crear una nueva duda
async function createDoubt(doubtData) {
    try {
        // Añadir el ID del usuario si está en sessionStorage
        try {
            const userInfo = JSON.parse(sessionStorage.getItem('user_info'));
            if (userInfo && userInfo.authenticated && userInfo.user_id) {
                doubtData.user = userInfo.user_id;
            }
        } catch (e) {
            console.error("Error al leer sessionStorage:", e);
        }
        
        const response = await fetch(`${API_BASE_URL}/doubts/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(doubtData),
            credentials: 'include'
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Error al crear la duda');
        }
        
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error:', error);
        throw error;
    }
}

// Función para actualizar una duda existente
async function updateDoubt(id, doubtData) {
    try {
        const response = await fetch(`${API_BASE_URL}/doubts/${id}/`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(doubtData),
            credentials: 'include'
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Error al actualizar la duda');
        }
        
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error:', error);
        throw error;
    }
}

// Función para eliminar una duda
async function deleteDoubt(id) {
    try {
        const response = await fetch(`${API_BASE_URL}/doubts/${id}/`, {
            method: 'DELETE',
            credentials: 'include'
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Error al eliminar la duda');
        }
        
        return true;
    } catch (error) {
        console.error('Error:', error);
        throw error;
    }
}

// Función para responder a una duda
async function answerDoubt(id, answer) {
    try {
        const response = await fetch(`${API_BASE_URL}/doubts/${id}/answer/`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ answer }),
            credentials: 'include'
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Error al responder la duda');
        }
        
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error:', error);
        throw error;
    }
}

$(document).ready(async function () {
    // Valor predeterminado (no es admin)
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
        const response = await fetch('http://localhost:8000/api/check-auth/', {
            method: 'GET',
            credentials: 'include'
        });
        
        if (response.ok) {
            const data = await response.json();
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
        }
    } catch (error) {
        console.error("Error al verificar autenticación con el backend:", error);
    }
    
    // Mostrar mensaje en consola para confirmar el rol del usuario
    console.log("Estado de administrador:", isAdmin ? "Es administrador" : "No es administrador");
    console.log("ID del usuario actual:", currentUserId);
    
    // Ocultar botón de crear duda si es administrador
    if (isAdmin) {
        $('#create-question').hide();
    }
    
    // Función para renderizar las dudas en la página
    function renderQuestions(questions) {
        $('#questions').empty();
        if (questions.length === 0) {
            $('#questions').append(`
                <li class="list-group-item text-center py-4">
                    <p class="mb-0">No hay dudas disponibles</p>
                </li>`);
            return;
        }
        
        questions.forEach((question) => {
            // Determinar si el usuario actual puede editar/eliminar esta duda
            // Administradores no pueden editar/eliminar, solo usuarios normales que crearon la duda
            const canEdit = !isAdmin && (currentUserId && question.user === currentUserId);
            
            $('#questions').append(`
                <li class="list-group-item">
                    <div class="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center w-100">
                        <div>
                            <h5 class="mb-1">${question.title}</h5>
                            <p>${question.description}</p>
                            ${question.answer ? `<p class="text-success"><strong>Respuesta:</strong> ${question.answer}</p>` : ''}
                            <small class="text-muted">Creado por: ${question.username || 'Anónimo'}</small>
                        </div>
                        <div class="button-group ms-auto mt-2 mt-md-0">
                            ${isAdmin ? `
                                <button class="btn btn-outline-success btn-sm answer-btn" data-id="${question.id}">
                                    Responder
                                </button>
                            ` : ''}
                            ${canEdit ? `
                            <button class="btn btn-outline-warning btn-sm edit-btn" data-id="${question.id}">
                                Modificar
                            </button>
                            <button class="btn btn-outline-danger btn-sm delete-btn" data-id="${question.id}">
                                Eliminar
                            </button>
                            ` : ''}
                        </div>
                    </div>
                </li>
            `);
        });
        
        // Añadir event listeners a los botones
        $('.answer-btn').click(function() {
            const id = $(this).data('id');
            answerQuestion(id);
        });
        
        $('.edit-btn').click(function() {
            const id = $(this).data('id');
            editQuestion(id);
        });
        
        $('.delete-btn').click(function() {
            const id = $(this).data('id');
            deleteQuestion(id);
        });
    }

    // Cargar dudas desde el API
    function loadQuestions() {
        fetchDoubts()
            .then(questions => {
                renderQuestions(questions);
            })
            .catch(error => {
                console.error('Error al cargar dudas:', error);
                showAlert('Error al cargar las dudas. Por favor, intente nuevamente.', 'danger');
            });
    }

    // Función para mostrar alertas
    function showAlert(message, type = 'danger') {
        const alertHtml = `<div class="alert alert-${type} alert-dismissible fade show" role="alert">
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        </div>`;
        
        // Remover alertas anteriores
        $('.alert').remove();
        
        // Añadir nueva alerta al principio del contenedor
        $('.card-body').prepend(alertHtml);
        
        // Auto ocultar después de 5 segundos
        setTimeout(() => {
            $('.alert').alert('close');
        }, 5000);
    }

    // Reiniciar errores en el formulario
    function resetFormErrors() {
        $('.error-message').text('').hide();
        $('.form-control').removeClass('is-invalid');
        $('#form-errors, #answer-form-errors').addClass('d-none').text('');
    }

    // Event listener para el botón de crear duda (solo para usuarios no administradores)
    $('#create-question').click(function () {
        // Verificar que no sea administrador (medida de seguridad adicional)
        if (isAdmin) {
            showAlert('Los administradores no pueden crear dudas', 'warning');
            return;
        }
        resetFormErrors();
        $('#question-form').trigger("reset");
        $('#questionModalLabel').text("Crear Duda");
        $('#question-form').off('submit').on('submit', function (event) {
            event.preventDefault();
            resetFormErrors();
            
            // Validación del formulario
            const validationResult = validateQuestionForm();
            if (validationResult.isValid) {
                const title = $('#question-title').val();
                const description = $('#question-description').val();
                
                createDoubt({ title, description })
                    .then(() => {
                        loadQuestions();
                        $('#questionModal').modal('hide');
                    })
                    .catch(error => {
                        console.error('Error al crear duda:', error);
                        showFormError('Error al crear la duda. Por favor, intente nuevamente.');
                    });
            }
        });
        $('#questionModal').modal('show');
    });

    // Función para validar el formulario de dudas
    function validateQuestionForm() {
        const title = $('#question-title').val().trim();
        const description = $('#question-description').val().trim();
        let isValid = true;
        const errors = [];
        
        // Expresión regular para validar el título (solo letras, números, paréntesis y espacios)
        const titleRegex = /^[a-zA-Z0-9\(\) ]+$/;
        
        // Validar título
        if (!title) {
            $('#title-error').text('El título es obligatorio').show();
            $('#question-title').addClass('is-invalid');
            isValid = false;
            errors.push('El título es obligatorio');
        } else if (title.length < 5) {
            $('#title-error').text('El título debe tener al menos 5 caracteres').show();
            $('#question-title').addClass('is-invalid');
            isValid = false;
            errors.push('El título debe tener al menos 5 caracteres');
        } else if (title.length > 255) {
            $('#title-error').text('El título no puede tener más de 255 caracteres').show();
            $('#question-title').addClass('is-invalid');
            isValid = false;
            errors.push('El título no puede tener más de 255 caracteres');
        } else if (!titleRegex.test(title)) {
            $('#title-error').text('El título solo puede contener letras, números, paréntesis y espacios').show();
            $('#question-title').addClass('is-invalid');
            isValid = false;
            errors.push('El título solo puede contener letras, números, paréntesis y espacios');
        } else {
            $('#question-title').removeClass('is-invalid');
        }
        
        // Validar descripción
        if (!description) {
            $('#description-error').text('La descripción es obligatoria').show();
            $('#question-description').addClass('is-invalid');
            isValid = false;
            errors.push('La descripción es obligatoria');
        } else if (description.length < 10) {
            $('#description-error').text('La descripción debe tener al menos 10 caracteres').show();
            $('#question-description').addClass('is-invalid');
            isValid = false;
            errors.push('La descripción debe tener al menos 10 caracteres');
        } else if (description.length > 2000) {
            $('#description-error').text('La descripción no puede exceder los 2000 caracteres').show();
            $('#question-description').addClass('is-invalid');
            isValid = false;
            errors.push('La descripción no puede exceder los 2000 caracteres');
        } else if (/[<>]/.test(description)) {
            $('#description-error').text('La descripción contiene caracteres no permitidos').show();
            $('#question-description').addClass('is-invalid');
            isValid = false;
            errors.push('La descripción contiene caracteres no permitidos');
        } else {
            $('#question-description').removeClass('is-invalid');
        }
        
        // Si hay errores, mostrarlos en el contenedor de errores
        if (errors.length > 0) {
            $('#form-errors').removeClass('d-none').html(errors.map(err => `<p class="mb-0">• ${err}</p>`).join(''));
        }
        
        return { isValid, errors };
    }
    
    // Función para mostrar error en el formulario
    function showFormError(message) {
        $('#form-errors').removeClass('d-none').text(message);
    }

    // Función para editar una duda
    function editQuestion(id) {
        // Verificar que no sea administrador (medida de seguridad adicional)
        if (isAdmin) {
            showAlert('Los administradores no pueden modificar dudas', 'warning');
            return;
        }
        resetFormErrors();
        fetch(`http://localhost:8000/api/doubts/${id}/`)
            .then(response => {
                if (!response.ok) {
                    if (response.status === 403) {
                        throw new Error('No tienes permiso para modificar esta duda');
                    }
                    throw new Error('Error al obtener la duda');
                }
                return response.json();
            })
            .then(doubt => {
                $('#question-title').val(doubt.title);
                $('#question-description').val(doubt.description);
                $('#questionModalLabel').text("Modificar Duda");
                
                $('#question-form').off('submit').on('submit', function (event) {
                    event.preventDefault();
                    resetFormErrors();
                    
                    // Validación del formulario
                    const validationResult = validateQuestionForm();
                    if (validationResult.isValid) {
                        const title = $('#question-title').val();
                        const description = $('#question-description').val();
                        
                        updateDoubt(id, { title, description })
                            .then(() => {
                                loadQuestions();
                                $('#questionModal').modal('hide');
                                showAlert('Duda actualizada exitosamente', 'success');
                            })
                            .catch(error => {
                                console.error('Error al actualizar duda:', error);
                                if (error.message.includes('permiso')) {
                                    showAlert('No tienes permiso para modificar esta duda', 'danger');
                                    $('#questionModal').modal('hide');
                                } else {
                                showFormError('Error al actualizar la duda. Por favor, intente nuevamente.');
                                }
                            });
                    }
                });
                
                $('#questionModal').modal('show');
            })
            .catch(error => {
                console.error('Error al obtener duda:', error);
                showAlert(error.message || 'Error al obtener los datos de la duda. Por favor, intente nuevamente.', 'danger');
            });
    }

    // Función para eliminar una duda
    function deleteQuestion(id) {
        // Verificar que no sea administrador (medida de seguridad adicional)
        if (isAdmin) {
            showAlert('Los administradores no pueden eliminar dudas', 'warning');
            return;
        }
        // Eliminar directamente sin confirmación
        deleteDoubt(id)
            .then(() => {
                loadQuestions();
            })
            .catch(error => {
                console.error('Error al eliminar duda:', error);
                if (error.message.includes('permiso')) {
                    showAlert('No tienes permiso para eliminar esta duda', 'danger');
                } else {
                    showAlert('Error al eliminar la duda. Por favor, intente nuevamente.', 'danger');
                }
            });
    }

    // Función para responder una duda
    function answerQuestion(id) {
        resetFormErrors();
        fetch(`http://localhost:8000/api/doubts/${id}/`)
            .then(response => response.json())
            .then(doubt => {
                $('#answer-description').val(doubt.answer);
                
                $('#answer-form').off('submit').on('submit', function (event) {
                    event.preventDefault();
                    resetFormErrors();
                    
                    // Validación del formulario de respuesta
                    const validationResult = validateAnswerForm();
                    if (validationResult.isValid) {
                        const answer = $('#answer-description').val();
                        
                        answerDoubt(id, answer)
                            .then(() => {
                                loadQuestions();
                                $('#answerModal').modal('hide');
                                showAlert('Respuesta enviada exitosamente', 'success');
                            })
                            .catch(error => {
                                console.error('Error al responder duda:', error);
                                $('#answer-form-errors').removeClass('d-none').text('Error al responder la duda. Por favor, intente nuevamente.');
                            });
                    }
                });
                
                $('#answerModal').modal('show');
            })
            .catch(error => {
                console.error('Error al obtener duda:', error);
                showAlert('Error al obtener los datos de la duda. Por favor, intente nuevamente.');
            });
    }
    
    // Función para validar el formulario de respuesta
    function validateAnswerForm() {
        const answer = $('#answer-description').val().trim();
        let isValid = true;
        const errors = [];
        
        if (!answer) {
            $('#answer-error').text('La respuesta es obligatoria').show();
            $('#answer-description').addClass('is-invalid');
            isValid = false;
            errors.push('La respuesta es obligatoria');
        } else if (answer.length < 10) {
            $('#answer-error').text('La respuesta debe tener al menos 10 caracteres').show();
            $('#answer-description').addClass('is-invalid');
            isValid = false;
            errors.push('La respuesta debe tener al menos 10 caracteres');
        } else if (answer.length > 5000) {
            $('#answer-error').text('La respuesta no puede exceder los 5000 caracteres').show();
            $('#answer-description').addClass('is-invalid');
            isValid = false;
            errors.push('La respuesta no puede exceder los 5000 caracteres');
        } else if (/[<>]/.test(answer)) {
            $('#answer-error').text('La respuesta contiene caracteres no permitidos').show();
            $('#answer-description').addClass('is-invalid');
            isValid = false;
            errors.push('La respuesta contiene caracteres no permitidos');
        } else {
            $('#answer-description').removeClass('is-invalid');
        }
        
        // Si hay errores, mostrarlos en el contenedor de errores
        if (errors.length > 0) {
            $('#answer-form-errors').removeClass('d-none').html(errors.map(err => `<p class="mb-0">• ${err}</p>`).join(''));
        }
        
        return { isValid, errors };
    }

    // Botón para ir a la página de inicio
    $('#go-to-page').click(function () {
        window.location.href = 'index.html';
    });

    // Añadir el evento de búsqueda con validación mejorada
    $('#search-input').on('input', function() {
        const searchTerm = $(this).val().toLowerCase().trim();
        if (searchTerm === '') {
            loadQuestions();
        } else {
            // Validar longitud mínima de búsqueda
            if (searchTerm.length < 2) {
                return;
            }
            
            // Validar que no tenga caracteres especiales o HTML
            if (/[<>]/.test(searchTerm)) {
                showAlert('La búsqueda contiene caracteres no permitidos');
                return;
            }
            
            searchDoubts(searchTerm)
                .then(questions => {
                    renderQuestions(questions);
                })
                .catch(error => {
                    console.error('Error al buscar dudas:', error);
                    showAlert('Error al buscar dudas. Por favor, intente nuevamente.');
                });
        }
    });

    // Cargar dudas al iniciar la página
    loadQuestions();
});