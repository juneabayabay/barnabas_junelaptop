from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.contrib.auth import get_user_model, authenticate
from django.utils import timezone
from datetime import datetime, timedelta
import uuid
from django.db import models
from rest_framework.exceptions import PermissionDenied
from knox.models import AuthToken
from django.core.mail import send_mail
from django.conf import settings
import asyncio

from .models import *
from .serializers import *
from .tasks import (
    expire_pencil_booking, expire_reservation, 
    check_waitlist_for_slots, generate_ai_recommendations,
    send_invoice_email, check_overdue_invoices
)
from .ai_service import AIDentalScheduler, GeminiAIAssistant

# Constants
CLINIC_OPEN = 9
CLINIC_CLOSE = 18
LUNCH_START = 12
LUNCH_END = 13
MAX_PER_SLOT = 2

User = get_user_model()


class RegisterViewset(viewsets.ViewSet):
    permission_classes = [permissions.AllowAny]
    queryset = User.objects.all()
    serializer_class = RegisterSerializer

    def create(self, request):
        serializer = self.serializer_class(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        else:
            return Response(serializer.errors, status=400)


class LoginViewset(viewsets.ViewSet):
    permission_classes = [permissions.AllowAny]
    serializer_class = LoginSerializer
    
    def create(self, request):
        serializer = self.serializer_class(data=request.data)
        if serializer.is_valid():
            email = serializer.validated_data['email']
            password = serializer.validated_data['password']
            user = authenticate(request, email=email, password=password)

            if user:
                _, token = AuthToken.objects.create(user)
                return Response(
                    {
                        'user': {'id': user.id, 'email': user.email},
                        'token': token
                    }
                )
            else:
                return Response({'error': 'invalid credentials'}, status=401)
        else:
            return Response(serializer.errors, status=400)


class AdminLoginViewset(viewsets.ViewSet):
    permission_classes = [permissions.AllowAny]
    serializer_class = LoginSerializer
    
    def create(self, request):
        serializer = self.serializer_class(data=request.data)
        if serializer.is_valid():
            email = serializer.validated_data['email']
            password = serializer.validated_data['password']
            user = authenticate(request, email=email, password=password)

            if user and user.is_superuser:
                _, token = AuthToken.objects.create(user)
                return Response(
                    {
                        'user': {'id': user.id, 'email': user.email, 'is_superuser': user.is_superuser},
                        'token': token
                    }
                )
            else:
                return Response({'error': 'invalid credentials'}, status=401)
        else:
            return Response(serializer.errors, status=400)


class UserViewset(viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticated]
    queryset = User.objects.all()
    serializer_class = RegisterSerializer

    def list(self, request):
        queryset = User.objects.all()
        serializer = self.serializer_class(queryset, many=True)
        return Response(serializer.data)


class PatientRecordViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = PatientRecordSerializer
    queryset = PatientRecord.objects.all()
    
    def get_queryset(self):
        user = self.request.user
        if user.is_superuser or user.role == 'admin' or user.is_staff:
            return PatientRecord.objects.all()
        return PatientRecord.objects.filter(user=user)
    
    def get_object(self):
        obj = super().get_object()
        if obj.user != self.request.user and not (self.request.user.is_superuser or self.request.user.is_staff):
            raise PermissionDenied("You can only access your own patient record")
        return obj
    
    @action(detail=False, methods=['get'])
    def my_record(self, request):
        """Get current user's patient record"""
        record, created = PatientRecord.objects.get_or_create(user=request.user)
        serializer = self.get_serializer(record)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def add_medical_history(self, request, pk=None):
        """Add medical history notes"""
        record = self.get_object()
        record.medical_conditions = request.data.get('medical_conditions', record.medical_conditions)
        record.allergies = request.data.get('allergies', record.allergies)
        record.medications = request.data.get('medications', record.medications)
        record.save()
        return Response(self.get_serializer(record).data)


class AppointmentViewSet(viewsets.ModelViewSet):
    serializer_class = AppointmentSerializer
    permission_classes = [IsAuthenticated]
    queryset = Appointment.objects.all()
    
    def get_queryset(self):
        user = self.request.user
        
        if user.is_superuser or user.role == 'admin':
            queryset = Appointment.objects.all().select_related('user', 'dentist')
        elif user.is_staff:
            queryset = Appointment.objects.all().select_related('user', 'dentist')
        else:
            queryset = Appointment.objects.filter(user=user)
        
        # Apply filters
        status_filter = self.request.query_params.get('status', None)
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        start_date = self.request.query_params.get('start_date', None)
        end_date = self.request.query_params.get('end_date', None)
        if start_date:
            queryset = queryset.filter(date__gte=start_date)
        if end_date:
            queryset = queryset.filter(date__lte=end_date)
        
        user_id = self.request.query_params.get('user_id', None)
        if user_id and (user.is_superuser or user.is_staff):
            queryset = queryset.filter(user_id=user_id)
        
        return queryset.order_by('date', 'time')
    
    def get_object(self):
        obj = super().get_object()
        user = self.request.user
        
        if obj.user != user and not (user.is_superuser or user.is_staff):
            raise PermissionDenied("Access denied")
        return obj
    
    def create(self, request, *args, **kwargs):
        data = request.data.copy()
        data['user'] = request.user.id
        data['status'] = 'pending'  # Force pending status
        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        appointment = serializer.save()
        return Response({
            'message': 'Appointment requested successfully',
            'appointment': serializer.data
        }, status=status.HTTP_201_CREATED)
    
    def _create_invoice_for_appointment(self, appointment):
        """Create invoice for confirmed appointment"""
        service_prices = {
            'consultation': 500,
            'teeth_cleaning': 1000,
            'tooth_extraction': 1000,
            'dental_filling': 1000,
            'orthodontic': 50000,
            'root_canal': 3000,
            'dental_implant': 15000,
            'teeth_whitening': 2500,
            'cleaning': 1000,
            'extraction': 1000,
            'filling': 1000,
            'braces': 50000,
        }
        
        price = service_prices.get(appointment.service, 1000)
        
        invoice = Invoice.objects.create(
            user=appointment.user,
            appointment=appointment,
            due_date=appointment.date,
            subtotal=price,
            total_amount=price,
            status='sent'
        )
        
        InvoiceItem.objects.create(
            invoice=invoice,
            description=f"Dental Service: {appointment.get_service_display() if appointment.service else appointment.service}",
            quantity=1,
            unit_price=price
        )
    
    @action(detail=False, methods=['post'])
    def pencil_booking(self, request):
        """Create a temporary pencil booking"""
        user = request.user
        date = request.data.get('date')
        time_slot = request.data.get('time')
        service = request.data.get('service')
        
        if not date or not time_slot:
            return Response(
                {'error': 'Date and time are required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if slot is available
        existing = Appointment.objects.filter(
            date=date,
            time=time_slot,
            status__in=['confirmed', 'pending', 'pencil']
        ).count()
        
        if existing >= MAX_PER_SLOT:
            return Response(
                {'error': 'Slot is no longer available'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Create pencil booking
        pencil_appt = Appointment.objects.create(
            user=user,
            date=date,
            time=time_slot,
            service=service,
            status='pencil',
            pencil_expires_at=timezone.now() + timedelta(minutes=15)
        )
        
        return Response({
            'message': 'Pencil booking created! You have 15 minutes to confirm.',
            'expires_at': pencil_appt.pencil_expires_at,
            'appointment_id': pencil_appt.id,
            'minutes_left': 15
        })
    
    @action(detail=False, methods=['get'])
    def check_pencil_booking(self, request):
        """Check if user has an active pencil booking"""
        user = request.user
        
        active_pencil = Appointment.objects.filter(
            user=user,
            status='pencil',
            pencil_expires_at__gt=timezone.now()
        ).first()
        
        if active_pencil:
            minutes_left = max(0, int((active_pencil.pencil_expires_at - timezone.now()).total_seconds() / 60))
            return Response({
                'has_pencil': True,
                'appointment_id': active_pencil.id,
                'minutes_left': minutes_left,
                'expires_at': active_pencil.pencil_expires_at
            })
        
        return Response({'has_pencil': False})
    
    @action(detail=False, methods=['post'])
    def confirm_pencil_booking(self, request):
        """Convert pencil booking to confirmed appointment"""
        appointment_id = request.data.get('appointment_id')
        
        if not appointment_id:
            return Response({'error': 'Appointment ID is required'}, status=400)
        
        try:
            appointment = Appointment.objects.get(id=appointment_id, user=request.user)
            
            if appointment.status != 'pencil':
                return Response({'error': 'Not a pencil booking'}, status=400)
            
            if appointment.pencil_expires_at and appointment.pencil_expires_at < timezone.now():
                appointment.status = 'cancelled'
                appointment.save()
                return Response({'error': 'Pencil booking has expired'}, status=400)
            
            # Check if slot is still available
            existing = Appointment.objects.filter(
                date=appointment.date,
                time=appointment.time,
                status__in=['confirmed', 'pending', 'pencil']
            ).exclude(id=appointment_id).count()
            
            if existing >= MAX_PER_SLOT:
                appointment.status = 'cancelled'
                appointment.save()
                return Response({'error': 'Time slot is no longer available'}, status=400)
            
            appointment.status = 'confirmed'
            appointment.pencil_expires_at = None
            appointment.save()
            
            # Create invoice for confirmed appointment
            self._create_invoice_for_appointment(appointment)
            
            return Response({
                'message': 'Appointment confirmed successfully!',
                'appointment': AppointmentSerializer(appointment).data
            })
        except Appointment.DoesNotExist:
            return Response({'error': 'Appointment not found'}, status=404)
    
    @action(detail=False, methods=['get'])
    def waitlist_status(self, request):
        """Get current user's waitlist status"""
        user = request.user
        
        # Get all active waitlist entries
        waitlists = Waitlist.objects.filter(
            user=user,
            status='active'
        ).order_by('-urgency_level', 'created_at')
        
        result = []
        for entry in waitlists:
            # Calculate position
            position = Waitlist.objects.filter(
                preferred_date=entry.preferred_date,
                urgency_level__gte=entry.urgency_level,
                created_at__lt=entry.created_at,
                status='active'
            ).count() + 1
            
            result.append({
                'id': entry.id,
                'preferred_date': entry.preferred_date,
                'preferred_time_start': entry.preferred_time_start,
                'preferred_time_end': entry.preferred_time_end,
                'service_needed': entry.service_needed,
                'urgency_level': entry.urgency_level,
                'status': entry.status,
                'position': position,
                'created_at': entry.created_at
            })
        
        return Response({'waitlists': result})
    
    @action(detail=False, methods=['get'])
    def ai_suggestions(self, request):
        """Get AI-powered suggestions"""
        suggestions = AISuggestion.objects.filter(user=request.user, is_read=False)
        serializer = AISuggestionSerializer(suggestions, many=True)
        return Response({'suggestions': serializer.data})
    
    @action(detail=False, methods=['post'])
    def ai_chat(self, request):
        """AI receptionist chat endpoint"""
        message = request.data.get('message')
        if not message:
            return Response({'error': 'Message is required'}, status=400)
        
        context = {
            'user_appointments': AppointmentSerializer(
                Appointment.objects.filter(user=request.user)[:5], 
                many=True
            ).data,
            'clinic_hours': settings.CLINIC_HOURS,
            'current_time': str(timezone.now())
        }
        
        ai_assistant = GeminiAIAssistant()
        
        # Run async in sync context
        try:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            response = loop.run_until_complete(
                ai_assistant.generate_chat_response(message, context)
            )
            loop.close()
            return Response({'response': response})
        except Exception as e:
            return Response({'response': f'AI assistant is temporarily unavailable. Please try again later.'}, status=200)
    
    @action(detail=False, methods=['get'])
    def get_available_slots(self, request):
        """Get available time slots"""
        date_str = request.query_params.get('date')
        service = request.query_params.get('service')
        
        if not date_str:
            return Response({'error': 'Date is required'}, status=400)
        
        try:
            selected_date = datetime.strptime(date_str, '%Y-%m-%d').date()
        except ValueError:
            return Response({'error': 'Invalid date format'}, status=400)
        
        # Service durations (in minutes)
        service_durations = {
            'consultation': 30,
            'teeth_cleaning': 60,
            'tooth_extraction': 60,
            'dental_filling': 60,
            'orthodontic': 120,
            'root_canal': 90,
            'dental_implant': 120,
            'teeth_whitening': 60,
            'cleaning': 60,
            'extraction': 60,
            'filling': 60,
            'braces': 120,
        }
        
        duration = service_durations.get(service, 60)
        
        # Get booked times for the selected date
        booked_appointments = Appointment.objects.filter(
            date=selected_date,
            status__in=['pending', 'confirmed', 'pencil']
        )
        
        booked_times = set()
        for apt in booked_appointments:
            booked_times.add(apt.time.strftime('%H:%M'))
        
        available_slots = []
        
        # Generate all possible time slots (9 AM to 6 PM, excluding 12-1 PM lunch)
        for hour in range(CLINIC_OPEN, CLINIC_CLOSE):
            if hour == LUNCH_START:
                continue
            for minute in [0, 30]:
                slot_time = f"{hour:02d}:{minute:02d}"
                
                # Skip if slot is booked
                if slot_time in booked_times:
                    continue
                
                slot_datetime = datetime.combine(selected_date, datetime.strptime(slot_time, '%H:%M').time())
                end_datetime = slot_datetime + timedelta(minutes=duration)
                
                # Check if appointment crosses lunch break
                if slot_datetime.hour < LUNCH_END and end_datetime.hour >= LUNCH_START:
                    continue
                
                # Check if appointment goes beyond closing time
                if end_datetime.hour > CLINIC_CLOSE or (end_datetime.hour == CLINIC_CLOSE and end_datetime.minute > 0):
                    continue
                
                # Check consecutive slots for longer procedures
                if duration > 30:
                    slots_needed = duration // 30
                    has_consecutive = True
                    for i in range(1, slots_needed):
                        next_hour = hour
                        next_minute = minute + (i * 30)
                        if next_minute >= 60:
                            next_hour += 1
                            next_minute -= 60
                        
                        if next_hour >= CLINIC_CLOSE or next_hour == LUNCH_START:
                            has_consecutive = False
                            break
                        
                        next_time = f"{next_hour:02d}:{next_minute:02d}"
                        if next_time in booked_times:
                            has_consecutive = False
                            break
                    
                    if not has_consecutive:
                        continue
                
                available_slots.append({
                    'time': datetime.strptime(slot_time, '%H:%M').strftime('%I:%M %p'),
                    'timeValue': slot_time,
                    'hour': hour,
                    'minute': minute
                })
        
        return Response({'available_slots': available_slots})
    
    @action(detail=False, methods=['post'])
    def join_waitlist(self, request):
        """Add user to waitlist"""
        user = request.user
        preferred_date = request.data.get('preferred_date')
        time_start = request.data.get('time_start', '09:00')
        time_end = request.data.get('time_end', '17:00')
        service_needed = request.data.get('service')
        urgency_level = int(request.data.get('urgency_level', 1))
        
        if not preferred_date or not service_needed:
            return Response(
                {'error': 'Preferred date and service are required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            preferred_date = datetime.strptime(preferred_date, '%Y-%m-%d').date()
        except ValueError:
            return Response({'error': 'Invalid date format'}, status=400)
        
        waitlist_entry = Waitlist.objects.create(
            user=user,
            preferred_date=preferred_date,
            preferred_time_start=time_start,
            preferred_time_end=time_end,
            service_needed=service_needed,
            urgency_level=urgency_level
        )
        
        # Calculate position
        position = Waitlist.objects.filter(
            preferred_date=preferred_date,
            urgency_level__gte=urgency_level,
            created_at__lt=waitlist_entry.created_at,
            status='active'
        ).count() + 1
        
        return Response({
            'message': 'Added to waitlist successfully',
            'position': position,
            'waitlist_id': waitlist_entry.id
        })


class InvoiceViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = InvoiceSerializer
    queryset = Invoice.objects.all()
    
    def get_queryset(self):
        user = self.request.user
        if user.is_superuser or user.is_staff:
            return Invoice.objects.all().select_related('user', 'appointment')
        return Invoice.objects.filter(user=user)
    
    @action(detail=False, methods=['get'])
    def my_invoices(self, request):
        """Get current user's invoices"""
        invoices = Invoice.objects.filter(user=request.user)
        serializer = self.get_serializer(invoices, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def add_payment(self, request, pk=None):
        """Add payment to invoice"""
        invoice = self.get_object()
        
        payment = Payment.objects.create(
            invoice=invoice,
            user=request.user,
            amount=request.data.get('amount'),
            payment_method=request.data.get('payment_method'),
            reference_number=request.data.get('reference_number'),
            processed_by=request.user if request.user.is_staff else None,
            status='completed'
        )
        
        # Log payment
        AuditLog.objects.create(
            user=request.user,
            action='create',
            model_name='Payment',
            object_id=str(payment.id),
            ip_address=request.META.get('REMOTE_ADDR')
        )
        
        return Response({
            'message': 'Payment recorded successfully',
            'payment': PaymentSerializer(payment).data,
            'invoice': self.get_serializer(invoice).data
        })


class PaymentViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = PaymentSerializer
    queryset = Payment.objects.all()
    
    def get_queryset(self):
        user = self.request.user
        if user.is_superuser or user.is_staff:
            return Payment.objects.all().select_related('invoice', 'user')
        return Payment.objects.filter(user=user)


class StaffViewSet(viewsets.ViewSet):
    """Staff/dentist specific endpoints"""
    permission_classes = [IsAuthenticated]
    
    def get_permissions(self):
        if self.request.user.is_staff or self.request.user.is_superuser:
            return super().get_permissions()
        raise PermissionDenied("Staff access required")
    
    @action(detail=False, methods=['get'])
    def today_appointments(self, request):
        """Get today's appointments"""
        today = timezone.now().date()
        appointments = Appointment.objects.filter(
            date=today,
            status__in=['confirmed', 'pending']
        ).select_related('user')
        
        return Response({
            'date': today,
            'appointments': AppointmentSerializer(appointments, many=True).data
        })
    
    @action(detail=False, methods=['get'])
    def upcoming_appointments(self, request):
        """Get upcoming appointments for the week"""
        today = timezone.now().date()
        next_week = today + timedelta(days=7)
        
        appointments = Appointment.objects.filter(
            date__range=[today, next_week],
            status__in=['confirmed', 'pending']
        ).order_by('date', 'time')
        
        return Response({
            'appointments': AppointmentSerializer(appointments, many=True).data
        })
    
    @action(detail=True, methods=['post'])
    def update_prescription(self, request, pk=None):
        """Update appointment prescription"""
        try:
            appointment = Appointment.objects.get(pk=pk)
            appointment.prescription = request.data.get('prescription', '')
            appointment.save()
            return Response({'message': 'Prescription updated'})
        except Appointment.DoesNotExist:
            return Response({'error': 'Appointment not found'}, status=404)
    
    @action(detail=False, methods=['get'])
    def pending_payments(self, request):
        """Get all pending/overdue invoices"""
        invoices = Invoice.objects.filter(
            status__in=['sent', 'partial', 'overdue']
        ).select_related('user')
        
        return Response({
            'invoices': InvoiceSerializer(invoices, many=True).data
        })
    
    @action(detail=False, methods=['get'])
    def revenue_stats(self, request):
        """Get revenue statistics"""
        from django.db.models import Sum
        
        today = timezone.now().date()
        today_revenue = Payment.objects.filter(
            payment_date__date=today,
            status='completed'
        ).aggregate(total=Sum('amount'))['total'] or 0
        
        this_month = today.replace(day=1)
        month_revenue = Payment.objects.filter(
            payment_date__date__gte=this_month,
            status='completed'
        ).aggregate(total=Sum('amount'))['total'] or 0
        
        return Response({
            'today_revenue': today_revenue,
            'month_revenue': month_revenue,
            'pending_invoices': Invoice.objects.filter(status__in=['sent', 'partial']).count(),
            'overdue_invoices': Invoice.objects.filter(status='overdue').count()
        })


class AdminViewSet(viewsets.ViewSet):
    """Admin-only endpoints"""
    permission_classes = [IsAuthenticated]
    
    def get_permissions(self):
        if self.request.user.is_superuser or self.request.user.role == 'admin':
            return super().get_permissions()
        raise PermissionDenied("Admin access required")
    
    @action(detail=False, methods=['get'])
    def dashboard_stats(self, request):
        """Get comprehensive dashboard statistics"""
        from django.db.models import Sum, Count
        from datetime import timedelta
        
        today = timezone.now().date()
        this_month_start = today.replace(day=1)
        
        stats = {
            'users': {
                'total': User.objects.count(),
                'patients': User.objects.filter(role='patient').count(),
                'staff': User.objects.filter(role='staff').count(),
                'dentists': User.objects.filter(role='dentist').count(),
                'new_this_month': User.objects.filter(date_joined__date__gte=this_month_start).count(),
            },
            'appointments': {
                'total': Appointment.objects.count(),
                'pending': Appointment.objects.filter(status='pending').count(),
                'confirmed': Appointment.objects.filter(status='confirmed').count(),
                'completed': Appointment.objects.filter(status='completed').count(),
                'cancelled': Appointment.objects.filter(status='cancelled').count(),
                'today': Appointment.objects.filter(date=today).exclude(status='cancelled').count(),
                'upcoming_week': Appointment.objects.filter(
                    date__range=[today, today + timedelta(days=7)]
                ).exclude(status='cancelled').count(),
            },
            'revenue': {
                'today': Payment.objects.filter(payment_date__date=today, status='completed').aggregate(total=Sum('amount'))['total'] or 0,
                'this_month': Payment.objects.filter(payment_date__date__gte=this_month_start, status='completed').aggregate(total=Sum('amount'))['total'] or 0,
                'total': Payment.objects.filter(status='completed').aggregate(total=Sum('amount'))['total'] or 0,
            },
            'invoices': {
                'total': Invoice.objects.count(),
                'paid': Invoice.objects.filter(status='paid').count(),
                'pending': Invoice.objects.filter(status='sent').count(),
                'partial': Invoice.objects.filter(status='partial').count(),
                'overdue': Invoice.objects.filter(status='overdue').count(),
                'total_outstanding': Invoice.objects.filter(status__in=['sent', 'partial']).aggregate(total=Sum('balance_due'))['total'] or 0,
            },
            'waitlist': {
                'active': Waitlist.objects.filter(status='active').count(),
                'high_urgency': Waitlist.objects.filter(urgency_level=3, status='active').count(),
            },
            'ai_suggestions': {
                'unread': AISuggestion.objects.filter(is_read=False).count(),
                'total': AISuggestion.objects.count(),
            },
        }
        
        return Response(stats)

class NotificationViewSet(viewsets.ModelViewSet):
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]
    queryset = Notification.objects.all()  # ADD THIS LINE
    
    def get_queryset(self):
        user = self.request.user
        
        # Admin/staff can see all notifications (for debugging)
        if user.is_superuser or user.is_staff:
            queryset = Notification.objects.all()
        else:
            queryset = Notification.objects.filter(user=user)
        
        # Filter by read/unread
        is_read = self.request.query_params.get('is_read', None)
        if is_read is not None:
            is_read_bool = is_read.lower() == 'true'
            queryset = queryset.filter(is_read=is_read_bool)
        
        # Filter by notification type
        notification_type = self.request.query_params.get('type', None)
        if notification_type:
            queryset = queryset.filter(notification_type=notification_type)
        
        # Filter by priority
        priority = self.request.query_params.get('priority', None)
        if priority:
            queryset = queryset.filter(priority=priority)
        
        # Exclude expired
        exclude_expired = self.request.query_params.get('exclude_expired', 'true')
        if exclude_expired == 'true':
            queryset = queryset.filter(
                models.Q(expires_at__isnull=True) | models.Q(expires_at__gt=timezone.now())
            )
        
        return queryset.select_related('user')
    
    def list(self, request, *args, **kwargs):
        """Get notifications with pagination"""
        queryset = self.filter_queryset(self.get_queryset())
        
        # Pagination
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response({
                'notifications': serializer.data,
                'unread_count': self.get_queryset().filter(is_read=False).count(),
                'total_count': self.get_queryset().count(),
            })
        
        serializer = self.get_serializer(queryset, many=True)
        return Response({
            'notifications': serializer.data,
            'unread_count': self.get_queryset().filter(is_read=False).count(),
            'total_count': self.get_queryset().count(),
        })
    
   
    
    @action(detail=False, methods=['delete'])
    def delete_all_read(self, request):
        """Delete all read notifications"""
        if not (request.user.is_superuser or request.user.is_staff):
            # Users can only delete their own
            deleted_count = Notification.objects.filter(
                user=request.user, 
                is_read=True
            ).delete()[0]
        else:
            # Admin can delete all read notifications
            deleted_count = Notification.objects.filter(is_read=True).delete()[0]
        
        return Response({
            'message': f'Deleted {deleted_count} read notifications',
            'deleted_count': deleted_count
        })
    
    @action(detail=True, methods=['post'])
    def mark_single_read(self, request, pk=None):
        """Mark a single notification as read"""
        notification = self.get_object()
        notification.mark_as_read()
        return Response({'message': 'Notification marked as read'})
    
    @action(detail=False, methods=['get'])
    def unread_count(self, request):
        """Get unread notification count"""
        count = self.get_queryset().filter(is_read=False).count()
        return Response({'unread_count': count})
    
    @action(detail=False, methods=['post'])
    def test_notification(self, request):
        """Test endpoint for sending notifications (admin only)"""
        if not (request.user.is_superuser or request.user.is_staff):
            raise PermissionDenied("Admin access required")
        
        notification = Notification.objects.create(
            user=request.user,
            notification_type='system_alert',
            title='Test Notification',
            message='This is a test notification to verify the system is working correctly.',
            priority='high',
            channel='in_app',
            action_url='/dashboard',
            expires_at=timezone.now() + timedelta(days=1)
        )
        
        return Response({
            'message': 'Test notification created',
            'notification': NotificationSerializer(notification).data
        })


class NotificationPreferenceViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]
    
    def get_preferences(self, request):
        """Get or create notification preferences for current user"""
        preferences, created = NotificationPreference.objects.get_or_create(user=request.user)
        serializer = NotificationPreferenceSerializer(preferences)
        return Response(serializer.data)
    
    def update_preferences(self, request):
        """Update notification preferences"""
        preferences, created = NotificationPreference.objects.get_or_create(user=request.user)
        serializer = NotificationPreferenceSerializer(preferences, data=request.data, partial=True)
        
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=400)
    
    @action(detail=False, methods=['get'])
    def get(self, request):
        return self.get_preferences(request)
    
    @action(detail=False, methods=['put', 'patch'])
    def update(self, request):
        return self.update_preferences(request)    