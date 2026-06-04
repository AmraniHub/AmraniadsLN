#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────
//  AmraniAds — New Client Scaffolder
//  Usage: node templates/new-client.js
//  Creates a ready-to-deploy client folder in /clients/
// ─────────────────────────────────────────────────────────────

const fs   = require('fs');
const path = require('path');

const readline = require('readline').createInterface({
  input: process.stdin, output: process.stdout
});

const ask = (q) => new Promise(res => readline.question(q, res));

async function main() {
  console.log('\n🚀  AmraniAds — New Client Setup\n' + '─'.repeat(40));

  const clientName = (await ask('Client folder name (e.g. nouhaila-store): ')).trim().toLowerCase().replace(/\s+/g,'-');
  const template   = (await ask('Template [ecommerce / service / restaurant]: ')).trim() || 'ecommerce';
  const bizName    = (await ask('Business name (Arabic or French): ')).trim();
  const phone      = (await ask('WhatsApp number (212XXXXXXXXX): ')).trim();
  const pixelId    = (await ask('Meta Pixel ID (leave blank to skip): ')).trim();
  const ga4Id      = (await ask('GA4 ID (leave blank to skip): ')).trim();

  readline.close();

  const srcDir  = path.join(__dirname, template);
  const destDir = path.join(__dirname, '..', 'clients', clientName);

  if (!fs.existsSync(srcDir)) {
    console.error(`❌  Template "${template}" not found in /templates/`); process.exit(1);
  }
  if (fs.existsSync(destDir)) {
    console.error(`❌  Client folder "${clientName}" already exists`); process.exit(1);
  }

  // Copy template
  fs.mkdirSync(destDir, { recursive: true });
  fs.copyFileSync(path.join(srcDir, 'index.html'), path.join(destDir, 'index.html'));

  // Read and patch config
  let config = fs.readFileSync(path.join(srcDir, 'config.js'), 'utf8');
  if (bizName)  config = config.replace("'اسم المتجر'",    `'${bizName}'`)
                               .replace("'اسم الشركة'",    `'${bizName}'`)
                               .replace("'مطعم الأصيل'",   `'${bizName}'`);
  if (phone)    config = config.replace(/212600000000/g,    phone);
  if (pixelId)  config = config.replace("metaPixelId: ''", `metaPixelId: '${pixelId}'`);
  if (ga4Id)    config = config.replace("ga4Id: ''",       `ga4Id: '${ga4Id}'`);

  fs.writeFileSync(path.join(destDir, 'config.js'), config);

  // Create placeholder success page
  fs.writeFileSync(path.join(destDir, 'success.html'),
    `<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>تم الإرسال</title></head><body style="font-family:sans-serif;text-align:center;padding:80px 20px"><h1>✅ تم إرسال طلبك بنجاح!</h1><p style="margin-top:16px;color:#555">سيتواصل معك الفريق في أقرب وقت.</p><a href="/" style="display:inline-block;margin-top:24px;color:#075E54">← العودة</a></body></html>`
  );

  console.log('\n' + '═'.repeat(40));
  console.log(`✅  Client created: clients/${clientName}/`);
  console.log(`📁  Files: index.html, config.js, success.html`);
  console.log('\n📋  Next steps:');
  console.log(`  1. Edit clients/${clientName}/config.js to customize content`);
  console.log(`  2. git add clients/${clientName} && git commit -m "Add client ${clientName}"`);
  console.log(`  3. git push → Vercel auto-deploys`);
  console.log(`  4. Add client domain in Vercel dashboard → Settings → Domains`);
  console.log(`  5. Live at: amraniads.com/clients/${clientName}/`);
  console.log('═'.repeat(40) + '\n');
}

main().catch(e => { console.error('❌', e.message); process.exit(1); });
