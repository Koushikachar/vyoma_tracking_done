# Email setup (free options)

Vyoma Route sends verification, password-reset and invitation emails. Pick ONE service and set its variables in `.env` (and in Vercel). Restart after changing.

## Option A: Brevo (recommended to start; free 300 emails/day, no domain needed)
1. Sign up at brevo.com.
2. **Senders, domains & dedicated IPs -> Senders -> Add a sender**: use the address people will see as the sender and click the confirmation link Brevo emails you.
3. **SMTP & API -> API keys -> Generate a new API key** (the "API" key, not the SMTP key).
4. `.env`:
   ```
   EMAIL_PROVIDER=brevo
   BREVO_API_KEY=xkeysib-...
   EMAIL_FROM="Vyoma Route <the-address-you-verified@example.com>"
   ```
Note: if the sender is a free address such as @gmail.com, many inboxes will put the emails in spam. For real sellers, authenticate your own domain in Brevo (Senders & domains -> Domains).

## Option B: Resend (free 3,000/month, 100/day)
Resend only emails other people after you verify your own domain (DNS records). Without a domain it can only email yourself.
```
EMAIL_PROVIDER=resend
RESEND_API_KEY=re_...
EMAIL_FROM="Vyoma Route <no-reply@your-domain.com>"
```

## Option C: any SMTP server (Gmail needs an app password)
```
EMAIL_PROVIDER=smtp
EMAIL_SERVER=smtps://user%40gmail.com:APP_PASSWORD@smtp.gmail.com:465
EMAIL_FROM="Vyoma Route <user@gmail.com>"
```

## Check it works
Admin panel -> Sellers -> **Send test email** (enter your password). It emails you and shows the provider's exact error if it fails.
