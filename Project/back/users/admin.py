from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import CustomUser, Video, Questionnaire, Question, Option, UserAttempt, Doubt, Evaluation

# Register your models here.
admin.site.register(CustomUser, UserAdmin)
admin.site.register(Video)
admin.site.register(Questionnaire)
admin.site.register(Question)
admin.site.register(Option)
admin.site.register(UserAttempt)
admin.site.register(Doubt)
admin.site.register(Evaluation)
