from django.urls import path
from . import views

urlpatterns = [
    path('auth/register/', views.register),
    path('auth/login/', views.login),
    path('auth/me/', views.me),
    path('psychologists/', views.psychologists_list),
    path('swipe/', views.swipe),
    path('matches/', views.my_matches),
]
