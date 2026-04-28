from django.shortcuts import render, redirect
from rest_framework import viewsets, permissions, status
from .serializers import *
from .models import *
from rest_framework.response import Response
from django.contrib.auth import get_user_model, authenticate
from knox.models import AuthToken
from django.conf import settings
from .forms import AppointmentForm
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from collections import Counter
from .ai_service import AIDentalScheduler
from .tasks import (
    expire_pencil_booking, expire_reservation, 
    check_waitlist_for_slots, generate_ai_recommendations)


User = get_user_model()

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta
import uuid
from django.db import models
from rest_framework.exceptions import PermissionDenied

from .models import Appointment, Waitlist, AISuggestion, BookingReservation
from .serializers import AppointmentSerializer, WaitlistSerializer, AISuggestionSerializer, BookingReservationSerializer
from .tasks import generate_ai_recommendations, expire_pencil_booking, expire_reservation, check_waitlist_for_slots

User = get_user_model()


class AppointmentViewSet(viewsets.ModelViewSet):
    serializer_class = AppointmentSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        
        # ADMIN USERS: See ALL appointments from ALL users
        if user.is_staff or user.is_superuser:
            queryset = Appointment.objects.all().select_related('user')
        else:
            # REGULAR USERS: See only their own appointments
            queryset = Appointment.objects.filter(user=user)
        
        # Apply filters (works for both admin and regular users)
        status_filter = self.request.query_params.get('status', None)
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        start_date = self.request.query_params.get('start_date', None)
        end_date = self.request.query_params.get('end_date', None)
        if start_date:
            queryset = queryset.filter(date__gte=start_date)
        if end_date:
            queryset = queryset.filter(date__lte=end_date)
        
        # Filter by specific user (admin only feature)
        user_id = self.request.query_params.get('user_id', None)
        if user_id and (user.is_staff or user.is_superuser):
            queryset = queryset.filter(user_id=user_id)
        
        return queryset.order_by('-date', 'time')
    
    def get_object(self):
        """Override to allow admin to access any appointment"""
        obj = super().get_object()
        
        # Admin can access any appointment
        if self.request.user.is_staff or self.request.user.is_superuser:
            return obj
        
        # Regular users can only access their own appointments
        if obj.user != self.request.user:
            raise PermissionDenied("You don't have permission to access this appointment")
        
        return obj
    
    def create(self, request, *args, **kwargs):
        """Create a new appointment"""
        data = request.data.copy()
        data['user'] = request.user.id
        
        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        
        # Generate AI suggestions asynchronously
        generate_ai_recommendations.delay()
        
        return Response({
            'message': 'Appointment reserved successfully',
            'appointment': serializer.data
        }, status=status.HTTP_201_CREATED)
    
    @action(detail=False, methods=['post'])
    def pencil_booking(self, request):
        """Create a temporary pencil booking (holds slot for 15 minutes)"""
        user = request.user
        date = request.data.get('date')
        time_slot = request.data.get('time')
        service = request.data.get('service')
        
        existing = Appointment.objects.filter(
            date=date,
            time=time_slot,
            status__in=['confirmed', 'pending', 'pencil']
        ).count()
        
        if existing >= 2:
            return Response(
                {'error': 'Slot is no longer available'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        pencil_appt = Appointment.objects.create(
            user=user,
            date=date,
            time=time_slot,
            service=service,
            status='pencil',
            pencil_expires_at=timezone.now() + timedelta(minutes=15)
        )
        
        expire_pencil_booking.apply_async(
            args=[pencil_appt.id],
            countdown=900  # 15 minutes
        )
        
        return Response({
            'message': 'Pencil booking created! You have 15 minutes to confirm.',
            'expires_at': pencil_appt.pencil_expires_at,
            'appointment_id': pencil_appt.id
        })
    
    @action(detail=False, methods=['post'])
    def confirm_pencil_booking(self, request):
        """Convert pencil booking to confirmed appointment"""
        appointment_id = request.data.get('appointment_id')
        
        try:
            appointment = Appointment.objects.get(
                id=appointment_id, 
                user=request.user
            )
            
            if appointment.status != 'pencil':
                return Response(
                    {'error': 'Not a pencil booking'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            if appointment.pencil_expires_at < timezone.now():
                appointment.status = 'cancelled'
                appointment.save()
                return Response(
                    {'error': 'Pencil booking has expired'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            appointment.status = 'pending'
            appointment.pencil_expires_at = None
            appointment.save()
            
            return Response({
                'message': 'Appointment confirmed successfully!',
                'appointment': AppointmentSerializer(appointment).data
            })
        except Appointment.DoesNotExist:
            return Response(
                {'error': 'Appointment not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )
    
    @action(detail=False, methods=['post'])
    def join_waitlist(self, request):
        """Add user to waitlist"""
        user = request.user
        
        waitlist_entry = Waitlist.objects.create(
            user=user,
            preferred_date=request.data.get('preferred_date'),
            preferred_time_start=request.data.get('time_start'),
            preferred_time_end=request.data.get('time_end'),
            service_needed=request.data.get('service'),
            urgency_level=request.data.get('urgency_level', 1)
        )
        
        position = Waitlist.objects.filter(
            preferred_date=waitlist_entry.preferred_date,
            urgency_level__gte=waitlist_entry.urgency_level,
            created_at__lt=waitlist_entry.created_at,
            status='active'
        ).count() + 1
        
        serializer = WaitlistSerializer(waitlist_entry)
        
        return Response({
            'message': 'Added to waitlist successfully',
            'position': position,
            'waitlist': serializer.data
        })
    
    @action(detail=False, methods=['get'])
    def waitlist_status(self, request):
        """Get user's position in waitlist"""
        user = request.user
        waitlist_entries = Waitlist.objects.filter(user=user, status='active')
        
        serializer = WaitlistSerializer(waitlist_entries, many=True)
        
        return Response({'waitlist_entries': serializer.data})
    
    @action(detail=False, methods=['get'])
    def ai_suggestions(self, request):
        """Get AI-powered suggestions for the user"""
        user = request.user
        suggestions = AISuggestion.objects.filter(user=user, is_read=False)
        serializer = AISuggestionSerializer(suggestions, many=True)
        
        return Response({'suggestions': serializer.data})
    
    @action(detail=False, methods=['post'])
    def mark_suggestion_read(self, request):
        """Mark AI suggestion as read"""
        suggestion_id = request.data.get('suggestion_id')
        
        try:
            suggestion = AISuggestion.objects.get(
                id=suggestion_id, 
                user=request.user
            )
            suggestion.is_read = True
            suggestion.save()
            return Response({'message': 'Suggestion marked as read'})
        except AISuggestion.DoesNotExist:
            return Response(
                {'error': 'Suggestion not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )
    
    @action(detail=False, methods=['get'])
    def check_pencil_booking(self, request):
        """Check if user has an active pencil booking"""
        user = request.user
        pencil_booking = Appointment.objects.filter(
            user=user,
            status='pencil',
            pencil_expires_at__gt=timezone.now()
        ).first()
        
        if pencil_booking:
            time_left = (pencil_booking.pencil_expires_at - timezone.now()).seconds // 60
            return Response({
                'has_pencil': True,
                'appointment_id': pencil_booking.id,
                'minutes_left': time_left,
                'expires_at': pencil_booking.pencil_expires_at
            })
        
        return Response({'has_pencil': False})
    
    @action(detail=False, methods=['get'])
    def get_available_slots(self, request):
        """Get available time slots for a specific date and service"""
        date_str = request.query_params.get('date')
        service_name = request.query_params.get('service')
        
        if not date_str:
            return Response(
                {'error': 'Date is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            from datetime import datetime
            selected_date = datetime.strptime(date_str, '%Y-%m-%d').date()
        except ValueError:
            return Response(
                {'error': 'Invalid date format'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        service_durations = {
            'Teeth Cleaning': 60,
            'Tooth Extraction': 60,
            'Dental Filling': 60,
            'Orthodontic Procedure': 180
        }
        
        duration = service_durations.get(service_name, 60)
        
        booked_times = Appointment.objects.filter(
            date=selected_date,
            status__in=['pending', 'confirmed', 'pencil']
        ).values_list('time', flat=True)
        
        booked_times = [t.strftime('%H:%M') for t in booked_times]
        
        available_slots = []
        
        for hour in range(9, 18):
            if hour == 12:
                continue
            
            for minute in [0, 30]:
                slot_time = f"{hour:02d}:{minute:02d}"
                
                if slot_time in booked_times:
                    continue
                
                slot_datetime = datetime.combine(
                    selected_date, 
                    datetime.strptime(slot_time, '%H:%M').time()
                )
                end_datetime = slot_datetime + timedelta(minutes=duration)
                
                if slot_datetime.hour < 12 and end_datetime.hour >= 12:
                    continue
                
                if end_datetime.hour > 18 or (end_datetime.hour == 18 and end_datetime.minute > 0):
                    continue
                
                display_time = datetime.strptime(slot_time, '%H:%M').strftime('%I:%M %p')
                
                available_slots.append({
                    'time': display_time,
                    'timeValue': slot_time,
                    'hour': hour,
                    'minute': minute
                })
        
        return Response({'available_slots': available_slots})
    
    @action(detail=False, methods=['post'])
    def create_reservation(self, request):
        """Create a booking reservation with unique token"""
        user = request.user
        token = str(uuid.uuid4())[:8]
        
        reservation = BookingReservation.objects.create(
            user=user,
            token=token,
            date=request.data.get('date'),
            time=request.data.get('time'),
            service=request.data.get('service'),
            expires_at=timezone.now() + timedelta(minutes=30)
        )
        
        expire_reservation.apply_async(
            args=[token],
            countdown=1800  # 30 minutes
        )
        
        serializer = BookingReservationSerializer(reservation)
        
        return Response({
            'message': 'Reservation created successfully',
            'reservation': serializer.data,
            'token': token
        })
    
    @action(detail=False, methods=['post'])
    def confirm_reservation(self, request):
        """Confirm a reservation and convert to appointment"""
        token = request.data.get('token')
        
        try:
            reservation = BookingReservation.objects.get(
                token=token,
                is_confirmed=False,
                expires_at__gt=timezone.now()
            )
            
            appointment = Appointment.objects.create(
                user=reservation.user,
                date=reservation.date,
                time=reservation.time,
                service=reservation.service,
                status='pending'
            )
            
            reservation.is_confirmed = True
            reservation.save()
            
            return Response({
                'message': 'Reservation confirmed successfully',
                'appointment': AppointmentSerializer(appointment).data
            })
        except BookingReservation.DoesNotExist:
            return Response(
                {'error': 'Invalid or expired reservation token'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
    
    # ADMIN-SPECIFIC ACTIONS
    
    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def admin_all_appointments(self, request):
        """Admin endpoint to get all appointments with user details"""
        if not (request.user.is_staff or request.user.is_superuser):
            return Response(
                {'error': 'Admin access required'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        queryset = Appointment.objects.all().select_related('user').order_by('-date', 'time')
        
        # Apply filters
        status_filter = request.query_params.get('status', None)
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        start_date = request.query_params.get('start_date', None)
        end_date = request.query_params.get('end_date', None)
        if start_date:
            queryset = queryset.filter(date__gte=start_date)
        if end_date:
            queryset = queryset.filter(date__lte=end_date)
        
        user_id = request.query_params.get('user_id', None)
        if user_id:
            queryset = queryset.filter(user_id=user_id)
        
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = self.get_serializer(queryset, many=True)
        return Response({
            'count': queryset.count(),
            'appointments': serializer.data
        })
    
    @action(detail=True, methods=['patch'], permission_classes=[IsAuthenticated])
    def admin_update_status(self, request, pk=None):
        """Admin endpoint to update any appointment's status"""
        if not (request.user.is_staff or request.user.is_superuser):
            return Response(
                {'error': 'Admin access required'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        appointment = self.get_object()
        new_status = request.data.get('status')
        
        valid_statuses = ['pending', 'confirmed', 'cancelled', 'completed', 'pencil', 'waiting']
        if new_status not in valid_statuses:
            return Response(
                {'error': f'Invalid status. Must be one of: {valid_statuses}'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        old_status = appointment.status
        appointment.status = new_status
        
        # Clear pencil expiry if confirming
        if new_status == 'confirmed' and appointment.pencil_expires_at:
            appointment.pencil_expires_at = None
        
        appointment.save()
        
        return Response({
            'message': f'Appointment status changed from {old_status} to {new_status}',
            'appointment': AppointmentSerializer(appointment).data
        })
    
    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def admin_confirm(self, request, pk=None):
        """Admin endpoint to confirm an appointment"""
        if not (request.user.is_staff or request.user.is_superuser):
            return Response(
                {'error': 'Admin access required'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        appointment = self.get_object()
        
        if appointment.status not in ['pending', 'pencil']:
            return Response(
                {'error': f'Cannot confirm appointment with status: {appointment.status}'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        appointment.status = 'confirmed'
        if appointment.pencil_expires_at:
            appointment.pencil_expires_at = None
        appointment.save()
        
        return Response({
            'message': 'Appointment confirmed successfully',
            'appointment': AppointmentSerializer(appointment).data
        })
    
    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def admin_cancel(self, request, pk=None):
        """Admin endpoint to cancel an appointment"""
        if not (request.user.is_staff or request.user.is_superuser):
            return Response(
                {'error': 'Admin access required'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        appointment = self.get_object()
        
        if appointment.status in ['completed', 'cancelled']:
            return Response(
                {'error': f'Cannot cancel appointment with status: {appointment.status}'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        appointment.status = 'cancelled'
        appointment.save()
        
        # Check waitlist for this timeslot
        check_waitlist_for_slots.delay()
        
        return Response({
            'message': 'Appointment cancelled successfully',
            'appointment': AppointmentSerializer(appointment).data
        })
    
    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def admin_complete(self, request, pk=None):
        """Admin endpoint to mark appointment as completed"""
        if not (request.user.is_staff or request.user.is_superuser):
            return Response(
                {'error': 'Admin access required'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        appointment = self.get_object()
        
        if appointment.status != 'confirmed':
            return Response(
                {'error': f'Only confirmed appointments can be completed. Current status: {appointment.status}'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        appointment.status = 'completed'
        appointment.save()
        
        return Response({
            'message': 'Appointment marked as completed',
            'appointment': AppointmentSerializer(appointment).data
        })
    
    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def admin_stats(self, request):
        """Get comprehensive statistics for admin dashboard"""
        if not (request.user.is_staff or request.user.is_superuser):
            return Response(
                {'error': 'Admin access required'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        from django.db.models import Count, Q
        from datetime import datetime, timedelta
        
        # Basic stats
        stats = {
            'total': Appointment.objects.count(),
            'pending': Appointment.objects.filter(status='pending').count(),
            'pencil': Appointment.objects.filter(status='pencil').count(),
            'confirmed': Appointment.objects.filter(status='confirmed').count(),
            'completed': Appointment.objects.filter(status='completed').count(),
            'cancelled': Appointment.objects.filter(status='cancelled').count(),
            'waiting': Appointment.objects.filter(status='waiting').count(),
        }
        
        # Today's appointments
        today = timezone.now().date()
        stats['today'] = Appointment.objects.filter(date=today).exclude(status='cancelled').count()
        
        # Upcoming appointments (next 7 days)
        next_week = today + timedelta(days=7)
        stats['upcoming'] = Appointment.objects.filter(
            date__range=[today, next_week]
        ).exclude(status='cancelled').count()
        
        # Appointments by user (top 10)
        users_data = Appointment.objects.values('user__username', 'user__email').annotate(
            total=Count('id'),
            pending=Count('id', filter=Q(status='pending')),
            confirmed=Count('id', filter=Q(status='confirmed')),
            completed=Count('id', filter=Q(status='completed')),
            cancelled=Count('id', filter=Q(status='cancelled'))
        ).order_by('-total')[:10]
        
        stats['top_users'] = list(users_data)
        
        # Appointments by date (last 30 days)
        last_30_days = today - timedelta(days=30)
        daily_stats = Appointment.objects.filter(
            date__gte=last_30_days
        ).values('date').annotate(
            count=Count('id')
        ).order_by('date')
        
        stats['daily'] = list(daily_stats)
        
        # Waitlist stats
        stats['waitlist_active'] = Waitlist.objects.filter(status='active').count()
        stats['waitlist_notified'] = Waitlist.objects.filter(status='notified').count()
        
        # AI suggestions stats
        stats['unread_suggestions'] = AISuggestion.objects.filter(is_read=False).count()
        stats['total_suggestions'] = AISuggestion.objects.count()
        
        return Response(stats)
    
    def update(self, request, *args, **kwargs):
        """Update appointment status (allows status updates for both admin and users)"""
        instance = self.get_object()
        
        # Check permissions
        is_admin = request.user.is_staff or request.user.is_superuser
        is_owner = instance.user == request.user
        
        if not (is_admin or is_owner):
            return Response(
                {'error': 'You do not have permission to update this appointment'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        if 'status' in request.data:
            new_status = request.data['status']
            old_status = instance.status
            
            # Regular users can only cancel their pending/confirmed appointments
            if not is_admin:
                if new_status not in ['cancelled']:
                    return Response(
                        {'error': 'Regular users can only cancel appointments'}, 
                        status=status.HTTP_400_BAD_REQUEST
                    )
                if old_status not in ['pending', 'confirmed']:
                    return Response(
                        {'error': 'Only pending or confirmed appointments can be cancelled'}, 
                        status=status.HTTP_400_BAD_REQUEST
                    )
            
            instance.status = new_status
            instance.save()
            
            serializer = self.get_serializer(instance)
            return Response({
                'message': f'Appointment {instance.status} successfully',
                'appointment': serializer.data
            })
        
        return Response(
            {'error': 'Only status updates are allowed'}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    
    def destroy(self, request, *args, **kwargs):
        """Cancel an appointment"""
        instance = self.get_object()
        
        # Check permissions
        is_admin = request.user.is_staff or request.user.is_superuser
        is_owner = instance.user == request.user
        
        if not (is_admin or is_owner):
            return Response(
                {'error': 'You do not have permission to cancel this appointment'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        if instance.status in ['pending', 'confirmed']:
            instance.status = 'cancelled'
            instance.save()
            
            # Check waitlist for this timeslot
            if is_admin:
                check_waitlist_for_slots.delay()
            
            return Response({
                'message': 'Appointment cancelled successfully'
            }, status=status.HTTP_200_OK)
        
        return Response(
            {'error': f'Cannot cancel appointment with status: {instance.status}'}, 
            status=status.HTTP_400_BAD_REQUEST
        )

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
                return Response({'error':'invalid credentials'}, status=401)
        else:
            return Response(serializer.errors, status=400)


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


class UserViewset(viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticated]
    queryset = User.objects.all()
    serializer_class = RegisterSerializer

    def list(self, request):
        queryset = User.objects.all()
        serializer = self.serializer_class(queryset, many=True)
        return Response(serializer.data)
    
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
                        'user': {'id': user.id, 'email': user.email, 'is_superuser': user.is_superuser,},
                        'token': token
                    }
                )
            else:
                return Response({'error':'invalid credentials'}, status=401)
        else:
            return Response(serializer.errors, status=400)
