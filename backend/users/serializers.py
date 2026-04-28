from rest_framework import serializers
from .models import *
from django.conf import settings
from django.contrib.auth import get_user_model, authenticate
from datetime import timedelta, date, datetime
User = get_user_model()

# serializers.py
from rest_framework import serializers
from django.utils import timezone
from datetime import datetime, timedelta
from .models import Appointment, Waitlist, AISuggestion, BookingReservation

class AppointmentSerializer(serializers.ModelSerializer):
    user_username = serializers.ReadOnlyField(source='user.username')
    user_email = serializers.ReadOnlyField(source='user.email')
    formatted_date = serializers.SerializerMethodField()
    formatted_time = serializers.SerializerMethodField()
    time_until_expiry = serializers.SerializerMethodField()
    
    class Meta:
        model = Appointment
        fields = [
            'id', 'user', 'user_username', 'user_email', 'date', 'time',
            'service', 'other_concern', 'status', 'pencil_expires_at',
            'waitlist_position', 'ai_suggestion', 'preferred_time',
            'urgency_level', 'notes', 'created_at', 'updated_at',
            'formatted_date', 'formatted_time', 'time_until_expiry'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'pencil_expires_at']
    
    def get_formatted_date(self, obj):
        return obj.date.strftime('%B %d, %Y')
    
    def get_formatted_time(self, obj):
        return obj.time.strftime('%I:%M %p')
    
    def get_time_until_expiry(self, obj):
        if obj.pencil_expires_at and obj.status == 'pencil':
            remaining = (obj.pencil_expires_at - timezone.now()).total_seconds()
            if remaining > 0:
                return int(remaining // 60)
        return None
    
    def validate_date(self, value):
        if value < timezone.now().date():
            raise serializers.ValidationError("Cannot book appointments for past dates")
        return value
    
    def validate(self, data):
        date = data.get('date')
        time = data.get('time')
        service = data.get('service')
        
        if date.weekday() == 6:
            raise serializers.ValidationError({"date": "Clinic is closed on Sundays"})
        
        hour = time.hour
        if hour < 9 or hour >= 18:
            raise serializers.ValidationError({"time": "Clinic hours are 9:00 AM to 6:00 PM"})
        
        if hour == 12:
            raise serializers.ValidationError({"time": "Clinic is closed for lunch from 12:00 PM to 1:00 PM"})
        
        existing_count = Appointment.objects.filter(
            date=date,
            time=time,
            status__in=['pending', 'confirmed', 'pencil']
        ).exclude(id=self.instance.id if self.instance else None).count()
        
        if existing_count >= 2:
            raise serializers.ValidationError({"time": "This time slot is fully booked"})
        
        if service == "Orthodontic Procedure":
            end_time = (datetime.combine(date, time) + timedelta(hours=3)).time()
            
            if time.hour < 12 and end_time.hour > 12:
                raise serializers.ValidationError(
                    {"time": "Orthodontic procedure cannot cross lunch break"}
                )
            
            if end_time.hour > 18 or (end_time.hour == 18 and end_time.minute > 0):
                raise serializers.ValidationError(
                    {"time": "Orthodontic procedure must end by 6:00 PM"}
                )
            
            current_time = time
            for _ in range(6):
                existing = Appointment.objects.filter(
                    date=date,
                    time=current_time,
                    status__in=['pending', 'confirmed', 'pencil']
                ).exclude(id=self.instance.id if self.instance else None).count()
                
                if existing >= 2:
                    raise serializers.ValidationError(
                        {"time": f"Time slot {current_time.strftime('%I:%M %p')} is already booked"}
                    )
                
                current_time = (datetime.combine(date, current_time) + timedelta(minutes=30)).time()
        
        return data
    
    def create(self, validated_data):
        validated_data['status'] = 'pending'
        return super().create(validated_data)

class WaitlistSerializer(serializers.ModelSerializer):
    user_username = serializers.ReadOnlyField(source='user.username')
    position = serializers.SerializerMethodField()
    urgency_display = serializers.SerializerMethodField()
    
    class Meta:
        model = Waitlist
        fields = [
            'id', 'user', 'user_username', 'preferred_date', 
            'preferred_time_start', 'preferred_time_end', 'service_needed',
            'urgency_level', 'urgency_display', 'status', 'position', 'created_at'
        ]
        read_only_fields = ['id', 'created_at', 'status']
    
    def get_position(self, obj):
        return Waitlist.objects.filter(
            preferred_date=obj.preferred_date,
            urgency_level__gt=obj.urgency_level,
            created_at__lt=obj.created_at,
            status='active'
        ).count() + 1
    
    def get_urgency_display(self, obj):
        return dict(Waitlist._meta.get_field('urgency_level').choices).get(obj.urgency_level)

class AISuggestionSerializer(serializers.ModelSerializer):
    class Meta:
        model = AISuggestion
        fields = [
            'id', 'user', 'suggestion_type', 'title', 'description',
            'priority', 'is_read', 'metadata', 'created_at', 'expires_at'
        ]
        read_only_fields = ['id', 'created_at']

class BookingReservationSerializer(serializers.ModelSerializer):
    class Meta:
        model = BookingReservation
        fields = ['id', 'user', 'token', 'date', 'time', 'service', 'expires_at', 'is_confirmed', 'created_at']
        read_only_fields = ['id', 'token', 'created_at']



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