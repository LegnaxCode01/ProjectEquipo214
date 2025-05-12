from django.contrib.auth.models import AbstractUser
from django.db import models

# Create your models here.

class CustomUser(AbstractUser):
    username = models.CharField(max_length=150, unique=True)
    
    groups = models.ManyToManyField(
        'auth.Group',
        related_name='custom_user_set',
        blank=True,
        help_text='The groups this user belongs to. A user will get all permissions granted to each of their groups.',
        verbose_name='groups',
    )
    user_permissions = models.ManyToManyField(
        'auth.Permission',
        related_name='custom_user_set',
        blank=True,
        help_text='Specific permissions for this user.',
        verbose_name='user permissions',
    )
    
    def __str__(self):
        return self.username

class Video(models.Model):
    title = models.CharField(max_length=255)
    url = models.URLField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return self.title

class Questionnaire(models.Model):
    title = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return self.title

class Question(models.Model):
    questionnaire = models.ForeignKey(Questionnaire, related_name='questions', on_delete=models.CASCADE)
    question_text = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return self.question_text

class Option(models.Model):
    question = models.ForeignKey(Question, related_name='options', on_delete=models.CASCADE)
    option_text = models.CharField(max_length=255)
    is_correct = models.BooleanField(default=False)
    
    def __str__(self):
        return self.option_text

class UserAttempt(models.Model):
    user = models.ForeignKey(CustomUser, related_name='attempts', on_delete=models.CASCADE)
    questionnaire = models.ForeignKey(Questionnaire, related_name='attempts', on_delete=models.CASCADE)
    score = models.IntegerField(default=0)
    attempt_date = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = [['user', 'questionnaire', 'attempt_date']]

class Doubt(models.Model):
    title = models.CharField(max_length=255)
    description = models.TextField()
    answer = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    user = models.ForeignKey(CustomUser, related_name='doubts', on_delete=models.CASCADE, null=True, blank=True)
    
    def __str__(self):
        return self.title

class Evaluation(models.Model):
    rating = models.IntegerField()
    comment = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    user = models.ForeignKey(CustomUser, related_name='evaluations', on_delete=models.CASCADE, null=True, blank=True)
    
    def __str__(self):
        return f"Evaluación {self.rating}/5 - {self.created_at.strftime('%d/%m/%Y')}"
