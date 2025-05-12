from django.shortcuts import render
from rest_framework import status, generics, views
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import User
from django.db import transaction
from django.db.models import Avg
from rest_framework.decorators import api_view
from rest_framework.reverse import reverse
from .models import CustomUser, Video, Questionnaire, Question, Option, UserAttempt, Doubt, Evaluation
from .serializers import (
    VideoSerializer, QuestionnaireSerializer, UserAttemptSerializer, 
    QuestionnaireCreateSerializer, DoubtSerializer, EvaluationSerializer
)
import re

class LoginView(views.APIView):
    permission_classes = [AllowAny]
    
    def post(self, request):
        username = request.data.get('username')
        password = request.data.get('password')
        
        print(f"Intento de inicio de sesión para: {username}")
        
        user = authenticate(username=username, password=password)
        
        if user is not None:
            print(f"Autenticación exitosa para: {username}")
            
            if hasattr(request, 'session'):
                request.session.flush()
            
            login(request, user)
            request.session.modified = True
            request.session.save()
            
            print(f"Session key después de login: {request.session.session_key}")
            print(f"Session data: {dict(request.session)}")
            
            response = Response({
                'message': 'Inicio de sesión exitoso',
                'username': user.username,
                'user_id': user.id,
                'session_key': request.session.session_key,
                'is_staff': user.is_staff,
                'is_superuser': user.is_superuser
            }, status=status.HTTP_200_OK)
            
            if request.session.session_key:
                response.set_cookie(
                    key='sessionid',
                    value=request.session.session_key,
                    httponly=False,
                    samesite='Lax',
                    secure=False,
                    max_age=86400,
                    path='/'
                )
                print(f"Cookie de sesión configurada: {request.session.session_key}")
            else:
                print("ERROR: No se pudo obtener una clave de sesión válida")
            
            return response
        else:
            print(f"Autenticación fallida para: {username}")
            return Response(
                {'error': 'Usuario o contraseña incorrectos'}, 
                status=status.HTTP_401_UNAUTHORIZED
            )

class LogoutView(views.APIView):
    def post(self, request):
        print("Ejecutando logout_view")
        print(f"Usuario: {request.user.username if request.user.is_authenticated else 'No autenticado'}")
        print(f"Sesión activa: {bool(request.session.session_key)}")
        print(f"Session key: {request.session.session_key}")
        
        if request.user.is_authenticated:
            username = request.user.username
            logout(request)
            
            response = Response({
                'message': f'Sesión cerrada exitosamente para {username}'
            }, status=status.HTTP_200_OK)
            
            response.delete_cookie('sessionid', path='/')
            
            return response
        else:
            response = Response({
                'message': 'No hay sesión activa para cerrar'
            }, status=status.HTTP_200_OK)
            
            response.delete_cookie('sessionid', path='/')
            
            return response

