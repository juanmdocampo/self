from django.contrib.auth import authenticate
from rest_framework import serializers
from .models import Appointment, AppointmentModification, Availability, Conversation, Favorite, Message, PsychologistProfile, RecurringAvailability, RecurringBooking, SwipeAction, User


class PsychologistProfileSerializer(serializers.ModelSerializer):
    is_verified = serializers.SerializerMethodField()

    def get_is_verified(self, obj):
        return obj.verification_status == PsychologistProfile.STATUS_APPROVED

    class Meta:
        model = PsychologistProfile
        fields = [
            'specialties', 'modality', 'session_price', 'years_experience',
            'license_number', 'languages', 'city',
            'verification_status', 'rejection_reason',
            'is_verified', 'is_accepting_patients',
            'slot_duration', 'slot_gap',
        ]


class AdminPsychologistProfileSerializer(serializers.ModelSerializer):
    is_verified = serializers.SerializerMethodField()
    document_upload = serializers.SerializerMethodField()

    def get_is_verified(self, obj):
        return obj.verification_status == PsychologistProfile.STATUS_APPROVED

    def get_document_upload(self, obj):
        return _resolve_file_url(obj.document_upload, self.context.get('request'))

    class Meta:
        model = PsychologistProfile
        fields = [
            'specialties', 'modality', 'session_price', 'years_experience',
            'license_number', 'languages', 'city',
            'verification_status', 'rejection_reason', 'document_upload',
            'is_verified', 'is_accepting_patients',
            'slot_duration', 'slot_gap',
        ]


def _resolve_file_url(value, request):
    """Generate a presigned S3 GET URL if S3 is configured, otherwise build a local media URL."""
    if not value:
        return None

    from django.conf import settings
    if getattr(settings, 'AWS_ACCESS_KEY_ID', None):
        import boto3
        # Normalize to key: strip full S3 path-style prefix if stored as full URL
        key = str(value)
        prefix = f"{settings.AWS_S3_ENDPOINT_URL}/{settings.AWS_STORAGE_BUCKET_NAME}/"
        if key.startswith(prefix):
            key = key[len(prefix):]
        # If it's still a full URL (unknown format), return as-is
        if key.startswith('http'):
            return key
        s3 = boto3.client(
            's3',
            endpoint_url=settings.AWS_S3_ENDPOINT_URL,
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
            region_name=settings.AWS_S3_REGION_NAME,
        )
        return s3.generate_presigned_url(
            'get_object',
            Params={'Bucket': settings.AWS_STORAGE_BUCKET_NAME, 'Key': key},
            ExpiresIn=60 * 60 * 24,  # 24 hours
        )

    # Local storage fallback
    if str(value).startswith('http'):
        return str(value)
    if request:
        return request.build_absolute_uri(f'/media/{value}')
    return f'/media/{value}'


class UserSerializer(serializers.ModelSerializer):
    psychologist_profile = PsychologistProfileSerializer(read_only=True)
    avatar = serializers.SerializerMethodField()

    def get_avatar(self, obj):
        return _resolve_file_url(obj.avatar, self.context.get('request'))

    class Meta:
        model = User
        fields = [
            'id', 'username', 'first_name', 'last_name', 'email', 'role',
            'bio', 'avatar', 'city', 'sought_specialties', 'psychologist_profile',
        ]


class AdminUserSerializer(serializers.ModelSerializer):
    psychologist_profile = AdminPsychologistProfileSerializer(read_only=True)
    avatar = serializers.SerializerMethodField()

    def get_avatar(self, obj):
        return _resolve_file_url(obj.avatar, self.context.get('request'))

    class Meta:
        model = User
        fields = [
            'id', 'username', 'first_name', 'last_name', 'email', 'role',
            'bio', 'avatar', 'city', 'created_at', 'psychologist_profile',
        ]


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    psychologist_profile = PsychologistProfileSerializer(required=False)

    class Meta:
        model = User
        fields = [
            'username', 'email', 'password', 'first_name', 'last_name',
            'role', 'bio', 'city', 'sought_specialties', 'psychologist_profile',
        ]

    def create(self, validated_data):
        profile_data = validated_data.pop('psychologist_profile', None)
        user = User.objects.create_user(**validated_data)
        if user.role == User.ROLE_PSYCHOLOGIST and profile_data:
            PsychologistProfile.objects.create(user=user, **profile_data)
        elif user.role == User.ROLE_PSYCHOLOGIST:
            PsychologistProfile.objects.create(user=user)
        return user


class LoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField(write_only=True)

    def validate(self, data):
        user = authenticate(username=data['username'], password=data['password'])
        if not user:
            raise serializers.ValidationError('Credenciales inválidas.')
        data['user'] = user
        return data


class UpdatePsychologistProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = PsychologistProfile
        fields = [
            'specialties', 'modality', 'session_price', 'years_experience',
            'city', 'languages', 'license_number', 'slot_duration', 'slot_gap',
        ]


class UpdateProfileSerializer(serializers.ModelSerializer):
    psychologist_profile = UpdatePsychologistProfileSerializer(required=False)

    class Meta:
        model = User
        fields = ['first_name', 'last_name', 'email', 'bio', 'city', 'sought_specialties', 'psychologist_profile']

    def update(self, instance, validated_data):
        profile_data = validated_data.pop('psychologist_profile', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if profile_data and hasattr(instance, 'psychologist_profile'):
            for attr, value in profile_data.items():
                setattr(instance.psychologist_profile, attr, value)
            instance.psychologist_profile.save()
        return instance


class SwipeSerializer(serializers.ModelSerializer):
    class Meta:
        model = SwipeAction
        fields = ['psychologist', 'action']


class FavoriteSerializer(serializers.ModelSerializer):
    psychologist = UserSerializer(read_only=True)
    patient = UserSerializer(read_only=True)

    class Meta:
        model = Favorite
        fields = ['id', 'patient', 'psychologist', 'created_at', 'is_active']


class MessageSerializer(serializers.ModelSerializer):
    sender_id = serializers.IntegerField(source='sender.id', read_only=True)

    class Meta:
        model = Message
        fields = ['id', 'sender_id', 'text', 'created_at', 'is_read']


class ConversationSerializer(serializers.ModelSerializer):
    patient = UserSerializer(read_only=True)
    psychologist = UserSerializer(read_only=True)
    last_message = serializers.SerializerMethodField()
    unread_count = serializers.SerializerMethodField()

    def get_last_message(self, obj):
        last = obj.messages.order_by('-created_at').first()
        if not last:
            return None
        return {'text': last.text, 'created_at': last.created_at, 'sender_id': last.sender_id}

    def get_unread_count(self, obj):
        user = self.context.get('request').user
        return obj.messages.filter(is_read=False).exclude(sender=user).count()

    class Meta:
        model = Conversation
        fields = ['id', 'patient', 'psychologist', 'created_at', 'updated_at', 'last_message', 'unread_count']


class RecurringAvailabilitySerializer(serializers.ModelSerializer):
    class Meta:
        model = RecurringAvailability
        fields = ['id', 'day_of_week', 'start_time', 'end_time', 'is_active', 'cancelled_dates']


class AvailabilitySerializer(serializers.ModelSerializer):
    class Meta:
        model = Availability
        fields = ['id', 'date', 'start_time', 'end_time', 'is_booked']
        read_only_fields = ['is_booked']


class AppointmentSerializer(serializers.ModelSerializer):
    patient = UserSerializer(read_only=True)
    psychologist = UserSerializer(read_only=True)
    availability = AvailabilitySerializer(read_only=True)

    class Meta:
        model = Appointment
        fields = ['id', 'patient', 'psychologist', 'availability', 'status', 'rejection_reason', 'notes', 'created_at']


class RecurringBookingSerializer(serializers.ModelSerializer):
    patient = UserSerializer(read_only=True)
    psychologist = UserSerializer(read_only=True)

    class Meta:
        model = RecurringBooking
        fields = [
            'id', 'patient', 'psychologist', 'day_of_week', 'start_time', 'end_time',
            'notes', 'status', 'rejection_reason', 'cancelled_dates', 'created_at',
        ]


class AppointmentModificationSerializer(serializers.ModelSerializer):
    proposed_by = UserSerializer(read_only=True)

    class Meta:
        model = AppointmentModification
        fields = [
            'id', 'appointment', 'recurring_booking', 'proposed_by',
            'is_cancellation', 'new_date', 'new_start_time', 'new_end_time',
            'reason', 'status', 'created_at',
        ]


class VerifySerializer(serializers.Serializer):
    action = serializers.ChoiceField(choices=[
        PsychologistProfile.STATUS_APPROVED,
        PsychologistProfile.STATUS_REJECTED,
    ])
    rejection_reason = serializers.CharField(required=False, allow_blank=True, default='')

    def validate(self, data):
        if data['action'] == PsychologistProfile.STATUS_REJECTED and not data.get('rejection_reason', '').strip():
            raise serializers.ValidationError({'rejection_reason': 'Requerido al rechazar.'})
        return data
