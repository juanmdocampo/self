from django.contrib.auth import authenticate
from rest_framework import serializers
from .models import Match, PsychologistProfile, SwipeAction, User


class PsychologistProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = PsychologistProfile
        fields = [
            'specialties', 'modality', 'session_price', 'years_experience',
            'license_number', 'languages', 'city', 'is_verified', 'is_accepting_patients',
        ]


class UserSerializer(serializers.ModelSerializer):
    psychologist_profile = PsychologistProfileSerializer(read_only=True)

    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name', 'email', 'role', 'bio', 'avatar', 'psychologist_profile']


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    psychologist_profile = PsychologistProfileSerializer(required=False)

    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'first_name', 'last_name', 'role', 'bio', 'psychologist_profile']

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
        fields = ['specialties', 'modality', 'session_price', 'years_experience', 'city', 'languages', 'license_number']


class UpdateProfileSerializer(serializers.ModelSerializer):
    psychologist_profile = UpdatePsychologistProfileSerializer(required=False)

    class Meta:
        model = User
        fields = ['first_name', 'last_name', 'email', 'bio', 'psychologist_profile']

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


class MatchSerializer(serializers.ModelSerializer):
    psychologist = UserSerializer(read_only=True)
    patient = UserSerializer(read_only=True)

    class Meta:
        model = Match
        fields = ['id', 'patient', 'psychologist', 'created_at', 'is_active']
