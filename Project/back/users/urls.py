from django.urls import path
from rest_framework.routers import DefaultRouter
from rest_framework.documentation import include_docs_urls
from . import views

urlpatterns = [
    path('', views.api_root, name='api-root'),
    path('login/', views.LoginView.as_view(), name='login'),
    path('register/', views.RegisterView.as_view(), name='register'),
    path('logout/', views.LogoutView.as_view(), name='logout'),
    path('check-auth/', views.CheckAuthView.as_view(), name='check-auth'),
    path('videos/', views.VideoList.as_view(), name='video-list'),
    path('videos/search/', views.VideoSearch.as_view(), name='video-search'),
    path('videos/<int:pk>/', views.VideoDetail.as_view(), name='video-detail'),
    # URLs para cuestionarios
    path('questionnaires/', views.QuestionnaireList.as_view(), name='questionnaire-list'),
    path('questionnaires/search/', views.QuestionnaireSearch.as_view(), name='questionnaire-search'),
    path('questionnaires/<int:pk>/', views.QuestionnaireDetail.as_view(), name='questionnaire-detail'),
    path('questionnaires/<int:pk>/submit/', views.SubmitQuestionnaire.as_view(), name='submit-questionnaire'),
    path('user/attempts/', views.UserAttemptsList.as_view(), name='user-attempts'),
    path('all-attempts/', views.AllUserAttempts.as_view(), name='all-user-attempts'),
    # URLs para dudas
    path('doubts/', views.DoubtList.as_view(), name='doubt-list'),
    path('doubts/search/', views.DoubtSearch.as_view(), name='doubt-search'),
    path('doubts/<int:pk>/', views.DoubtDetail.as_view(), name='doubt-detail'),
    path('doubts/<int:pk>/answer/', views.AnswerDoubt.as_view(), name='answer-doubt'),
    # URLs para evaluaciones
    path('evaluations/', views.EvaluationList.as_view(), name='evaluation-list'),
    path('evaluations/<int:pk>/', views.EvaluationDetail.as_view(), name='evaluation-detail'),
]