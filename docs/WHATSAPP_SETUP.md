# WhatsApp setup (where each .env value comes from)

1. Go to **developers.facebook.com**, sign in, and **Create app** (type: Business). Add the **WhatsApp** product.
2. **WhatsApp → API Setup**: Meta gives you a free test number. Copy the **Phone number ID** -> `WHATSAPP_PHONE_ID`. Add your own phone as a test recipient.
3. **Access token**: the one on API Setup expires in about 24 hours (fine for a first test). For production, in **Business Settings → Users → System users** create a system user (Admin), **Assign assets** (your app and WhatsApp account), **Generate token** with `whatsapp_business_messaging` and `whatsapp_business_management`, expiry **Never** -> `WHATSAPP_TOKEN`.
4. **App secret**: **App settings → Basic → App secret** -> `WHATSAPP_APP_SECRET`.
5. **Verify token**: invent any long random string yourself -> `WHATSAPP_VERIFY_TOKEN`.
6. **WhatsApp → Configuration → Webhook**: Callback URL `https://YOUR-SITE/api/webhooks/whatsapp`, Verify token = the string from step 5, **Verify and save**, then subscribe to the **messages** field. (The site must be public https; use a tunnel such as ngrok while testing on your computer.)
7. **WhatsApp Manager → Message templates**: create three templates and wait for approval. Use category **Utility** for order updates.
   - COD confirmation: body with 4 variables (name, order number, store name, amount) and two **quick-reply** buttons (Confirm, Cancel) -> name in `WHATSAPP_TEMPLATE_COD`
   - NDR: body with 4 variables (name, order number, store name, tracking link) -> `WHATSAPP_TEMPLATE_NDR`
   - Status: body with 4 variables (name, order number, store name, status text such as "has been shipped") -> `WHATSAPP_TEMPLATE_STATUS`
   Set `WHATSAPP_LANG` to the template language code (for example `en`).
8. For real customers you need a real business number and Meta business verification. Messages are billed by Meta per message.

Restart the app after changing `.env`.
