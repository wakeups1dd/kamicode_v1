from convex import ConvexClient
from config import settings

# --- Convex DB Config ---
convex_client = ConvexClient(settings.convex_url) if settings.convex_url else None

def get_convex():
    if not convex_client:
        raise Exception("CONVEX_URL is not set")
    return convex_client
