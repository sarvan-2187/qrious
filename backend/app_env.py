import os

from dotenv import load_dotenv

load_dotenv()

# Set APP_ENV=production on the deployed host; leave it unset locally.
# Lives in its own top-level module (like auth.py/database.py) rather than in
# any one service, so both services/qbraid_service.py and
# services/quantum_providers/ can read it without importing each other.
IS_PRODUCTION = os.getenv("APP_ENV", "").lower() == "production"
