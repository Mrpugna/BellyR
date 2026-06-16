# BellyRub backend testing

Start the app and API together:

```bash
python3 server.py
```

Useful test endpoints:

```bash
curl http://127.0.0.1:4173/api/health
curl http://127.0.0.1:4173/api/pets
curl http://127.0.0.1:4173/api/bookings
curl http://127.0.0.1:4173/api/care-logs
curl http://127.0.0.1:4173/api/financials
curl http://127.0.0.1:4173/api/settings
```

Create a booking:

```bash
curl -X POST http://127.0.0.1:4173/api/bookings \
  -H 'Content-Type: application/json' \
  -d '{"pet_name":"Coco","check_in":"2026-06-20","check_out":"2026-06-21","service_type":"Overnight","status":"Confirmed"}'
```

Create a payment:

```bash
curl -X POST http://127.0.0.1:4173/api/payments \
  -H 'Content-Type: application/json' \
  -d '{"customer":"Ploy S.","pet_name":"Coco","service":"Overnight stay","amount":2400,"status":"Paid"}'
```

Create a care log:

```bash
curl -X POST http://127.0.0.1:4173/api/care-logs \
  -H 'Content-Type: application/json' \
  -d '{"pet_name":"Coco","meal_status":"All eaten","mood":"Happy","pee":true,"poo":true,"notes":"Great day","channel":"LINE"}'
```

Data is stored locally in `bellyrub.db`.

Pet profiles support `PUT /api/pets/:id` and `DELETE /api/pets/:id`. Business settings support `PUT /api/settings`.
