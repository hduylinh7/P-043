import os

files = [
    "frontend/src/components/Sidebar.tsx",
    "frontend/src/components/landing/LandingNavbar.tsx",
    "frontend/src/components/landing/CTASection.tsx",
    "frontend/src/components/landing/FeaturesSection.tsx",
    "frontend/src/components/landing/TestimonialsSection.tsx"
]

for f in files:
    if os.path.exists(f):
        with open(f, 'r', encoding='utf-8') as file:
            content = file.read()
        
        content = content.replace('amber', 'blue')
        content = content.replace('orange', 'blue')
        content = content.replace('rose', 'indigo')
        
        with open(f, 'w', encoding='utf-8') as file:
            file.write(content)
