from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken

from .models import Match, SwipeAction, User
from .serializers import (
    LoginSerializer, MatchSerializer, RegisterSerializer,
    SwipeSerializer, UpdateProfileSerializer, UserSerializer,
)


def _jwt_response(user, http_status=status.HTTP_200_OK):
    refresh = RefreshToken.for_user(user)
    return Response({
        'access': str(refresh.access_token),
        'refresh': str(refresh),
        'user': UserSerializer(user).data,
    }, status=http_status)


@api_view(['POST'])
@permission_classes([AllowAny])
def register(request):
    serializer = RegisterSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    user = serializer.save()
    return _jwt_response(user, status.HTTP_201_CREATED)


@api_view(['POST'])
@permission_classes([AllowAny])
def login(request):
    serializer = LoginSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    return _jwt_response(serializer.validated_data['user'])


@api_view(['GET', 'PATCH'])
@permission_classes([IsAuthenticated])
def me(request):
    if request.method == 'GET':
        return Response(UserSerializer(request.user).data)

    user = request.user
    if 'avatar' in request.FILES:
        user.avatar = request.FILES['avatar']
        user.save()

    serializer = UpdateProfileSerializer(user, data=request.data, partial=True)
    serializer.is_valid(raise_exception=True)
    serializer.save()
    return Response(UserSerializer(user).data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def psychologists_list(request):
    qs = User.objects.filter(role=User.ROLE_PSYCHOLOGIST).select_related('psychologist_profile')

    specialty = request.query_params.get('specialty')
    modality = request.query_params.get('modality')
    max_price = request.query_params.get('max_price')

    if specialty:
        qs = qs.filter(psychologist_profile__specialties__icontains=specialty)
    if modality:
        qs = qs.filter(psychologist_profile__modality__in=[modality, 'both'])
    if max_price:
        qs = qs.filter(psychologist_profile__session_price__lte=max_price)

    swipes = {}
    if request.user.role == User.ROLE_PATIENT:
        for s in SwipeAction.objects.filter(patient=request.user, psychologist__in=qs):
            swipes[s.psychologist_id] = s.action

    data = UserSerializer(qs, many=True).data
    for item in data:
        item['swipe_status'] = swipes.get(item['id'])

    return Response(data)


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
    else:
        Match.objects.filter(patient=request.user, psychologist_id=psychologist_id).delete()

    return Response({'match': match_created})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_matches(request):
    if request.user.role == User.ROLE_PATIENT:
        matches = Match.objects.filter(patient=request.user, is_active=True).select_related(
            'psychologist', 'psychologist__psychologist_profile'
        )
    else:
        matches = Match.objects.filter(psychologist=request.user, is_active=True).select_related(
            'patient'
        )
    return Response(MatchSerializer(matches, many=True).data)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_match(request, pk):
    try:
        if request.user.role == User.ROLE_PATIENT:
            match = Match.objects.get(pk=pk, patient=request.user)
        else:
            match = Match.objects.get(pk=pk, psychologist=request.user)
        match.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
    except Match.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)
