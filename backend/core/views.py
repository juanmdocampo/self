import uuid
from datetime import date, datetime, timedelta

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, BasePermission, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken

from .models import Appointment, AppointmentModification, Availability, Conversation, Favorite, Message, PsychologistProfile, RecurringAvailability, RecurringBooking, SwipeAction, User
from .serializers import (
    AdminUserSerializer, AppointmentModificationSerializer, AppointmentSerializer, AvailabilitySerializer,
    ConversationSerializer, FavoriteSerializer, LoginSerializer,
    MessageSerializer, RecurringAvailabilitySerializer, RecurringBookingSerializer, RegisterSerializer,
    SwipeSerializer, UpdateProfileSerializer, UserSerializer, VerifySerializer,
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


# ── Calendar helpers ──────────────────────────────────────────────────────────

def _parse_date(s):
    return datetime.fromisoformat(s[:10]).date() if s else None


_C_AVAILABLE = '#8BAF8E'
_C_PENDING   = '#F59E0B'
_C_CONFIRMED = '#EA580C'
_C_REJECTED  = '#9CA3AF'


def _slot_event(slot, patient_name=None, appt_status=None, appt_id=None):
    if appt_status == Appointment.STATUS_PENDING:
        color = _C_PENDING
        title = f'Pendiente — {patient_name}' if patient_name else 'Pendiente'
    elif appt_status == Appointment.STATUS_CONFIRMED:
        color = _C_CONFIRMED
        title = f'Reservado — {patient_name}' if patient_name else 'Reservado'
    else:
        color = _C_AVAILABLE
        title = 'Disponible'
    return {
        'id': f'slot_{slot.id}',
        'title': title,
        'start': f'{slot.date}T{slot.start_time}',
        'end': f'{slot.date}T{slot.end_time}',
        'backgroundColor': color,
        'borderColor': color,
        'extendedProps': {
            'type': appt_status or 'available',
            'slot_id': slot.id,
            'appointment_id': appt_id,
            'patient_name': patient_name,
        },
    }


def _recurring_event(rule, target_date):
    return {
        'id': f'recurring_{rule.id}_{target_date.isoformat()}',
        'title': 'Disponible',
        'start': f'{target_date}T{rule.start_time}',
        'end': f'{target_date}T{rule.end_time}',
        'backgroundColor': _C_AVAILABLE,
        'borderColor': _C_AVAILABLE,
        'extendedProps': {
            'type': 'recurring',
            'rule_id': rule.id,
            'date': target_date.isoformat(),
            'start_time': str(rule.start_time),
            'end_time': str(rule.end_time),
        },
    }


def _generate_events_for_range(psychologist, start_date, end_date, public=False):
    """Return FullCalendar event dicts for a psychologist in [start_date, end_date]."""
    events = []

    # 1. Specific Availability slots
    slots = Availability.objects.filter(
        psychologist=psychologist, date__range=[start_date, end_date]
    ).select_related('appointment__patient')

    booked_keys = set()  # (date, start_time) of specific slots
    for slot in slots:
        if public and slot.is_booked:
            continue
        patient_name = appt_status = appt_id = None
        if slot.is_booked:
            try:
                appt = slot.appointment
                patient_name = appt.patient.get_full_name() or appt.patient.username
                appt_status = appt.status
                appt_id = appt.id
            except Exception:
                pass
        events.append(_slot_event(slot, patient_name, appt_status, appt_id))
        booked_keys.add((slot.date, slot.start_time))

    # 2. Recurring bookings
    rb_qs = RecurringBooking.objects.filter(
        psychologist=psychologist,
    ).exclude(status__in=[RecurringBooking.STATUS_CANCELLED, RecurringBooking.STATUS_REJECTED])
    if public:
        rb_qs = rb_qs.filter(status=RecurringBooking.STATUS_CONFIRMED)
    rb_qs = rb_qs.select_related('patient')

    # (day_of_week, start_time) → set of cancelled dates, for confirmed RBs blocking public slots
    rb_blocked = {}
    rb_suppress = set()  # (date, start_time) shown via recurring booking in psych calendar

    for rb in rb_qs:
        key = (rb.day_of_week, rb.start_time)
        if rb.status == RecurringBooking.STATUS_CONFIRMED:
            if key not in rb_blocked:
                rb_blocked[key] = set(rb.cancelled_dates)
            else:
                rb_blocked[key].update(rb.cancelled_dates)

        if not public:
            color = _C_PENDING if rb.status == RecurringBooking.STATUS_PENDING else _C_CONFIRMED
            patient_name = rb.patient.get_full_name() or rb.patient.username
            label = (f'Pendiente — {patient_name}' if rb.status == RecurringBooking.STATUS_PENDING
                     else f'Recurrente — {patient_name}')
            cur = start_date
            while cur <= end_date:
                if (cur.weekday() == rb.day_of_week
                        and cur.isoformat() not in rb.cancelled_dates
                        and (cur, rb.start_time) not in booked_keys):
                    events.append({
                        'id': f'rb_{rb.id}_{cur.isoformat()}',
                        'title': label,
                        'start': f'{cur}T{rb.start_time}',
                        'end': f'{cur}T{rb.end_time}',
                        'backgroundColor': color,
                        'borderColor': color,
                        'extendedProps': {
                            'type': 'recurring_booking',
                            'recurring_booking_id': rb.id,
                            'status': rb.status,
                            'patient_name': patient_name,
                            'date': cur.isoformat(),
                        },
                    })
                    rb_suppress.add((cur, rb.start_time))
                cur += timedelta(days=1)

    # 3. Recurring availability rules — skip slots already covered
    rules = RecurringAvailability.objects.filter(psychologist=psychologist, is_active=True)
    current = start_date
    while current <= end_date:
        for rule in rules:
            if current.weekday() != rule.day_of_week:
                continue
            if current.isoformat() in rule.cancelled_dates:
                continue  # explicitly cancelled occurrence
            if (current, rule.start_time) in booked_keys:
                continue
            if (current, rule.start_time) in rb_suppress:
                continue
            rb_key = (rule.day_of_week, rule.start_time)
            if public and rb_key in rb_blocked:
                if current.isoformat() not in rb_blocked[rb_key]:
                    continue  # blocked by a confirmed recurring booking
            events.append(_recurring_event(rule, current))
        current += timedelta(days=1)

    return events


# ── Calendar endpoints ────────────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def calendar_events(request):
    """Logged-in user's own events (psychologist: all slots; patient: their appointments)."""
    start_date = _parse_date(request.query_params.get('start')) or date.today()
    end_date = _parse_date(request.query_params.get('end')) or (start_date + timedelta(days=42))

    if request.user.role == User.ROLE_PSYCHOLOGIST:
        events = _generate_events_for_range(request.user, start_date, end_date)
    else:
        events = []
        appts = Appointment.objects.filter(
            patient=request.user,
            availability__date__range=[start_date, end_date],
        ).select_related('psychologist', 'availability').exclude(status=Appointment.STATUS_CANCELLED)

        color_map = {
            Appointment.STATUS_PENDING:   _C_PENDING,
            Appointment.STATUS_CONFIRMED: _C_CONFIRMED,
            Appointment.STATUS_REJECTED:  _C_REJECTED,
        }
        status_labels = {
            Appointment.STATUS_PENDING: 'Pendiente',
            Appointment.STATUS_CONFIRMED: 'Confirmado',
            Appointment.STATUS_REJECTED: 'Rechazado',
        }
        for appt in appts:
            av = appt.availability
            color = color_map.get(appt.status, '#6B5B47')
            psych_name = appt.psychologist.get_full_name() or appt.psychologist.username
            label = status_labels.get(appt.status, '')
            events.append({
                'id': f'appt_{appt.id}',
                'title': f'{psych_name} — {label}',
                'start': f'{av.date}T{av.start_time}',
                'end': f'{av.date}T{av.end_time}',
                'backgroundColor': color,
                'borderColor': color,
                'extendedProps': {
                    'type': 'appointment',
                    'appointment_id': appt.id,
                    'status': appt.status,
                    'rejection_reason': appt.rejection_reason,
                    'psychologist_name': psych_name,
                },
            })

        # RecurringBooking virtual events
        rb_color_map = {
            RecurringBooking.STATUS_PENDING:   _C_PENDING,
            RecurringBooking.STATUS_CONFIRMED: _C_CONFIRMED,
        }
        rb_qs = RecurringBooking.objects.filter(
            patient=request.user,
        ).exclude(status__in=[RecurringBooking.STATUS_CANCELLED, RecurringBooking.STATUS_REJECTED]).select_related('psychologist')
        for rb in rb_qs:
            color = rb_color_map.get(rb.status, '#6B5B47')
            psych_name = rb.psychologist.get_full_name() or rb.psychologist.username
            label = 'Pendiente' if rb.status == RecurringBooking.STATUS_PENDING else 'Recurrente'
            current = start_date
            while current <= end_date:
                if current.weekday() == rb.day_of_week and current.isoformat() not in rb.cancelled_dates:
                    events.append({
                        'id': f'rb_{rb.id}_{current.isoformat()}',
                        'title': f'{psych_name} ({label})',
                        'start': f'{current}T{rb.start_time}',
                        'end': f'{current}T{rb.end_time}',
                        'backgroundColor': color,
                        'borderColor': color,
                        'extendedProps': {
                            'type': 'recurring_booking',
                            'recurring_booking_id': rb.id,
                            'status': rb.status,
                            'psychologist_name': psych_name,
                            'date': current.isoformat(),
                        },
                    })
                current += timedelta(days=1)

    return Response(events)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def psychologist_public_events(request, pk):
    """Available slots for a specific psychologist (for patient to browse & book)."""
    start_date = _parse_date(request.query_params.get('start')) or date.today()
    end_date = _parse_date(request.query_params.get('end')) or (start_date + timedelta(days=42))
    try:
        psych = User.objects.get(pk=pk, role=User.ROLE_PSYCHOLOGIST)
    except User.DoesNotExist:
        return Response({'detail': 'No encontrado.'}, status=status.HTTP_404_NOT_FOUND)
    events = _generate_events_for_range(psych, start_date, end_date, public=True)
    return Response(events)


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def recurring_availability(request):
    if request.user.role != User.ROLE_PSYCHOLOGIST:
        return Response({'detail': 'Solo psicólogos.'}, status=status.HTTP_403_FORBIDDEN)
    if request.method == 'GET':
        rules = RecurringAvailability.objects.filter(psychologist=request.user)
        return Response(RecurringAvailabilitySerializer(rules, many=True).data)
    serializer = RecurringAvailabilitySerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    rule = serializer.save(psychologist=request.user)
    return Response(RecurringAvailabilitySerializer(rule).data, status=status.HTTP_201_CREATED)


@api_view(['DELETE', 'PATCH'])
@permission_classes([IsAuthenticated])
def recurring_availability_detail(request, pk):
    try:
        rule = RecurringAvailability.objects.get(pk=pk, psychologist=request.user)
    except RecurringAvailability.DoesNotExist:
        return Response({'detail': 'No encontrado.'}, status=status.HTTP_404_NOT_FOUND)
    if request.method == 'PATCH':
        cancel_date = request.data.get('cancel_date')
        if not cancel_date:
            return Response({'detail': 'cancel_date requerido.'}, status=status.HTTP_400_BAD_REQUEST)
        if cancel_date not in rule.cancelled_dates:
            rule.cancelled_dates.append(cancel_date)
            rule.save()
        return Response(RecurringAvailabilitySerializer(rule).data)
    rule.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def availability_slots(request):
    """Psychologist creates a specific one-off slot."""
    if request.user.role != User.ROLE_PSYCHOLOGIST:
        return Response({'detail': 'Solo psicólogos.'}, status=status.HTTP_403_FORBIDDEN)
    serializer = AvailabilitySerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    slot = serializer.save(psychologist=request.user)
    return Response(AvailabilitySerializer(slot).data, status=status.HTTP_201_CREATED)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def availability_slot_detail(request, pk):
    try:
        slot = Availability.objects.get(pk=pk, psychologist=request.user)
    except Availability.DoesNotExist:
        return Response({'detail': 'No encontrado.'}, status=status.HTTP_404_NOT_FOUND)
    if slot.is_booked:
        return Response({'detail': 'No se puede eliminar un turno reservado.'}, status=status.HTTP_400_BAD_REQUEST)
    slot.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def appointments(request):
    if request.method == 'GET':
        if request.user.role == User.ROLE_PATIENT:
            qs = Appointment.objects.filter(patient=request.user).select_related(
                'psychologist', 'psychologist__psychologist_profile', 'availability'
            ).order_by('availability__date', 'availability__start_time')
        else:
            qs = Appointment.objects.filter(psychologist=request.user).select_related(
                'patient', 'availability'
            ).order_by('availability__date', 'availability__start_time')
        return Response(AppointmentSerializer(qs, many=True).data)

    # POST — patient books a slot (specific or from recurring rule)
    if request.user.role != User.ROLE_PATIENT:
        return Response({'detail': 'Solo pacientes pueden reservar turnos.'}, status=status.HTTP_403_FORBIDDEN)

    notes = request.data.get('notes', '')
    recurring_weeks = int(request.data.get('recurring_weeks', 0))

    # Case A: booking an existing specific slot
    slot_id = request.data.get('slot_id')
    if slot_id:
        try:
            slot = Availability.objects.select_for_update().get(pk=slot_id, is_booked=False)
        except Availability.DoesNotExist:
            return Response({'detail': 'Turno no disponible.'}, status=status.HTTP_400_BAD_REQUEST)
        rid = uuid.uuid4() if recurring_weeks else None
        slot.is_booked = True
        slot.save()
        appt = Appointment.objects.create(
            patient=request.user, psychologist=slot.psychologist,
            availability=slot, notes=notes, recurring_id=rid,
        )
        created = [appt]

        # Generate recurring follow-ups
        if recurring_weeks:
            for w in range(1, recurring_weeks):
                next_date = slot.date + timedelta(weeks=w)
                next_slot, _ = Availability.objects.get_or_create(
                    psychologist=slot.psychologist, date=next_date,
                    start_time=slot.start_time,
                    defaults={'end_time': slot.end_time},
                )
                if not next_slot.is_booked:
                    next_slot.is_booked = True
                    next_slot.save()
                    Appointment.objects.create(
                        patient=request.user, psychologist=slot.psychologist,
                        availability=next_slot, notes=notes, recurring_id=rid,
                    )
        return Response(AppointmentSerializer(created[0]).data, status=status.HTTP_201_CREATED)

    # Case B: booking a recurring-rule virtual slot
    psych_id = request.data.get('psychologist_id')
    slot_date = request.data.get('date')
    start_time = request.data.get('start_time')
    end_time = request.data.get('end_time')
    if not all([psych_id, slot_date, start_time, end_time]):
        return Response({'detail': 'Faltan datos para reservar.'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        psych = User.objects.get(pk=psych_id, role=User.ROLE_PSYCHOLOGIST)
    except User.DoesNotExist:
        return Response({'detail': 'Psicólogo no encontrado.'}, status=status.HTTP_404_NOT_FOUND)

    rid = uuid.uuid4() if recurring_weeks else None
    created = []
    base_date = datetime.fromisoformat(slot_date).date()
    weeks = max(1, recurring_weeks)

    # Confirmed recurring bookings for this psych+time block certain dates
    blocking_rbs = list(RecurringBooking.objects.filter(
        psychologist=psych,
        start_time=start_time,
        status=RecurringBooking.STATUS_CONFIRMED,
    ))

    for w in range(weeks):
        target = base_date + timedelta(weeks=w)
        # Skip dates blocked by a confirmed recurring booking
        if any(
            rb.day_of_week == target.weekday() and target.isoformat() not in rb.cancelled_dates
            for rb in blocking_rbs
        ):
            continue
        slot, _ = Availability.objects.get_or_create(
            psychologist=psych, date=target, start_time=start_time,
            defaults={'end_time': end_time},
        )
        if slot.is_booked:
            continue
        slot.is_booked = True
        slot.save()
        created.append(Appointment.objects.create(
            patient=request.user, psychologist=psych,
            availability=slot, notes=notes, recurring_id=rid,
        ))

    if not created:
        return Response({'detail': 'No se pudo reservar ningún turno.'}, status=status.HTTP_400_BAD_REQUEST)
    return Response(AppointmentSerializer(created[0]).data, status=status.HTTP_201_CREATED)


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def appointment_detail(request, pk):
    try:
        if request.user.role == User.ROLE_PATIENT:
            appt = Appointment.objects.get(pk=pk, patient=request.user)
        else:
            appt = Appointment.objects.get(pk=pk, psychologist=request.user)
    except Appointment.DoesNotExist:
        return Response({'detail': 'No encontrado.'}, status=status.HTTP_404_NOT_FOUND)

    new_status = request.data.get('status')
    allowed = {
        User.ROLE_PATIENT: [Appointment.STATUS_CANCELLED],
        User.ROLE_PSYCHOLOGIST: [Appointment.STATUS_CONFIRMED, Appointment.STATUS_REJECTED, Appointment.STATUS_CANCELLED],
    }
    if new_status not in allowed.get(request.user.role, []):
        return Response({'detail': 'Acción no permitida.'}, status=status.HTTP_403_FORBIDDEN)

    if new_status in (Appointment.STATUS_CANCELLED, Appointment.STATUS_REJECTED):
        appt.availability.is_booked = False
        appt.availability.save()

    if new_status == Appointment.STATUS_REJECTED:
        appt.rejection_reason = request.data.get('rejection_reason', '').strip()

    appt.status = new_status
    appt.save()
    return Response(AppointmentSerializer(appt).data)


# ── Calendar V2: range-based slot generation ─────────────────────────────────

def _time_slots(start_t, end_t, duration_min, gap_min):
    slots = []
    base_dt = datetime(2000, 1, 1)
    current = datetime.combine(base_dt.date(), start_t)
    end_dt = datetime.combine(base_dt.date(), end_t)
    step = timedelta(minutes=int(duration_min))
    gap = timedelta(minutes=int(gap_min))
    while current + step <= end_dt:
        slot_end = current + step
        slots.append((current.time(), slot_end.time()))
        current = slot_end + gap
    return slots


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def slots_range(request):
    """Psychologist creates multiple one-off slots from a time range."""
    if request.user.role != User.ROLE_PSYCHOLOGIST:
        return Response({'detail': 'Solo psicólogos.'}, status=status.HTTP_403_FORBIDDEN)

    slot_date = request.data.get('date')
    start_str = request.data.get('start_time')
    end_str = request.data.get('end_time')
    if not all([slot_date, start_str, end_str]):
        return Response({'detail': 'date, start_time, end_time requeridos.'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        profile = request.user.psychologist_profile
    except PsychologistProfile.DoesNotExist:
        return Response({'detail': 'Perfil no encontrado.'}, status=status.HTTP_404_NOT_FOUND)

    try:
        from datetime import time as time_type
        start_t = time_type.fromisoformat(start_str[:5])
        end_t = time_type.fromisoformat(end_str[:5])
    except (ValueError, TypeError):
        return Response({'detail': 'Formato de tiempo inválido.'}, status=status.HTTP_400_BAD_REQUEST)

    generated = _time_slots(start_t, end_t, profile.slot_duration, profile.slot_gap)
    if not generated:
        return Response({'detail': 'No se generaron turnos. Verificá duración y rango.'}, status=status.HTTP_400_BAD_REQUEST)

    created_count = 0
    for s, e in generated:
        _, made = Availability.objects.get_or_create(
            psychologist=request.user, date=slot_date, start_time=s,
            defaults={'end_time': e},
        )
        if made:
            created_count += 1

    return Response({'created': created_count, 'total': len(generated)}, status=status.HTTP_201_CREATED)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def recurring_availability_range(request):
    """Psychologist creates multiple recurring rules from a time range."""
    if request.user.role != User.ROLE_PSYCHOLOGIST:
        return Response({'detail': 'Solo psicólogos.'}, status=status.HTTP_403_FORBIDDEN)

    day_of_week = request.data.get('day_of_week')
    start_str = request.data.get('start_time')
    end_str = request.data.get('end_time')
    if day_of_week is None or not all([start_str, end_str]):
        return Response({'detail': 'day_of_week, start_time, end_time requeridos.'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        profile = request.user.psychologist_profile
    except PsychologistProfile.DoesNotExist:
        return Response({'detail': 'Perfil no encontrado.'}, status=status.HTTP_404_NOT_FOUND)

    try:
        from datetime import time as time_type
        start_t = time_type.fromisoformat(start_str[:5])
        end_t = time_type.fromisoformat(end_str[:5])
    except (ValueError, TypeError):
        return Response({'detail': 'Formato de tiempo inválido.'}, status=status.HTTP_400_BAD_REQUEST)

    generated = _time_slots(start_t, end_t, profile.slot_duration, profile.slot_gap)
    if not generated:
        return Response({'detail': 'No se generaron turnos. Verificá duración y rango.'}, status=status.HTTP_400_BAD_REQUEST)

    created_count = 0
    for s, e in generated:
        _, made = RecurringAvailability.objects.get_or_create(
            psychologist=request.user, day_of_week=int(day_of_week), start_time=s,
            defaults={'end_time': e, 'is_active': True},
        )
        if made:
            created_count += 1

    return Response({'created': created_count, 'total': len(generated)}, status=status.HTTP_201_CREATED)


# ── Calendar V2: recurring bookings ──────────────────────────────────────────

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def recurring_bookings(request):
    if request.method == 'GET':
        if request.user.role == User.ROLE_PATIENT:
            qs = RecurringBooking.objects.filter(patient=request.user).select_related(
                'psychologist', 'psychologist__psychologist_profile',
            )
        else:
            qs = RecurringBooking.objects.filter(psychologist=request.user).select_related('patient')
        return Response(RecurringBookingSerializer(qs, many=True).data)

    if request.user.role != User.ROLE_PATIENT:
        return Response({'detail': 'Solo pacientes pueden crear reservas recurrentes.'}, status=status.HTTP_403_FORBIDDEN)

    psych_id = request.data.get('psychologist_id')
    day_of_week = request.data.get('day_of_week')
    start_time = request.data.get('start_time')
    end_time = request.data.get('end_time')
    notes = request.data.get('notes', '')

    if not all([psych_id, day_of_week is not None, start_time, end_time]):
        return Response({'detail': 'Faltan datos para la reserva recurrente.'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        psych = User.objects.get(pk=psych_id, role=User.ROLE_PSYCHOLOGIST)
    except User.DoesNotExist:
        return Response({'detail': 'Psicólogo no encontrado.'}, status=status.HTTP_404_NOT_FOUND)

    booking = RecurringBooking.objects.create(
        patient=request.user, psychologist=psych,
        day_of_week=int(day_of_week), start_time=start_time, end_time=end_time,
        notes=notes,
    )
    return Response(RecurringBookingSerializer(booking).data, status=status.HTTP_201_CREATED)


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def recurring_booking_detail(request, pk):
    try:
        if request.user.role == User.ROLE_PATIENT:
            booking = RecurringBooking.objects.get(pk=pk, patient=request.user)
        else:
            booking = RecurringBooking.objects.get(pk=pk, psychologist=request.user)
    except RecurringBooking.DoesNotExist:
        return Response({'detail': 'No encontrado.'}, status=status.HTTP_404_NOT_FOUND)

    # Single-occurrence cancellation
    cancel_date = request.data.get('cancel_date')
    if cancel_date:
        if cancel_date not in booking.cancelled_dates:
            booking.cancelled_dates.append(cancel_date)
            booking.save()
        return Response(RecurringBookingSerializer(booking).data)

    new_status = request.data.get('status')
    allowed = {
        User.ROLE_PATIENT: [RecurringBooking.STATUS_CANCELLED],
        User.ROLE_PSYCHOLOGIST: [RecurringBooking.STATUS_CONFIRMED, RecurringBooking.STATUS_REJECTED, RecurringBooking.STATUS_CANCELLED],
    }
    if new_status not in allowed.get(request.user.role, []):
        return Response({'detail': 'Acción no permitida.'}, status=status.HTTP_403_FORBIDDEN)

    if new_status == RecurringBooking.STATUS_REJECTED:
        booking.rejection_reason = request.data.get('rejection_reason', '').strip()

    booking.status = new_status
    booking.save()
    return Response(RecurringBookingSerializer(booking).data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def pending_items(request):
    """Pending appointments and recurring bookings for psychologist to approve/reject."""
    if request.user.role != User.ROLE_PSYCHOLOGIST:
        return Response({'detail': 'Solo psicólogos.'}, status=status.HTTP_403_FORBIDDEN)

    appts = Appointment.objects.filter(
        psychologist=request.user, status=Appointment.STATUS_PENDING,
    ).select_related('patient', 'availability').order_by('availability__date', 'availability__start_time')

    bookings = RecurringBooking.objects.filter(
        psychologist=request.user, status=RecurringBooking.STATUS_PENDING,
    ).select_related('patient').order_by('created_at')

    return Response({
        'appointments': AppointmentSerializer(appts, many=True).data,
        'recurring_bookings': RecurringBookingSerializer(bookings, many=True).data,
    })


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
