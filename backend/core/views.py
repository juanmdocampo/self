from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from .models import Match, SwipeAction, User
from .serializers import (
    LoginSerializer, MatchSerializer, RegisterSerializer,
    SwipeSerializer, UserSerializer,
)


@api_view(['POST'])
@permission_classes([AllowAny])
def register(request):
    serializer = RegisterSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    user = serializer.save()
    token, _ = Token.objects.get_or_create(user=user)
    return Response({'token': token.key, 'user': UserSerializer(user).data}, status=status.HTTP_201_CREATED)


@api_view(['POST'])
@permission_classes([AllowAny])
def login(request):
    serializer = LoginSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    user = serializer.validated_data['user']
    token, _ = Token.objects.get_or_create(user=user)
    return Response({'token': token.key, 'user': UserSerializer(user).data})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def me(request):
    return Response(UserSerializer(request.user).data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def psychologists_list(request):
    already_swiped = SwipeAction.objects.filter(patient=request.user).values_list('psychologist_id', flat=True)
    qs = User.objects.filter(role=User.ROLE_PSYCHOLOGIST).exclude(id__in=already_swiped)

    specialty = request.query_params.get('specialty')
    modality = request.query_params.get('modality')
    max_price = request.query_params.get('max_price')

    if specialty:
        qs = qs.filter(psychologist_profile__specialties__contains=[specialty])
    if modality:
        qs = qs.filter(psychologist_profile__modality__in=[modality, 'both'])
    if max_price:
        qs = qs.filter(psychologist_profile__session_price__lte=max_price)

    return Response(UserSerializer(qs, many=True).data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def swipe(request):
    serializer = SwipeSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    psychologist_id = serializer.validated_data['psychologist'].id
    action = serializer.validated_data['action']

    SwipeAction.objects.update_or_create(
        patient=request.user,
        psychologist_id=psychologist_id,
        defaults={'action': action},
    )

    match_created = False
    if action == SwipeAction.LIKE:
        _, match_created = Match.objects.get_or_create(
            patient=request.user,
            psychologist_id=psychologist_id,
        )

    return Response({'match': match_created})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_matches(request):
    if request.user.role == User.ROLE_PATIENT:
        matches = Match.objects.filter(patient=request.user, is_active=True)
    else:
        matches = Match.objects.filter(psychologist=request.user, is_active=True)
    return Response(MatchSerializer(matches, many=True).data)
