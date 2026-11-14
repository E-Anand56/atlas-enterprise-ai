from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent

folders = [
    "app",
    "app/templates",
    "app/static/css",
    "app/static/js",
    "worker",
    "infra",
    "scripts",
    "docs",
]

files = [
    "requirements.txt",
    ".env",
    ".env.example",
    ".gitignore",
    "README.md",
    "app/__init__.py",
    "app/main.py",
    "app/config.py",
    "app/db.py",
    "app/aws.py",
    "app/vector.py",
    "app/rag.py",
    "app/memory.py",
    "app/guardrails.py",
    "app/graph.py",
    "app/observability.py",
    "app/templates/index.html",
    "app/static/css/styles.css",
    "app/static/js/app.js",
    "worker/__init__.py",
    "worker/ingest.py",
    "infra/schema.sql",
    "scripts/init_db.py",
    "docs/SETUP.md",
]

def create_structure():

    for folder in folders:
        (BASE_DIR / folder).mkdir(
            parents=True, exist_ok=True
        )

    for file in files:
        path = BASE_DIR / file
        path.parent.mkdir(parents=True, exist_ok=True)
        path.touch(exist_ok=True)

    print("RAG Project created successfully!")
    print("Location:", BASE_DIR)
    print("Total folders:", len(folders))
    print("Total files:", len(files))


if __name__ == "__main__":
    create_structure()