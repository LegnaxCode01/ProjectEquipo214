// API para manejar videos
const API_URL = 'http://localhost:8000/api';

// Funciones para manejar la API de videos
const VideosAPI = {
    // Obtener todos los videos
    async getVideos() {
        try {
            console.log('Obteniendo videos...');
            const response = await fetch(`${API_URL}/videos/`, {
                credentials: 'include'
            });
            console.log('Respuesta:', response);
            if (!response.ok) {
                throw new Error(`Error al obtener videos: ${response.status} ${response.statusText}`);
            }
            const data = await response.json();
            console.log('Datos recibidos:', data);
            return data;
        } catch (error) {
            console.error('Error completo:', error);
            return [];
        }
    },

    // Obtener un video específico por ID
    async getVideo(videoId) {
        try {
            console.log(`Obteniendo video ${videoId}...`);
            const response = await fetch(`${API_URL}/videos/${videoId}/`, {
                credentials: 'include'
            });
            console.log('Respuesta:', response);
            if (!response.ok) {
                throw new Error(`Error al obtener video: ${response.status} ${response.statusText}`);
            }
            const data = await response.json();
            console.log('Datos recibidos:', data);
            return data;
        } catch (error) {
            console.error('Error al obtener video:', error);
            throw error;
        }
    },

    // Buscar videos por título
    async searchVideos(query) {
        try {
            console.log('Buscando videos con query:', query);
            const response = await fetch(`${API_URL}/videos/search/?query=${encodeURIComponent(query)}`, {
                credentials: 'include'
            });
            console.log('Respuesta búsqueda:', response);
            if (!response.ok) {
                throw new Error(`Error al buscar videos: ${response.status} ${response.statusText}`);
            }
            const data = await response.json();
            console.log('Resultados de búsqueda:', data);
            return data;
        } catch (error) {
            console.error('Error en búsqueda:', error);
            return [];
        }
    },

    // Crear un nuevo video
    async createVideo(videoData) {
        try {
            console.log('Creando video con datos:', videoData);
            const response = await fetch(`${API_URL}/videos/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(videoData),
                credentials: 'include'
            });
            console.log('Respuesta creación:', response);
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Error al crear video: ${response.status} ${response.statusText} - ${errorText}`);
            }
            const data = await response.json();
            console.log('Video creado:', data);
            return data;
        } catch (error) {
            console.error('Error completo al crear:', error);
            throw error;
        }
    },

    // Actualizar un video existente
    async updateVideo(videoId, videoData) {
        try {
            console.log(`Actualizando video ${videoId} con datos:`, videoData);
            const response = await fetch(`${API_URL}/videos/${videoId}/`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(videoData),
                credentials: 'include'
            });
            console.log('Respuesta actualización:', response);
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Error al actualizar video: ${response.status} ${response.statusText} - ${errorText}`);
            }
            const data = await response.json();
            console.log('Video actualizado:', data);
            return data;
        } catch (error) {
            console.error('Error completo al actualizar:', error);
            throw error;
        }
    },

    // Eliminar un video
    async deleteVideo(videoId) {
        try {
            console.log(`Eliminando video ${videoId}`);
            const response = await fetch(`${API_URL}/videos/${videoId}/`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include'
            });
            console.log('Respuesta eliminación:', response);
            if (!response.ok) {
                let errorMessage = `Error al eliminar video: ${response.status} ${response.statusText}`;
                try {
                    const errorText = await response.text();
                    if (errorText) {
                        errorMessage += ` - ${errorText}`;
                    }
                } catch (textError) {
                    console.error('No se pudo obtener el texto de error:', textError);
                }
                throw new Error(errorMessage);
            }
            console.log('Video eliminado correctamente');
            return true;
        } catch (error) {
            console.error('Error completo al eliminar:', error);
            throw error;
        }
    }
};

$(document).ready(async function () {
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
    try {
        const response = await fetch('http://localhost:8000/api/check-auth/', {
            method: 'GET',
            credentials: 'include'
        });
        
        if (response.ok) {
            const data = await response.json();
            // Si el usuario está autenticado, actualizar isAdmin
            if (data.isAuthenticated) {
                // Comprobar si el usuario tiene rol de admin en el backend
                if (data.is_staff || data.is_superuser) {
                    isAdmin = true;
                }
            }
        }
    } catch (error) {
        console.error("Error al verificar autenticación con el backend:", error);
    }
    
    // Mostrar elementos de administrador solo si es admin
    if (isAdmin) {
        // Mostrar botones de administración
        $('#admin-buttons').show();
    } else {
        // Ocultar modal y deshabilitar eventos relacionados con la administración
        $('#videoModal').remove(); // Remover completamente el modal
        
        // Evitar que se intenten registrar eventos de administración
        $('#create-video, .edit-video, .delete-video').on('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            return false;
        });
    }

    // Cargar los videos desde la API
    async function loadVideos() {
        try {
            console.log('Iniciando carga de videos desde la API...');
            const videos = await VideosAPI.getVideos();
            console.log('Videos cargados exitosamente:', videos);
            renderVideos(videos);
        } catch (error) {
            console.error('Error al cargar videos:', error);
            mostrarErrorGeneral('Error al cargar los videos: ' + error.message);
        }
    }

    function renderVideos(videos) {
        $('#videos').empty();
        console.log('Renderizando videos:', videos);
        if (videos.length === 0) {
            $('#videos').append(`
                <li class="list-group-item text-center py-4">
                    <p class="mb-0">No hay videos disponibles</p>
                </li>`);
            return;
        }
        
        videos.forEach((video) => {
            $('#videos').append(`
                <li class="list-group-item">
                    <div class="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center w-100">
                        <div>
                            <h5 class="mb-1">${video.title}</h5>
                            <a href="${video.url}" target="_blank">${video.url}</a>
                        </div>
                        ${isAdmin ? `
                            <div class="btn-group ms-auto mt-2 mt-md-0">
                                <button class="btn btn-outline-warning btn-sm edit-video" data-id="${video.id}">
                                    Editar
                                </button>
                                <button class="btn btn-outline-danger btn-sm delete-video" data-id="${video.id}">
                                    Eliminar
                                </button>
                            </div>
                        ` : ''}
                    </div>
                </li>
            `);
        });

        // Agregar event listeners a los botones recién creados
        $('.delete-video').click(function() {
            const videoId = $(this).data('id');
            
            // Eliminar directamente sin confirmación
            deleteVideo(videoId);
        });

        $('.edit-video').click(function() {
            const videoId = $(this).data('id');
            editVideo(videoId);
        });
    }

    // Función para validación de título
    function validarTitulo(titulo) {
        // Limpiar errores previos
        $('#title-error').hide();
        $('#title-custom-error').text('').addClass('d-none');
        $('#video-title').removeClass('is-invalid');
        
        // Verificar si está vacío
        if (!titulo || titulo.trim() === '') {
            $('#title-custom-error').text('El título no puede estar vacío').removeClass('d-none');
            $('#video-title').addClass('is-invalid');
            return false;
        }
        
        // Verificar longitud mínima
        if (titulo.trim().length < 3) {
            $('#title-custom-error').text('El título debe tener al menos 3 caracteres').removeClass('d-none');
            $('#video-title').addClass('is-invalid');
            return false;
        }
        
        // Verificar longitud máxima
        if (titulo.trim().length > 100) {
            $('#title-custom-error').text('El título no puede exceder los 100 caracteres').removeClass('d-none');
            $('#video-title').addClass('is-invalid');
            return false;
        }
        
        // Verificar caracteres permitidos (solo letras, números, paréntesis y espacios)
        const caracteresPermitidos = /^[a-zA-Z0-9\(\) ]+$/;
        if (!caracteresPermitidos.test(titulo)) {
            $('#title-custom-error').text('El título solo puede contener letras, números, paréntesis y espacios').removeClass('d-none');
            $('#video-title').addClass('is-invalid');
            return false;
        }
        
        return true;
    }

    // Función para validación de URL
    function validarUrl(url) {
        // Limpiar errores previos
        $('#url-error').hide();
        $('#url-custom-error').text('').addClass('d-none');
        $('#video-url').removeClass('is-invalid');
        
        // Verificar si está vacío
        if (!url || url.trim() === '') {
            $('#url-custom-error').text('La URL no puede estar vacía').removeClass('d-none');
            $('#video-url').addClass('is-invalid');
            return false;
        }
        
        // Verificar que no contenga espacios
        if (url.includes(' ')) {
            $('#url-custom-error').text('La URL no puede contener espacios').removeClass('d-none');
            $('#video-url').addClass('is-invalid');
            return false;
        }
        
        // Verificar formato básico de URL
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
            $('#url-custom-error').text('La URL debe comenzar con http:// o https://').removeClass('d-none');
            $('#video-url').addClass('is-invalid');
            return false;
        }
        
        // Verificar si es una URL válida
        try {
            new URL(url);
        } catch (e) {
            $('#url-custom-error').text('La URL no tiene un formato válido').removeClass('d-none');
            $('#video-url').addClass('is-invalid');
            return false;
        }
        
        return true;
    }

    // Función para mostrar errores generales
    function mostrarErrorGeneral(mensaje) {
        $('#form-error-message').text(mensaje).removeClass('d-none');
        setTimeout(() => {
            $('#form-error-message').addClass('d-none');
        }, 5000); // Ocultar después de 5 segundos
    }

    // Validación en tiempo real para el título
    $('#video-title').on('input', function() {
        const titulo = $(this).val().trim();
        if (titulo.length > 0) {
            validarTitulo(titulo);
        } else {
            // Solo limpiar, no mostrar error mientras escribe
            $('#title-custom-error').addClass('d-none');
            $(this).removeClass('is-invalid');
        }
    });

    // Validación en tiempo real para la URL
    $('#video-url').on('input', function() {
        const url = $(this).val().trim();
        if (url.length > 0) {
            validarUrl(url);
        } else {
            // Solo limpiar, no mostrar error mientras escribe
            $('#url-custom-error').addClass('d-none');
            $(this).removeClass('is-invalid');
        }
    });

    // Limpiar todos los errores al abrir el modal
    $('#videoModal').on('show.bs.modal', function () {
        limpiarErrores();
    });

    function limpiarErrores() {
        $('#title-custom-error, #url-custom-error').text('').addClass('d-none');
        $('#video-title, #video-url').removeClass('is-invalid');
        $('#form-error-message').addClass('d-none');
    }

    // Botón para crear video
    $('#create-video').click(function () {
        $('#video-form').trigger("reset");
        $('#videoModalLabel').text("Crear Video");
        limpiarErrores();
        
        $('#video-form').off('submit').on('submit', async function (event) {
            event.preventDefault();
            limpiarErrores();
            
            // Obtener valores
            const title = $('#video-title').val().trim();
            const url = $('#video-url').val().trim();

            // Validar ambos campos
            const tituloValido = validarTitulo(title);
            const urlValida = validarUrl(url);
            
            // Solo continuar si ambos son válidos
            if (tituloValido && urlValida) {
            try {
                await VideosAPI.createVideo({ title, url });
                await loadVideos();
                $('#videoModal').modal('hide');
            } catch (error) {
                console.error('Error al crear el video:', error);
                    mostrarErrorGeneral('Error al crear el video: ' + error.message);
                }
            }
        });
    });

    // Función para editar video
    async function editVideo(videoId) {
        try {
            const videoToEdit = await VideosAPI.getVideo(videoId);
            
            $('#video-title').val(videoToEdit.title);
            $('#video-url').val(videoToEdit.url);
            $('#videoModalLabel').text("Modificar Video");
            limpiarErrores();
            
            $('#video-form').off('submit').on('submit', async function (event) {
                event.preventDefault();
                limpiarErrores();
                
                // Obtener valores
                const title = $('#video-title').val().trim();
                const url = $('#video-url').val().trim();

                // Validar ambos campos
                const tituloValido = validarTitulo(title);
                const urlValida = validarUrl(url);
                
                // Solo continuar si ambos son válidos
                if (tituloValido && urlValida) {
                try {
                    await VideosAPI.updateVideo(videoId, { title, url });
                    await loadVideos();
                    $('#videoModal').modal('hide');
                } catch (error) {
                    console.error('Error al actualizar el video:', error);
                        mostrarErrorGeneral('Error al actualizar el video: ' + error.message);
                    }
                }
            });
            $('#videoModal').modal('show');
        } catch (error) {
            console.error('Error al preparar la edición del video:', error);
            mostrarErrorGeneral('Error al obtener el video: ' + error.message);
        }
    }

    // Función para eliminar video
    async function deleteVideo(videoId) {
        try {
            // Obtener referencia al elemento antes de eliminarlo
            const $elementoVideo = $(`.delete-video[data-id="${videoId}"]`).closest('li');
            
            // Mostrar indicador de carga en el elemento
            $elementoVideo.css('opacity', '0.5').append('<div class="position-absolute w-100 h-100 d-flex justify-content-center align-items-center" style="top: 0; left: 0;"><div class="spinner-border text-primary" role="status"></div></div>');
            
            // Enviar solicitud al servidor (sin await para no bloquear)
            const deletePromise = VideosAPI.deleteVideo(videoId);
            
            // Eliminar el elemento de la UI inmediatamente para mejor experiencia
            setTimeout(() => {
                $elementoVideo.fadeOut(300, function() {
                    $(this).remove();
                    
                    // Verificar si no quedan videos y mostrar mensaje
                    if ($('#videos li').length === 0) {
                        $('#videos').append(`
                            <li class="list-group-item text-center py-4">
                                <p class="mb-0">No hay videos disponibles</p>
                            </li>`);
                    }
                });
            }, 300); // Pequeño retraso para que se vea el indicador de carga
            
            // Esperar a que termine la operación en el servidor en segundo plano
            deletePromise.catch(error => {
                console.error('Error al eliminar el video:', error);
                mostrarErrorGeneral('Error al eliminar el video: ' + error.message);
                // Recargar videos en caso de error para mantener sincronización
                loadVideos();
            });
            
        } catch (error) {
            console.error('Error al eliminar el video:', error);
            mostrarErrorGeneral('Error al eliminar el video: ' + error.message);
        }
    }

    // Navegación
    $('#go-to-page').click(function () {
        window.location.href = 'index.html'; 
    });

    // Búsqueda de videos
    $('#search-input').on('input', async function() {
        const searchTerm = $(this).val().toLowerCase().trim();
        
        if (searchTerm === '') {
            await loadVideos();
        } else {
            try {
                const filteredVideos = await VideosAPI.searchVideos(searchTerm);
                renderVideos(filteredVideos);
            } catch (error) {
                console.error('Error en la búsqueda:', error);
                mostrarErrorGeneral('Error en la búsqueda: ' + error.message);
            }
        }
    });

    // Cargar videos al iniciar
    await loadVideos();
});