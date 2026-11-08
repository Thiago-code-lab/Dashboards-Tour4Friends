"""Create an ignored local configuration without predefined passwords or application users."""

import argparse
import secrets
from pathlib import Path


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--postgres-port", type=int, default=55433)
    args = parser.parse_args()
    if not 1024 <= args.postgres_port <= 65535:
        parser.error("Escolha uma porta válida entre 1024 e 65535.")
    root = Path(__file__).resolve().parents[2]
    destination = root / "backend/.env"
    if destination.exists():
        parser.exit(1, "backend/.env já existe. Nenhuma configuração foi sobrescrita.\n")
    password = secrets.token_urlsafe(36)
    database_url = f"postgresql+psycopg://t4f_lab:{password}@127.0.0.1:{args.postgres_port}/t4f_lab"
    destination.write_text(
        f'POSTGRES_USER=t4f_lab\nPOSTGRES_PASSWORD={password}\nPOSTGRES_DB=t4f_lab\nPOSTGRES_PORT={args.postgres_port}\nDATABASE_URL={database_url}\nTEST_DATABASE_URL={database_url}_test\nCORS_ORIGINS=["http://127.0.0.1:5173","http://localhost:5173","https://thiago-code-lab.github.io"]\n',
        encoding="utf8",
    )
    print("backend/.env criado com senha aleatória. Nenhuma senha foi impressa ou versionada.")


if __name__ == "__main__":
    main()
