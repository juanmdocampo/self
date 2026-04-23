# Self

Plataforma híbrida para conectar personas con psicólogos de forma simple, humana e intuitiva.

Ofrece dos caminos: explorar perfiles y hacer swipe libremente, o completar un formulario corto y recibir una recomendación personalizada en menos de 24 horas. Solo profesionales verificados.

---

## Tecnologías

**Backend**
- Python 3.14 / Django 6
- Django REST Framework — API REST con autenticación por token
- PostgreSQL 18 — base de datos principal
- psycopg2-binary — driver PostgreSQL para Python
- python-decouple — configuración por variables de entorno

**Frontend**
- React 19 + Vite 8
- React Router v7 — navegación entre páginas
- Tailwind CSS v3 — estilos utilitarios con paleta personalizada
- Fetch API — comunicación con el backend

---

## Arquitectura del proyecto

```
self/
├── backend/                  # Proyecto Django
│   ├── settings.py           # Configuración (BD, auth, CORS, env vars)
│   ├── urls.py               # Rutas raíz (/api/, /admin/)
│   └── core/                 # App principal
│       ├── models.py         # User, PsychologistProfile, SwipeAction, Match
│       ├── serializers.py    # Serialización y validación de datos
│       ├── views.py          # Endpoints de la API
│       └── urls.py           # Rutas de /api/
│
├── frontend/                 # Proyecto React + Vite
│   └── src/
│       ├── api.js            # Todas las llamadas al backend
│       ├── App.jsx           # Router raíz + providers
│       ├── context/
│       │   ├── AuthContext.jsx   # Token, usuario actual, modal de login
│       │   └── ToastContext.jsx  # Notificaciones globales
│       ├── pages/
│       │   ├── Landing.jsx       # Hero + CTAs
│       │   ├── Discover.jsx      # Vista de swipe (3 columnas)
│       │   ├── Recommend.jsx     # Formulario de recomendación personalizada
│       │   ├── Register.jsx      # Registro paciente / psicólogo
│       │   └── Profile.jsx       # Edición de perfil + avatar
│       └── components/
│           ├── Nav.jsx               # Barra de navegación
│           ├── SwipeStack.jsx        # Stack de cards con drag-to-swipe
│           ├── PsychDetailModal.jsx  # Modal de detalle del psicólogo
│           ├── FilterSidebar.jsx     # Filtros (especialidad, modalidad, precio)
│           ├── MatchesPanel.jsx      # Panel lateral de matches
│           └── LoginModal.jsx        # Modal de inicio de sesión
│
├── seed.py                   # Carga datos de prueba (3 psicólogos)
├── manage.py
└── .env                      # Variables de entorno (no commitear)
```

---

## API

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/api/auth/register/` | Registro de paciente o psicólogo |
| POST | `/api/auth/login/` | Login → devuelve token |
| GET / PATCH | `/api/auth/me/` | Perfil del usuario actual / actualizar perfil |
| GET | `/api/psychologists/` | Listar psicólogos (filtros: specialty, modality, max_price) |
| POST | `/api/swipe/` | Registrar like o pass |
| GET | `/api/matches/` | Ver matches del usuario |
| — | `/admin/` | Panel de administración Django |

---

## Modelos de datos

**User** — extiende AbstractUser con `role` (patient / psychologist), `bio`, `avatar`

**PsychologistProfile** — especialidades (JSON), modalidad, precio por sesión, años de experiencia, ciudad, idiomas, matrícula, verificado, acepta pacientes

**SwipeAction** — relación paciente → psicólogo con acción (like / pass)

**Match** — relación activa paciente ↔ psicólogo generada por un like

---

## Desarrollo local

**Backend**
```bash
python -m pip install -r requirements.txt
# configurar .env con credenciales de PostgreSQL
python manage.py migrate
python manage.py createsuperuser
python seed.py
python manage.py runserver
```

**Frontend**
```bash
cd frontend
npm install
npm run dev
```

El frontend corre en `http://localhost:5173` y hace proxy de `/api` y `/media` hacia Django en `http://localhost:8000`.
