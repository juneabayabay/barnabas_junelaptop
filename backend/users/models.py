# models.py
from django.db import models
from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin, BaseUserManager
from django_rest_passwordreset.signals import reset_password_token_created
from django.dispatch import receiver
from django.urls import reverse 
from django.template.loader import render_to_string
from django.core.mail import EmailMultiAlternatives
from django.utils.html import strip_tags
from django.conf import settings
from django.utils import timezone
from datetime import timedelta
import uuid
from celery import shared_task
from django.core.mail import send_mail
from .ai_service import AIDentalScheduler


User = settings.AUTH_USER_MODEL


    
class CustomUserManager(BaseUserManager):
    def create_user(self, username, email, password=None, **extra_fields):
        if not username:
            raise ValueError("Username is required")
        if not email:
            raise ValueError("Email is required")
        email = self.normalize_email(email)
        user = self.model(username=username, email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, username, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        return self.create_user(username, email, password, **extra_fields)

class CustomUser(AbstractBaseUser, PermissionsMixin):
    username = models.CharField(max_length=150, unique=True)
    firstname = models.CharField(max_length=150, null=True, blank=True)
    middlename = models.CharField(max_length=150, null=True, blank=True)
    lastname = models.CharField(max_length=150, null=True, blank=True)
    email = models.EmailField(unique=True)
    birthday = models.DateField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)

    objects = CustomUserManager()

    # Primary identifier for Django admin login
    USERNAME_FIELD = "username"
    REQUIRED_FIELDS = ["email"]  # superuser creation will ask for email too

    def __str__(self):
        return self.username or self.email

@receiver(reset_password_token_created)
def password_reset_token_created(reset_password_token, *args, **kwargs):
    sitelink = 'http://localhost:5173/'
    token = '{}'.format(reset_password_token.key)
    full_link = str(sitelink)+str('password_reset/')+str(token)

    print(full_link)
    print(token)

    context = {
        'full_link': full_link,
        'email_address': reset_password_token.user.email
    }
    html_message = render_to_string('backend/email.html', context=context)
    plain_message = strip_tags(html_message)

    msg = EmailMultiAlternatives(
        subject = 'request for resetting password for {title}'.format(title=reset_password_token.user.email),
        body=plain_message,
        from_email = 'sender@example.com',
        to=[reset_password_token.user.email]
    )
    msg.attach_alternative(html_message, 'text/html')
    msg.send()

# models.py

class Appointment(models.Model):
    STATUS_CHOICES = [
        ('pencil', 'Pencil Booking'),
        ('pending', 'Pending'),
        ('confirmed', 'Confirmed'),
        ('cancelled', 'Cancelled'),
        ('completed', 'Completed'),
        ('waiting', 'Waiting List'),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='appointments'
    )
    date = models.DateField()
    time = models.TimeField()
    service = models.CharField(max_length=255, blank=True, null=True)
    other_concern = models.CharField(max_length=255, blank=True, null=True)
    status = models.CharField(
        max_length=10,
        choices=STATUS_CHOICES,
        default='pending'
    )
    pencil_expires_at = models.DateTimeField(null=True, blank=True)
    waitlist_position = models.IntegerField(null=True, blank=True)
    ai_suggestion = models.TextField(blank=True, null=True)
    preferred_time = models.CharField(max_length=50, blank=True, null=True)
    urgency_level = models.IntegerField(
        default=1, 
        choices=[(1, 'Low'), (2, 'Medium'), (3, 'High')]
    )
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['date', 'time']
        indexes = [
            models.Index(fields=['user', 'date', 'status']),
            models.Index(fields=['date', 'time', 'status']),
            models.Index(fields=['status', 'waitlist_position']),
        ]

    def __str__(self):
        return f"{self.user.username} - {self.date} {self.time} ({self.status})"

class Waitlist(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='waitlist_entries'
    )
    preferred_date = models.DateField()
    preferred_time_start = models.TimeField()
    preferred_time_end = models.TimeField()
    service_needed = models.CharField(max_length=255)
    urgency_level = models.IntegerField(
        choices=[(1, 'Low'), (2, 'Medium'), (3, 'High')],
        default=1
    )
    status = models.CharField(
        max_length=20, 
        default='active',
        choices=[('active', 'Active'), ('notified', 'Notified'), ('booked', 'Booked')]
    )
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-urgency_level', 'created_at']
        indexes = [
            models.Index(fields=['status', 'urgency_level']),
            models.Index(fields=['preferred_date', 'status']),
        ]

    def __str__(self):
        return f"{self.user.username} - {self.preferred_date} (Urgency: {self.get_urgency_level_display()})"

