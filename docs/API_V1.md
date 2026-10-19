# Vyoma Route API v1

Create an API key in the seller dashboard: **Connections → API access** (Growth plan or higher). The key is shown once. Send it on every request:

    Authorization: Bearer vr_live_xxxxxxxx

Every response has a `request_id` (also in the `x-request-id` header). Errors look like `{ "error": { "code": "...", "message": "..." }, "request_id": "..." }`. Limit: 120 requests per minute per key.

| Method | Path | What it does |
|---|---|---|
| GET | `/api/v1/orders?limit=25&cursor=<id>&status=NDR` | List orders (max 100 per page). Use `next_cursor` for the next page. `status`: NEW, IN_TRANSIT, NDR, DELIVERED, RTO |
| POST | `/api/v1/orders` | Create up to 100 orders: `{ "orders": [{ "order_no", "payment_type": "COD"\|"PREPAID", "amount", "customer_name?", "phone?", "pincode?", "awb?", "whatsapp_consent?" }] }`. Repeating an `order_no` is ignored, so retries are safe. |
| GET | `/api/v1/orders/{order_no}` | One order: status, awb, carrier, risk level, COD verification state, customer tracking link |

Responses never include the customer's name, phone or address. Keys can only reach the workspace that created them.
