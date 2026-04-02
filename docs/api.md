# API Reference

Quick Invoice exposes a REST API under the `/api` path. All endpoints return JSON.

## Authentication

Most endpoints require an active session. The app uses **NextAuth.js** session cookies.  
In API calls from browser JavaScript (e.g. `fetch`), credentials are included automatically via cookies.

Unauthenticated requests to protected endpoints return:

```json
{ "error": "Unauthorized" }
```
with HTTP status `401`.

---

## Response Format

All responses follow a common wrapper:

```typescript
// Success
{ "data": <T> }

// Error
{ "error": "<message>" }
```

Paginated responses use:

```typescript
{
  "data": {
    "data": T[],
    "total": number,
    "page": number,
    "limit": number
  }
}
```

---

## Health

### `GET /api/health`

No authentication required. Returns service health status.

**Response 200:**
```json
{ "status": "ok", "timestamp": "2026-04-02T12:00:00.000Z" }
```

---

## Authentication Endpoints

### `POST /api/auth/register`

Register a new user with email and password.

**Request body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword",
  "fullName": "Jane Smith"
}
```

**Response 201:**
```json
{ "message": "Registration successful. Please verify your email." }
```

---

### `POST /api/auth/forgot-password`

Send a password reset email.

**Request body:**
```json
{ "email": "user@example.com" }
```

**Response 200:**
```json
{ "message": "If an account exists, a reset link has been sent." }
```

---

### `POST /api/auth/reset-password`

Reset the user's password using a token received by email.

**Request body:**
```json
{
  "token": "<reset-token>",
  "password": "newpassword"
}
```

**Response 200:**
```json
{ "message": "Password reset successful." }
```

---

### `POST /api/auth/verify-email`

Verify an email address with the token sent during registration.

**Request body:**
```json
{ "token": "<verification-token>" }
```

**Response 200:**
```json
{ "message": "Email verified successfully." }
```

---

### `POST /api/auth/resend-verification`

Re-send the email verification link.

**Request body:**
```json
{ "email": "user@example.com" }
```

**Response 200:**
```json
{ "message": "Verification email sent." }
```

---

## Invoices

All invoice endpoints require authentication.

### `GET /api/invoices`

Returns a paginated list of invoices for the authenticated user.

**Query parameters:**

| Parameter | Type | Default | Description |
|---|---|---|---|
| `page` | integer | `1` | Page number (1-based) |
| `limit` | integer | `20` | Results per page (max 100) |
| `status` | string | — | Filter by status: `DRAFT`, `SENT`, `VIEWED`, `PAID`, `OVERDUE`, `CANCELLED` |
| `clientId` | string | — | Filter by client ID |

**Response 200:**
```json
{
  "data": {
    "data": [ /* InvoiceWithClient[] */ ],
    "total": 42,
    "page": 1,
    "limit": 20
  }
}
```

---

### `POST /api/invoices`

Create a new invoice (status defaults to `DRAFT`). Monetary values are provided in **dollars** and stored as cents internally.

Plan limits apply: FREE users may create up to 3 invoices per calendar month.

**Request body:**
```json
{
  "clientId": "cuid_client_id",
  "dueDate": "2026-05-01T00:00:00.000Z",
  "currency": "USD",
  "taxRate": 10,
  "discountAmount": 0,
  "notes": "Optional invoice notes",
  "footer": "Thank you for your business.",
  "lineItems": [
    {
      "description": "Web design",
      "quantity": 10,
      "unitPrice": 75.00,
      "sortOrder": 0
    }
  ]
}
```

**Response 201:**
```json
{ "data": { /* InvoiceWithClient */ } }
```

**Response 403** — monthly limit reached:
```json
{ "error": "You have reached your monthly invoice limit. Upgrade to Pro for unlimited invoices." }
```

---

### `GET /api/invoices/[id]`

Get a single invoice by ID (must belong to the authenticated user).

**Response 200:**
```json
{ "data": { /* InvoiceWithClient */ } }
```

---

### `PATCH /api/invoices/[id]`

Update a draft invoice. Only `DRAFT` invoices can be edited.

**Request body** (all fields optional):
```json
{
  "clientId": "cuid_client_id",
  "dueDate": "2026-06-01T00:00:00.000Z",
  "currency": "EUR",
  "taxRate": 20,
  "discountAmount": 50,
  "notes": "Updated notes",
  "footer": "Updated footer",
  "lineItems": [ /* LineItemInput[] — replaces all existing items */ ]
}
```

**Response 200:**
```json
{ "data": { /* InvoiceWithClient */ } }
```

---

### `DELETE /api/invoices/[id]`

Delete an invoice.

**Response 200:**
```json
{ "message": "Invoice deleted." }
```

---

### `POST /api/invoices/[id]/send`

Send an invoice to the client by email and set status to `SENT`.

**Response 200:**
```json
{ "message": "Invoice sent." }
```

---

### `POST /api/invoices/[id]/status`

Manually update an invoice's status.

**Request body:**
```json
{ "status": "PAID" }
```

**Response 200:**
```json
{ "data": { /* Invoice */ } }
```

---

### `GET /api/invoices/[id]/pdf`

Download the invoice as a PDF. Requires **Pro** or **Enterprise** plan.

**Response 200:** `application/pdf` binary stream.

**Response 403** — plan not eligible:
```json
{ "error": "PDF downloads require a Pro plan." }
```

---

### `POST /api/invoices/[id]/duplicate`

Create a copy of an existing invoice as a new `DRAFT`.

**Response 201:**
```json
{ "data": { /* InvoiceWithClient */ } }
```

---

### `POST /api/invoices/[id]/reminder`

Send a payment reminder email to the client. Requires **Pro** or **Enterprise** plan.

**Response 200:**
```json
{ "message": "Reminder sent." }
```

---

## Clients

All client endpoints require authentication.

### `GET /api/clients`

Returns a paginated list of clients.

**Query parameters:**

| Parameter | Type | Default | Description |
|---|---|---|---|
| `page` | integer | `1` | Page number |
| `pageSize` | integer | `50` | Results per page (max 100) |
| `search` | string | — | Search by name, email, or company |

**Response 200:**
```json
{
  "data": {
    "data": [ /* Client[] */ ],
    "total": 10,
    "page": 1,
    "limit": 50
  }
}
```

---

### `POST /api/clients`

Create a new client. Plan limits apply: FREE users may have up to 5 clients.

**Request body:**
```json
{
  "name": "Acme Corp",
  "email": "billing@acme.com",
  "company": "Acme Corporation",
  "address": "123 Main St, Springfield",
  "phone": "+1 555 0100",
  "currency": "USD",
  "notes": "Net 30 payment terms"
}
```

**Response 201:**
```json
{ "data": { /* Client */ } }
```

**Response 403** — client limit reached:
```json
{ "error": "You have reached your client limit. Upgrade to Pro for unlimited clients." }
```

---

### `GET /api/clients/[id]`

Get a single client by ID.

**Response 200:**
```json
{ "data": { /* Client */ } }
```

---

### `PATCH /api/clients/[id]`

Update client details (all fields optional).

**Request body:**
```json
{
  "name": "Updated Name",
  "email": "new@email.com",
  "company": "New Company"
}
```

**Response 200:**
```json
{ "data": { /* Client */ } }
```

---

### `DELETE /api/clients/[id]`

Delete a client. This will fail if the client has existing invoices.

**Response 200:**
```json
{ "message": "Client deleted." }
```

---

## User Profile

### `GET /api/user/profile`

Get the authenticated user's profile.

**Response 200:**
```json
{ "data": { /* User */ } }
```

---

### `PATCH /api/user/profile`

Update user profile.

**Request body** (all fields optional):
```json
{
  "fullName": "Jane Smith",
  "businessName": "Jane Smith Design",
  "businessAddress": "456 Oak Ave, Portland, OR",
  "businessPhone": "+1 503 555 0200",
  "currency": "USD",
  "locale": "en-US",
  "logoUrl": "https://example.com/logo.png"
}
```

**Response 200:**
```json
{ "data": { /* User */ } }
```

---

### `POST /api/user/change-password`

Change the authenticated user's password.

**Request body:**
```json
{
  "currentPassword": "oldpassword",
  "newPassword": "newpassword"
}
```

**Response 200:**
```json
{ "message": "Password changed successfully." }
```

---

### `DELETE /api/user/delete`

Permanently delete the authenticated user's account and all associated data.

**Response 200:**
```json
{ "message": "Account deleted." }
```

---

## Billing

### `GET /api/billing/subscription`

Returns the current user's plan, subscription status, and usage counters.

**Response 200:**
```json
{
  "data": {
    "plan": "PRO",
    "planName": "Pro",
    "status": "ACTIVE",
    "stripeSubscriptionId": "sub_...",
    "trialEnd": null,
    "currentPeriodEnd": "2026-05-01T00:00:00.000Z",
    "cancelAtPeriodEnd": false,
    "hasStripeCustomer": true,
    "usage": {
      "invoicesThisMonth": 7,
      "invoicesLimit": null,
      "totalClients": 12,
      "clientsLimit": null
    }
  }
}
```

---

### `POST /api/billing/checkout`

Create a Stripe Checkout session to subscribe to a plan.

**Request body:**
```json
{ "priceId": "price_..." }
```

**Response 200:**
```json
{ "data": { "url": "https://checkout.stripe.com/..." } }
```

---

### `POST /api/billing/portal`

Create a Stripe Customer Portal session for managing the subscription.

**Response 200:**
```json
{ "data": { "url": "https://billing.stripe.com/..." } }
```

---

### `POST /api/billing/upgrade`

Upgrade an existing subscription to a higher plan.

**Request body:**
```json
{ "priceId": "price_..." }
```

**Response 200:**
```json
{ "message": "Subscription upgraded." }
```

---

### `POST /api/billing/cancel`

Cancel the subscription at the end of the current billing period.

**Response 200:**
```json
{ "message": "Subscription will be cancelled at end of period." }
```

---

### `POST /api/billing/reactivate`

Reactivate a subscription that was set to cancel at period end.

**Response 200:**
```json
{ "message": "Subscription reactivated." }
```

---

## Webhooks

### `POST /api/webhooks/stripe`

Handles incoming Stripe webhook events. The request must include a valid `Stripe-Signature` header.

**Handled events:**

| Event | Action |
|---|---|
| `checkout.session.completed` | Activate subscription, update user plan |
| `customer.subscription.updated` | Sync subscription status and plan |
| `customer.subscription.deleted` | Downgrade user to FREE plan |
| `invoice.payment_succeeded` | Record successful payment |
| `invoice.payment_failed` | Mark subscription as past due |

This endpoint is not called by clients directly — it is registered as a webhook in the Stripe Dashboard.

---

## Public Invoice View

### `GET /invoice/[id]`

Public page (no authentication) where a client can view an invoice sent to them. This is a Next.js page, not a JSON API endpoint.

### `GET /invoice/[id]/thank-you`

Thank-you page shown to a client after payment.

---

## Error Codes

| HTTP Status | Meaning |
|---|---|
| `400` | Bad request — validation error in request body |
| `401` | Unauthorized — no valid session |
| `403` | Forbidden — plan limit reached or insufficient permissions |
| `404` | Not found — resource does not exist or belongs to another user |
| `429` | Too many requests — rate limit exceeded |
| `500` | Internal server error |
