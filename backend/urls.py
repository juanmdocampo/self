from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path, re_path
from django.views.generic import TemplateView

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('backend.core.urls')),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

# In production Django serves the React SPA for all non-API routes
if not settings.DEBUG:
    urlpatterns += [
        re_path(r'^(?!api/|admin/|media/|static/).*$',
                TemplateView.as_view(template_name='index.html'))
    ]
