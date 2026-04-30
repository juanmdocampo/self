# Self App — Feature List para Claude Code

## contexto del proyecto
App tipo Tinder para conectar pacientes con psicólogos.
Stack: Django backend + React/Vite/Tailwind frontend.
Deploy en Railway. DB PostgreSQL.
Repo tiene carpeta `frontend/` y `backend/`.

---

## 🃏 1. sistema de tarjetas (discover)

- [ ] Mostrar TODAS las tarjetas de psicólogos disponibles en la DB
- [ ] El usuario puede navegar entre tarjetas (siguiente / anterior)
- [ ] Swipe o botones: "Me interesa" (like) / "Pasar" (nope)
- [ ] Si ya hizo swipe antes, mostrar igual la tarjeta pero con estado visual (liked/noped)
- [ ] Las tarjetas NO desaparecen — siempre se pueden volver a ver
- [ ] Filtros funcionales: especialidad, modalidad, precio máximo
- [ ] Filtros conectados a la API real (no hardcodeados)

---

## 💚 2. sistema de matches

- [ ] Cuando el paciente le da like a un psicólogo → se guarda en DB como Match
- [ ] Panel "Tus matches" muestra todos los psicólogos que el paciente eligió
- [ ] El psicólogo puede ver en su panel quién le dio like ("Me recomiendan")
- [ ] Match no requiere aceptación mutua por ahora (one-sided like = match)
- [ ] Botón para "deshacer match" / quitar de la lista

---

## 🧑‍⚕️ 3. perfil del psicólogo (onboarding)

- [ ] Registro con tipo de usuario: Paciente o Psicólogo
- [ ] Si es psicólogo → formulario de perfil completo:
  - Nombre y apellido
  - Foto de perfil (upload)
  - N° de matrícula
  - Especialidad (ej: TCC, Gestalt, Psicoanálisis, Sistémica, ACT)
  - Corriente / enfoque
  - Bio / descripción
  - Modalidad: online / presencial / ambas
  - Ubicación (ciudad)
  - Precio por sesión
  - Tags / temas que trabaja (ansiedad, depresión, pareja, etc.)
- [ ] El psicólogo puede editar su perfil después
- [ ] Perfil visible como tarjeta en el feed de pacientes

---

## 👤 4. perfil del paciente

- [ ] Registro básico: nombre, email, contraseña
- [ ] Puede ver y editar su perfil
- [ ] Historial de swipes (a quiénes vio, liked/noped)
- [ ] Lista de matches

---

## 🔐 5. autenticación

- [ ] Registro con email + contraseña
- [ ] Login / logout
- [ ] JWT tokens (access + refresh)
- [ ] Rutas protegidas en el frontend (redirigir si no está logueado)
- [ ] Sesión persistente (guardar token en localStorage)

---

## 🔌 6. API endpoints necesarios

- `POST /api/auth/register/` — registro (paciente o psicólogo)
- `POST /api/auth/login/` — login → devuelve JWT
- `GET /api/discover/` — feed de psicólogos (con filtros, todos, no excluir vistos)
- `POST /api/swipe/` — registrar like o nope
- `GET /api/matches/` — lista de matches del paciente
- `DELETE /api/matches/{id}/` — quitar match
- `GET /api/psychologists/{id}/` — detalle de un psicólogo
- `PUT /api/profile/` — editar perfil propio
- `GET /api/swipes/` — historial de swipes del usuario

---

## 🎨 7. UI / frontend

- [ ] Navbar con: Inicio, Descubrir, Me recomiendan (para psicólogos), Mi perfil
- [ ] Vista Discover: stack de tarjetas navegables + filtros laterales + panel matches
- [ ] Tarjeta de psicólogo: foto, nombre, especialidad, tags, precio, modalidad, rating
- [ ] Vista "Mis Matches" para pacientes
- [ ] Vista "Me recomiendan" para psicólogos (quiénes les dieron like)
- [ ] Vista de perfil editable
- [ ] Login / Register pages
- [ ] Estado vacío amigable cuando no hay más tarjetas
- [ ] Responsive (mobile friendly)

---

## 🚀 8. nice to have (futuro)

- [ ] Chat directo entre match
- [ ] Sistema de turnos / agenda
- [ ] Verificación de matrícula profesional
- [ ] Rating y reseñas post-sesión
- [ ] Notificaciones
- [ ] Expandir a otros profesionales (electricistas, abogados, etc.)
- [ ] Onboarding con quiz para recomendar psicólogos según necesidad

---

## 📁 estructura del proyecto

```
self/
├── backend/          # Django
│   ├── users/        # modelos User, PsychologistProfile
│   ├── matching/     # modelos SwipeAction, Match
│   └── backend/      # settings, urls
├── frontend/         # React + Vite + Tailwind
│   ├── src/
│   │   ├── pages/    # Discover, Matches, Recommend, Profile, Login, Register
│   │   ├── components/
│   │   └── api/      # fetch calls al backend
└── requirements.txt
```