import os

# Files that I have manually audited and know only contain em-dashes in comments or places where a simple hyphen is perfect.
FILES_TO_FIX = [
    "e:/supportOS/backend/services/sentiment_service.py",
    "e:/supportOS/backend/services/ticket_service.py",
    "e:/supportOS/backend/services/__init__.py",
    "e:/supportOS/backend/static/widget.js",
    "e:/supportOS/frontend/src/App.jsx",
    "e:/supportOS/frontend/src/index.css",
    "e:/supportOS/frontend/src/main.jsx",
    "e:/supportOS/frontend/src/components/NotificationPanel.jsx",
    "e:/supportOS/frontend/src/components/ProtectedRoute.jsx",
    "e:/supportOS/frontend/src/components/landing/ContactSection.jsx",
    "e:/supportOS/frontend/src/components/landing/HeroSection.jsx",
    "e:/supportOS/frontend/src/components/landing/RopeRow.jsx",
    "e:/supportOS/frontend/src/components/layout/Navbar.jsx",
    "e:/supportOS/frontend/src/dashboard/DashboardLayout.jsx",
    "e:/supportOS/frontend/src/dashboard/chatbot/ChatbotPage.jsx",
    "e:/supportOS/frontend/src/dashboard/inbox/Inbox.jsx",
    "e:/supportOS/frontend/src/dashboard/settings/SettingsPage.jsx",
    "e:/supportOS/frontend/src/lib/api.js",
    "e:/supportOS/frontend/src/lib/hooks/useInboxSocket.js",
    "e:/supportOS/frontend/src/pages/Login.jsx",
    "e:/supportOS/frontend/src/pages/Signup.jsx",
    "e:/supportOS/frontend/src/pages/widget/WidgetChat.jsx"
]

def replace_in_file(filepath):
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Replace ' - ' (space em-dash space) with ' - ' (space hyphen space)
        # And replace '-' (em-dash) with '-' (hyphen) just in case
        new_content = content.replace(' - ', ' - ').replace('-', '-')
        
        if new_content != content:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(new_content)
            print(f"Updated: {filepath}")
    except Exception as e:
        print(f"Failed to process {filepath}: {e}")

if __name__ == "__main__":
    for f in FILES_TO_FIX:
        replace_in_file(f)
