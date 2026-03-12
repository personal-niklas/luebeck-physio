interface Env {
  ASSETS: Fetcher;
  RESEND_API_KEY?: string;
  TURNSTILE_SECRET_KEY?: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Handle contact form submission
    if (url.pathname === '/api/contact' && request.method === 'POST') {
      return handleContactForm(request, env);
    }

    // Handle application form submission
    if (url.pathname === '/api/bewerbung' && request.method === 'POST') {
      return handleApplicationForm(request, env);
    }

    // Serve static assets for everything else
    return env.ASSETS.fetch(request);
  },
};

async function handleContactForm(request: Request, env: Env): Promise<Response> {
  const origin = new URL(request.url).origin;

  try {
    const formData = await request.formData();

    // Honeypot check (spam protection)
    const honeypot = formData.get('_gotcha')?.toString();
    if (honeypot) {
      // Bot detected — silently redirect as if successful
      return Response.redirect(`${origin}/danke/`, 302);
    }

    // Cloudflare Turnstile verification
    if (env.TURNSTILE_SECRET_KEY) {
      const turnstileToken = formData.get('cf-turnstile-response')?.toString();
      if (!turnstileToken) {
        return Response.redirect(`${origin}/kontakt/?error=captcha`, 302);
      }

      const ip = request.headers.get('CF-Connecting-IP') || '';
      const verifyRes = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          secret: env.TURNSTILE_SECRET_KEY,
          response: turnstileToken,
          remoteip: ip,
        }),
      });

      const verifyData = await verifyRes.json() as { success: boolean };
      if (!verifyData.success) {
        return Response.redirect(`${origin}/kontakt/?error=captcha`, 302);
      }
    }

    const name = formData.get('name')?.toString().trim() || '';
    const email = formData.get('email')?.toString().trim() || '';
    const phone = formData.get('phone')?.toString().trim() || '';
    const subject = formData.get('subject')?.toString().trim() || 'Kontaktanfrage';
    const message = formData.get('message')?.toString().trim() || '';

    // Validate required fields
    if (!name || !email || !message) {
      return Response.redirect(`${origin}/kontakt/?error=missing`, 302);
    }

    // Basic email format validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return Response.redirect(`${origin}/kontakt/?error=email`, 302);
    }

    // Send email via Resend API
    if (env.RESEND_API_KEY) {
      const emailBody = [
        `Name: ${name}`,
        `E-Mail: ${email}`,
        phone ? `Telefon: ${phone}` : '',
        `Betreff: ${subject}`,
        '',
        'Nachricht:',
        message,
        '',
        '---',
        'Gesendet über das Kontaktformular auf luebeck-physio.de',
      ].filter(Boolean).join('\n');

      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'Physio One Website <website@luebeck-physio.de>',
          to: ['info@luebeck-physio.de'],
          reply_to: email,
          subject: `${subject} — ${name}`,
          text: emailBody,
        }),
      });

      if (!res.ok) {
        console.error('Resend API error:', res.status, await res.text());
        return Response.redirect(`${origin}/kontakt/?error=send`, 302);
      }
    } else {
      // No API key configured — log the submission (visible in Workers logs)
      console.log('Contact form submission (no RESEND_API_KEY configured):');
      console.log(`Name: ${name}, Email: ${email}, Phone: ${phone}`);
      console.log(`Subject: ${subject}, Message: ${message}`);
    }

    return Response.redirect(`${origin}/danke/`, 302);
  } catch (err) {
    console.error('Contact form error:', err);
    return Response.redirect(`${origin}/kontakt/?error=server`, 302);
  }
}

async function handleApplicationForm(request: Request, env: Env): Promise<Response> {
  const origin = new URL(request.url).origin;

  try {
    const formData = await request.formData();

    // Honeypot check
    const honeypot = formData.get('_gotcha')?.toString();
    if (honeypot) {
      return Response.redirect(`${origin}/karriere/?status=danke`, 302);
    }

    // Cloudflare Turnstile verification
    if (env.TURNSTILE_SECRET_KEY) {
      const turnstileToken = formData.get('cf-turnstile-response')?.toString();
      if (!turnstileToken) {
        return Response.redirect(`${origin}/karriere/?error=captcha`, 302);
      }

      const ip = request.headers.get('CF-Connecting-IP') || '';
      const verifyRes = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          secret: env.TURNSTILE_SECRET_KEY,
          response: turnstileToken,
          remoteip: ip,
        }),
      });

      const verifyData = await verifyRes.json() as { success: boolean };
      if (!verifyData.success) {
        return Response.redirect(`${origin}/karriere/?error=captcha`, 302);
      }
    }

    const name = formData.get('name')?.toString().trim() || '';
    const email = formData.get('email')?.toString().trim() || '';
    const phone = formData.get('phone')?.toString().trim() || '';
    const position = formData.get('position')?.toString().trim() || 'Nicht angegeben';
    const start = formData.get('start')?.toString().trim() || '';
    const message = formData.get('message')?.toString().trim() || '';

    // Validate required fields
    if (!name || !email) {
      return Response.redirect(`${origin}/karriere/?error=missing`, 302);
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return Response.redirect(`${origin}/karriere/?error=email`, 302);
    }

    // Send email via Resend API
    if (env.RESEND_API_KEY) {
      const emailBody = [
        `Neue Bewerbung über luebeck-physio.de/karriere/`,
        '',
        `Name: ${name}`,
        `E-Mail: ${email}`,
        phone ? `Telefon: ${phone}` : '',
        `Position: ${position}`,
        start ? `Frühester Start: ${start}` : '',
        '',
        message ? `Nachricht:\n${message}` : '',
        '',
        '---',
        'Gesendet über das Bewerbungsformular auf luebeck-physio.de',
      ].filter(Boolean).join('\n');

      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'Physio One Website <website@luebeck-physio.de>',
          to: ['info@luebeck-physio.de'],
          reply_to: email,
          subject: `Bewerbung: ${position} — ${name}`,
          text: emailBody,
        }),
      });

      if (!res.ok) {
        console.error('Resend API error:', res.status, await res.text());
        return Response.redirect(`${origin}/karriere/?error=send`, 302);
      }
    } else {
      console.log('Application form submission (no RESEND_API_KEY):');
      console.log(`Name: ${name}, Email: ${email}, Position: ${position}`);
    }

    return Response.redirect(`${origin}/karriere/?status=danke`, 302);
  } catch (err) {
    console.error('Application form error:', err);
    return Response.redirect(`${origin}/karriere/?error=server`, 302);
  }
}
