import os
import re

def fix_html_content(content):
    # Classes to clean up
    target_classes = ['intuition-box', 'methodology-box', 'math-block', 'definition-box', 'theorem-box', 'warning-box', 'algorithm-box']
    
    for cls in target_classes:
        # Match <div class="..." style="..."> and remove style if it has background-related properties
        # This handles many variations including single/double quotes, spaces, etc.
        content = re.sub(
            rf'(<div[^>]*class=[^>]*{cls}[^>]*)\s+style=["\'][^"\']*(?:background|border-left)[^"\']*["\']',
            r'\1',
            content, flags=re.IGNORECASE
        )
        # Handle style before class
        content = re.sub(
            rf'(<div[^>]*)\s+style=["\'][^"\']*(?:background|border-left)[^"\']*["\']([^>]*class=[^>]*{cls}[^>]*>)',
            r'\1\2',
            content, flags=re.IGNORECASE
        )

    # Specific HERO section fix for index.html - remove hardcoded White/Light checks
    content = re.sub(
        r'style="padding: 4rem 2rem;"',
        r'style="padding: 4rem 1rem;"',
        content, flags=re.IGNORECASE
    )
    
    # Remove hardcoded text colors that conflict with dark mode
    content = re.sub(r'\s+style=["\'][^"\']*color:\s*(?:#2c3e50|#34495e|#666|#555|#333)[^"\']*["\']', '', content, flags=re.IGNORECASE)
    
    # Remove hardcoded background whites
    content = re.sub(r'\s+style=["\'][^"\']*background-color:\s*(?:#fff|#ffffff|white)[^"\']*["\']', '', content, flags=re.IGNORECASE)
    
    return content

def fix_html_files(base_dir):
    # Fix files in pages/
    pages_dir = os.path.join(base_dir, 'pages')
    for root, dirs, files in os.walk(pages_dir):
        for file in files:
            if file.endswith('.html'):
                file_path = os.path.join(root, file)
                process_file(file_path)
    
    # Fix index.html
    index_path = os.path.join(base_dir, 'index.html')
    if os.path.exists(index_path):
        process_file(index_path)

def process_file(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    new_content = fix_html_content(content)
    
    if new_content != content:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"Fixed: {file_path}")

if __name__ == "__main__":
    base_dir = r"d:\University\Υπολογιστικη Γεωμετρια\computational-geometry-notes"
    fix_html_files(base_dir)
