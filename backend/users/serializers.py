from rest_framework import serializers
from .models import *
from django.conf import settings
from django.contrib.auth import get_user_model, authenticate
from datetime import timedelta
User = get_user_model()

class AppointmentSerializer(serializers.ModelSerializer):
    user = serializers.StringRelatedField(read_only=True) 

    class Meta:
        model = Appointment
        fields = [
            'id',
            'user',
            'date',
            'time',
            'service',
            'other_concern',
            'status',
            'created_at',
        ]
        
    def validate(self, data):
        if not data.get('service') and not data.get('other_concern'):
            raise serializers.ValidationError("Either service or other_concern must be provided.")
        if data.get('service') and data.get('other_concern'):
            raise serializers.ValidationError("Choose only one: service or other_concern.")
        return data


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField()
    def to_representation(self, instance):
        ret = super().to_representation(instance)
        ret.pop('password', None)
        return ret

class RegisterSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'password')
        extra_kwargs = {'password': {'write_only':True}}

    def create(self, validated_data):
        user = User.objects.create_user(**validated_data)
        return user