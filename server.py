#!/usr/bin/env python3
import argparse
import json
import sqlite3
from datetime import datetime, timezone
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse


ROOT = Path(__file__).resolve().parent
DB_PATH = ROOT / "bellyrub.db"


SEED_PETS = [
    ("Coco", "Golden Retriever", "4 years", "Female", 180, 2, "Chicken allergy", "Up to date", "Ploy S.", "LINE: ploy.p", "Friendly", "Checked in", "Overnight stay", "13-17 Jun", "Loves people; no chicken treats."),
    ("Milo", "French Bulldog", "2 years", "Male", 110, 2, "Sensitive breathing", "Up to date", "Ben T.", "089-445-2210", "Friendly", "Checked in", "Daycare", "Today, 10:30", "Keep cool during outdoor play."),
    ("Luna", "Shiba Inu", "3 years", "Female", 130, 2, "No known conditions", "Due 28 Jun", "Mina K.", "LINE: minak", "Shy", "Checked in", "Overnight stay", "14-18 Jun", "Needs a little time to warm up."),
    ("Bento", "Beagle", "6 years", "Male", 145, 2, "Daily joint support", "Up to date", "Jay P.", "IG: @jayandbento", "Friendly", "Checking out", "Overnight stay", "12-15 Jun", "Tablet with dinner at 6 PM."),
    ("Mochi", "Pomeranian", "1 year", "Female", 65, 3, "No known conditions", "Up to date", "Fern L.", "LINE: fern.lee", "Reactive", "Checked in", "Solo care", "15-16 Jun", "Solo play only; reactive to large dogs."),
    ("Nala", "Thai Ridgeback", "5 years", "Female", 200, 2, "Hip dysplasia", "Up to date", "Chris W.", "081-203-8851", "Needs solo care", "Checked in", "Overnight + bath", "Today, 14:00", "Short gentle walks only."),
]


def connect():
    connection = sqlite3.connect(DB_PATH)
    connection.row_factory = sqlite3.Row
    return connection


