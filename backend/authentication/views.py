from django.shortcuts import render

# Create your views here.
"""
Authentication views.

Each view is a function that takes an HTTP request and returns an HTTP response.
DRF wraps the raw Django request/response with extra conveniences:
  - request.data: parses JSON body into a Python dict
  - Response(...): serializes a dict to JSON with an HTTP status code

CSRF protection stays ON. React will read the csrftoken cookie and send it
back in the X-CSRFToken header — that's how the browser proves the request
came from our legitimate frontend.
"""

from django.contrib.auth import login as django_login, logout as django_logout
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .serializers import SignupSerializer, LoginSerializer


@api_view(["POST"])
def signup_view(request):
    """
    POST /api/signup/
    Body: { "username": "...", "email": "...", "password": "...", "password_confirm": "..." }
    Returns: 201 Created with user info, or 400 with field errors.
    """
    serializer = SignupSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    user = serializer.save()  # calls SignupSerializer.create()
    return Response(
        {
            "message": "Account created successfully.",
            "user": {
                "id": user.id,
                "username": user.username,
                "email": user.email,
            },
        },
        status=status.HTTP_201_CREATED,
    )


@api_view(["POST"])
def login_view(request):
    """
    POST /api/login/
    Body: { "username": "...", "password": "..." }
    Returns: 200 with user info + Set-Cookie sessionid, or 400 with error.
    """
    serializer = LoginSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    user = serializer.validated_data["user"]
    # This creates the session row in django_session and sets the sessionid cookie.
    django_login(request, user)

    return Response(
        {
            "message": "Logged in successfully.",
            "user": {
                "id": user.id,
                "username": user.username,
                "email": user.email,
            },
        },
        status=status.HTTP_200_OK,
    )


@api_view(["POST"])
def logout_view(request):
    """
    POST /api/logout/
    Deletes the session row and clears the sessionid cookie.
    Returns: 204 No Content (convention: nothing to say on logout).
    """
    django_logout(request)
    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def me_view(request):
    """
    GET /api/me/
    Requires a valid session cookie.
    Returns: 200 with user info, or 403 if not logged in (DRF handles that).
    """
    user = request.user
    return Response(
        {
            "id": user.id,
            "username": user.username,
            "email": user.email,
        },
        status=status.HTTP_200_OK,
    )