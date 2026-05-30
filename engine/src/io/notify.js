// notify.js — push alerts to Discord and/or email when a fresh edge appears.
// Channel-agnostic: send to whatever is configured. Never throws.
import { CONFIG } from "../config.js";

// Pure: compose a short alert from today's lock + board. Returns null if nothing.
export function composeAlert({ lock, picks, siteUrl }) {
  const board = picks || [];
  if (!lock && board.length === 0) return null;
  const lines = ["🎯 Degen with Discipline — fresh edge"];
  if (lock) {
    lines.push(`LOCK · ${lock.matchup}`);
    lines.push(`  ${lock.pick} ${lock.odds}  (+${(lock.evPct * 100).toFixed(1)}% EV · ${lock.grade}) — $${lock.kellyStake} @ ${lock.bestBook}`);
  }
  for (const p of board.slice(0, 4)) {
    lines.push(`• ${p.pick} ${p.odds}  (+${(p.evPct * 100).toFixed(1)}% EV) @ ${p.bestBook}`);
  }
  if (siteUrl) lines.push(siteUrl);
  return lines.join("\n");
}

export async function sendDiscord(webhook, content) {
  try {
    const res = await fetch(webhook, {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ content })
    });
    return res.ok;
  } catch (e) { console.error("[notify discord] " + e.message); return false; }
}

export async function sendEmail({ apiKey, to, from, subject, text }) {
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
      body: JSON.stringify({ from, to, subject, text })
    });
    return res.ok;
  } catch (e) { console.error("[notify email] " + e.message); return false; }
}

// I/O: send a message to every configured channel. Returns the channels reached.
export async function notify(message, subject) {
  const sent = [];
  if (CONFIG.discordWebhook && await sendDiscord(CONFIG.discordWebhook, message)) sent.push("discord");
  if (CONFIG.resendApiKey && CONFIG.alertEmail &&
    await sendEmail({ apiKey: CONFIG.resendApiKey, to: CONFIG.alertEmail, from: CONFIG.alertFrom, subject, text: message })) {
    sent.push("email");
  }
  return sent;
}

export function anyChannelConfigured() {
  return !!(CONFIG.discordWebhook || (CONFIG.resendApiKey && CONFIG.alertEmail));
}
