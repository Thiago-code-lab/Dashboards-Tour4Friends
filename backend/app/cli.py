import argparse
import asyncio
import getpass
import json
import sys
from uuid import uuid4

from sqlalchemy import select

from app.core.config import get_settings
from app.core.database import database_factory
from app.core.security import hash_password
from app.models.entities import User
from app.schemas.requests import UserCreate
from app.services.audit import record_audit
from app.services.seed import seed_demo


async def execute(arguments: argparse.Namespace) -> None:
    settings = get_settings()
    factory = database_factory(settings)
    try:
        async with factory() as session, session.begin():
            if arguments.command == "seed-demo":
                print(json.dumps(await seed_demo(session, settings.demo_path)))
                return
            password = (
                sys.stdin.readline().rstrip("\r\n")
                if arguments.password_stdin
                else getpass.getpass("Senha administrativa (mínimo 12 caracteres): ")
            )
            if not arguments.password_stdin and password != getpass.getpass("Confirme a senha: "):
                raise ValueError("As senhas não coincidem.")
            payload = UserCreate(
                email=arguments.email, name=arguments.name, role="admin", password=password
            )
            if await session.scalar(select(User.id).where(User.email == payload.email)):
                raise ValueError("Usuário já existe; nenhuma senha foi alterada.")
            identifier = str(uuid4())
            session.add(
                User(
                    id=identifier,
                    email=payload.email,
                    name=payload.name,
                    role="admin",
                    password_hash=hash_password(payload.password.get_secret_value()),
                    active=True,
                )
            )
            await session.flush()
            record_audit(
                session,
                identifier,
                "users",
                identifier,
                "create",
                str(uuid4()),
                after={"role": "admin", "active": True},
            )
            print(json.dumps({"created": True, "id": identifier, "role": "admin"}))
    finally:
        await factory.kw["bind"].dispose()


def main() -> None:
    parser = argparse.ArgumentParser(description="Administração local do laboratório T4F")
    subcommands = parser.add_subparsers(dest="command", required=True)
    subcommands.add_parser("seed-demo")
    admin = subcommands.add_parser("create-admin")
    admin.add_argument("--email", required=True)
    admin.add_argument("--name", required=True)
    admin.add_argument(
        "--password-stdin",
        action="store_true",
        help="Receber senha por stdin, sem incluí-la na linha de comando",
    )
    try:
        asyncio.run(execute(parser.parse_args()))
    except (ValueError, OSError) as error:
        parser.exit(1, f"Operação recusada: {error}\n")


if __name__ == "__main__":
    main()
