import os
import django
import sys

# Configurar el entorno de Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'back.settings')
django.setup()

from users.models import CustomUser

# Si se proporciona un nombre de usuario como argumento, úsalo
if len(sys.argv) > 1:
    username = sys.argv[1]
else:
    # De lo contrario, mostrar todos los usuarios y pedir uno
    users = CustomUser.objects.all()
    
    print("Usuarios disponibles:")
    for user in users:
        print(f"- {user.username} (Es staff: {user.is_staff}, Es superusuario: {user.is_superuser})")
    
    # Si no hay usuarios, crear uno administrador
    if not users:
        print("\nNo hay usuarios, creando usuario administrador...")
        admin_user = CustomUser.objects.create_user(
            username='admin',
            password='admin',
            is_staff=True,
            is_superuser=True
        )
        print(f"Usuario 'admin' creado con contraseña 'admin'")
    else:
        # Hacer que el primer usuario sea administrador
        user = users.first()
        user.is_staff = True
        user.is_superuser = True
        user.save()
        print(f"\nEl usuario '{user.username}' ahora tiene permisos de administrador")

# Nombre de usuario que quieres convertir en administrador
USERNAME = 'admin'  # Reemplaza esto con el nombre de usuario real

try:
    user = CustomUser.objects.get(username=USERNAME)
    user.is_staff = True
    user.is_superuser = True
    user.save()
    print(f"El usuario '{USERNAME}' ahora tiene permisos de administrador")
except CustomUser.DoesNotExist:
    print(f"El usuario '{USERNAME}' no existe")
except Exception as e:
    print(f"Error: {e}") 