import asyncio
from convex import ConvexClient
from config import settings

client = ConvexClient(settings.convex_url)

try:
    client.mutation("submissions:updateResult", {
        "submissionId": "jd7e83j664tmgdntq087ns6e49748bch",
        "status": "running",
        "passedCount": 0,
        "totalCount": 1,
        "stderr": None
    })
except Exception as e:
    print("Exception:", repr(e))
