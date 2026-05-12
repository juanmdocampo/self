from django.db import migrations


def clear_stale_paths(apps, schema_editor):
    User = apps.get_model('core', 'User')
    PsychologistProfile = apps.get_model('core', 'PsychologistProfile')

    # Clear avatars that are local filesystem paths (not S3 URLs)
    User.objects.exclude(avatar__startswith='http').update(avatar='')

    # Clear documents that are local filesystem paths (not S3 URLs)
    PsychologistProfile.objects.exclude(document_upload__startswith='http').update(document_upload='')


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0011_avatar_document_to_charfield'),
    ]

    operations = [
        migrations.RunPython(clear_stale_paths, migrations.RunPython.noop),
    ]
