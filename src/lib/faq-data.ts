/**
 * Wodejia help centre. One source of truth for the public /faq pages (search-engine friendly, FAQPage structured data)
 * and the in-app Help page. Answers are plain Markdown (see markdown-core.ts). Keep each answer self-contained and direct:
 * it is read out of context by search engines and assistants. Only describe what the product really does.
 */
export type Faq = { slug: string; q: string; a: string };
export type FaqCategory = { slug: string; title: string; blurb: string; seoTitle: string; seoDescription: string; items: Faq[] };

export const FAQ_CATEGORIES: FaqCategory[] = [
  {
    slug: 'getting-started',
    title: 'Getting started',
    blurb: 'What Wodejia is, who it is for and how to set up your first home.',
    seoTitle: 'Getting started with Wodejia: FAQ',
    seoDescription: 'What Wodejia is, whether it is free, who it is for and how to set up your first home, install the app and start tracking appliances and warranties.',
    items: [
      { slug: 'what-is-wodejia', q: 'What is Wodejia?', a: 'Wodejia (from the Chinese pinyin for “my home”, 我的家) is a free home-management app. It keeps every appliance, warranty, receipt, manual, document, contractor and utility bill for your home in one place, reminds you about seasonal maintenance and expiring warranties, and can produce a shareable **Home Service Passport** when you sell or rent.' },
      { slug: 'is-wodejia-free', q: 'Is Wodejia free?', a: 'Yes. You can create an account and start for free. The free plan may limit how many assets you can add per home and how many people can join a home; if you reach a limit the app tells you. The optional “Buy me a coffee” page is a voluntary donation and unlocks nothing.' },
      { slug: 'who-is-wodejia-for', q: 'Who is Wodejia for?', a: 'Homeowners, landlords, tenants and families who want to stop losing receipts and missing warranty dates. It is built with homes in Singapore and Malaysia in mind (tropical climate tasks, local currencies and date formats), and works anywhere.' },
      { slug: 'set-up-my-first-home', q: 'How do I set up my first home?', a: 'After you create an account, Wodejia creates your first home automatically. Open **My homes** and tap the pencil to set the home’s name, icon, address, currency and climate. Then add your first appliance from **Assets**: snap its receipt and Wodejia fills in the details. The dashboard checklist walks you through the rest.' },
      { slug: 'install-wodejia-on-phone', q: 'Can I install Wodejia as an app on my phone?', a: 'Yes. Wodejia is a progressive web app, so there is nothing to download from an app store. On **iPhone or iPad**, open the site in Safari, tap Share and choose **Add to Home Screen**. On **Android**, open it in Chrome and choose **Install app** (or Add to Home screen). On a computer, use the install icon in the address bar of Chrome or Edge.' },
      { slug: 'supported-countries-languages-currencies', q: 'Which countries, languages and currencies does Wodejia support?', a: 'Wodejia works in any country. You can choose the date and number format for several English variants (United States, United Kingdom, Malaysia, Singapore, Australia, New Zealand, Canada, India), Bahasa Melayu, Bahasa Indonesia, Chinese and Thai in **Settings → Appearance**, and set a currency for each home. The interface text itself is in English.' },
    ],
  },
  {
    slug: 'assets-and-warranties',
    title: 'Assets & warranties',
    blurb: 'Adding appliances, scanning receipts, QR labels and warranty reminders.',
    seoTitle: 'Appliance & warranty tracking: FAQ',
    seoDescription: 'How to add appliances, scan receipts, store manuals and photos, print QR labels and get reminded before a warranty expires in Wodejia.',
    items: [
      { slug: 'how-to-add-an-appliance', q: 'How do I add an appliance or piece of equipment?', a: 'Go to **Assets → Add an asset**. Enter the name, brand, model, serial number, install date and warranty end date, then attach a receipt, manual and photos if you have them. The fastest way is **Scan receipt**: upload the receipt and Wodejia fills in the product, brand, model, purchase date and warranty length for you to check.' },
      { slug: 'how-does-receipt-scanning-work', q: 'How does receipt scanning work, and is it accurate?', a: 'When you press **Scan receipt**, the image is sent to an AI service (Anthropic) that reads the product name, brand, model, dates, warranty length and price. Nothing is scanned unless you choose to. Scanning is a starting point, not a guarantee: always check the filled-in fields before saving, especially serial numbers, which are only filled in when they are printed on the document. Photos up to 8 MB in JPEG, PNG, WebP or GIF are supported.' },
      { slug: 'what-files-can-i-upload', q: 'What files can I upload, and how big can they be?', a: 'You can attach photos (JPEG, PNG, WebP, HEIC and similar) and PDFs for receipts, manuals and item photos, up to 10 MB per file. Files are stored privately: only signed-in members of your home can open them.' },
      { slug: 'warranty-expiry-reminders', q: 'How do I get reminded before a warranty expires?', a: 'Enter the warranty end date on the asset, then turn on reminders in **Settings → Notifications** and choose how early you want the warning (14, 30, 60 or 90 days, plus a final nudge in the last week). Reminders arrive by e-mail and/or push notification, and the dashboard also highlights warranties ending soon.' },
      { slug: 'what-are-qr-labels', q: 'What are QR labels and how do I print them?', a: 'A QR label is a small sticker you put on an appliance. Scanning it with any phone camera opens that appliance’s record in Wodejia (after you sign in), so you can see its warranty, manual and service history. Open **More → QR labels** to print a sheet, then stick them on your appliances.' },
      { slug: 'brand-logos', q: 'Why do my appliances show brand logos, and can I change them?', a: 'Wodejia has a library of common appliance brand logos that make lists easier to scan. If your brand is missing, simply type its name; a missing logo never affects reminders or records.' },
      { slug: 'delete-an-asset', q: 'What happens when I delete an asset?', a: 'Deleting an asset removes it, its service history and its uploaded files from your home. This cannot be undone, so download your data first from **Settings → Privacy & data** if you want a copy.' },
    ],
  },
  {
    slug: 'maintenance-and-reminders',
    title: 'Maintenance & reminders',
    blurb: 'Seasonal checklists, e-mail and push reminders and calendar sync.',
    seoTitle: 'Home maintenance reminders: FAQ',
    seoDescription: 'How Wodejia seasonal maintenance checklists, e-mail and push reminders, WhatsApp status and calendar feeds work, and how to fix reminders that do not arrive.',
    items: [
      { slug: 'seasonal-maintenance-tasks', q: 'What are seasonal maintenance tasks?', a: 'When you create a home Wodejia adds a starter set of recurring tasks for its climate: tropical homes (heat, humidity, monsoon: aircon servicing, drain checks, termite inspection) or four-season homes (frost, heating, gutters). Tick a task off and it comes back automatically on its schedule. Change the climate in **My homes → pencil** and use **Add suggested tasks** to add the matching ones; your existing tasks are never changed.' },
      { slug: 'how-do-reminders-work', q: 'How do Wodejia reminders work?', a: 'Wodejia sends one daily summary covering tasks due soon, warranties about to end and documents about to expire. Choose the channels (e-mail and/or push notification) and how many days ahead you want to be warned in **Settings → Notifications**. Nothing is sent if there is nothing due.' },
      { slug: 'push-notifications-iphone', q: 'How do I turn on push notifications on iPhone or Android?', a: 'Open **Settings → Notifications → Turn on for this device** and allow notifications when asked. On **iPhone and iPad** push only works after you add Wodejia to the Home Screen (Safari → Share → Add to Home Screen) and open it from that icon. Use **Send a test** to confirm it works. Each device is turned on separately.' },
      { slug: 'whatsapp-reminders', q: 'Can Wodejia send reminders on WhatsApp?', a: 'WhatsApp reminders are built but switched off for now (“coming soon”) because they need a verified WhatsApp Business account. Use e-mail or push notifications today; both arrive on time and need no extra set-up.' },
      { slug: 'add-tasks-to-my-calendar', q: 'Can I see my maintenance schedule in Google, Apple or Outlook calendar?', a: 'Yes. In **Settings → Notifications → Calendar** create your private calendar link and subscribe to it in Google Calendar, Apple Calendar or Outlook. Your due dates then appear alongside your other events. If the link is ever shared by mistake, make a new one and the old link stops working.' },
      { slug: 'reminders-not-arriving', q: 'Why am I not getting reminders?', a: 'Check three things: reminders are switched on in **Settings → Notifications**; there is something due within your chosen lead time (nothing is sent on quiet days); and for e-mail, that messages are not in your spam or promotions folder (add the sender to your contacts). For push, make sure notifications are allowed for the site (or the Home Screen app) in your device settings and use **Send a test**.' },
      { slug: 'assign-tasks', q: 'Can I give a task to someone else in my household?', a: 'Yes. Tasks can be assigned to members of the home from the **Schedule** page, so everyone knows who is doing what.' },
    ],
  },
  {
    slug: 'documents-bills-and-contractors',
    title: 'Documents, bills & contractors',
    blurb: 'The document vault, utility bills, yearly spending and your contractor list.',
    seoTitle: 'Document vault, utility bills & contractors: FAQ',
    seoDescription: 'Store insurance and property documents with expiry reminders, track utility bills and yearly home spending, and keep a contractor book in Wodejia.',
    items: [
      { slug: 'document-vault', q: 'What is the document vault?', a: 'A private place for the papers a home generates: insurance policies, mortgage and tenancy agreements, deeds, inspection reports. Add a title, an optional expiry date and your file. Wodejia reminds you before documents expire, so an insurance renewal never sneaks up on you. Find it under **Documents**.' },
      { slug: 'track-utility-bills', q: 'How do I track utility bills and spot spikes?', a: 'Open **Utility bills** and add each bill (electricity, water, gas, internet and more) with its month and amount. Wodejia charts them and warns you when a bill jumps well above your usual level, which is often the first sign of a leak or a faulty appliance.' },
      { slug: 'yearly-spending-report', q: 'Can I see how much my home costs me each year?', a: 'Yes. **Spending** shows your yearly total for appliance purchases and repair or servicing costs, broken down by category, and lets you download the figures as a CSV spreadsheet for tax time or budgeting. Utility bills are tracked separately under **Utility bills**, with totals per year.' },
      { slug: 'contractors-book', q: 'What is the contractors book?', a: 'A list of the trusted people who look after your home: plumber, electrician, aircon technician. Save their phone and e-mail once, tap to call or message, and mark which of your homes each contractor covers, because one contractor can serve several of your properties.' },
      { slug: 'service-history', q: 'Can I record repairs and servicing?', a: 'Yes. Each asset has a service history where you log the date, what was done, who did it and what it cost. It feeds your yearly spending report and makes your Home Service Passport more convincing to a buyer or tenant.' },
    ],
  },
  {
    slug: 'sharing-and-households',
    title: 'Households, sharing & moving',
    blurb: 'Inviting family, several homes, the Home Service Passport and the move-out pack.',
    seoTitle: 'Households, Home Passport & move-out pack: FAQ',
    seoDescription: 'Invite family to your home, manage several properties, share a read-only Home Service Passport and download a move-out pack when you sell or rent.',
    items: [
      { slug: 'invite-family-members', q: 'How do I invite family or co-owners?', a: 'Open **Household → Invite** to create a private invite link and send it to the person. The link works for 7 days. When they open it and sign in they join your home. Owners and admins can manage members and roles.' },
      { slug: 'roles-owner-admin-member', q: 'What is the difference between owner, admin and member?', a: 'The **owner** created the home and can do everything, including deleting it. **Admins** can edit home details and manage people and sharing. **Members** can use the home’s records but cannot change its details, invite people or manage other members.' },
      { slug: 'manage-multiple-homes', q: 'Can I manage more than one home?', a: 'Yes. Add as many homes as you need from **My homes** and switch between them with the icons at the top of the left menu (or the home picker on your phone). Each home has its own assets, schedule, documents, bills and members, plus its own currency and climate.' },
      { slug: 'home-service-passport', q: 'What is a Home Service Passport?', a: 'A read-only web page that shows how well your home has been looked after: appliances, service history and completed maintenance. It is **off by default**. You choose to turn it on in **Passport**, can protect it with a password and can turn it off again at any time. It never shows your name, e-mail, other members, serial numbers, notes, receipts or photos.' },
      { slug: 'move-out-pack', q: 'What is the move-out pack?', a: 'A single download for when you sell, rent out or move: a ZIP file with your assets and service history as spreadsheets, a printable summary you can save as PDF, and the receipts, manuals and photos. You can also include your contractors, vault documents and utility bills. Only the home’s owner or admins can create it. Open **More → Move-out pack**.' },
      { slug: 'leave-or-remove-someone', q: 'How do I remove someone from my home or leave a home?', a: 'Owners and admins can remove members from **Household**. To leave a home yourself, open **Household** and use the **Leave household** button next to your own name. An owner who wants to stop sharing altogether can delete the home from **My homes**.' },
    ],
  },
  {
    slug: 'privacy-and-security',
    title: 'Privacy & security',
    blurb: 'Where your data lives, who can see it, two-factor sign-in and deleting your account.',
    seoTitle: 'Privacy & account security: FAQ',
    seoDescription: 'Where Wodejia stores your data, who can see your files, how to turn on two-factor authentication, download your data and delete your account.',
    items: [
      { slug: 'is-my-data-safe', q: 'Is my data safe and who can see it?', a: 'Your records belong to your home. Only signed-in members of that home can see them. Connections use HTTPS, the database is encrypted and managed, and uploaded receipts, manuals and photos live in private storage with no public web address. We do not sell your data and show no ads. Read the full [Privacy Policy](/privacy) for details.' },
      { slug: 'two-factor-authentication', q: 'How do I turn on two-factor authentication?', a: 'Open **Settings → Security → Set up 2FA**, scan the QR code with an authenticator app (such as Google Authenticator, 1Password or Authy) and enter the 6-digit code. Save the recovery codes it shows you somewhere safe: they let you sign in if you lose your phone.' },
      { slug: 'download-my-data', q: 'Can I download all my data?', a: 'Yes, at any time. **Settings → Privacy & data** has **Download my data (JSON)** with everything you can see, and **Assets (CSV)** for a spreadsheet of your appliances.' },
      { slug: 'delete-my-account', q: 'How do I delete my account?', a: 'Open **Settings → Privacy & data → Delete my account**, confirm with your password (and your 2FA code if enabled). Your account and the data you own are permanently deleted. Download your data first if you want a copy; deletion cannot be undone.' },
      { slug: 'who-reads-my-receipts', q: 'Does anyone read my receipts and documents?', a: 'No person at Wodejia reads your files as part of normal operation. A receipt is only processed by the AI service when you press **Scan receipt**, solely to extract product details. See the [Privacy Policy](/privacy) for the list of service providers that handle data on our behalf.' },
    ],
  },
  {
    slug: 'account-and-sign-in',
    title: 'Account & sign-in',
    blurb: 'Creating an account, passwords, Google and Apple sign-in and account problems.',
    seoTitle: 'Account & sign-in help: FAQ',
    seoDescription: 'Create a Wodejia account, confirm your e-mail, reset a forgotten password, sign in with Google or Apple and fix common sign-in problems.',
    items: [
      { slug: 'create-an-account', q: 'How do I create an account?', a: 'Go to [Create your account](/register), enter your e-mail and we send you a link to confirm your address and choose a password (at least 12 characters). You can also continue with Google or Apple where available.' },
      { slug: 'confirmation-email-not-arriving', q: 'I did not receive the confirmation or reset e-mail. What should I do?', a: 'Wait a minute, then check your spam, junk or promotions folder. Make sure the address is spelled correctly and ask for a new link; the newest link always replaces older ones. Links expire for your security, so use the latest one promptly.' },
      { slug: 'forgot-my-password', q: 'I forgot my password. How do I reset it?', a: 'Choose **Forgot password** on the [sign-in page](/login), enter your e-mail and follow the link we send. Resetting your password signs you out everywhere else for safety.' },
      { slug: 'sign-in-with-google-or-apple', q: 'Can I sign in with Google or Apple?', a: 'Yes, where it is shown on the sign-in page. If you already created an account with the same e-mail address, use that e-mail to sign in. Never share your password or codes with anyone, including us.' },
      { slug: 'account-locked', q: 'My account is locked after wrong passwords. What now?', a: 'To protect your account, sign-in is paused for a short while after several wrong attempts. Wait a few minutes and try again, or reset your password from the sign-in page.' },
    ],
  },
  {
    slug: 'troubleshooting',
    title: 'Troubleshooting',
    blurb: 'Quick fixes for the most common problems.',
    seoTitle: 'Wodejia troubleshooting: FAQ',
    seoDescription: 'Fix common Wodejia problems: receipt scan not working, files will not upload, app not updating, notifications missing or dates in the wrong format.',
    items: [
      { slug: 'receipt-scan-not-working', q: 'Receipt scanning failed or filled in the wrong details. What can I do?', a: 'Use a sharp, well-lit photo with the whole receipt in frame (JPEG, PNG, WebP or GIF, under 8 MB). If scanning still fails, wait a minute and try again, or enter the details by hand. Scanning has a fair-use limit per minute and per day to keep it free for everyone.' },
      { slug: 'file-will-not-upload', q: 'My file will not upload.', a: 'Files must be photos or PDFs of 10 MB or less. Large phone photos can exceed this: take a lower-resolution photo or share a compressed copy. Check your connection and try again.' },
      { slug: 'app-not-updating', q: 'The app looks out of date or something is stuck. How do I refresh it?', a: 'Close and reopen the app, or refresh the page. On iPhone, swipe the app away and open it again. If the problem remains, remove the Home Screen icon, open the website in your browser and add it again.' },
      { slug: 'dates-wrong-format', q: 'Dates or money show in the wrong format.', a: 'Pick your region in **Settings → Appearance** (language & region) for dates and numbers, and set the currency for each home from **My homes → pencil**.' },
      { slug: 'contact-support', q: 'How do I contact support or suggest a feature?', a: 'Use the contact details in our [Privacy Policy](/privacy) and [Terms](/terms), and include what you were doing and which device or browser you use. Feature ideas are welcome and help decide what we build next.' },
    ],
  },
];
