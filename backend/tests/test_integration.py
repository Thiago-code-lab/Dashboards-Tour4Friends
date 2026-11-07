import asyncio
import csv
import io
import json
import shutil
import subprocess
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[2]


def frontend_results(dataset: dict, scopes: list[dict] | None = None) -> list[dict]:
    payload = {"dataset": dataset}
    if scopes:
        payload["filters"] = scopes
    result = subprocess.run(
        [shutil.which("node"), "--import", "tsx", "scripts/analytics-bridge.ts"],
        cwd=ROOT,
        input=json.dumps(payload),
        text=True,
        encoding="utf-8",
        capture_output=True,
        check=True,
    )
    return json.loads(result.stdout)


async def test_frontend_backend_kpi_and_alert_parity(lab):
    headers = await lab["login"]()
    dataset = (await lab["client"].get("/api/v1/dataset", headers=headers)).json()
    base = {
        "start": "2024-01-01",
        "end": "2026-12-31",
        "route": "all",
        "modality": "all",
        "category": "all",
    }
    scopes = [
        base,
        {**base, "route": "portugues"},
        {**base, "category": "Premium"},
        {**base, "modality": "Bicicleta"},
        {**base, "start": "2026-01-01", "end": "2026-10-31"},
        {**base, "route": "portugues", "modality": "Bicicleta"},
    ]
    expected = await asyncio.to_thread(frontend_results, dataset, scopes)
    for scope, frontend in zip(scopes, expected, strict=True):
        params = {
            "start": scope["start"],
            "end": scope["end"],
            **{
                key: value
                for key, value in {
                    "route_id": scope["route"],
                    "modality": scope["modality"],
                    "category": scope["category"],
                }.items()
                if value != "all"
            },
        }
        response = await lab["client"].get(
            "/api/v1/analytics/overview", headers=headers, params=params
        )
        assert response.status_code == 200, response.text
        backend = response.json()
        for key, value in frontend.items():
            if key in ("monthly", "forecast", "alertIds"):
                continue
            assert (
                backend[key] == pytest.approx(value, abs=0.000001)
                if value is not None
                else backend[key] is None
            )
        assert len(backend["monthly"]) == len(frontend["monthly"])
        for actual, wanted in zip(backend["monthly"], frontend["monthly"], strict=True):
            for key, value in wanted.items():
                assert (
                    actual[key] == pytest.approx(value, abs=0.000001)
                    if isinstance(value, (int, float))
                    else actual[key] == value
                )
        alerts = (await lab["client"].get("/api/v1/alerts", headers=headers, params=params)).json()
        assert sorted(a["id"] for a in alerts["items"]) == frontend["alertIds"]


async def test_authorized_change_rebuilds_history_and_existing_ridge(lab):
    headers = await lab["login"]("manager")
    client = lab["client"]
    before = (await client.get("/api/v1/dataset", headers=headers)).json()
    candidate = next(
        b
        for b in before["bookings"]
        if b["status"] == "confirmed"
        and len(b["travelerIds"]) > 1
        and next(d for d in before["departures"] if d["id"] == b["departureId"])["date"]
        <= before["metadata"]["historyEnd"]
    )
    version = (await client.get(f"/api/v1/bookings/{candidate['id']}", headers=headers)).json()[
        "version"
    ]
    response = await client.patch(
        f"/api/v1/bookings/{candidate['id']}",
        headers=headers,
        json={"expectedVersion": version, "travelerIds": candidate["travelerIds"][:-1]},
    )
    assert response.status_code == 200, response.text
    await client.post("/api/v1/auth/logout", headers=headers)
    next_headers = await lab["login"]("manager")
    after = (await client.get("/api/v1/dataset", headers=next_headers)).json()
    original = (await asyncio.to_thread(frontend_results, before))[0]
    updated = (await asyncio.to_thread(frontend_results, after))[0]
    assert (
        sum(p["travelers"] for p in original["monthly"])
        - sum(p["travelers"] for p in updated["monthly"])
        == 1
    )
    assert original["forecast"]["history"] != updated["forecast"]["history"]
    assert len(updated["forecast"]["predictions"]) == 6
    assert all(p["predicted"] >= 0 for p in updated["forecast"]["predictions"])