def initialize_database():
    with connect() as db:
        db.executescript(
            """
            CREATE TABLE IF NOT EXISTS pets (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                breed TEXT NOT NULL,
                age TEXT NOT NULL DEFAULT '',
                sex TEXT NOT NULL DEFAULT '',
                food_grams INTEGER,
                meals_per_day INTEGER,
                health_notes TEXT NOT NULL DEFAULT '',
                vaccine_record TEXT NOT NULL DEFAULT 'Record pending',
                owner_name TEXT NOT NULL,
                owner_contact TEXT NOT NULL DEFAULT '',
                temperament TEXT NOT NULL DEFAULT 'Friendly',
                status TEXT NOT NULL DEFAULT 'Checked in',
                service_type TEXT NOT NULL DEFAULT 'Booking pending',
                stay_dates TEXT NOT NULL DEFAULT 'Dates not set',
                notes TEXT NOT NULL DEFAULT '',
                created_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS bookings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                pet_name TEXT NOT NULL,
                check_in TEXT NOT NULL,
                check_out TEXT NOT NULL,
                service_type TEXT NOT NULL,
                status TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS care_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                pet_name TEXT NOT NULL,
                meal_status TEXT NOT NULL,
                mood TEXT NOT NULL,
                pee INTEGER NOT NULL DEFAULT 0,
                poo INTEGER NOT NULL DEFAULT 0,
                notes TEXT NOT NULL DEFAULT '',
                channel TEXT NOT NULL,
                sent_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS payments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                customer TEXT NOT NULL,
                pet_name TEXT NOT NULL,
                service TEXT NOT NULL,
                amount REAL NOT NULL,
                status TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS settings (
                id INTEGER PRIMARY KEY CHECK (id = 1),
                business_name TEXT NOT NULL,
                business_subtitle TEXT NOT NULL,
                manager_name TEXT NOT NULL,
                manager_role TEXT NOT NULL,
                capacity INTEGER NOT NULL,
                care_deadline TEXT NOT NULL
            );
            """
        )
        if db.execute("SELECT COUNT(*) FROM pets").fetchone()[0] == 0:
            db.executemany(
                """INSERT INTO pets (
                    name, breed, age, sex, food_grams, meals_per_day, health_notes,
                    vaccine_record, owner_name, owner_contact, temperament, status,
                    service_type, stay_dates, notes, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                [row + (now_iso(),) for row in SEED_PETS],
            )
        if db.execute("SELECT COUNT(*) FROM bookings").fetchone()[0] == 0:
            db.executemany(
                "INSERT INTO bookings (pet_name, check_in, check_out, service_type, status) VALUES (?, ?, ?, ?, ?)",
                [
                    ("Coco", "2026-06-13", "2026-06-17", "Overnight", "Checked-in"),
                    ("Milo", "2026-06-15", "2026-06-15", "Daycare", "Checked-in"),
                    ("Nala", "2026-06-15", "2026-06-18", "Overnight + bath", "Checked-in"),
                ],
            )
        if db.execute("SELECT COUNT(*) FROM payments").fetchone()[0] == 0:
            db.executemany(
                "INSERT INTO payments (customer, pet_name, service, amount, status) VALUES (?, ?, ?, ?, ?)",
                [
                    ("Ploy S.", "Coco", "Overnight stay", 4800, "Paid"),
                    ("Chris W.", "Nala", "Stay + grooming", 3250, "Pending"),
                    ("Mina K.", "Luna", "Overnight stay", 5200, "Paid"),
                    ("Ben T.", "Milo", "Daycare", 850, "Paid"),
                ],
            )
        db.execute(
            """INSERT OR IGNORE INTO settings
            (id, business_name, business_subtitle, manager_name, manager_role, capacity, care_deadline)
            VALUES (1, 'BellyRub', 'Pet Staycation', 'May Kanya', 'Staycation manager', 18, '17:00')"""
        )


def now_iso():
    return datetime.now(timezone.utc).isoformat()


def rows(query, params=()):
    with connect() as db:
        return [dict(row) for row in db.execute(query, params).fetchall()]


class BellyRubHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def send_json(self, payload, status=200):
        body = json.dumps(payload, ensure_ascii=True).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def read_json(self):
        try:
            length = int(self.headers.get("Content-Length", "0"))
            return json.loads(self.rfile.read(length) or b"{}")
        except (ValueError, json.JSONDecodeError):
            return None

    def do_GET(self):
        path = urlparse(self.path).path
        if path == "/api/health":
            return self.send_json({"status": "ok", "service": "bellyrub-api", "database": "connected"})
        if path == "/api/pets":
            return self.send_json(rows("SELECT * FROM pets ORDER BY id"))
        if path == "/api/bookings":
            return self.send_json(rows("SELECT * FROM bookings ORDER BY check_in, id"))
        if path == "/api/care-logs":
            return self.send_json(rows("SELECT * FROM care_logs ORDER BY id DESC"))
        if path == "/api/financials":
            payments = rows("SELECT * FROM payments ORDER BY id DESC")
            paid = sum(item["amount"] for item in payments if item["status"] == "Paid")
            pending = sum(item["amount"] for item in payments if item["status"] == "Pending")
            return self.send_json({"paid_revenue": paid, "pending_revenue": pending, "payments": payments})
        if path == "/api/settings":
            return self.send_json(rows("SELECT * FROM settings WHERE id = 1")[0])
        if path == "/api":
            return self.send_json({
                "name": "BellyRub API",
                "endpoints": ["GET /api/health", "GET, POST /api/pets", "PUT, DELETE /api/pets/:id", "GET, POST /api/bookings", "GET, POST /api/care-logs", "GET /api/financials", "POST /api/payments", "GET, PUT /api/settings"],
            })
        return super().do_GET()

    def do_POST(self):
        path = urlparse(self.path).path
        data = self.read_json()
        if data is None:
            return self.send_json({"error": "Request body must be valid JSON"}, 400)
        if path == "/api/pets":
            required = ("name", "breed", "owner_name")
            missing = [field for field in required if not str(data.get(field, "")).strip()]
            if missing:
                return self.send_json({"error": "Missing required fields", "fields": missing}, 422)
            with connect() as db:
                cursor = db.execute(
                    """INSERT INTO pets (
                        name, breed, age, sex, food_grams, meals_per_day, health_notes,
                        vaccine_record, owner_name, owner_contact, temperament, status,
                        service_type, stay_dates, notes, created_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                    (
                        data["name"], data["breed"], data.get("age", ""), data.get("sex", ""),
                        data.get("food_grams"), data.get("meals_per_day"), data.get("health_notes", ""),
                        data.get("vaccine_record", "Record pending"), data["owner_name"],
                        data.get("owner_contact", ""), data.get("temperament", "Friendly"),
                        data.get("status", "Checked in"), data.get("service_type", "Booking pending"),
                        data.get("stay_dates", "Dates not set"), data.get("notes", ""), now_iso(),
                    ),
                )
                pet = dict(db.execute("SELECT * FROM pets WHERE id = ?", (cursor.lastrowid,)).fetchone())
            return self.send_json(pet, 201)
        if path == "/api/care-logs":
            required = ("pet_name", "meal_status", "mood", "channel")
            missing = [field for field in required if not str(data.get(field, "")).strip()]
            if missing:
                return self.send_json({"error": "Missing required fields", "fields": missing}, 422)
            with connect() as db:
                cursor = db.execute(
                    "INSERT INTO care_logs (pet_name, meal_status, mood, pee, poo, notes, channel, sent_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                    (data["pet_name"], data["meal_status"], data["mood"], bool(data.get("pee")), bool(data.get("poo")), data.get("notes", ""), data["channel"], now_iso()),
                )
                log = dict(db.execute("SELECT * FROM care_logs WHERE id = ?", (cursor.lastrowid,)).fetchone())
            return self.send_json(log, 201)
        if path == "/api/bookings":
            required = ("pet_name", "check_in", "check_out", "service_type", "status")
            missing = [field for field in required if not str(data.get(field, "")).strip()]
            if missing:
                return self.send_json({"error": "Missing required fields", "fields": missing}, 422)
            if data["check_out"] < data["check_in"]:
                return self.send_json({"error": "Check-out must be on or after check-in"}, 422)
            with connect() as db:
                cursor = db.execute(
                    "INSERT INTO bookings (pet_name, check_in, check_out, service_type, status) VALUES (?, ?, ?, ?, ?)",
                    (data["pet_name"], data["check_in"], data["check_out"], data["service_type"], data["status"]),
                )
                booking = dict(db.execute("SELECT * FROM bookings WHERE id = ?", (cursor.lastrowid,)).fetchone())
            return self.send_json(booking, 201)
        if path == "/api/payments":
            required = ("customer", "pet_name", "service", "amount", "status")
            missing = [field for field in required if not str(data.get(field, "")).strip()]
            if missing:
                return self.send_json({"error": "Missing required fields", "fields": missing}, 422)
            try:
                amount = float(data["amount"])
            except (TypeError, ValueError):
                return self.send_json({"error": "Amount must be a number"}, 422)
            if amount <= 0:
                return self.send_json({"error": "Amount must be greater than zero"}, 422)
            with connect() as db:
                cursor = db.execute(
                    "INSERT INTO payments (customer, pet_name, service, amount, status) VALUES (?, ?, ?, ?, ?)",
                    (data["customer"], data["pet_name"], data["service"], amount, data["status"]),
                )
                payment = dict(db.execute("SELECT * FROM payments WHERE id = ?", (cursor.lastrowid,)).fetchone())
            return self.send_json(payment, 201)
        return self.send_json({"error": "Endpoint not found"}, 404)

    def do_PUT(self):
        path = urlparse(self.path).path
        data = self.read_json()
        if data is None:
            return self.send_json({"error": "Request body must be valid JSON"}, 400)
        if path.startswith("/api/pets/"):
            try:
                pet_id = int(path.rsplit("/", 1)[1])
            except ValueError:
                return self.send_json({"error": "Invalid pet id"}, 400)
            required = ("name", "breed", "owner_name")
            missing = [field for field in required if not str(data.get(field, "")).strip()]
            if missing:
                return self.send_json({"error": "Missing required fields", "fields": missing}, 422)
            with connect() as db:
                existing = db.execute("SELECT id, name FROM pets WHERE id = ?", (pet_id,)).fetchone()
                if not existing:
                    return self.send_json({"error": "Pet not found"}, 404)
                db.execute(
                    """UPDATE pets SET name=?, breed=?, age=?, sex=?, food_grams=?, meals_per_day=?,
                    health_notes=?, vaccine_record=?, owner_name=?, owner_contact=?, temperament=?,
                    status=?, service_type=?, stay_dates=?, notes=? WHERE id=?""",
                    (data["name"], data["breed"], data.get("age", ""), data.get("sex", ""),
                     data.get("food_grams"), data.get("meals_per_day"), data.get("health_notes", ""),
                     data.get("vaccine_record", "Record pending"), data["owner_name"],
                     data.get("owner_contact", ""), data.get("temperament", "Friendly"),
                     data.get("status", "Checked in"), data.get("service_type", "Booking pending"),
                     data.get("stay_dates", "Dates not set"), data.get("notes", ""), pet_id),
                )
                if existing["name"] != data["name"]:
                    db.execute("UPDATE bookings SET pet_name = ? WHERE pet_name = ?", (data["name"], existing["name"]))
                    db.execute("UPDATE care_logs SET pet_name = ? WHERE pet_name = ?", (data["name"], existing["name"]))
                    db.execute("UPDATE payments SET pet_name = ? WHERE pet_name = ?", (data["name"], existing["name"]))
                pet = dict(db.execute("SELECT * FROM pets WHERE id = ?", (pet_id,)).fetchone())
            return self.send_json(pet)
        if path.startswith("/api/bookings/"):
            try:
                booking_id = int(path.rsplit("/", 1)[1])
            except ValueError:
                return self.send_json({"error": "Invalid booking id"}, 400)
            required = ("check_in", "check_out", "status")
            missing = [field for field in required if not str(data.get(field, "")).strip()]
            if missing:
                return self.send_json({"error": "Missing required fields", "fields": missing}, 422)
            if data["check_out"] < data["check_in"]:
                return self.send_json({"error": "Check-out must be on or after check-in"}, 422)
            with connect() as db:
                existing = db.execute("SELECT * FROM bookings WHERE id = ?", (booking_id,)).fetchone()
                if not existing:
                    return self.send_json({"error": "Booking not found"}, 404)
                db.execute(
                    """UPDATE bookings SET pet_name=?, check_in=?, check_out=?, service_type=?, status=?
                    WHERE id=?""",
                    (data.get("pet_name", existing["pet_name"]), data["check_in"], data["check_out"],
                     data.get("service_type", existing["service_type"]), data["status"], booking_id),
                )
                booking = dict(db.execute("SELECT * FROM bookings WHERE id = ?", (booking_id,)).fetchone())
            return self.send_json(booking)
        if path == "/api/settings":
            required = ("business_name", "business_subtitle", "manager_name", "manager_role", "capacity", "care_deadline")
            missing = [field for field in required if not str(data.get(field, "")).strip()]
            if missing:
                return self.send_json({"error": "Missing required fields", "fields": missing}, 422)
            try:
                capacity = int(data["capacity"])
            except (TypeError, ValueError):
                return self.send_json({"error": "Capacity must be a whole number"}, 422)
            if capacity < 1 or capacity > 500:
                return self.send_json({"error": "Capacity must be between 1 and 500"}, 422)
            with connect() as db:
                db.execute(
                    """UPDATE settings SET business_name=?, business_subtitle=?, manager_name=?,
                    manager_role=?, capacity=?, care_deadline=? WHERE id=1""",
                    (data["business_name"], data["business_subtitle"], data["manager_name"],
                     data["manager_role"], capacity, data["care_deadline"]),
                )
                settings = dict(db.execute("SELECT * FROM settings WHERE id=1").fetchone())
            return self.send_json(settings)
        return self.send_json({"error": "Endpoint not found"}, 404)

    def do_DELETE(self):
        path = urlparse(self.path).path
        if path.startswith("/api/bookings/"):
            try:
                booking_id = int(path.rsplit("/", 1)[1])
            except ValueError:
                return self.send_json({"error": "Invalid booking id"}, 400)
            with connect() as db:
                booking = db.execute("SELECT * FROM bookings WHERE id = ?", (booking_id,)).fetchone()
                if not booking:
                    return self.send_json({"error": "Booking not found"}, 404)
                db.execute("DELETE FROM bookings WHERE id = ?", (booking_id,))
            return self.send_json({"deleted": True, "id": booking_id, "pet_name": booking["pet_name"]})
        if not path.startswith("/api/pets/"):
            return self.send_json({"error": "Endpoint not found"}, 404)
        try:
            pet_id = int(path.rsplit("/", 1)[1])
        except ValueError:
            return self.send_json({"error": "Invalid pet id"}, 400)
        with connect() as db:
            pet = db.execute("SELECT name FROM pets WHERE id = ?", (pet_id,)).fetchone()
            if not pet:
                return self.send_json({"error": "Pet not found"}, 404)
            db.execute("DELETE FROM pets WHERE id = ?", (pet_id,))
        return self.send_json({"deleted": True, "id": pet_id, "name": pet["name"]})


def main():
    parser = argparse.ArgumentParser(description="BellyRub local app and API server")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=4173)
    args = parser.parse_args()
    initialize_database()
    server = ThreadingHTTPServer((args.host, args.port), BellyRubHandler)
    print(f"BellyRub app and API running at http://{args.host}:{args.port}")
    server.serve_forever()


if __name__ == "__main__":
    main()
