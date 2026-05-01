from django.db import models
from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin, BaseUserManager
from django_rest_passwordreset.signals import reset_password_token_created
from django.dispatch import receiver
from django.template.loader import render_to_string
from django.core.mail import EmailMultiAlternatives
from django.utils.html import strip_tags
from django.conf import settings
from django.utils import timezone
from datetime import timedelta
import uuid


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
    # User Roles
    ROLE_CHOICES = [
        ('patient', 'Patient'),
        ('staff', 'Staff'),
        ('dentist', 'Dentist'),
        ('admin', 'Admin'),
    ]
    
    username = models.CharField(max_length=150, unique=True)
    firstname = models.CharField(max_length=150, null=True, blank=True)
    middlename = models.CharField(max_length=150, null=True, blank=True)
    lastname = models.CharField(max_length=150, null=True, blank=True)
    email = models.EmailField(unique=True)
    birthday = models.DateField(null=True, blank=True)
    phone_number = models.CharField(max_length=20, null=True, blank=True)
    address = models.TextField(null=True, blank=True)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='patient')
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    profile_picture = models.ImageField(upload_to='profile_pics/', null=True, blank=True)
    date_joined = models.DateTimeField(auto_now_add=True)
    last_login = models.DateTimeField(null=True, blank=True)

    objects = CustomUserManager()
    USERNAME_FIELD = "username"
    REQUIRED_FIELDS = ["email"]

    def __str__(self):
        return f"{self.username} ({self.get_role_display()})"
    
    @property
    def full_name(self):
        return f"{self.firstname} {self.lastname}".strip() or self.username


@receiver(reset_password_token_created)
def password_reset_token_created(reset_password_token, *args, **kwargs):
    sitelink = 'http://localhost:5173/'
    token = '{}'.format(reset_password_token.key)
    full_link = str(sitelink) + str('password_reset/') + str(token)

    context = {
        'full_link': full_link,
        'email_address': reset_password_token.user.email
    }
    html_message = render_to_string('backend/email.html', context=context)
    plain_message = strip_tags(html_message)

    msg = EmailMultiAlternatives(
        subject=f'Password Reset Request for {reset_password_token.user.email}',
        body=plain_message,
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=[reset_password_token.user.email]
    )
    msg.attach_alternative(html_message, 'text/html')
    msg.send()


class PatientRecord(models.Model):
    BLOOD_TYPE_CHOICES = [
        ('A+', 'A+'), ('A-', 'A-'), ('B+', 'B+'), ('B-', 'B-'),
        ('AB+', 'AB+'), ('AB-', 'AB-'), ('O+', 'O+'), ('O-', 'O-'),
    ]
    
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='patient_record')
    blood_type = models.CharField(max_length=3, choices=BLOOD_TYPE_CHOICES, null=True, blank=True)
    allergies = models.TextField(blank=True, null=True, help_text="List any allergies")
    medical_conditions = models.TextField(blank=True, null=True, help_text="List any medical conditions")
    medications = models.TextField(blank=True, null=True, help_text="Current medications")
    emergency_contact_name = models.CharField(max_length=200, blank=True, null=True)
    emergency_contact_phone = models.CharField(max_length=20, blank=True, null=True)
    emergency_contact_relation = models.CharField(max_length=50, blank=True, null=True)
    insurance_provider = models.CharField(max_length=100, blank=True, null=True)
    insurance_number = models.CharField(max_length=100, blank=True, null=True)
    dental_history = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"Record for {self.user.full_name}"


