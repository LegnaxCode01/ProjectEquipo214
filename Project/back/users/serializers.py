from rest_framework import serializers
from .models import Video, CustomUser, Questionnaire, Question, Option, UserAttempt, Doubt, Evaluation

class VideoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Video
        fields = ['id', 'title', 'url', 'created_at', 'updated_at']

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomUser
        fields = ['id', 'username']

class OptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Option
        fields = ['id', 'option_text', 'is_correct']

class QuestionSerializer(serializers.ModelSerializer):
    options = OptionSerializer(many=True, read_only=True)
    
    class Meta:
        model = Question
        fields = ['id', 'question_text', 'options']

class QuestionnaireSerializer(serializers.ModelSerializer):
    questions = QuestionSerializer(many=True, read_only=True)
    
    class Meta:
        model = Questionnaire
        fields = ['id', 'title', 'created_at', 'updated_at', 'questions']

class UserAttemptSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserAttempt
        fields = ['id', 'user', 'questionnaire', 'score', 'attempt_date']

class QuestionnaireCreateSerializer(serializers.Serializer):
    title = serializers.CharField(max_length=255)
    questions = serializers.ListField(
        min_length=1
    )
    
    def validate_questions(self, value):
        # Validar que cada pregunta tiene los campos necesarios
        validated_questions = []
        
        for i, question in enumerate(value):
            errors = []
            
            if not isinstance(question, dict):
                raise serializers.ValidationError(f'La pregunta {i+1} debe ser un objeto, no {type(question)}')
                
            if 'question' not in question:
                errors.append(f'La pregunta {i+1} no tiene el campo "question"')
                
            if 'options' not in question:
                errors.append(f'La pregunta {i+1} no tiene el campo "options"')
            elif not isinstance(question['options'], list):
                errors.append(f'Las opciones de la pregunta {i+1} deben ser una lista')
            elif len(question['options']) < 2:
                errors.append(f'La pregunta {i+1} debe tener al menos 2 opciones')
                
            if 'correctOption' not in question:
                errors.append(f'La pregunta {i+1} no tiene el campo "correctOption"')
            else:
                try:
                    correct_option = int(question['correctOption'])
                    if 'options' in question and isinstance(question['options'], list):
                        if correct_option < 1 or correct_option > len(question['options']):
                            errors.append(
                                f'La opción correcta de la pregunta {i+1} debe ser un número entre 1 y {len(question["options"])}')
                except (ValueError, TypeError):
                    errors.append(f'La opción correcta de la pregunta {i+1} debe ser un número')
            
            if errors:
                raise serializers.ValidationError(errors)
            
            validated_questions.append(question)
                    
        return validated_questions

class DoubtSerializer(serializers.ModelSerializer):
    username = serializers.SerializerMethodField()
    
    class Meta:
        model = Doubt
        fields = ['id', 'title', 'description', 'answer', 'created_at', 'updated_at', 'user', 'username']
    
    def get_username(self, obj):
        if obj.user:
            return obj.user.username
        return None

class EvaluationSerializer(serializers.ModelSerializer):
    username = serializers.SerializerMethodField()
    date = serializers.SerializerMethodField()
    
    class Meta:
        model = Evaluation
        fields = ['id', 'rating', 'comment', 'created_at', 'updated_at', 'user', 'username', 'date']
    
    def get_username(self, obj):
        if obj.user:
            return obj.user.username
        return None
        
    def get_date(self, obj):
        return obj.created_at.strftime('%d/%m/%Y') 