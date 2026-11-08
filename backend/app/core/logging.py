import json
import logging
import time
from collections import OrderedDict, deque
from uuid import uuid4

from starlette.responses import JSONResponse
from starlette.types import ASGIApp, Message, Receive, Scope, Send

from app.core.config import Settings

logger = logging.getLogger("t4f.requests")


def configure_logging() -> None:
    parent = logging.getLogger("t4f")
    parent.setLevel(logging.INFO)
    parent.propagate = False
    if not parent.handlers:
        handler = logging.StreamHandler()
        handler.setFormatter(logging.Formatter("%(message)s"))
        parent.addHandler(handler)


class RequestGuards:
    def __init__(self, app: ASGIApp, settings: Settings) -> None:
        self.app, self.settings = app, settings
        self.windows: OrderedDict[str, deque[float]] = OrderedDict()

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return
        identifier, started = str(uuid4()), time.monotonic()
        scope.setdefault("state", {})["request_id"] = identifier
        if scope["path"] not in ("/health", "/ready") and scope["method"] != "OPTIONS":
            address = (scope.get("client") or ("unknown", 0))[0]
            window = self.windows.setdefault(address, deque())
            self.windows.move_to_end(address)
            while window and window[0] < started - 60:
                window.popleft()
            if len(window) >= self.settings.request_limit:
                await JSONResponse(
                    {"detail": "Limite de requisições excedido."},
                    429,
                    headers={"Retry-After": "60"},
                )(scope, receive, send)
                return
            window.append(started)
            if len(self.windows) > 5000:
                self.windows.popitem(last=False)
        payload = bytearray()
        while True:
            message = await receive()
            if message["type"] == "http.disconnect":
                return
            payload.extend(message.get("body", b""))
            if len(payload) > self.settings.max_payload_bytes:
                await JSONResponse({"detail": "Payload excede o tamanho permitido."}, 413)(
                    scope, receive, send
                )
                return
            if not message.get("more_body", False):
                break
        delivered = False
        status_code = 500

        async def replay() -> Message:
            nonlocal delivered
            if not delivered:
                delivered = True
                return {"type": "http.request", "body": bytes(payload), "more_body": False}
            return await receive()

        async def respond(message: Message) -> None:
            nonlocal status_code
            if message["type"] == "http.response.start":
                status_code = message["status"]
                message["headers"] = [
                    *message.get("headers", []),
                    (b"x-request-id", identifier.encode()),
                    (b"cache-control", b"no-store"),
                    (b"x-content-type-options", b"nosniff"),
                ]
            await send(message)

        try:
            await self.app(scope, replay, respond)
        finally:
            logger.info(
                json.dumps(
                    {
                        "request_id": identifier,
                        "method": scope["method"],
                        "path": scope["path"],
                        "status": status_code,
                        "duration_ms": round((time.monotonic() - started) * 1000, 2),
                    }
                )
            )
