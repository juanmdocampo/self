from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, BasePermission, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken

from .models import Favorite, PsychologistProfile, SwipeAction, User
from .serializers import (
    AdminUserSerializer, FavoriteSerializer, LoginSerializer,
    RegisterSerializer, SwipeSerializer, UpdateProfileSerializer,
    UserSerializer, VerifySerializer,
)


class IsAdminRole(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == User.ROLE_ADMIN


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

    if 'document_upload' in request.FILES and hasattr(user, 'psychologist_profile'):
        user.psychologist_profile.document_upload = request.FILES['document_upload']
        user.psychologist_profile.save()

    serializer = UpdateProfileSerializer(user, data=request.data, partial=True)
    serializer.is_valid(raise_exception=True)
    serializer.save()
    return Response(UserSerializer(user).data)


@api_view(['GET'])
@permission_classes([AllowAny])
def psychologists_list(request):
    qs = User.objects.filter(
        role=User.ROLE_PSYCHOLOGIST,
        psychologist_profile__verification_status=PsychologistProfile.STATUS_APPROVED,
    ).select_related('psychologist_profile')

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
    if request.user.is_authenticated and request.user.role == User.ROLE_PATIENT:
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
        _, match_created = Favorite.objects.get_or_create(
            patient=request.user,
            psychologist_id=psychologist_id,
        )
    else:
        Favorite.objects.filter(patient=request.user, psychologist_id=psychologist_id).delete()

    return Response({'match': match_created})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_favorites(request):
    if request.user.role == User.ROLE_PATIENT:
        favorites = Favorite.objects.filter(patient=request.user, is_active=True).select_related(
            'psychologist', 'psychologist__psychologist_profile'
        )
    else:
        favorites = Favorite.objects.filter(psychologist=request.user, is_active=True).select_related(
            'patient'
        )
    return Response(FavoriteSerializer(favorites, many=True).data)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_favorite(request, pk):
    try:
        if request.user.role == User.ROLE_PATIENT:
            favorite = Favorite.objects.get(pk=pk, patient=request.user)
        else:
            favorite = Favorite.objects.get(pk=pk, psychologist=request.user)
        favorite.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
    except Favorite.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)


# ── Admin endpoints ───────────────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAdminRole])
def admin_psychologists(request):
    status_filter = request.query_params.get('status', PsychologistProfile.STATUS_PENDING)
    qs = User.objects.filter(
        role=User.ROLE_PSYCHOLOGIST,
        psychologist_profile__verification_status=status_filter,
    ).select_related('psychologist_profile').order_by('-created_at')
    return Response(AdminUserSerializer(qs, many=True).data)


@api_view(['POST'])
@permission_classes([IsAdminRole])
def admin_verify(request, pk):
    serializer = VerifySerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    try:
        profile = PsychologistProfile.objects.select_related('user').get(user_id=pk)
    except PsychologistProfile.DoesNotExist:
        return Response({'detail': 'No encontrado.'}, status=status.HTTP_404_NOT_FOUND)

    profile.verification_status = serializer.validated_data['action']
    profile.rejection_reason = serializer.validated_data.get('rejection_reason', '')
    profile.save()
    return Response(AdminUserSerializer(profile.user).data)


@api_view(['GET'])
@permission_classes([IsAdminRole])
def admin_stats(request):
    return Response({
        'total_patients': User.objects.filter(role=User.ROLE_PATIENT).count(),
        'total_psychologists': User.objects.filter(role=User.ROLE_PSYCHOLOGIST).count(),
        'pending_review': PsychologistProfile.objects.filter(verification_status=PsychologistProfile.STATUS_PENDING).count(),
        'approved': PsychologistProfile.objects.filter(verification_status=PsychologistProfile.STATUS_APPROVED).count(),
        'rejected': PsychologistProfile.objects.filter(verification_status=PsychologistProfile.STATUS_REJECTED).count(),
        'total_favorites': Favorite.objects.filter(is_active=True).count(),
    })