class Appointment(models.Model):
    STATUS_CHOICES = [
        ('pencil', 'Pencil Booking'),
        ('pending', 'Pending'),
        ('confirmed', 'Confirmed'),
        ('cancelled', 'Cancelled'),
        ('completed', 'Completed'),
        ('waiting', 'Waiting List'),
        ('no_show', 'No Show'),
    ]
    
    SERVICE_CHOICES = [
        ('consultation', 'Consultation'),
        ('teeth_cleaning', 'Teeth Cleaning'),
        ('tooth_extraction', 'Tooth Extraction'),
        ('dental_filling', 'Dental Filling'),
        ('orthodontic', 'Orthodontic Procedure'),
        ('root_canal', 'Root Canal Treatment'),
        ('dental_implant', 'Dental Implant'),
        ('teeth_whitening', 'Teeth Whitening'),
    ]

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='appointments')
    dentist = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='assigned_appointments')
    date = models.DateField()
    time = models.TimeField()
    service = models.CharField(max_length=50, choices=SERVICE_CHOICES, blank=True, null=True)
    other_concern = models.CharField(max_length=255, blank=True, null=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    pencil_expires_at = models.DateTimeField(null=True, blank=True)
    waitlist_position = models.IntegerField(null=True, blank=True)
    ai_suggestion = models.TextField(blank=True, null=True)
    urgency_level = models.IntegerField(default=1, choices=[(1, 'Low'), (2, 'Medium'), (3, 'High')])
    notes = models.TextField(blank=True, null=True)
    prescription = models.TextField(blank=True, null=True)
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


class Service(models.Model):
    name = models.CharField(max_length=100)
    description = models.TextField()
    duration_minutes = models.IntegerField()
    base_price = models.DecimalField(max_digits=10, decimal_places=2)
    is_active = models.BooleanField(default=True)
    
    def __str__(self):
        return f"{self.name} - ₱{self.base_price}"


class Invoice(models.Model):
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('sent', 'Sent'),
        ('partial', 'Partially Paid'),
        ('paid', 'Paid'),
        ('overdue', 'Overdue'),
        ('cancelled', 'Cancelled'),
    ]
    
    invoice_number = models.CharField(max_length=50, unique=True)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='invoices')
    appointment = models.OneToOneField(Appointment, on_delete=models.SET_NULL, null=True, blank=True, related_name='invoice')
    issue_date = models.DateField(default=timezone.now)
    due_date = models.DateField()
    subtotal = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    discount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    tax = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    total_amount = models.DecimalField(max_digits=10, decimal_places=2)
    amount_paid = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    @property
    def balance_due(self):
        return self.total_amount - self.amount_paid
    
    @property
    def is_overdue(self):
        return self.due_date < timezone.now().date() and self.status not in ['paid', 'cancelled']
    
    def save(self, *args, **kwargs):
        if not self.invoice_number:
            year = timezone.now().year
            count = Invoice.objects.filter(issue_date__year=year).count() + 1
            self.invoice_number = f"INV-{year}-{count:06d}"
        super().save(*args, **kwargs)
    
    def __str__(self):
        return f"{self.invoice_number} - {self.user.full_name} - {self.status}"


class InvoiceItem(models.Model):
    invoice = models.ForeignKey(Invoice, on_delete=models.CASCADE, related_name='items')
    description = models.CharField(max_length=255)
    quantity = models.IntegerField(default=1)
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    total = models.DecimalField(max_digits=10, decimal_places=2)
    
    def save(self, *args, **kwargs):
        self.total = self.quantity * self.unit_price
        super().save(*args, **kwargs)
    
    def __str__(self):
        return f"{self.description} - ₱{self.total}"


class Payment(models.Model):
    PAYMENT_METHOD_CHOICES = [
        ('cash', 'Cash'),
        ('credit_card', 'Credit Card'),
        ('debit_card', 'Debit Card'),
        ('bank_transfer', 'Bank Transfer'),
        ('gcash', 'GCash'),
        ('paymaya', 'PayMaya'),
        ('insurance', 'Insurance'),
    ]
    
    PAYMENT_STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
        ('refunded', 'Refunded'),
    ]
    
    invoice = models.ForeignKey(Invoice, on_delete=models.CASCADE, related_name='payments')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='payments')
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    payment_method = models.CharField(max_length=20, choices=PAYMENT_METHOD_CHOICES)
    reference_number = models.CharField(max_length=100, blank=True, null=True)
    status = models.CharField(max_length=20, choices=PAYMENT_STATUS_CHOICES, default='pending')
    notes = models.TextField(blank=True, null=True)
    payment_date = models.DateTimeField(auto_now_add=True)
    processed_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='processed_payments')
    
    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        if self.status == 'completed':
            # Update invoice amount paid
            total_paid = self.invoice.payments.filter(status='completed').aggregate(models.Sum('amount'))['amount__sum'] or 0
            self.invoice.amount_paid = total_paid
            if self.invoice.amount_paid >= self.invoice.total_amount:
                self.invoice.status = 'paid'
            elif self.invoice.amount_paid > 0:
                self.invoice.status = 'partial'
            self.invoice.save()
    
    def __str__(self):
        return f"Payment for {self.invoice.invoice_number} - ₱{self.amount}"


class Waitlist(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='waitlist_entries')
    preferred_date = models.DateField()
    preferred_time_start = models.TimeField()
    preferred_time_end = models.TimeField()
    service_needed = models.CharField(max_length=255)
    urgency_level = models.IntegerField(choices=[(1, 'Low'), (2, 'Medium'), (3, 'High')], default=1)
    status = models.CharField(max_length=20, default='active', choices=[('active', 'Active'), ('notified', 'Notified'), ('booked', 'Booked')])
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
        ('treatment_plan', 'Treatment Plan'),
        ('follow_up', 'Follow Up'),
    ]

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='ai_suggestions')
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

    def __str__(self):
        return f"{self.user.username} - {self.title}"


