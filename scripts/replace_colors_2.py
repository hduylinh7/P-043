import os

files = [
    "frontend/src/pages/DashboardPage.tsx",
    "frontend/src/pages/CourseDetailPage.tsx",
    "frontend/src/components/ChatInterface.tsx",
    "frontend/src/pages/RegisterPage.tsx"
]

for f in files:
    if os.path.exists(f):
        with open(f, 'r', encoding='utf-8') as file:
            content = file.read()
        
        # Don't replace if it's password strength logic (e.g. bg-amber-500)
        # Actually in RegisterPage we have: label: 'Trung bình', color: 'bg-amber-500' -> let's keep it as is, or change to blue. It's a strength meter so amber is fine.
        # But let's replace anyway, except in RegisterPage.
        if "RegisterPage" not in f:
            content = content.replace('amber', 'blue')
            content = content.replace('orange', 'blue')
            content = content.replace('rose', 'indigo')
            
            with open(f, 'w', encoding='utf-8') as file:
                file.write(content)
