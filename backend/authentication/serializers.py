"""
Serializers for authentication.

A serializer in Django REST Framework does two things:
  - validate incoming JSON and turn it into Python objects (deserialization)
  - turn Python objects back into JSON for responses (serialization)

We use them here as the *input gatekeeper* for signup and login. If a
serializer raises ValidationError, DRF returns a 400 with field errors
and nothing is written to the database.
"""

from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers


class SignupSerializer(serializers.Serializer):
    """
    Validates signup input and creates a user.

    We use a plain Serializer (not ModelSerializer) on purpose:
      - we need custom validation (confirm password, uniqueness, etc.)
      - we don't want to expose the model's auto-generated fields (id,
        date_joined, etc.) on input
      - we handle password hashing explicitly via create_user()
    """

    username = serializers.CharField(min_length=3, max_length=150)
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, min_length=8)
    password_confirm = serializers.CharField(write_only=True)

    def validate_username(self, value):
        """
        Field-level validator. Runs after `username` is validated as a string.
        Must be unique.
        """
        if User.objects.filter(username__iexact=value).exists():
            raise serializers.ValidationError("This username is already taken.")
        return value

    def validate_email(self, value):
        """
        Field-level validator for email. Must be unique.
        `__iexact` makes the check case-insensitive:
        user@example.com and User@Example.com are the same email.
        """
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("This email is already registered.")
        return value

    def validate(self, attrs):
        """
        Object-level validator. Runs AFTER all field-level validators pass.
        This is where we do cross-field checks (passwords match, strength).
        """
        if attrs["password"] != attrs["password_confirm"]:
            raise serializers.ValidationError({"password_confirm": "Passwords do not match."})

        # Django's built-in password validators from settings.AUTH_PASSWORD_VALIDATORS:
        # - minimum length
        # - not a common password
        # - not all digits
        # - not too similar to the username
        try:
            validate_password(attrs["password"])
        except DjangoValidationError as exc:
            raise serializers.ValidationError({"password": list(exc.messages)})

        return attrs

    def create(self, validated_data):
        """
        Called by the view when serializer.is_valid() passes and .save() is called.

        *** THIS IS WHERE HASHING HAPPENS ***
        User.objects.create_user() is a helper that:
          1. takes the plain-text password
          2. hashes it with Django's password hasher (PBKDF2-SHA256 by default)
          3. stores only the hash in auth_user.password
        The plain-text password is never stored anywhere.
        """
        user = User.objects.create_user(
            username=validated_data["username"],
            email=validated_data["email"],
            password=validated_data["password"],
        )
        return user


class LoginSerializer(serializers.Serializer):
    """
    Validates login credentials using Django's authenticate() function.

    authenticate() does the password check for us:
      - looks up the user by username
      - hashes the submitted password with the user's stored hash
      - compares the two hashes
      - returns the User object on success, or None on failure
    """

    username = serializers.CharField()
    password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        username = attrs.get("username")
        password = attrs.get("password")

        # authenticate() may return None (bad credentials) or a User.
        user = authenticate(username=username, password=password)

        if user is None:
            # The message is intentionally generic: we do not reveal
            # whether the username exists or the password was wrong.
            # This is a security best-practice (prevents user enumeration).
            raise serializers.ValidationError("Invalid credentials.")

        if not user.is_active:
            raise serializers.ValidationError("This account is disabled.")

        attrs["user"] = user
        return attrs