class RegisterView(views.APIView):
    permission_classes = [AllowAny]
    
    def post(self, request):
        username = request.data.get('username')
        password = request.data.get('password')
        
        if not username or not password:
            return Response(
                {'error': 'Por favor, ingrese usuario y contraseña'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if not re.match(r'^[a-zA-Z0-9]+$', username):
            return Response(
                {'error': 'El usuario solo puede contener letras mayúsculas, minúsculas y números'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if CustomUser.objects.filter(username=username).exists():
            return Response(
                {'error': 'El usuario ya existe'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            user = CustomUser.objects.create_user(username=username, password=password)
            return Response(
                {'message': 'Usuario registrado exitosamente'}, 
                status=status.HTTP_201_CREATED
            )
        except Exception as e:
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_400_BAD_REQUEST
            )

class CheckAuthView(views.APIView):
    permission_classes = [AllowAny]
    
    def get(self, request):
        session_key = request.COOKIES.get('sessionid')
        manual_session_key = request.query_params.get('session_key')
        
        print("Verificando autenticación para usuario:", 
              request.user.username if request.user.is_authenticated else "No autenticado")
        print("Sesión activa:", bool(request.session.session_key))
        print("Session key de cookie:", session_key)
        print("Session key manual:", manual_session_key)
        print("Cookies recibidas:", request.COOKIES)
        
        if not request.user.is_authenticated and manual_session_key:
            from django.contrib.sessions.models import Session
            try:
                session = Session.objects.get(session_key=manual_session_key)
                from django.contrib.sessions.backends.db import SessionStore
                session_data = SessionStore(session_key=manual_session_key)
                uid = session_data.get('_auth_user_id')
                
                if uid:
                    from django.contrib.auth import get_user_model
                    User = get_user_model()
                    user = User.objects.get(pk=uid)
                    login(request, user)
                    print(f"Sesión restaurada manualmente para: {user.username}")
            except (Session.DoesNotExist, User.DoesNotExist, Exception) as e:
                print(f"Error al restaurar sesión: {str(e)}")
        
        status_code = status.HTTP_200_OK
        
        if request.user.is_authenticated:
            response_data = {
                'isAuthenticated': True,
                'username': request.user.username,
                'user_id': request.user.id,
                'session_id': request.session.session_key,
                'is_staff': request.user.is_staff,
                'is_superuser': request.user.is_superuser
            }
            
            response = Response(response_data, status=status_code)
            response.set_cookie(
                key='sessionid',
                value=request.session.session_key,
                httponly=False,
                samesite='Lax',
                secure=False,
                max_age=86400,
                path='/'
            )
            return response
        else:
            response_data = {
                'isAuthenticated': False,
                'cookies_received': bool(request.COOKIES),
                'session_key_present': bool(request.session.session_key),
                'debug_info': {
                    'cookies': request.COOKIES,
                    'session_key': request.session.session_key
                }
            }
        
            return Response(response_data, status=status_code)

class VideoList(generics.ListCreateAPIView):
    permission_classes = [AllowAny]
    queryset = Video.objects.all().order_by('-created_at')
    serializer_class = VideoSerializer

class VideoDetail(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [AllowAny]
    queryset = Video.objects.all()
    serializer_class = VideoSerializer

class VideoSearch(generics.ListAPIView):
    permission_classes = [AllowAny]
    serializer_class = VideoSerializer

    def get_queryset(self):
        query = self.request.query_params.get('query', '')
        if query:
            return Video.objects.filter(title__icontains=query)
        return Video.objects.none()

class QuestionnaireList(generics.ListCreateAPIView):
    permission_classes = [AllowAny]
    serializer_class = QuestionnaireSerializer
    
    def get_queryset(self):
        return Questionnaire.objects.all().order_by('-created_at')
    
    def create(self, request, *args, **kwargs):
        data = {
            'title': request.data.get('title', ''),
            'questions': []
        }
        
        if 'questions' in request.data and isinstance(request.data['questions'], str):
            import json
            try:
                questions_list = json.loads(request.data['questions'])
                data['questions'] = questions_list
            except json.JSONDecodeError as e:
                return Response(
                    {'error': 'Formato de preguntas inválido'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        serializer = QuestionnaireCreateSerializer(data=data)
        if serializer.is_valid():
            try:
                with transaction.atomic():
                    questionnaire = Questionnaire.objects.create(
                        title=serializer.validated_data['title']
                    )
                    
                    for q_data in serializer.validated_data['questions']:
                        question = Question.objects.create(
                            questionnaire=questionnaire,
                            question_text=q_data['question']
                        )
                        
                        for i, option_text in enumerate(q_data['options']):
                            correct = str(q_data['correctOption']) == str(i+1)
                            Option.objects.create(
                                question=question,
                                option_text=option_text,
                                is_correct=correct
                            )
                    
                    return Response(
                        QuestionnaireSerializer(questionnaire).data, 
                        status=status.HTTP_201_CREATED
                    )
            except Exception as e:
                return Response(
                    {'error': str(e)}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class QuestionnaireDetail(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [AllowAny]
    queryset = Questionnaire.objects.all()
    serializer_class = QuestionnaireSerializer

    def update(self, request, *args, **kwargs):
        data = {
            'title': request.data.get('title', ''),
            'questions': []
        }
        
        if 'questions' in request.data and isinstance(request.data['questions'], str):
            import json
            try:
                questions_list = json.loads(request.data['questions'])
                data['questions'] = questions_list
            except json.JSONDecodeError as e:
                return Response(
                    {'error': 'Formato de preguntas inválido'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
                
        serializer = QuestionnaireCreateSerializer(data=data)
        if serializer.is_valid():
            try:
                with transaction.atomic():
                    questionnaire = self.get_object()
                    questionnaire.title = serializer.validated_data['title']
                    questionnaire.save()
                    
                    questionnaire.questions.all().delete()
                    
                    for q_data in serializer.validated_data['questions']:
                        question = Question.objects.create(
                            questionnaire=questionnaire,
                            question_text=q_data['question']
                        )
                        
                        for i, option_text in enumerate(q_data['options']):
                            correct = str(q_data['correctOption']) == str(i+1)
                            Option.objects.create(
                                question=question,
                                option_text=option_text,
                                is_correct=correct
                            )
                    
                    return Response(QuestionnaireSerializer(questionnaire).data)
            except Exception as e:
                return Response(
                    {'error': str(e)}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class QuestionnaireSearch(generics.ListAPIView):
    permission_classes = [AllowAny]
    serializer_class = QuestionnaireSerializer

    def get_queryset(self):
        query = self.request.query_params.get('query', '')
        if query:
            return Questionnaire.objects.filter(title__icontains=query)
        return Questionnaire.objects.none()

class SubmitQuestionnaire(views.APIView):
    permission_classes = [AllowAny]
    
    def post(self, request, pk):
        try:
            questionnaire = Questionnaire.objects.get(pk=pk)
        except Questionnaire.DoesNotExist:
            return Response(
                {'error': 'El cuestionario no existe'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        user_id = request.data.get('user_id')
        
        if not user_id:
            return Response(
                {'error': 'Se requiere un ID de usuario para realizar el cuestionario'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            user = CustomUser.objects.get(pk=user_id)
        except CustomUser.DoesNotExist:
            return Response(
                {'error': 'Usuario no encontrado'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        attempts_count = UserAttempt.objects.filter(user=user, questionnaire=questionnaire).count()
        if attempts_count >= 2:
            return Response(
                {'error': 'Has alcanzado el límite de intentos para este cuestionario'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        user_answers = []
        if 'answers' in request.data and isinstance(request.data['answers'], str):
            import json
            try:
                user_answers = json.loads(request.data['answers'])
            except json.JSONDecodeError:
                return Response(
                    {'error': 'Formato de respuestas inválido'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
        else:
            user_answers = request.data.get('answers', [])
        
        correct_answers = 0
        for answer in user_answers:
            question_id = answer.get('question_id')
            option_id = answer.get('option_id')
            
            try:
                option = Option.objects.get(id=option_id, question_id=question_id)
                if option.is_correct:
                    correct_answers += 1
            except Option.DoesNotExist:
                pass
        
        score = 2
        if correct_answers == 1:
            score = 3
        elif correct_answers == 2:
            score = 4
        elif correct_answers == 3:
            score = 5
        
        attempt = UserAttempt.objects.create(
            user=user,
            questionnaire=questionnaire,
            score=score
        )
        
        return Response({
            'correct_answers': correct_answers,
            'total_questions': 3,
            'score': score,
            'attempts_left': 2 - (attempts_count + 1)
        }, status=status.HTTP_201_CREATED)

class UserAttemptsList(views.APIView):
    permission_classes = [AllowAny]
    
    def get(self, request):
        user_id = request.query_params.get('user_id')
        
        if not user_id:
            return Response(
                {'error': 'Se requiere un ID de usuario para ver los intentos'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            user = CustomUser.objects.get(pk=user_id)
        except CustomUser.DoesNotExist:
            return Response(
                {'error': 'Usuario no encontrado'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        attempts = UserAttempt.objects.filter(user=user).order_by('-attempt_date')
        
        best_scores = {}
        for attempt in attempts:
            questionnaire_id = attempt.questionnaire.id
            if questionnaire_id not in best_scores or attempt.score > best_scores[questionnaire_id]['score']:
                best_scores[questionnaire_id] = {
                    'id': questionnaire_id,
                    'title': attempt.questionnaire.title,
                    'score': attempt.score,
                    'attempts': UserAttempt.objects.filter(
                        user=user, 
                        questionnaire=attempt.questionnaire
                    ).count()
                }
        
        return Response(list(best_scores.values()))

class AllUserAttempts(views.APIView):
    permission_classes = [AllowAny]
    
    def get(self, request):
        attempts = UserAttempt.objects.all().order_by('-score', '-attempt_date')
        
        results = []
        for attempt in attempts:
            results.append({
                'id': attempt.id,
                'user_id': attempt.user.id,
                'username': attempt.user.username,
                'questionnaire_id': attempt.questionnaire.id,
                'questionnaire_title': attempt.questionnaire.title,
                'score': attempt.score,
                'attempt_date': attempt.attempt_date.strftime("%Y-%m-%d %H:%M:%S")
            })
        
        return Response(results)

class DoubtList(generics.ListCreateAPIView):
    permission_classes = [AllowAny]
    queryset = Doubt.objects.all().order_by('-created_at')
    serializer_class = DoubtSerializer

    def perform_create(self, serializer):
        if self.request.user.is_authenticated:
            serializer.save(user=self.request.user)
        else:
            serializer.save()

class DoubtDetail(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [AllowAny]
    queryset = Doubt.objects.all()
    serializer_class = DoubtSerializer

    def check_object_permissions(self, request, obj):
        if request.method in ['PUT', 'DELETE']:
            if request.user.is_authenticated and obj.user and obj.user.id != request.user.id and not request.user.is_staff:
                self.permission_denied(request, message='No tienes permiso para modificar esta duda')

class AnswerDoubt(generics.UpdateAPIView):
    permission_classes = [AllowAny]
    queryset = Doubt.objects.all()
    serializer_class = DoubtSerializer

    def update(self, request, *args, **kwargs):
        doubt = self.get_object()
        answer = request.data.get('answer', '')
        if not answer:
            return Response(
                {'error': 'La respuesta no puede estar vacía'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
            
        doubt.answer = answer
        doubt.save()
        
        serializer = self.get_serializer(doubt)
        return Response(serializer.data)

class DoubtSearch(generics.ListAPIView):
    permission_classes = [AllowAny]
    serializer_class = DoubtSerializer

    def get_queryset(self):
        query = self.request.query_params.get('query', '')
        if query:
            return Doubt.objects.filter(
                title__icontains=query
            ) | Doubt.objects.filter(
                description__icontains=query
            ).distinct()
        return Doubt.objects.none()

class EvaluationList(generics.ListCreateAPIView):
    permission_classes = [AllowAny]
    queryset = Evaluation.objects.all().order_by('-created_at')
    serializer_class = EvaluationSerializer

    def list(self, request, *args, **kwargs):
        evaluations = self.get_queryset()
        serializer = self.get_serializer(evaluations, many=True)
        
        avg_rating = evaluations.aggregate(Avg('rating'))['rating__avg']
        count = evaluations.count()
        
        return Response({
            'evaluations': serializer.data,
            'average': round(avg_rating, 1) if avg_rating else 0,
            'count': count
        })

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            if request.user.is_authenticated:
                evaluation = serializer.save(user=request.user)
            else:
                evaluation = serializer.save()
                
            avg_rating = Evaluation.objects.aggregate(Avg('rating'))['rating__avg']
            count = Evaluation.objects.count()
            
            return Response({
                'evaluation': serializer.data,
                'average': round(avg_rating, 1) if avg_rating else 0,
                'count': count
            }, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class EvaluationDetail(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [AllowAny]
    queryset = Evaluation.objects.all()
    serializer_class = EvaluationSerializer

    def check_object_permissions(self, request, obj):
        if request.method in ['PUT', 'DELETE']:
            if request.user.is_authenticated and obj.user and obj.user.id != request.user.id and not request.user.is_staff:
                self.permission_denied(request, message='No tienes permiso para modificar esta evaluación')

    def update(self, request, *args, **kwargs):
        response = super().update(request, *args, **kwargs)
        
        avg_rating = Evaluation.objects.aggregate(Avg('rating'))['rating__avg']
        count = Evaluation.objects.count()
        
        return Response({
            'evaluation': response.data,
            'average': round(avg_rating, 1) if avg_rating else 0,
            'count': count
        })

    def destroy(self, request, *args, **kwargs):
        super().destroy(request, *args, **kwargs)
        
        avg_rating = Evaluation.objects.aggregate(Avg('rating'))['rating__avg']
        count = Evaluation.objects.count()
        
        return Response({
            'average': round(avg_rating, 1) if avg_rating else 0,
            'count': count
        }, status=status.HTTP_200_OK)

@api_view(['GET'])
def api_root(request, format=None):
    return Response({
        'login': reverse('login', request=request, format=format),
        'register': reverse('register', request=request, format=format),
        'logout': reverse('logout', request=request, format=format),
        'check-auth': reverse('check-auth', request=request, format=format),
        'videos': reverse('video-list', request=request, format=format),
        'questionnaires': reverse('questionnaire-list', request=request, format=format),
        'doubts': reverse('doubt-list', request=request, format=format),
        'evaluations': reverse('evaluation-list', request=request, format=format),
    })