class BookingReservation(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='reservations')
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
        return f"{self.user.username} - {self.token}"


class AuditLog(models.Model):
    ACTION_CHOICES = [
        ('create', 'Create'),
        ('update', 'Update'),
        ('delete', 'Delete'),
        ('view', 'View'),
        ('login', 'Login'),
        ('logout', 'Logout'),
    ]
    
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='audit_logs')
    action = models.CharField(max_length=20, choices=ACTION_CHOICES)
    model_name = models.CharField(max_length=100)
    object_id = models.CharField(max_length=100, blank=True, null=True)
    changes = models.JSONField(default=dict, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True, null=True)
    timestamp = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"{self.user} - {self.action} - {self.model_name} at {self.timestamp}"

class Notification(models.Model):
    NOTIFICATION_TYPES = [
        ('appointment_reminder', 'Appointment Reminder'),
        ('appointment_confirmation', 'Appointment Confirmation'),
        ('appointment_cancellation', 'Appointment Cancellation'),
        ('appointment_rescheduled', 'Appointment Rescheduled'),
        ('payment_reminder', 'Payment Reminder'),
        ('payment_confirmation', 'Payment Confirmation'),
        ('invoice_ready', 'Invoice Ready'),
        ('waitlist_notification', 'Waitlist Notification'),
        ('ai_suggestion', 'AI Suggestion'),
        ('promotional', 'Promotional'),
        ('system_alert', 'System Alert'),
    ]
    
    PRIORITY_CHOICES = [
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
        ('urgent', 'Urgent'),
    ]
    
    DELIVERY_CHANNELS = [
        ('email', 'Email'),
        ('sms', 'SMS'),
        ('push', 'Push Notification'),
        ('in_app', 'In-App'),
    ]
    
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='notifications')
    notification_type = models.CharField(max_length=50, choices=NOTIFICATION_TYPES)
    title = models.CharField(max_length=255)
    message = models.TextField()
    priority = models.CharField(max_length=10, choices=PRIORITY_CHOICES, default='medium')
    channel = models.CharField(max_length=10, choices=DELIVERY_CHANNELS, default='in_app')
    
    # Tracking fields
    is_read = models.BooleanField(default=False)
    read_at = models.DateTimeField(null=True, blank=True)
    is_sent = models.BooleanField(default=False)
    sent_at = models.DateTimeField(null=True, blank=True)
    is_delivered = models.BooleanField(default=False)
    delivered_at = models.DateTimeField(null=True, blank=True)
    
    # Action/Deep linking
    action_url = models.CharField(max_length=500, blank=True, null=True)
    action_data = models.JSONField(default=dict, blank=True)
    
    # Related objects
    related_appointment = models.ForeignKey('Appointment', on_delete=models.SET_NULL, null=True, blank=True)
    related_invoice = models.ForeignKey('Invoice', on_delete=models.SET_NULL, null=True, blank=True)
    related_payment = models.ForeignKey('Payment', on_delete=models.SET_NULL, null=True, blank=True)
    
    # Expiry
    expires_at = models.DateTimeField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-priority', '-created_at']
        indexes = [
            models.Index(fields=['user', 'is_read']),
            models.Index(fields=['user', 'created_at']),
            models.Index(fields=['notification_type', 'created_at']),
            models.Index(fields=['is_sent', 'created_at']),
            models.Index(fields=['expires_at']),
        ]
    
    def __str__(self):
        return f"{self.user.username} - {self.title} ({self.notification_type})"
    
    def mark_as_read(self):
        if not self.is_read:
            self.is_read = True
            self.read_at = timezone.now()
            self.save()
    
    @property
    def is_expired(self):
        if self.expires_at:
            return timezone.now() > self.expires_at
        return False


class NotificationPreference(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='notification_preferences')
    
    # Email preferences
    email_appointment_reminders = models.BooleanField(default=True)
    email_payment_notifications = models.BooleanField(default=True)
    email_promotional = models.BooleanField(default=False)
    email_system_alerts = models.BooleanField(default=True)
    
    # SMS preferences
    sms_appointment_reminders = models.BooleanField(default=False)
    sms_payment_notifications = models.BooleanField(default=False)
    
    # Push preferences
    push_appointment_reminders = models.BooleanField(default=True)
    push_waitlist_updates = models.BooleanField(default=True)
    push_ai_suggestions = models.BooleanField(default=True)
    
    # In-app preferences
    in_app_all = models.BooleanField(default=True)
    
    # Quiet hours
    quiet_hours_enabled = models.BooleanField(default=False)
    quiet_hours_start = models.TimeField(null=True, blank=True, default="22:00")
    quiet_hours_end = models.TimeField(null=True, blank=True, default="08:00")
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"Preferences for {self.user.username}"    