class AISuggestion(models.Model):
    SUGGESTION_TYPES = [
        ('time_optimization', 'Time Optimization'),
        ('service_recommendation', 'Service Recommendation'),
        ('cancellation_risk', 'Cancellation Risk'),
        ('trending_services', 'Trending Services'),
        ('waitlist_opportunity', 'Waitlist Opportunity'),
        ('reminder', 'Reminder'),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='ai_suggestions'
    )
    suggestion_type = models.CharField(max_length=50, choices=SUGGESTION_TYPES)
    title = models.CharField(max_length=255)
    description = models.TextField()
    priority = models.IntegerField(default=1)
    is_read = models.BooleanField(default=False)
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-priority', '-created_at']
        indexes = [
            models.Index(fields=['user', 'is_read']),
            models.Index(fields=['suggestion_type', 'created_at']),
        ]

    def __str__(self):
        return f"{self.user.username} - {self.title}"

class BookingReservation(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='reservations'
    )
    token = models.CharField(max_length=100, unique=True)
    date = models.DateField()
    time = models.TimeField()
    service = models.CharField(max_length=255, blank=True, null=True)
    expires_at = models.DateTimeField()
    is_confirmed = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=['token', 'is_confirmed']),
            models.Index(fields=['expires_at']),
        ]

    def __str__(self):
        return f"{self.user.username} - {self.token} ({self.expires_at})"

@shared_task
def expire_pencil_booking(appointment_id):
    """Auto-expire pencil bookings after 15 minutes"""
    try:
        appointment = Appointment.objects.get(id=appointment_id, status='pencil')
        if appointment.pencil_expires_at < timezone.now():
            appointment.status = 'cancelled'
            appointment.save()
            
            # Notify user
            send_mail(
                'Pencil Booking Expired',
                f'Your pencil booking for {appointment.date} at {appointment.time} has expired.',
                'noreply@dentalclinic.com',
                [appointment.user.email],
                fail_silently=True,
            )
    except Appointment.DoesNotExist:
        pass

def generate_all_slots():
    """
    Generate all possible appointment slots for a clinic day.
    Clinic hours: 9:00 AM to 6:00 PM
    Lunch break: 12:00 PM to 1:00 PM
    Slot length: 30 minutes
    """
    from datetime import datetime, time, timedelta

    slots = []
    start_time = datetime.combine(datetime.today(), time(9, 0))
    end_time = datetime.combine(datetime.today(), time(18, 0))

    current = start_time
    while current < end_time:
        # Skip lunch break
        if current.time().hour == 12:
            current += timedelta(hours=1)
            continue

        slots.append({
            "hour": current.time().hour,
            "minute": current.time().minute,
            "time": current.strftime("%H:%M")
        })
        current += timedelta(minutes=30)

    return slots

@shared_task
def check_waitlist_for_slots():
    """Periodically check if waitlist users can be matched with open slots"""
    # Get all available slots for next 7 days
    from datetime import datetime, timedelta
    
    for days_ahead in range(7):
        check_date = timezone.now().date() + timedelta(days=days_ahead)
        
        # Get all appointments for this date
        appointments = Appointment.objects.filter(
            date=check_date,
            status__in=['confirmed', 'pending']
        )
        
        booked_slots = set([(apt.time.hour, apt.time.minute) for apt in appointments])
        all_slots = generate_all_slots()  # Generate all possible slots
        
        available_slots = [slot for slot in all_slots if slot not in booked_slots]
        
        # Check waitlist users
        waitlist_users = Waitlist.objects.filter(
            preferred_date=check_date,
            status='active'
        ).order_by('-urgency_level', 'created_at')
        
        for user in waitlist_users:
            matching_slots = []
            for slot in available_slots:
                slot_time = datetime.strptime(slot['time'], '%H:%M').time()
                if user.preferred_time_start <= slot_time <= user.preferred_time_end:
                    matching_slots.append(slot)
            
            if matching_slots:
                # Notify user
                AISuggestion.objects.create(
                    user=user.user,
                    suggestion_type='waitlist_match',
                    title='Waitlist Match Found!',
                    description=f'A slot has opened on {check_date}. Book now!',
                    priority=user.urgency_level
                )

@shared_task
def generate_ai_recommendations():
    """Generate AI recommendations for all users"""
    users = User.objects.filter(is_active=True)
    
    for user in users:
        user_appointments = Appointment.objects.filter(user=user)
        
        # Generate time optimization suggestion
        patterns = AIDentalScheduler.analyze_booking_patterns(user_appointments)
        if patterns and patterns.get('preferred_time'):
            AISuggestion.objects.create(
                user=user,
                suggestion_type='time_optimization',
                title='Optimal Booking Time',
                description=f"Based on your history, {patterns['preferred_time']}:00 works best for you.",
                priority=1
            )
        
        # Check for upcoming appointments
        upcoming = Appointment.objects.filter(
            user=user,
            date__gt=timezone.now().date(),
            status='pending'
        ).first()
        
        if upcoming:
            risk = AIDentalScheduler.predict_cancellation_risk(upcoming)
            if risk['risk_score'] > 50:
                AISuggestion.objects.create(
                    user=user,
                    suggestion_type='cancellation_risk',
                    title='Appointment Risk Alert',
                    description=f"Your appointment has a {risk['risk_score']}% cancellation risk.",
                    priority=2
                )
