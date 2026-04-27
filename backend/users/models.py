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

class Appointment(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('confirmed', 'Confirmed'),
        ('cancelled', 'Cancelled'),
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
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user.username} - {self.date} {self.time} ({self.status})"


"""
class DentalService(models.Model):
    class DurationType(models.IntegerChoices):
        ONE_HOUR = 60, '1 Hour'
        THREE_HOURS = 180, '3 Hours'

    name = models.CharField(max_length=100)
    slug = models.SlugField(unique=True)
    description = models.TextField(blank=True)
    duration_minutes = models.IntegerField(choices=DurationType.choices, default=DurationType.ONE_HOUR)
    base_price = models.DecimalField(max_digits=10, decimal_places=2)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} ({self.duration_minutes}min)"

    class Meta:
        ordering = ['name']

class PatientProfile(models.Model):
    class BloodType(models.TextChoices):
        A_POS = 'A+', 'A+'
        A_NEG = 'A-', 'A-'
        B_POS = 'B+', 'B+'
        B_NEG = 'B-', 'B-'
        AB_POS = 'AB+', 'AB+'
        AB_NEG = 'AB-', 'AB-'
        O_POS = 'O+', 'O+'
        O_NEG = 'O-', 'O-'
        UNKNOWN = 'Unknown', 'Unknown'

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='patient_profile')
    patient_number = models.CharField(max_length=20, unique=True, blank=True)
    blood_type = models.CharField(max_length=10, choices=BloodType.choices, default=BloodType.UNKNOWN)
    allergies = models.TextField(blank=True)
    medical_history = models.TextField(blank=True)
    emergency_contact_name = models.CharField(max_length=100, blank=True)
    emergency_contact_phone = models.CharField(max_length=20, blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        if not self.patient_number:
            last = PatientProfile.objects.order_by('-created_at').first()
            count = (int(last.patient_number.replace('P', '')) + 1) if last and last.patient_number else 1
            self.patient_number = f"P{count:05d}"
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.patient_number} - {self.user.get_full_name()}"

class TimeSlot(models.Model):
    date = models.DateField()
    start_time = models.TimeField()
    end_time = models.TimeField()
    is_available = models.BooleanField(default=True)

    class Meta:
        unique_together = ['date', 'start_time']
        ordering = ['date', 'start_time']

    def __str__(self):
        return f"{self.date} {self.start_time}-{self.end_time}"


class Appointment(models.Model):
    class Status(models.TextChoices):
        PENDING = 'pending', 'Pending'
        CONFIRMED = 'confirmed', 'Confirmed'
        CANCELLED = 'cancelled', 'Cancelled'
        COMPLETED = 'completed', 'Completed'
        NO_SHOW = 'no_show', 'No Show'
        RESCHEDULED = 'rescheduled', 'Rescheduled'

    class BookingType(models.TextChoices):
        REGULAR = 'regular', 'Regular'
        PENCIL = 'pencil', 'Pencil Booking'
        WAITLIST = 'waitlist', 'Waitlist'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    patient = models.ForeignKey(User, on_delete=models.CASCADE, related_name='appointments')
    service = models.ForeignKey(DentalService, on_delete=models.PROTECT)
    date = models.DateField()
    start_time = models.TimeField()
    end_time = models.TimeField()
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    booking_type = models.CharField(max_length=20, choices=BookingType.choices, default=BookingType.REGULAR)

    # Pencil booking: auto-expires after 6 hours if not confirmed
    pencil_expires_at = models.DateTimeField(null=True, blank=True)
    pencil_confirmed = models.BooleanField(default=False)

    # Cancellation info
    cancelled_by = models.ForeignKey(
        User, null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name='cancelled_appointments'
    )
    cancelled_at = models.DateTimeField(null=True, blank=True)
    cancellation_reason = models.TextField(blank=True)

    # No-show tracking
    no_show_marked_at = models.DateTimeField(null=True, blank=True)
    no_show_count = models.IntegerField(default=0)

    # Admin confirmation
    confirmed_by = models.ForeignKey(
        User, null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name='confirmed_appointments'
    )
    confirmed_at = models.DateTimeField(null=True, blank=True)

    notes = models.TextField(blank=True)
    admin_notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['date', 'start_time']

    def save(self, *args, **kwargs):
        if self.booking_type == self.BookingType.PENCIL and not self.pencil_expires_at:
            self.pencil_expires_at = timezone.now() + timedelta(hours=6)
        super().save(*args, **kwargs)

    @property
    def is_pencil_expired(self):
        if self.booking_type == self.BookingType.PENCIL and self.pencil_expires_at:
            return timezone.now() > self.pencil_expires_at and not self.pencil_confirmed
        return False

    def mark_no_show(self):
        self.status = self.Status.NO_SHOW
        self.no_show_marked_at = timezone.now()
        self.no_show_count += 1
        self.save()

    def __str__(self):
        return f"{self.patient.get_full_name()} - {self.service.name} on {self.date}"


class WaitlistEntry(models.Model):
    class Status(models.TextChoices):
        WAITING = 'waiting', 'Waiting'
        NOTIFIED = 'notified', 'Notified'
        BOOKED = 'booked', 'Booked'
        EXPIRED = 'expired', 'Expired'

    patient = models.ForeignKey(User, on_delete=models.CASCADE, related_name='waitlist_entries')
    service = models.ForeignKey(DentalService, on_delete=models.PROTECT)
    preferred_date = models.DateField()
    preferred_time_start = models.TimeField(null=True, blank=True)
    preferred_time_end = models.TimeField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.WAITING)
    notes = models.TextField(blank=True)
    notified_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f"Waitlist: {self.patient.get_full_name()} for {self.service.name} on {self.preferred_date}"

class Invoice(models.Model):
    class Status(models.TextChoices):
        DRAFT = 'draft', 'Draft'
        SENT = 'sent', 'Sent'
        PAID = 'paid', 'Paid'
        OVERDUE = 'overdue', 'Overdue'
        CANCELLED = 'cancelled', 'Cancelled'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    invoice_number = models.CharField(max_length=20, unique=True, blank=True)
    patient = models.ForeignKey(User, on_delete=models.PROTECT, related_name='invoices')
    appointment = models.OneToOneField(
        Appointment, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='invoice'
    )
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.DRAFT)
    subtotal = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    discount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    tax = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    total = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    notes = models.TextField(blank=True)
    due_date = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        if not self.invoice_number:
            last = Invoice.objects.order_by('-created_at').first()
            count = (int(last.invoice_number.replace('INV-', '')) + 1) if last and last.invoice_number else 1
            self.invoice_number = f"INV-{count:06d}"
        self.total = self.subtotal - self.discount + self.tax
        super().save(*args, **kwargs)


class InvoiceItem(models.Model):
    invoice = models.ForeignKey(Invoice, on_delete=models.CASCADE, related_name='items')
    description = models.CharField(max_length=255)
    quantity = models.IntegerField(default=1)
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    total = models.DecimalField(max_digits=10, decimal_places=2)

    def save(self, *args, **kwargs):
        self.total = self.quantity * self.unit_price
        super().save(*args, **kwargs)


class Payment(models.Model):
    class Method(models.TextChoices):
        CASH = 'cash', 'Cash'
        GCASH = 'gcash', 'GCash'
        CARD = 'card', 'Credit/Debit Card'
        BANK = 'bank_transfer', 'Bank Transfer'
        MAYA = 'maya', 'Maya'

    class Status(models.TextChoices):
        PENDING = 'pending', 'Pending'
        COMPLETED = 'completed', 'Completed'
        FAILED = 'failed', 'Failed'
        REFUNDED = 'refunded', 'Refunded'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    invoice = models.ForeignKey(Invoice, on_delete=models.PROTECT, related_name='payments')
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    method = models.CharField(max_length=30, choices=Method.choices)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    reference_number = models.CharField(max_length=100, blank=True)
    received_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True
    )
    paid_at = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

class Notification(models.Model):
    class NotifType(models.TextChoices):
        APPOINTMENT_NEW = 'appointment_new', 'New Appointment'
        APPOINTMENT_CONFIRMED = 'appointment_confirmed', 'Appointment Confirmed'
        APPOINTMENT_CANCELLED = 'appointment_cancelled', 'Appointment Cancelled'
        APPOINTMENT_REMINDER = 'appointment_reminder', 'Appointment Reminder'
        WAITLIST_AVAILABLE = 'waitlist_available', 'Slot Available'
        PENCIL_EXPIRING = 'pencil_expiring', 'Pencil Booking Expiring'
        PENCIL_EXPIRED = 'pencil_expired', 'Pencil Booking Expired'
        PAYMENT_RECEIVED = 'payment_received', 'Payment Received'
        NO_SHOW = 'no_show', 'No Show Marked'

    recipient = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications')
    notif_type = models.CharField(max_length=40, choices=NotifType.choices)
    title = models.CharField(max_length=200)
    message = models.TextField()
    data = models.JSONField(default=dict, blank=True)  # Extra payload (appointment_id, etc.)
    is_read = models.BooleanField(default=False)
    read_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

class AuditLog(models.Model):
    class Action(models.TextChoices):
        CREATE = 'create', 'Created'
        UPDATE = 'update', 'Updated'
        DELETE = 'delete', 'Deleted'
        LOGIN = 'login', 'Logged In'
        LOGOUT = 'logout', 'Logged Out'
        CONFIRM = 'confirm', 'Confirmed'
        CANCEL = 'cancel', 'Cancelled'
        EXPORT = 'export', 'Exported'
        VIEW = 'view', 'Viewed'

    actor = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    action = models.CharField(max_length=20, choices=Action.choices)
    model_name = models.CharField(max_length=100)
    object_id = models.CharField(max_length=100, blank=True)
    object_repr = models.CharField(max_length=255, blank=True)
    changes = models.JSONField(default=dict, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-timestamp']

    def __str__(self):
        return f"{self.actor} {self.action} {self.model_name} at {self.timestamp}"
"""
