"""Portable Uvicorn entrypoint, including Psycopg-compatible Windows event loops."""

import argparse
import asyncio

import uvicorn


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8000)
    arguments = parser.parse_args()
    server = uvicorn.Server(
        uvicorn.Config(
            "app.main:app",
            host=arguments.host,
            port=arguments.port,
            access_log=False,
            loop="asyncio",
        )
    )
    # app.__init__ selects WindowsSelectorEventLoopPolicy before this loop is created.
    asyncio.run(server.serve())


if __name__ == "__main__":
    main()
