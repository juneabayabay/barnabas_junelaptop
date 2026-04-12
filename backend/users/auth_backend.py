# auth_backends.py
from django.contrib.auth import get_user_model
User = get_user_model()

class EmailAuthBackend:
    def authenticate(self, request, email=None, password=None, **kwargs):
        
        if email is None or password is None:
            return None
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return None

        if user.check_password(password) and self.user_can_authenticate(user):
            return user
        return None

    def get_user(self, user_id):
        try:
            return User.objects.get(pk=user_id)
        except User.DoesNotExist:
            return None

    def user_can_authenticate(self, user):
        return getattr(user, "is_active", False)
