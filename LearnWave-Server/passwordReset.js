// в”Ђв”Ђв”Ђ passwordReset.js вЂ” РјРѕРґСѓР»СЊ СЃР±СЂРѕСЃР° РїР°СЂРѕР»СЏ С‡РµСЂРµР· Yandex Mail в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ
// РџРѕРґРєР»СЋС‡Рё РІ index.js:
//   const passwordReset = require('./passwordReset');
//   passwordReset.init(pool);
//   app.use('/api/auth', passwordReset.router);

const express    = require('express');
const nodemailer = require('nodemailer');
const bcrypt     = require('bcryptjs');
const crypto     = require('crypto');

const router = express.Router();
let pool;

// в”Ђв”Ђв”Ђ Yandex SMTP С‚СЂР°РЅСЃРїРѕСЂС‚ в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ
// Р’ server/.env РґРѕР±Р°РІСЊ:
//   YANDEX_USER=С‚РІРѕР№_Р»РѕРіРёРЅ@yandex.ru
//   YANDEX_PASS=РїР°СЂРѕР»СЊ_РїСЂРёР»РѕР¶РµРЅРёСЏ_РёР·_РЅР°СЃС‚СЂРѕРµРє_СЏРЅРґРµРєСЃР°
const createTransporter = () => nodemailer.createTransport({
  host:   'smtp.yandex.ru',
  port:   465,
  secure: true,
  connectionTimeout: 10000,
  greetingTimeout: 10000,
  socketTimeout: 15000,
  auth: {
    user: process.env.YANDEX_USER,
    pass: process.env.YANDEX_PASS,
  },
});

// в”Ђв”Ђв”Ђ РљСЂР°СЃРёРІРѕРµ HTML-РїРёСЃСЊРјРѕ в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ
const buildEmailHtml = (code) => `
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#F0F4F8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="480" cellpadding="0" cellspacing="0" style="background:#FFFFFF;border-radius:24px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
          
          <tr>
            <td style="background:#4A90E2;padding:32px;text-align:center;">
              <h1 style="margin:0;color:#FFFFFF;font-size:24px;font-weight:700;letter-spacing:1px;">LearnWave</h1>
              <p style="margin:4px 0 0;color:rgba(255,255,255,0.8);font-size:14px;">Ваша волна знаний</p>
            </td>
          </tr>

          <tr>
            <td style="padding:40px 40px 32px;">
              <h2 style="margin:0 0 12px;color:#1A202C;font-size:20px;font-weight:700;">Сброс пароля</h2>
              <p style="margin:0 0 28px;color:#718096;font-size:15px;line-height:1.6;">
                Мы получили запрос на сброс пароля для вашего аккаунта.<br>
                Используйте код ниже для подтверждения:
              </p>

              <div style="background:#F7FAFC;border:2px dashed #4A90E2;border-radius:16px;padding:28px;text-align:center;margin-bottom:28px;">
                <p style="margin:0 0 8px;color:#718096;font-size:12px;font-weight:700;letter-spacing:2px;text-transform:uppercase;">Ваш код подтверждения</p>
                <div style="font-size:42px;font-weight:900;letter-spacing:12px;color:#4A90E2;font-family:'Courier New',monospace;">${code}</div>
                <p style="margin:12px 0 0;color:#A0AEC0;font-size:12px;">Действителен 10 минут</p>
              </div>

              <p style="margin:0;color:#A0AEC0;font-size:13px;line-height:1.6;">
                Если вы не запрашивали сброс пароля, просто проигнорируйте это письмо.
                Ваш пароль останется прежним.
              </p>
            </td>
          </tr>

          <tr>
            <td style="background:#F7FAFC;padding:20px 40px;border-top:1px solid #EDF2F7;text-align:center;">
              <p style="margin:0;color:#A0AEC0;font-size:12px;">
                © 2026 LearnWave · Это автоматическое письмо, отвечать на него не нужно
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

// в”Ђв”Ђв”Ђ РРЅРёС†РёР°Р»РёР·Р°С†РёСЏ (РїРѕРґРєР»СЋС‡РµРЅРёРµ pool РёР· index.js) в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ
const init = (pgPool) => { pool = pgPool; };

// в”Ђв”Ђв”Ђ РЎРѕР·РґР°РЅРёРµ С‚Р°Р±Р»РёС†С‹ reset_codes в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ
const createTable = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS reset_codes (
      id         SERIAL PRIMARY KEY,
      email      TEXT NOT NULL,
      code       TEXT NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      used       BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_reset_codes_email ON reset_codes(email);
  `);
  console.log('вњ… [Reset] Table reset_codes ready.');
};

// в”Ђв”Ђв”Ђ Р РѕСѓС‚С‹ в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ

// РЁРђР“ 1: РћС‚РїСЂР°РІРєР° РєРѕРґР° РЅР° email
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ success: false, error: 'Email обязателен.' });

  const normalizedEmail = email.toLowerCase().trim();

  try {
    // РџСЂРѕРІРµСЂСЏРµРј СЃСѓС‰РµСЃС‚РІРѕРІР°РЅРёРµ РїРѕР»СЊР·РѕРІР°С‚РµР»СЏ
    const userCheck = await pool.query('SELECT id FROM users WHERE email = $1', [normalizedEmail]);

    // РћС‚РІРµС‡Р°РµРј СѓСЃРїРµС…РѕРј РІ Р»СЋР±РѕРј СЃР»СѓС‡Р°Рµ вЂ” РЅРµ СЂР°СЃРєСЂС‹РІР°РµРј СЃСѓС‰РµСЃС‚РІРѕРІР°РЅРёРµ Р°РєРєР°СѓРЅС‚Р°
    if (userCheck.rows.length === 0) {
      return res.json({ success: true });
    }

    // РЈРґР°Р»СЏРµРј СЃС‚Р°СЂС‹Рµ РєРѕРґС‹ РґР»СЏ СЌС‚РѕРіРѕ email
    await pool.query('DELETE FROM reset_codes WHERE email = $1', [normalizedEmail]);

    // Р“РµРЅРµСЂРёСЂСѓРµРј 4-Р·РЅР°С‡РЅС‹Р№ РєРѕРґ
    const code      = String(crypto.randomInt(1000, 9999));
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // +10 РјРёРЅСѓС‚

    // РЎРѕС…СЂР°РЅСЏРµРј РІ Р‘Р”
    await pool.query(
      'INSERT INTO reset_codes (email, code, expires_at) VALUES ($1, $2, $3)',
      [normalizedEmail, code, expiresAt]
    );

    if (process.env.RESET_CODE_FALLBACK === 'true') {
      console.log(`[Reset] Fallback code for ${normalizedEmail}: ${code}`);
      return res.json({
        success: true,
        mailFallback: true,
        devCode: code,
        warning: 'Письмо не отправлено. Код показан в демо-режиме.',
      });
    }

    // РћС‚РїСЂР°РІР»СЏРµРј РїРёСЃСЊРјРѕ
    try {
      const transporter = createTransporter();
      await transporter.sendMail({
        from:    `"LearnWave" <${process.env.YANDEX_USER}>`,
        to:      normalizedEmail,
        subject: `${code} — код для сброса пароля LearnWave`,
        html:    buildEmailHtml(code),
      });

      console.log(`[Reset] Code sent to ${normalizedEmail}`);
      res.json({ success: true });
    } catch (mailErr) {
      const allowFallback = process.env.RESET_CODE_FALLBACK === 'true';
      console.error('[Reset] mail send error:', mailErr.code || mailErr.message);
      if (allowFallback) {
        console.log(`[Reset] Fallback code for ${normalizedEmail}: ${code}`);
        return res.json({
          success: true,
          mailFallback: true,
          devCode: code,
          warning: 'Письмо не отправлено. Код показан в демо-режиме.',
        });
      }
      throw mailErr;
    }

  } catch (err) {
    console.error('вќЊ [Reset] forgot-password error:', err.message);
    res.status(500).json({ success: false, error: 'Ошибка отправки письма.' });
  }
});

// РЁРђР“ 2: РџСЂРѕРІРµСЂРєР° РєРѕРґР°
router.post('/verify-reset-code', async (req, res) => {
  const { email, code } = req.body;
  if (!email || !code) return res.status(400).json({ success: false, error: 'Неполные данные.' });

  const normalizedEmail = email.toLowerCase().trim();

  try {
    const result = await pool.query(
      `SELECT * FROM reset_codes 
       WHERE email = $1 AND code = $2 AND used = FALSE AND expires_at > NOW()
       ORDER BY created_at DESC LIMIT 1`,
      [normalizedEmail, code.trim()]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ success: false, error: 'Неверный или просроченный код.' });
    }

    res.json({ success: true });

  } catch (err) {
    console.error('вќЊ [Reset] verify-code error:', err.message);
    res.status(500).json({ success: false, error: 'Ошибка сервера.' });
  }
});

// РЁРђР“ 3: РЈСЃС‚Р°РЅРѕРІРєР° РЅРѕРІРѕРіРѕ РїР°СЂРѕР»СЏ
router.post('/reset-password', async (req, res) => {
  const { email, code, newPassword } = req.body;
  if (!email || !code || !newPassword)
    return res.status(400).json({ success: false, error: 'Неполные данные.' });
  if (newPassword.length < 6)
    return res.status(400).json({ success: false, error: 'Пароль должен быть не короче 6 символов.' });

  const normalizedEmail = email.toLowerCase().trim();

  try {
    // Р•С‰С‘ СЂР°Р· РїСЂРѕРІРµСЂСЏРµРј РєРѕРґ (Р·Р°С‰РёС‚Р° РѕС‚ РїРѕРІС‚РѕСЂРЅРѕРіРѕ РёСЃРїРѕР»СЊР·РѕРІР°РЅРёСЏ)
    const codeCheck = await pool.query(
      `SELECT id FROM reset_codes 
       WHERE email = $1 AND code = $2 AND used = FALSE AND expires_at > NOW()
       ORDER BY created_at DESC LIMIT 1`,
      [normalizedEmail, code.trim()]
    );

    if (codeCheck.rows.length === 0) {
      return res.status(400).json({ success: false, error: 'Код недействителен. Запросите новый.' });
    }

    const resetId = codeCheck.rows[0].id;

    // РҐСЌС€РёСЂСѓРµРј Рё РѕР±РЅРѕРІР»СЏРµРј РїР°СЂРѕР»СЊ + РїРѕРјРµС‡Р°РµРј РєРѕРґ РєР°Рє РёСЃРїРѕР»СЊР·РѕРІР°РЅРЅС‹Р№
    const salt   = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash(newPassword, salt);

    await pool.query('BEGIN');
    await pool.query('UPDATE users SET password = $1 WHERE email = $2', [hashed, normalizedEmail]);
    await pool.query('UPDATE reset_codes SET used = TRUE WHERE id = $1', [resetId]);
    await pool.query('COMMIT');

    console.log(`[Reset] Password updated for ${normalizedEmail}`);
    res.json({ success: true });

  } catch (err) {
    await pool.query('ROLLBACK');
    console.error('вќЊ [Reset] reset-password error:', err.message);
    res.status(500).json({ success: false, error: 'Ошибка сервера.' });
  }
});

module.exports = { router, init, createTable };

