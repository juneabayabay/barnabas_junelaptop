from django.shortcuts import render, redirect
from rest_framework import viewsets, permissions, status
from .serializers import *
from .models import *
from rest_framework.response import Response
from django.contrib.auth import get_user_model, authenticate
from knox.models import AuthToken
from django.conf import settings
from .forms import AppointmentForm
User = get_user_model()


class AppointmentViewSet(viewsets.ModelViewSet):
    serializer_class = AppointmentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # Only return appointments belonging to the logged-in user
        return Appointment.objects.filter(user=self.request.user).order_by('-created_at')

    def perform_create(self, serializer):
        # Save appointment with the current user and default status = pending
        serializer.save(user=self.request.user, status='pending')

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
