import os

def replace_in_file(filepath):
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
            
        if '-' not in content:
            return
            
        # We only want to replace it in these remaining files because we already manually handled
        # the user facing text where we wanted commas or periods. The remaining files are ALL backend python files,
        # READMEs, or specific places where a simple hyphen is totally fine.
        new_content = content.replace(' - ', ' - ').replace('-', '-')
        
        if new_content != content:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(new_content)
            print(f"Updated: {filepath}")
    except Exception as e:
        print(f"Error processing {filepath}: {e}")

def check_all():
    for root, dirs, files in os.walk('.'):
        if any(skip in root for skip in ['node_modules', 'venv', '.git', '__pycache__', 'dist', '.vite']):
            continue
        for file in files:
            if file.endswith(('.py', '.js', '.jsx', '.html', '.md', '.css', '.txt')):
                filepath = os.path.join(root, file)
                replace_in_file(filepath)

if __name__ == "__main__":
    check_all()
