$(document).ready(function () {
    console.log("Inicializando cuestionario.js");
    // Valor predeterminado (no es admin)
    let isAdmin = false;
    
    // Intentar obtener información de sesión del almacenamiento local
    try {
        const storedInfo = sessionStorage.getItem('user_info');
        if (storedInfo) {
            const userInfo = JSON.parse(storedInfo);
            // Comprobar si el usuario existe y está autenticado
            if (userInfo && userInfo.authenticated) {
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
    $.ajax({
        url: 'http://localhost:8000/api/check-auth/',
        method: 'GET',
        async: false, // Para asegurar que se complete antes de continuar
        xhrFields: {
            withCredentials: true
        },
        success: function(data) {
            // Si el usuario está autenticado, actualizar isAdmin
            if (data.isAuthenticated) {
                // Comprobar si el usuario tiene rol de admin en el backend
                if (data.is_staff || data.is_superuser) {
                    isAdmin = true;
                }
            }
        },
        error: function(error) {
            console.error("Error al verificar autenticación con el backend:", error);
        }
    });
    
    // Mostrar elementos de administrador solo si es admin
    if (isAdmin) {
        // Mostrar botones de administración
        $('#admin-buttons').show();
    } else {
        // Ocultar modal y deshabilitar eventos relacionados con la administración
        $('#questionnaireModal').remove(); // Remover completamente el modal
        
        // Evitar que se intenten registrar eventos de administración
        $('#create-questionnaire, .edit-questionnaire, .delete-questionnaire').on('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            return false;
        });
    }
    
    let questionnaires = [];
    let currentQuestionnaireIndex = null;
    
    // URL de la API
    const API_URL = 'http://localhost:8000/api/';

    if (!isAdmin) {
        $('#admin-buttons').hide();
    }

    // Limpiar errores
    function clearErrors() {
        console.log("Limpiando errores");
        $('.error-message').removeClass('active').text('');
        $('.input-error').removeClass('input-error');
        $('#form-error').text('').removeClass('active');
    }

    // Mostrar errores en un campo específico
    function showError(fieldId, message) {
        console.log(`Mostrando error en campo ${fieldId}: ${message}`);
        const errorElement = $(`#${fieldId}-error`);
        $(`#${fieldId}`).addClass('input-error');
        errorElement.text(message).addClass('active');
        
        // Verificamos que el elemento existe y obtiene el mensaje
        console.log("Elemento de error:", errorElement.length > 0 ? "Existe" : "No existe");
        console.log("Texto del error después de asignar:", errorElement.text());
    }

    // Mostrar error general del formulario
    function showFormError(message) {
        console.log(`Mostrando error general: ${message}`);
        $('#form-error').text(message).addClass('active');
    }

    // Validar campo no vacío
    function validateNotEmpty(fieldId, fieldName) {
        const value = $(`#${fieldId}`).val().trim();
        console.log(`Validando campo ${fieldId} no vacío:`, value ? "Tiene valor" : "Está vacío");
        if (!value) {
            showError(fieldId, `El campo ${fieldName} no puede estar vacío`);
            return false;
        }
        return true;
    }
    
    // Validar título con caracteres permitidos
    function validateTitleChars(fieldId) {
        const value = $(`#${fieldId}`).val().trim();
        console.log(`Validando caracteres en título: "${value}"`);
        
        // Verificamos cada carácter individualmente
        let invalidChars = [];
        for (let i = 0; i < value.length; i++) {
            const char = value.charAt(i);
            // Permitimos: letras, números, paréntesis y espacios
            if (!/[a-zA-ZáéíóúÁÉÍÓÚñÑ0-9\s()]/.test(char)) {
                invalidChars.push(char);
            }
        }
        
        console.log("Caracteres no permitidos encontrados:", invalidChars);
        
        if (invalidChars.length > 0) {
            const uniqueInvalidChars = [...new Set(invalidChars)];
            showError(fieldId, `El título solo puede contener letras, números, paréntesis y espacios. Caracteres no permitidos: ${uniqueInvalidChars.join(' ')}`);
            return false;
        }
        return true;
    }

    // Validar longitud mínima
    function validateMinLength(fieldId, fieldName, minLength) {
        const value = $(`#${fieldId}`).val().trim();
        console.log(`Validando longitud mínima de ${fieldId}: ${value.length} >= ${minLength}`);
        if (value && value.length < minLength) {
            showError(fieldId, `El ${fieldName} debe tener al menos ${minLength} caracteres`);
            return false;
        }
        return true;
    }

    // Validar longitud máxima
    function validateMaxLength(fieldId, fieldName, maxLength) {
        const value = $(`#${fieldId}`).val().trim();
        console.log(`Validando longitud máxima de ${fieldId}: ${value.length} <= ${maxLength}`);
        if (value && value.length > maxLength) {
            showError(fieldId, `El ${fieldName} debe tener máximo ${maxLength} caracteres`);
            return false;
        }
        return true;
    }

    // Validar opciones de respuesta
    function validateOptionsUnique(questionIndex) {
        const options = [
            $(`#option${questionIndex}_1`).val().trim(),
            $(`#option${questionIndex}_2`).val().trim(),
            $(`#option${questionIndex}_3`).val().trim()
        ].filter(Boolean);
        
        console.log(`Validando opciones únicas para pregunta ${questionIndex}:`, options);
        
        if (options.length !== new Set(options).size) {
            showError(`option${questionIndex}_1`, `Las opciones de la pregunta ${questionIndex} deben ser diferentes`);
            return false;
        }
        return true;
    }

    // Cargar cuestionarios desde la API
    function loadQuestionnaires() {
        // Obtener información del usuario desde sessionStorage
        let userId = null;
        try {
            const storedInfo = sessionStorage.getItem('user_info');
            if (storedInfo) {
                const userInfo = JSON.parse(storedInfo);
                if (userInfo && userInfo.authenticated) {
                    userId = userInfo.user_id;
                }
            }
        } catch (e) {
            console.error("Error al leer sessionStorage:", e);
        }
        
        if (!userId) {
            console.error("No se pudo obtener el ID de usuario, no se pueden cargar los cuestionarios");
            // Mostrar mensaje de error en la interfaz
            $('#questionnaires').empty();
            $('#questionnaires').append(`
                <li class="list-group-item text-center py-4">
                    <p class="mb-0">Debe iniciar sesión para ver los cuestionarios</p>
                </li>`);
            return;
        }
        
        $.ajax({
            url: API_URL + 'questionnaires/',
            type: 'GET',
            success: function(data) {
                questionnaires = data;
                
                // Cargar los intentos del usuario
                $.ajax({
                    url: API_URL + 'user/attempts/',
                    type: 'GET',
                    data: { user_id: userId },
                    success: function(attemptsData) {
                        renderQuestionnaires(attemptsData);
                    },
                    error: function(error) {
                        console.error('Error al cargar intentos:', error);
                        console.error('Detalles:', error.responseText);
                        renderQuestionnaires([]);
                    }
                });
            },
            error: function(error) {
                console.error('Error al cargar cuestionarios:', error);
                console.error('Detalles:', error.responseText);
                alert('Error al cargar cuestionarios: ' + (error.responseJSON?.error || error.statusText || 'Error desconocido'));
            }
        });
    }

    function renderQuestionnaires(attemptsData = []) {
        $('#questionnaires').empty();
        
        // Si no hay cuestionarios mostrar mensaje
        if (questionnaires.length === 0) {
            $('#questionnaires').append(`
                <li class="list-group-item text-center py-4">
                    <p class="mb-0">No hay cuestionarios disponibles</p>
                </li>`);
            return;
        }
        
        // Crear mapas para acceso rápido
        const userAttemptsMap = {};
        const userScoresMap = {};
        
        attemptsData.forEach(attempt => {
            if (attempt.id) {
                userAttemptsMap[attempt.id] = attempt.attempts || 0;
                userScoresMap[attempt.id] = attempt.score || 0;
            }
        });

        questionnaires.forEach((questionnaire, index) => {
            const attempts = userAttemptsMap[questionnaire.id] || 0;
            const score = userScoresMap[questionnaire.id] || 'No realizado';
            const isDisabled = attempts >= 2;
            
            // Crear mensaje para mostrar basado en el estado
            let statusMessage = '';
            if (isDisabled) {
                statusMessage = `<span class="text-danger">Límite de intentos alcanzado</span>`;
            } else {
                statusMessage = `<span class="text-success">Intentos restantes: ${2 - attempts}</span>`;
            }
            
            let scoreDisplay = '';
            if (score !== 'No realizado') {
                // Determinar el estado según la puntuación
                let scoreStatus = '';
                if (score === 2) scoreStatus = 'text-danger">Desaprobado';
                else if (score === 3) scoreStatus = 'text-warning">Aprobado';
                else if (score === 4) scoreStatus = 'text-warning">Bueno';
                else if (score === 5) scoreStatus = 'text-success">Excelente';
                
                scoreDisplay = `<span class="${scoreStatus} (${score}/5)</span>`;
            } else {
                scoreDisplay = `<span class="text-muted">${score}</span>`;
            }
            
            $('#questionnaires').append(`
                <li class="list-group-item">
                    <div class="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center w-100">
                        <div>
                            <h5 class="mb-1">${questionnaire.title}</h5>
                    ${!isAdmin ? `
                    <div class="attempts-info">${statusMessage}</div>
                    <div class="score-info">Mejor nota: ${scoreDisplay}</div>
                    ` : ''}
                        </div>
                        <div class="buttons-container ms-auto mt-2 mt-md-0">
                            ${!isAdmin ? `
                            <button class="btn ${isDisabled ? 'btn-outline-secondary' : 'btn-outline-success'} btn-sm" 
                            onclick="takeQuestionnaire(${index})" 
                            ${isDisabled ? 'disabled' : ''}>
                            ${isDisabled ? 'Límite de intentos alcanzado' : 'Responder'}
                            </button>
                            ` : ''}
                            ${isAdmin ? `
                                <button class="btn btn-outline-warning btn-sm" onclick="editQuestionnaire(${index})">
                                    Modificar
                                </button>
                                <button class="btn btn-outline-danger btn-sm" onclick="deleteQuestionnaire(${index})">
                                    Eliminar
                                </button>
                            ` : ''}
                        </div>
                    </div>
                </li>
            `);
        });
    }

    $('#create-questionnaire').click(function () {
        // Verificar nuevamente si el usuario es administrador
        if (!isAdmin) {
            console.error("Error: Solo los administradores pueden crear cuestionarios");
            return;
        }
        
        $('#questionnaire-form').trigger("reset");
        $('#questionnaireModalLabel').text("Crear Cuestionario");
        clearErrors();
        
        $('#questionnaire-form').off('submit').on('submit', function (event) {
            event.preventDefault();
            
            // Limpiar validaciones previas
            clearErrors();
            
            // Validación del formulario
            let isValid = true;
            
            // Validar título
            if (!validateNotEmpty('questionnaire-title', 'título')) {
                isValid = false;
            } else {
                // Validar caracteres permitidos en el título
                if (!validateTitleChars('questionnaire-title')) {
                    isValid = false;
                }
                // Validar longitud del título
                else if (!validateMinLength('questionnaire-title', 'título', 3)) {
                    isValid = false;
                }
                else if (!validateMaxLength('questionnaire-title', 'título', 100)) {
                    isValid = false;
                }
            }
            
            // Validar preguntas y opciones
            for (let i = 1; i <= 3; i++) {
                // Validar texto de la pregunta
                if (!validateNotEmpty(`question${i}`, `de la pregunta ${i}`)) {
                    isValid = false;
                } else {
                    // Validar longitud de la pregunta
                    if (!validateMinLength(`question${i}`, `texto de la pregunta ${i}`, 5)) {
                        isValid = false;
                    }
                }
                
                // Validar opciones
                let allOptionsValid = true;
                for (let j = 1; j <= 3; j++) {
                    if (!validateNotEmpty(`option${i}_${j}`, `opción ${j} de la pregunta ${i}`)) {
                        isValid = false;
                        allOptionsValid = false;
                    }
                }
                
                // Validar que las opciones sean distintas
                if (allOptionsValid && !validateOptionsUnique(i)) {
                    isValid = false;
                }
            }
            
            if (isValid) {
                const questions = [
                    {
                        question: $('#question1').val().trim(),
                        options: [
                            $('#option1_1').val().trim(),
                            $('#option1_2').val().trim(),
                            $('#option1_3').val().trim()
                        ],
                        correctOption: $('#correct-option1').val()
                    },
                    {
                        question: $('#question2').val().trim(),
                        options: [
                            $('#option2_1').val().trim(),
                            $('#option2_2').val().trim(),
                            $('#option2_3').val().trim()
                        ],
                        correctOption: $('#correct-option2').val()
                    },
                    {
                        question: $('#question3').val().trim(),
                        options: [
                            $('#option3_1').val().trim(),
                            $('#option3_2').val().trim(),
                            $('#option3_3').val().trim()
                        ],
                        correctOption: $('#correct-option3').val()
                    }
                ];
                
                // Enviar al backend
                $.ajax({
                    url: API_URL + 'questionnaires/',
                    type: 'POST',
                    data: { title: $('#questionnaire-title').val().trim(), questions: JSON.stringify(questions) },
                    success: function(data) {
                        loadQuestionnaires();
                        $('#questionnaireModal').modal('hide');
                    },
                    error: function(error) {
                        console.error('Error al crear cuestionario:', error);
                        showFormError('Error al crear cuestionario: ' + (error.responseJSON?.error || error.statusText || 'Error en el servidor'));
                    }
                });
            } else {
                showFormError('Por favor, corrija los errores antes de continuar.');
            }
        });
        $('#questionnaireModal').modal('show');
    });

    window.takeQuestionnaire = function (index) {
        const questionnaire = questionnaires[index];
        let currentQuestion = 0;
        let userAnswers = [];

        // Obtener información del usuario desde sessionStorage
        let userId = null;
        try {
            const storedInfo = sessionStorage.getItem('user_info');
            if (storedInfo) {
                const userInfo = JSON.parse(storedInfo);
                if (userInfo && userInfo.authenticated) {
                    userId = userInfo.user_id;
                }
            }
        } catch (e) {
            console.error("Error al leer sessionStorage:", e);
        }
        
        if (!userId) {
            alert("Debe iniciar sesión para realizar el cuestionario");
            return;
        }

        function showQuestion(questionIndex) {
            const question = questionnaire.questions[questionIndex];
            $('#question-text').text(`Pregunta ${questionIndex + 1}: ${question.question_text}`);
            
            // Limpiar selecciones previas
            $('input[name="answer"]').prop('checked', false);
            clearErrors();
            
            for (let i = 1; i <= 3; i++) {
                $(`#option-text-${i}`).text(question.options[i-1].option_text);
                $(`#answer${i}`).val(question.options[i-1].id);
            }
        }

        showQuestion(0);

        $('#answer-form').off('submit').on('submit', function (event) {
            event.preventDefault();
            
            // Limpiar errores previos
            clearErrors();
            
            const selectedOption = $('input[name="answer"]:checked');
            
            // Validar que se haya seleccionado una opción
            if (selectedOption.length === 0) {
                $('#answer-error').text('Debe seleccionar una respuesta').addClass('active');
                return;
            }
            
            const optionId = selectedOption.val();
            const currentQuestionData = questionnaire.questions[currentQuestion];
            
            userAnswers.push({
                question_id: currentQuestionData.id,
                option_id: optionId
            });

            currentQuestion++;

            if (currentQuestion < questionnaire.questions.length) {
                showQuestion(currentQuestion);
            } else {
                // Enviar respuestas al backend
                $.ajax({
                    url: API_URL + `questionnaires/${questionnaire.id}/submit/`,
                    type: 'POST',
                    data: { 
                        answers: JSON.stringify(userAnswers),
                        user_id: userId
                    },
                    success: function(data) {
                        // Construir mensaje de resultado de forma simplificada
                        let scoreText = '';
                        if (data.score === 2) scoreText = 'Desaprobado';
                        else if (data.score === 3) scoreText = 'Aprobado';
                        else if (data.score === 4) scoreText = 'Bueno';
                        else if (data.score === 5) scoreText = 'Excelente';
                        
                        // Mostrar resultados en el modal simplificado
                        $('#result-title').text('Cuestionario completado');
                        $('#result-correct').text(`Respuestas correctas: ${data.correct_answers}/${data.total_questions}`);
                        $('#result-score').text(`Calificación: ${Math.round(data.score)}/5 - ${scoreText}`);
                        
                        if (data.attempts_left > 0) {
                            $('#result-attempts').text(`Intentos restantes: ${data.attempts_left}`);
                        } else {
                            $('#result-attempts').text(`Has alcanzado el límite de intentos.`);
                        }
                        
                        // Cerrar modal de respuestas y mostrar modal de resultados
                        $('#answerModal').modal('hide');
                        $('#resultModal').modal('show');
                        
                        // Cuando se cierre el modal de resultados, recargar la lista de cuestionarios
                        $('#resultModal').on('hidden.bs.modal', function () {
                            loadQuestionnaires();
                        });
                    },
                    error: function(error) {
                        console.error('Error al enviar respuestas:', error);
                        
                        // Mostrar mensaje de error específico si existe
                        if (error.responseJSON && error.responseJSON.error) {
                            $('#answer-error').text(error.responseJSON.error).addClass('active');
                        } else {
                            $('#answer-error').text('Error al enviar respuestas: ' + (error.statusText || 'Error en el servidor')).addClass('active');
                        }
                    }
                });
            }
        });
        $('#answerModal').modal('show');
    };

    window.editQuestionnaire = function (index) {
        // Verificar nuevamente si el usuario es administrador
        if (!isAdmin) {
            console.error("Error: Solo los administradores pueden editar cuestionarios");
            return;
        }
        
        currentQuestionnaireIndex = index;
        const questionnaire = questionnaires[index];
        
        // Limpiar validaciones previas
        clearErrors();
        
        $('#questionnaire-title').val(questionnaire.title);
        
        if (questionnaire.questions && questionnaire.questions.length >= 3) {
            // Cargar datos de las preguntas
            for (let i = 0; i < 3; i++) {
                $(`#question${i+1}`).val(questionnaire.questions[i].question_text);
                
                if (questionnaire.questions[i].options.length >= 3) {
                    for (let j = 0; j < 3; j++) {
                        $(`#option${i+1}_${j+1}`).val(questionnaire.questions[i].options[j].option_text);
                    }
                    
                    // Encontrar la opción correcta
                    for (let j = 0; j < 3; j++) {
                        if (questionnaire.questions[i].options[j].is_correct) {
                            $(`#correct-option${i+1}`).val(j + 1);
                            break;
                        }
                    }
                }
            }
        }

        $('#questionnaireModalLabel').text("Modificar Cuestionario");
        $('#questionnaire-form').off('submit').on('submit', function (event) {
            event.preventDefault();
            
            // Limpiar validaciones previas
            clearErrors();
            
            // Validación del formulario
            let isValid = true;
            
            // Validar título
            if (!validateNotEmpty('questionnaire-title', 'título')) {
                isValid = false;
            } else {
                // Validar caracteres permitidos en el título
                if (!validateTitleChars('questionnaire-title')) {
                    isValid = false;
                }
                // Validar longitud del título
                else if (!validateMinLength('questionnaire-title', 'título', 3)) {
                    isValid = false;
                }
                else if (!validateMaxLength('questionnaire-title', 'título', 100)) {
                    isValid = false;
                }
            }
            
            // Validar preguntas y opciones
            for (let i = 1; i <= 3; i++) {
                // Validar texto de la pregunta
                if (!validateNotEmpty(`question${i}`, `de la pregunta ${i}`)) {
                    isValid = false;
                } else {
                    // Validar longitud de la pregunta
                    if (!validateMinLength(`question${i}`, `texto de la pregunta ${i}`, 5)) {
                        isValid = false;
                    }
                }
                
                // Validar opciones
                let allOptionsValid = true;
                for (let j = 1; j <= 3; j++) {
                    if (!validateNotEmpty(`option${i}_${j}`, `opción ${j} de la pregunta ${i}`)) {
                        isValid = false;
                        allOptionsValid = false;
                    }
                }
                
                // Validar que las opciones sean distintas
                if (allOptionsValid && !validateOptionsUnique(i)) {
                    isValid = false;
                }
            }
            
            if (isValid) {
                const questions = [
                    {
                        question: $('#question1').val().trim(),
                        options: [
                            $('#option1_1').val().trim(),
                            $('#option1_2').val().trim(),
                            $('#option1_3').val().trim()
                        ],
                        correctOption: $('#correct-option1').val()
                    },
                    {
                        question: $('#question2').val().trim(),
                        options: [
                            $('#option2_1').val().trim(),
                            $('#option2_2').val().trim(),
                            $('#option2_3').val().trim()
                        ],
                        correctOption: $('#correct-option2').val()
                    },
                    {
                        question: $('#question3').val().trim(),
                        options: [
                            $('#option3_1').val().trim(),
                            $('#option3_2').val().trim(),
                            $('#option3_3').val().trim()
                        ],
                        correctOption: $('#correct-option3').val()
                    }
                ];
                
                // Actualizar en el backend
                $.ajax({
                    url: API_URL + `questionnaires/${questionnaire.id}/`,
                    type: 'PUT',
                    data: { title: $('#questionnaire-title').val().trim(), questions: JSON.stringify(questions) },
                    success: function(data) {
                        loadQuestionnaires();
                        $('#questionnaireModal').modal('hide');
                    },
                    error: function(error) {
                        console.error('Error al actualizar cuestionario:', error);
                        showFormError('Error al actualizar cuestionario: ' + (error.responseJSON?.error || 'Error en el servidor'));
                    }
                });
            } else {
                showFormError('Por favor, corrija los errores antes de continuar.');
            }
        });
        $('#questionnaireModal').modal('show');
    };

    window.deleteQuestionnaire = function (index) {
        // Verificar nuevamente si el usuario es administrador
        if (!isAdmin) {
            console.error("Error: Solo los administradores pueden eliminar cuestionarios");
            return;
        }
        
        const questionnaire = questionnaires[index];
        // Eliminar en el backend sin confirmación
        $.ajax({
                url: API_URL + `questionnaires/${questionnaire.id}/`,
                type: 'DELETE',
                success: function() {
                    loadQuestionnaires();
                },
                error: function(error) {
                    console.error('Error al eliminar cuestionario:', error);
                    alert('Error al eliminar cuestionario: ' + (error.responseJSON?.error || 'Error desconocido'));
                }
            });
    };

    $('#go-to-page').click(function () {
        window.location.href = 'index.html';
    });

    $('#search-input').on('input', function() {
        const searchTerm = $(this).val().toLowerCase().trim();
        if (searchTerm === '') {
            loadQuestionnaires();
        } else {
            // Validar longitud mínima de búsqueda
            if (searchTerm.length < 2) {
                return;
            }
            
            $.ajax({
                url: API_URL + 'questionnaires/search/?query=' + encodeURIComponent(searchTerm),
                type: 'GET',
                success: function(data) {
                    questionnaires = data;
                    $.ajax({
                        url: API_URL + 'user/attempts/',
                        type: 'GET',
                        success: function(attemptsData) {
                            renderQuestionnaires(attemptsData);
                        },
                        error: function(error) {
                            renderQuestionnaires([]);
                        }
                    });
                },
                error: function(error) {
                    console.error('Error en la búsqueda:', error);
                }
            });
        }
    });

    // Eventos de validación en tiempo real
    $('#questionnaire-title').on('blur', function() {
        clearErrors();
        validateNotEmpty('questionnaire-title', 'título');
        validateTitleChars('questionnaire-title');
        validateMinLength('questionnaire-title', 'título', 3);
        validateMaxLength('questionnaire-title', 'título', 100);
    });

    // Validar preguntas al perder el foco
    for (let i = 1; i <= 3; i++) {
        $(`#question${i}`).on('blur', function() {
            clearErrors();
            validateNotEmpty(`question${i}`, `de la pregunta ${i}`);
            validateMinLength(`question${i}`, `texto de la pregunta ${i}`, 5);
        });

        // Validar opciones al perder el foco
        for (let j = 1; j <= 3; j++) {
            $(`#option${i}_${j}`).on('blur', function() {
                clearErrors();
                validateNotEmpty(`option${i}_${j}`, `opción ${j} de la pregunta ${i}`);
                
                // Verificar si todas las opciones están llenas para validar que sean diferentes
                const option1 = $(`#option${i}_1`).val().trim();
                const option2 = $(`#option${i}_2`).val().trim();
                const option3 = $(`#option${i}_3`).val().trim();
                
                if (option1 && option2 && option3) {
                    validateOptionsUnique(i);
                }
            });
        }
    }

    // Botón para ver evaluaciones
    $('#view-evaluations').click(function() {
        loadAllUserEvaluations();
        $('#evaluationsModal').modal('show'); // Asegurar que el modal se muestre
    });

    // Función para cargar evaluaciones de todos los usuarios
    function loadAllUserEvaluations() {
        console.log("Cargando evaluaciones de todos los usuarios");
        
        // Limpiar el contenedor de evaluaciones
        $('#evaluations-list').empty();
        $('#no-evaluations').hide();
        
        // Mostrar indicador de carga
        $('#evaluations-list').html('<div class="text-center"><div class="spinner-border text-primary" role="status"><span class="visually-hidden">Cargando...</span></div><p class="mt-2">Cargando evaluaciones...</p></div>');
        
        // Realizar solicitud AJAX para obtener todas las evaluaciones
        $.ajax({
            url: API_URL + 'all-attempts/',
            type: 'GET',
            xhrFields: {
                withCredentials: true
            },
            success: function(data) {
                console.log("Datos recibidos de todas las evaluaciones:", data);
                displayAllUserEvaluations(data);
                
                // Configurar búsqueda en tiempo real
                setupEvaluationsSearch(data);
            },
            error: function(error) {
                console.error('Error al cargar evaluaciones:', error);
                $('#evaluations-list').empty();
                $('#evaluations-list').html('<div class="alert alert-danger">Error al cargar las evaluaciones. Por favor, intente nuevamente.</div>');
            }
        });
    }
    
    // Función para configurar la búsqueda de evaluaciones
    function setupEvaluationsSearch(allData) {
        $('#evaluations-search').on('input', function() {
            const searchTerm = $(this).val().toLowerCase().trim();
            
            if (searchTerm === '') {
                // Si no hay término de búsqueda, mostrar todos los datos nuevamente
                displayAllUserEvaluations(allData);
                return;
            }
            
            // Filtrar los datos según el término de búsqueda
            const filteredData = allData.filter(item => {
                return (
                    item.username.toLowerCase().includes(searchTerm) ||
                    item.questionnaire_title.toLowerCase().includes(searchTerm)
                );
            });
            
            // Mostrar los resultados filtrados
            displayAllUserEvaluations(filteredData);
        });
    }
    
    // Función para mostrar las evaluaciones de todos los usuarios en el modal
    function displayAllUserEvaluations(evaluations) {
        console.log("Mostrando evaluaciones de todos los usuarios:", evaluations);
        
        // Limpiar el contenedor
        $('#evaluations-list').empty();
        
        // Verificar si hay datos
        if (!evaluations || evaluations.length === 0) {
            $('#no-evaluations').show();
            return;
        }
        
        try {
            // Agrupar por usuario y cuestionario, y mantener solo la mejor puntuación
            const bestScores = {};
            
            evaluations.forEach(attempt => {
                // Crear una clave única para cada combinación de usuario y cuestionario
                const key = `${attempt.user_id}-${attempt.questionnaire_id}`;
                
                // Si es la primera vez que vemos esta combinación o si la puntuación es mayor que la anterior
                if (!bestScores[key] || attempt.score > bestScores[key].score) {
                    bestScores[key] = attempt;
                }
            });
            
            // Convertir el objeto de mejores puntuaciones a un array para mostrar
            const bestScoresArray = Object.values(bestScores);
            
            // Ordenar por puntuación (de mayor a menor)
            bestScoresArray.sort((a, b) => b.score - a.score);
            
            // Mostrar las mejores evaluaciones en el modal
            bestScoresArray.forEach(attempt => {
                // Convertir el score a escala de 2-5 (asumiendo que score original está en escala de 0-10)
                const scoreValue = 2 + (attempt.score * 3 / 10);
                const formattedScore = Math.round(scoreValue);
                
                const evaluationItem = `
                    <div class="list-group-item">
                        <div class="d-flex justify-content-between align-items-center">
                            <div>
                                <h5 class="mb-1">${attempt.questionnaire_title}</h5>
                                <small class="text-muted">Usuario: <strong>${attempt.username}</strong></small>
                            </div>
                            <div>
                                <span class="fs-5 fw-bold">${formattedScore}</span>
                            </div>
                        </div>
                    </div>
                `;
                
                $('#evaluations-list').append(evaluationItem);
            });
            
            // Mostrar cuántos resultados se están mostrando
            $('#evaluations-list').prepend(`
                <div class="alert alert-info mb-3">
                    Mostrando ${bestScoresArray.length} mejores resultados de cuestionarios
                </div>
            `);
        } catch (error) {
            console.error("Error al procesar evaluaciones:", error);
            $('#evaluations-list').html('<div class="alert alert-danger">Error al procesar los datos. Consulta la consola para más detalles.</div>');
        }
    }

    // Mantener la función loadUserEvaluations para compatibilidad si es necesario
    function loadUserEvaluations() {
        console.log("Cargando evaluaciones de usuarios");
        
        // Limpiar el contenedor de evaluaciones
        $('#evaluations-list').empty();
        $('#no-evaluations').hide();
        
        // Mostrar indicador de carga
        $('#evaluations-list').html('<div class="text-center"><div class="spinner-border text-primary" role="status"><span class="visually-hidden">Cargando...</span></div><p class="mt-2">Cargando evaluaciones...</p></div>');
        
        // Intentar obtener el ID de usuario desde sessionStorage
        let userId = null;
        try {
            const userInfo = JSON.parse(sessionStorage.getItem('user_info') || '{}');
            userId = userInfo.user_id;
            console.log("ID de usuario obtenido del sessionStorage:", userId);
        } catch (e) {
            console.error("Error al leer ID de usuario del sessionStorage:", e);
        }
        
        if (!userId) {
            console.error("No se pudo obtener el ID de usuario");
            $('#evaluations-list').html('<div class="alert alert-warning">No se pudo obtener el ID de usuario. Por favor, inicie sesión nuevamente.</div>');
            return;
        }
        
        // Realizar solicitud AJAX para obtener las evaluaciones
        $.ajax({
            url: API_URL + 'user/attempts/',
            type: 'GET',
            data: { user_id: userId }, // Agregamos el parámetro user_id que requiere la API
            xhrFields: {
                withCredentials: true
            },
            success: function(data) {
                console.log("Datos recibidos de evaluaciones:", data);
                displayUserEvaluations(data);
            },
            error: function(error) {
                console.error('Error al cargar evaluaciones:', error);
                
                if (error.status === 400) {
                    $('#evaluations-list').html('<div class="alert alert-warning">Se requiere iniciar sesión para ver sus evaluaciones.</div>');
                } else if (error.status === 404) {
                    $('#evaluations-list').html('<div class="alert alert-info">No se encontró información para este usuario.</div>');
                } else {
                    $('#evaluations-list').html('<div class="alert alert-danger">Error al cargar las evaluaciones. Por favor, intente nuevamente.</div>');
                }
            }
        });
    }
    
    // Función para mostrar las evaluaciones en el modal
    function displayUserEvaluations(evaluations) {
        console.log("Mostrando evaluaciones:", evaluations);
        
        // Limpiar el contenedor
        $('#evaluations-list').empty();
        
        // Verificar si hay datos
        if (!evaluations || evaluations.length === 0) {
            $('#no-evaluations').show();
            return;
        }
        
        try {
            // Ordenamos las evaluaciones por puntuación (de mayor a menor)
            evaluations.sort((a, b) => b.score - a.score);
            
            // Agrupar por cuestionario y obtener el mejor puntaje
            const bestScores = {};
            evaluations.forEach(attempt => {
                const questionnaire_id = attempt.questionnaire_id || attempt.questionnaire;
                
                // Verificar si el id de cuestionario existe
                if (!questionnaire_id) {
                    console.warn("Intento sin ID de cuestionario:", attempt);
                    return;
                }
                
                if (!bestScores[questionnaire_id] || attempt.score > bestScores[questionnaire_id].score) {
                    bestScores[questionnaire_id] = {
                        id: questionnaire_id,
                        title: attempt.title || attempt.questionnaire_title || "Cuestionario " + questionnaire_id,
                        score: attempt.score,
                        attempts: attempt.attempts || 1,
                        date: attempt.attempt_date
                    };
                }
            });
            
            // Si no hay puntuaciones después de filtrar
            if (Object.keys(bestScores).length === 0) {
                $('#no-evaluations').show();
                return;
            }
            
            // Mostrar las evaluaciones en el modal
            Object.values(bestScores).forEach(score => {
                // Convertir el score a escala de 2-5 (asumiendo que score original está en escala de 0-10)
                const scoreValue = 2 + (score.score * 3 / 10);
                const formattedScore = Math.round(scoreValue);
                
                const evaluationItem = `
                    <div class="list-group-item">
                        <div class="d-flex justify-content-between align-items-center">
                            <h5 class="mb-1">${score.title}</h5>
                            <div>
                                <span class="fs-5 fw-bold">${formattedScore}</span>
                            </div>
                        </div>
                        <div class="d-flex justify-content-between">
                            <small class="text-muted">Intentos: ${score.attempts}</small>
                        </div>
                    </div>
                `;
                
                $('#evaluations-list').append(evaluationItem);
            });
        } catch (error) {
            console.error("Error al procesar evaluaciones:", error);
            $('#evaluations-list').html('<div class="alert alert-danger">Error al procesar los datos. Consulta la consola para más detalles.</div>');
        }
    }

    // Cargar los cuestionarios al iniciar
    loadQuestionnaires();
});