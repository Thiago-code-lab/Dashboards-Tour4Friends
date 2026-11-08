"""T4F persistent synthetic laboratory."""

import asyncio
import sys

# Psycopg's async sockets require the selector loop on Windows/Python 3.12.
if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
