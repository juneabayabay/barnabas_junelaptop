from rest_framework import serializers
from .models import *
from django.conf import settings
from django.contrib.auth import get_user_model, authenticate
from datetime import timedelta, date, datetime
from django.utils import timezone

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'firstname', 'lastname', 'middlename', 
                  'phone_number', 'role', 'is_staff', 'is_superuser', 'full_name', 
                  'profile_picture', 'date_joined']
        read_only_fields = ['id', 'date_joined']
    
    def get_full_name(self, obj):
        return obj.full_name


class PatientRecordSerializer(serializers.ModelSerializer):
    user_details = UserSerializer(source='user', read_only=True)
    
    class Meta:
        model = PatientRecord
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']


class AppointmentSerializer(serializers.ModelSerializer):
    user_username = serializers.ReadOnlyField(source='user.username')
    user_email = serializers.ReadOnlyField(source='user.email')
    formatted_date = serializers.SerializerMethodField()
    formatted_time = serializers.SerializerMethodField()
    time_until_expiry = serializers.SerializerMethodField()
    dentist_name = serializers.SerializerMethodField()
    
    class Meta:
        model = Appointment
        fields = [
            'id', 'user', 'user_username', 'user_email', 'dentist', 'dentist_name',
            'date', 'time', 'service', 'other_concern', 'status', 'pencil_expires_at',
            'waitlist_position', 'ai_suggestion', 'urgency_level', 'notes', 'prescription',
            'created_at', 'updated_at', 'formatted_date', 'formatted_time', 'time_until_expiry'
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
    
    def get_dentist_name(self, obj):
        if obj.dentist:
            return obj.dentist.full_name
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
        
        return data
    
    def create(self, validated_data):
    # Don't override status if it's already set
        if 'status' not in validated_data:
            validated_data['status'] = 'pending'
        return super().create(validated_data)


class InvoiceItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = InvoiceItem
        fields = ['id', 'description', 'quantity', 'unit_price', 'total']


class InvoiceSerializer(serializers.ModelSerializer):
    items = InvoiceItemSerializer(many=True, read_only=True)
    user_details = UserSerializer(source='user', read_only=True)
    balance_due = serializers.ReadOnlyField()
    
    class Meta:
        model = Invoice
        fields = '__all__'
        read_only_fields = ['id', 'invoice_number', 'created_at', 'updated_at', 'balance_due']


class PaymentSerializer(serializers.ModelSerializer):
    user_details = UserSerializer(source='user', read_only=True)
    processed_by_details = UserSerializer(source='processed_by', read_only=True)
    
    class Meta:
        model = Payment
        fields = '__all__'
        read_only_fields = ['id', 'payment_date']


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


class AuditLogSerializer(serializers.ModelSerializer):
    user_details = UserSerializer(source='user', read_only=True)
    
    class Meta:
        model = AuditLog
        fields = '__all__'
        read_only_fields = ['id', 'timestamp']

class NotificationPreferenceSerializer(serializers.ModelSerializer):
    class Meta:
        model = NotificationPreference
        exclude = ['id', 'user', 'created_at', 'updated_at']
        read_only_fields = ['created_at', 'updated_at']


class NotificationSerializer(serializers.ModelSerializer):
    user_details = UserSerializer(source='user', read_only=True)
    time_ago = serializers.SerializerMethodField()
    
    class Meta:
        model = Notification
        fields = [
            'id', 'user', 'user_details', 'notification_type', 'title', 'message',
            'priority', 'channel', 'is_read', 'read_at', 'is_sent', 'sent_at',
            'action_url', 'action_data', 'related_appointment', 'related_invoice',
            'related_payment', 'expires_at', 'created_at', 'updated_at', 'time_ago'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'sent_at', 'read_at']
    
    def get_time_ago(self, obj):
        from django.utils.timesince import timesince
        return timesince(obj.created_at)
    
    def create(self, validated_data):
        validated_data['is_sent'] = True
        validated_data['sent_at'] = timezone.now()
        return super().create(validated_data)


