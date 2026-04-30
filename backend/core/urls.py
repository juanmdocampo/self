from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from . import views

urlpatterns = [
    path('auth/register/', views.register),
    path('auth/login/', views.login),
    path('auth/me/', views.me),
    path('auth/token/refresh/', TokenRefreshView.as_view()),
    path('psychologists/', views.psychologists_list),
    path('swipe/', views.swipe),
    path('favorites/', views.my_favorites),
    path('favorites/<int:pk>/', views.delete_favorite),
]