async def test_alert_review_persists_without_erasing_condition(lab):
    headers = await lab["login"]("manager")
    alerts = (await lab["client"].get("/api/v1/alerts", headers=headers)).json()
    identifier = alerts["items"][0]["id"]
    response = await lab["client"].patch(
        f"/api/v1/alerts/{identifier}/status",
        headers=headers,
        json={
            "expectedVersion": 0,
            "status": "resolved",
            "note": "Revisão demonstrativa autorizada",
        },
    )
    assert response.status_code == 200 and response.json()["conditionActive"]
    fresh = await lab["login"]("viewer")
    again = (await lab["client"].get("/api/v1/alerts", headers=fresh)).json()
    row = next(a for a in again["items"] if a["id"] == identifier)
    assert row["status"] == "resolved" and row["administrativelyResolved"]
    assert row["updatedByName"] and row["note"]


def booking_csv(rows: list[dict]) -> bytes:
    stream = io.StringIO()
    writer = csv.DictWriter(stream, fieldnames=list(rows[0]), delimiter=";")
    writer.writeheader()
    for row in rows:
        values = {
            **row,
            "travelerIds": "|".join(row["travelerIds"]),
            "formComplete": "true" if row["formComplete"] else "false",
            "confirmedAt": row["confirmedAt"] or "",
            "cancellationReason": row["cancellationReason"] or "",
        }
        writer.writerow(values)
    return stream.getvalue().encode("utf-8")


async def test_import_validation_commit_and_duplicate_protection(lab):
    headers = await lab["login"]()
    client = lab["client"]
    rows = (await client.get("/api/v1/dataset", headers=headers)).json()["bookings"][:2]
    rows[0]["totalAmount"] += 100
    content = booking_csv(rows)
    response = await client.post(
        "/api/v1/imports/bookings/validate",
        headers=headers,
        files={"file": ("demo.csv", content, "text/csv")},
    )
    assert response.status_code == 201, response.text
    validation = response.json()
    assert (await client.get(f"/api/v1/bookings/{rows[0]['id']}", headers=headers)).json()[
        "totalAmount"
    ] != rows[0]["totalAmount"]
    payload = {"batchId": validation["batchId"], "validationToken": validation["validationToken"]}
    commit = await client.post("/api/v1/imports/bookings/commit", headers=headers, json=payload)
    assert commit.status_code == 200, commit.text
    assert (
        await client.post("/api/v1/imports/bookings/commit", headers=headers, json=payload)
    ).status_code == 409
    assert (
        await client.post(
            "/api/v1/imports/bookings/validate",
            headers=headers,
            files={"file": ("demo.csv", content, "text/csv")},
        )
    ).status_code == 409
    assert (await client.get(f"/api/v1/bookings/{rows[0]['id']}", headers=headers)).json()[
        "totalAmount"
    ] == rows[0]["totalAmount"]


async def test_import_stale_validation_rolls_back_whole_batch(lab):
    headers = await lab["login"]()
    client = lab["client"]
    rows = (await client.get("/api/v1/dataset", headers=headers)).json()["bookings"][:2]
    response = await client.post(
        "/api/v1/imports/bookings/validate",
        headers=headers,
        files={"file": ("demo.csv", booking_csv(rows), "text/csv")},
    )
    assert response.status_code == 201, response.text
    validation = response.json()
    changed = await client.patch(
        f"/api/v1/bookings/{rows[1]['id']}",
        headers=headers,
        json={"expectedVersion": 1, "totalAmount": rows[1]["totalAmount"] + 1000},
    )
    assert changed.status_code == 200
    commit = await client.post(
        "/api/v1/imports/bookings/commit",
        headers=headers,
        json={"batchId": validation["batchId"], "validationToken": validation["validationToken"]},
    )
    assert commit.status_code == 409
    assert (await client.get(f"/api/v1/bookings/{rows[0]['id']}", headers=headers)).json()[
        "version"
    ] == 1
