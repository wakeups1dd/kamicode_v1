import socket
from urllib.parse import urlparse
from convex import ConvexClient
from config import settings

def _is_server_reachable(url: str, timeout_sec: float = 0.5) -> bool:
    """Quickly check if the Convex server host:port is reachable before blocking."""
    if not url:
        return False
    try:
        parsed = urlparse(url)
        host = parsed.hostname or "127.0.0.1"
        port = parsed.port or (443 if parsed.scheme == "https" else 80)
        with socket.create_connection((host, port), timeout=timeout_sec):
            return True
    except Exception:
        return False

# Initialize Convex client
convex_client = ConvexClient(settings.convex_url) if settings.convex_url else None


class OfflineFallbackConvexClient:
    """Fast-failing fallback client when local Convex server is not running."""
    def query(self, *args, **kwargs):
        raise ConnectionRefusedError("Convex server is offline")

    def mutation(self, *args, **kwargs):
        raise ConnectionRefusedError("Convex server is offline")


def get_convex():
    if not convex_client:
        return OfflineFallbackConvexClient()
    if not _is_server_reachable(settings.convex_url, timeout_sec=0.2):
        return OfflineFallbackConvexClient()
    return convex_client
