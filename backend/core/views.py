from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, BasePermission, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken

from .models import Conversation, Favorite, Message, PsychologistProfile, SwipeAction, User
from .serializers import (
    AdminUserSerializer, ConversationSerializer, FavoriteSerializer, LoginSerializer,
    MessageSerializer, RegisterSerializer, SwipeSerializer, UpdateProfileSerializer,
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

    language = request.query_params.get('language')

    if specialty:
        qs = qs.filter(psychologist_profile__specialties__icontains=specialty)
    if modality:
        qs = qs.filter(psychologist_profile__modality__in=[modality, 'both'])
    if max_price:
        qs = qs.filter(psychologist_profile__session_price__lte=max_price)
    if language:
        qs = qs.filter(psychologist_profile__languages__icontains=language)

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


@api_view(['GET'])
@permission_classes([AllowAny])
def psychologist_detail(request, pk):
    try:
        user = User.objects.filter(
            id=pk,
            role=User.ROLE_PSYCHOLOGIST,
            psychologist_profile__verification_status=PsychologistProfile.STATUS_APPROVED,
        ).select_related('psychologist_profile').get()
    except User.DoesNotExist:
        return Response({'detail': 'No encontrado.'}, status=status.HTTP_404_NOT_FOUND)
    return Response(UserSerializer(user).data)


# ── Chat endpoints ────────────────────────────────────────────────────────────

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def conversations(request):
    if request.method == 'GET':
        if request.user.role == User.ROLE_PATIENT:
            qs = Conversation.objects.filter(patient=request.user)
        else:
            qs = Conversation.objects.filter(psychologist=request.user)
        qs = qs.select_related(
            'patient', 'patient__psychologist_profile',
            'psychologist', 'psychologist__psychologist_profile',
        ).prefetch_related('messages').order_by('-updated_at')
        return Response(ConversationSerializer(qs, many=True, context={'request': request}).data)

    # POST — patient opens/creates a conversation
    if request.user.role != User.ROLE_PATIENT:
        return Response({'detail': 'Solo pacientes pueden iniciar conversaciones.'}, status=status.HTTP_403_FORBIDDEN)
    psychologist_id = request.data.get('psychologist_id')
    if not psychologist_id:
        return Response({'detail': 'psychologist_id requerido.'}, status=status.HTTP_400_BAD_REQUEST)
    try:
        psychologist = User.objects.get(id=psychologist_id, role=User.ROLE_PSYCHOLOGIST)
    except User.DoesNotExist:
        return Response({'detail': 'Psicólogo no encontrado.'}, status=status.HTTP_404_NOT_FOUND)
    conv, _ = Conversation.objects.get_or_create(patient=request.user, psychologist=psychologist)
    return Response(ConversationSerializer(conv, context={'request': request}).data, status=status.HTTP_201_CREATED)


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def conversation_messages(request, pk):
    try:
        if request.user.role == User.ROLE_PATIENT:
            conv = Conversation.objects.get(pk=pk, patient=request.user)
        else:
            conv = Conversation.objects.get(pk=pk, psychologist=request.user)
    except Conversation.DoesNotExist:
        return Response({'detail': 'No encontrado.'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        conv.messages.filter(is_read=False).exclude(sender=request.user).update(is_read=True)
        msgs = conv.messages.select_related('sender').order_by('created_at')
        return Response(MessageSerializer(msgs, many=True).data)

    text = request.data.get('text', '').strip()
    if not text:
        return Response({'detail': 'Mensaje vacío.'}, status=status.HTTP_400_BAD_REQUEST)
    msg = Message.objects.create(conversation=conv, sender=request.user, text=text)
    conv.save()  # touch updated_at
    return Response(MessageSerializer(msg).data, status=status.HTTP_201_CREATED)


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
