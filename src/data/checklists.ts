import type { ChecklistSection, ProductId } from "../types";

const CLIMAGRO_SECTIONS: ChecklistSection[] = [
  {
    id: "pre-1",
    title: "1. Pre-deployment preparation",
    color: "#94a3b8",
    phase: "pre",
    items: [
      { id: "pre-1-1", title: "Final code review completed", description: "A developer has reviewed all recent code changes for quality, completeness, and correctness. No unresolved issues or incomplete logic remains.", devRequired: true },
      { id: "pre-1-2", title: "Full testing done in a staging environment", description: "The complete website has been tested on a staging server that closely mirrors the live server. All features and pages are confirmed working before going live." },
      { id: "pre-1-3", title: "All planned features and bug fixes are complete", description: "Nothing is half-finished. Every item planned for this release is fully built and tested. No known bugs are being carried into the live site.", critical: true },
      { id: "pre-1-4", title: "Client or stakeholder sign-off received", description: "The decision-maker or client has reviewed and approved the website in staging. Written confirmation of the go-ahead for launch has been received.", clientVerify: true },
      { id: "pre-1-5", title: "Deployment plan shared with the team", description: "Everyone involved — developer, project manager, client contact — knows the exact timeline, what is being deployed, and their specific role during the deployment." },
      { id: "pre-1-6", title: "Rollback plan is documented and ready", description: "A clear, written step-by-step plan exists to quickly undo the deployment and restore the previous working version if anything goes wrong after launch.", critical: true },
      { id: "pre-1-7", title: "Current live website backed up (if replacing an existing site)", description: "If this deployment replaces an existing website, a full backup — both files and database — has been saved securely before any changes are made to the live environment.", critical: true },
      { id: "pre-1-8", title: "Maintenance window communicated to users", description: "If the website will experience downtime during deployment, users or clients have been notified in advance of the time and the expected duration.", clientVerify: true },
    ],
  },
  {
    id: "pre-2",
    title: "2. Code & application files",
    color: "#3b82f6",
    phase: "pre",
    items: [
      { id: "pre-2-1", title: "All code finalized and committed to version control (Git)", description: "Every change is saved in Git or a similar tool. No unsaved edits exist on anyone's local machine. The exact version being deployed is clearly tagged or noted.", devRequired: true },
      { id: "pre-2-2", title: "Debug and test code removed from all PHP files", description: "All temporary developer test lines — such as var_dump(), print_r(), die(), and echo statements used for debugging — have been deleted. These can expose sensitive server information to website visitors.", devRequired: true, critical: true },
      { id: "pre-2-3", title: "PHP error display turned OFF for production", description: "PHP settings are configured so errors do NOT appear on screen for website visitors. The setting 'display_errors = Off' must be confirmed. Error messages visible to the public are a security risk.", devRequired: true, critical: true },
      { id: "pre-2-4", title: "PHP error logging turned ON", description: "PHP is set to write errors silently to a server log file (error_log) so developers can review and diagnose problems — without those errors ever being visible to users.", devRequired: true },
      { id: "pre-2-5", title: "No hardcoded passwords or API keys inside code files", description: "No passwords, secret keys, or credentials are written directly into any PHP file. All sensitive values must live in a separate config file or environment variable (.env), never in source code.", devRequired: true, critical: true },
      { id: "pre-2-6", title: "PHP version compatibility verified against Hostinger server", description: "The code has been tested against and confirmed to work with the specific PHP version installed on Hostinger. To check: hPanel → Advanced → PHP Configuration.", devRequired: true },
      { id: "pre-2-7", title: "Composer packages installed for production only", description: "All PHP library dependencies are installed. Run 'composer install --no-dev' to include only production-needed packages and exclude developer tools not needed on the live server.", devRequired: true },
      { id: "pre-2-8", title: ".htaccess file prepared with all required rules", description: "The Apache server configuration file (.htaccess) is ready with the correct URL rewriting rules, HTTPS redirect, directory protection settings, and any custom security headers needed.", devRequired: true },
    ],
  },
  {
    id: "pre-3",
    title: "3. Database preparation",
    color: "#f59e0b",
    phase: "pre",
    items: [
      { id: "pre-3-1", title: "Database exported from staging as a .sql file", description: "The working database from the test environment has been exported as a complete .sql file using phpMyAdmin or a command-line tool. This is the file that will be imported onto Hostinger's server.", devRequired: true, critical: true },
      { id: "pre-3-2", title: "All database migrations run and verified in staging", description: "Any structural changes to the database — new tables created, columns added or removed, index updates — have been applied to staging and confirmed working before being included in the export.", devRequired: true },
      { id: "pre-3-3", title: "No test or placeholder data in the export", description: "The exported database does not contain fake test records such as 'Test User', 'test@example.com', dummy orders, or sample products. Only real or intentional initial data is included.", devRequired: true },
      { id: "pre-3-4", title: "Database character encoding set to utf8mb4", description: "The database charset is utf8mb4 (not the older 'utf8'). This is critical for correct support of all languages, special characters, and emoji. Using the wrong encoding causes data corruption.", devRequired: true },
      { id: "pre-3-5", title: "Production database name, username, and password are noted", description: "You have the exact database name, database username, and password planned for the Hostinger setup. These are the values that will be entered into the website's config file.", critical: true },
      { id: "pre-3-6", title: "All required tables and indexes confirmed in the export", description: "Open the .sql file and verify that all required tables are listed. Optionally, perform a test import on a fresh local copy first to confirm the file runs without errors.", devRequired: true },
      { id: "pre-3-7", title: "Admin user account exists in the database export", description: "The admin or super-admin user record is present in the database with the correct username and password hash, allowing you to log into the admin panel immediately after deployment.", critical: true },
    ],
  },
  {
    id: "pre-4",
    title: "4. Configuration & environment settings",
    color: "#ef4444",
    phase: "pre",
    items: [
      { id: "pre-4-1", title: "Production config file prepared separately from development", description: "A dedicated configuration file (config.php, .env, or similar) with production values is ready. It is NOT the same file used in local development — dev and production configs must always be separate.", devRequired: true, critical: true },
      { id: "pre-4-2", title: "Debug or development mode is set to OFF", description: "Any application-level debug flag (APP_DEBUG=false, ENVIRONMENT=production, etc.) is disabled in the production config. Debug mode can expose code internals and database details to the public.", devRequired: true, critical: true },
      { id: "pre-4-3", title: "Database credentials point to the Hostinger database", description: "The config file is updated with the correct Hostinger values — database host (usually 'localhost'), database name, username, and password. The local or staging database values must be replaced.", devRequired: true, critical: true },
      { id: "pre-4-4", title: "Base URL updated to the live production domain", description: "Any setting that stores the website address (BASE_URL, APP_URL, site_url) is updated to the production domain: e.g., https://www.yoursite.com. No 'localhost' or staging URLs should remain.", devRequired: true },
      { id: "pre-4-5", title: "Email / SMTP settings configured for production mail sending", description: "Mail-sending settings — SMTP server, port, username, password, and from-address — are updated for production. Test that all system emails (password reset, contact form reply) are delivered correctly.", devRequired: true },
      { id: "pre-4-6", title: "File upload directory paths corrected for the live server", description: "Any folder paths where the website saves user-uploaded files are updated to the correct absolute server path on Hostinger (e.g., /home/u123456789/domains/yoursite.com/public_html/uploads/).", devRequired: true },
      { id: "pre-4-7", title: "All API keys switched from test/sandbox to production", description: "Every third-party service — payment gateways, mapping services, SMS providers, social logins — has had its API key changed from the sandbox/test key to the live production key.", critical: true },
      { id: "pre-4-8", title: "Session and cookie security settings configured", description: "PHP session settings include the 'secure' and 'httponly' flags. The cookie SameSite attribute is set to 'Strict' or 'Lax'. These settings protect user login sessions from common interception attacks.", devRequired: true },
    ],
  },
  {
    id: "pre-5",
    title: "5. Hostinger account & server setup",
    color: "#8b5cf6",
    phase: "pre",
    items: [
      { id: "pre-5-1", title: "Hostinger account is active with no billing issues", description: "Log into hpanel.hostinger.com and confirm the hosting plan is active and fully paid. Check for any account suspension notices, expired plans, or unpaid invoices before deployment day.", clientVerify: true, critical: true },
      { id: "pre-5-2", title: "hPanel control panel is accessible", description: "You can log into hpanel.hostinger.com without any errors or issues. This is where all server settings — PHP, databases, files, SSL, and email — are managed." },
      { id: "pre-5-3", title: "Correct PHP version selected in hPanel", description: "In hPanel → Advanced → PHP Configuration, the PHP version is set to what the website requires. Using the wrong PHP version is one of the most common causes of a blank or broken site after deployment.", devRequired: true, critical: true },
      { id: "pre-5-4", title: "Required PHP extensions enabled in hPanel", description: "In hPanel PHP Configuration, verify these extensions are ON: PDO, PDO_MySQL (or MySQLi), mbstring, GD (for image processing), cURL, and any others the developer specifies as required.", devRequired: true },
      { id: "pre-5-5", title: "MySQL database created in hPanel", description: "In hPanel → Databases → MySQL Databases, a new database has been created with the agreed-upon name. Note the exact database name — it is case-sensitive and must match the config file exactly.", critical: true },
      { id: "pre-5-6", title: "Database user created and assigned with correct permissions", description: "In hPanel MySQL Databases, a database user has been created, assigned to the database, and granted 'All Privileges' — or the specific minimal permissions the developer specifies for the application.", critical: true },
      { id: "pre-5-7", title: "FTP or File Manager access confirmed and working", description: "You can connect to the server via FTP (using FileZilla or similar, with credentials from hPanel) OR access Hostinger's built-in File Manager in hPanel. Confirm access is working before upload begins." },
    ],
  },
  {
    id: "pre-6",
    title: "6. File upload & server permissions",
    color: "#10b981",
    phase: "pre",
    items: [
      { id: "pre-6-1", title: "All website files uploaded to the correct directory", description: "All PHP files, CSS, JavaScript, images, fonts, and other assets are uploaded into public_html (or the correct subdirectory for a subdomain or addon domain). Verify file count matches what was developed.", devRequired: true, critical: true },
      { id: "pre-6-2", title: "Directory (folder) permissions set to 755", description: "All folders on the server are set to permission code 755. This means: server owner can read, write, and execute; others can read and execute only. Right-click a folder in File Manager → Change Permissions.", devRequired: true },
      { id: "pre-6-3", title: "File permissions set to 644", description: "All PHP and other website files are set to permission code 644. This means: owner can read and write; everyone else can only read. Files set to 777 are a serious security risk.", devRequired: true },
      { id: "pre-6-4", title: "Writable folders set to 775 where the website needs to write", description: "Directories where the web application creates or saves files — uploads, cache, sessions, logs — are set to 775 so the web server process can write to them.", devRequired: true },
      { id: "pre-6-5", title: "Config / .env file uploaded and not publicly accessible via URL", description: "The config file with database credentials is on the server. CRITICAL TEST: Visit its URL directly in a browser (e.g., yoursite.com/.env). You must see '403 Forbidden' — never the file contents. If accessible, stop deployment immediately.", devRequired: true, critical: true },
      { id: "pre-6-6", title: ".htaccess file is present in the root public_html directory", description: "The .htaccess file exists inside public_html. Check via File Manager by enabling 'Show hidden files' from the settings icon — .htaccess is a hidden file that starts with a dot and may be invisible by default.", devRequired: true },
      { id: "pre-6-7", title: "Development-only files and folders removed from server", description: "These must NOT be on the live server: .git folder, node_modules folder, test scripts, local config files, development documentation, phpinfo.php files, and Composer dev-only packages.", devRequired: true },
    ],
  },
  {
    id: "pre-7",
    title: "7. Domain, DNS & SSL",
    color: "#06b6d4",
    phase: "pre",
    items: [
      { id: "pre-7-1", title: "Domain is active, not expired, and linked to this hosting account", description: "The domain name is not expired and is connected to this Hostinger hosting plan. Verify in hPanel → Domains. An expired domain means the website will be completely inaccessible to everyone.", clientVerify: true, critical: true },
      { id: "pre-7-2", title: "Nameservers at registrar are pointing to Hostinger", description: "At your domain registrar (GoDaddy, Namecheap, etc.), the nameservers are updated to Hostinger's nameserver values (shown in hPanel → Domains). Without this, the domain cannot find your server.", critical: true },
      { id: "pre-7-3", title: "DNS propagation is complete (2–48 hours after NS change)", description: "After changing nameservers, DNS changes can take 2–48 hours to spread globally. Use the free tool whatsmydns.net to check your domain's A record from multiple worldwide locations before proceeding.", critical: true },
      { id: "pre-7-4", title: "SSL certificate installed and active in hPanel", description: "In hPanel → Security → SSL, a valid SSL certificate is installed for the live domain. An active SSL enables https:// and the browser padlock icon. Without it, browsers show a 'Not Secure' warning that drives users away.", critical: true },
      { id: "pre-7-5", title: "HTTP to HTTPS redirect is configured and working", description: "Any visitor typing http://yoursite.com is automatically redirected to https://yoursite.com. This redirect rule is typically added to the .htaccess file. Test by typing the http:// version in a browser.", devRequired: true, critical: true },
    ],
  },
  {
    id: "pre-8",
    title: "8. Database import & connection test",
    color: "#f59e0b",
    phase: "pre",
    items: [
      { id: "pre-8-1", title: "Database SQL file imported via Hostinger's phpMyAdmin", description: "In hPanel → Databases → phpMyAdmin, select the correct database and use the Import tab to upload and run the .sql file. After a successful import, all tables will be visible in the left panel.", devRequired: true, critical: true },
      { id: "pre-8-2", title: "Import completed with no red error messages", description: "The phpMyAdmin import process showed a green success message. No red error notices appeared. Browse through the database tables to confirm they are all present and populated with the expected data.", devRequired: true, critical: true },
      { id: "pre-8-3", title: "Website successfully connects to the Hostinger database", description: "Load the live website homepage or login page in a browser. If it shows content (navigation, text, login form with data), the database connection is working. A blank page or error means the config credentials are wrong.", devRequired: true, critical: true },
      { id: "pre-8-4", title: "Admin user can log into the website on the live server", description: "Log into the website's admin panel using the admin account credentials. A successful login confirms the database, session handling, and authentication system are all working correctly on the live Hostinger server.", critical: true },
      { id: "pre-8-5", title: "Required seed data and default settings are present", description: "Any necessary initial data — default categories, system configuration options, country lists, pricing tiers, role definitions — is present in the database after the import and the website is using it correctly.", devRequired: true },
    ],
  },
  {
    id: "post-9",
    title: "9. Testing & quality assurance",
    color: "#16a34a",
    phase: "post",
    items: [
      { id: "post-9-1", title: "Homepage loads completely with no errors or warnings", description: "Open the live URL in a browser. The homepage loads fully — no PHP error messages, white screens, missing images, broken CSS styling, or JavaScript errors in the browser console." },
      { id: "post-9-2", title: "All navigation links work and go to correct pages", description: "Click every single menu item, navigation link, footer link, and internal page link throughout the site. Every link goes to the correct page without returning a 404 'page not found' error." },
      { id: "post-9-3", title: "User registration and login / logout works correctly", description: "If applicable: create a new test user account, activate it if an email confirmation is required, log in, browse the site as a logged-in user, then log out successfully. All steps work without errors." },
      { id: "post-9-4", title: "All forms submit and process data correctly", description: "Fill out and submit every form on the site: contact, inquiry, registration, search, feedback, and others. Confirm data is saved correctly to the database or that emails are triggered as expected.", critical: true },
      { id: "post-9-5", title: "All system email notifications are being delivered", description: "Trigger every automated email: contact form reply notification, password reset email, registration welcome message, order confirmation. Check both inbox AND spam folder. Confirm content and formatting are correct.", critical: true },
      { id: "post-9-6", title: "File upload feature works correctly on the live server", description: "If users can upload files, test uploading an image (jpg, png) and a document (pdf). Confirm the file saves to the server and can be displayed or downloaded correctly from the live URL." },
      { id: "post-9-7", title: "Payment gateway processes a complete end-to-end test transaction", description: "If there is a payment system, run a full test purchase using the gateway's sandbox mode (test card numbers). Confirm the transaction flows from product selection → checkout → payment → confirmation.", critical: true },
      { id: "post-9-8", title: "Website is responsive and correct on mobile devices", description: "Open the website on a smartphone (Android and iPhone if possible) and on a tablet. All pages are readable, images scale correctly, buttons are tappable, and no layout is broken or overflowing off-screen." },
      { id: "post-9-9", title: "Cross-browser testing completed on major browsers", description: "Test in at least: Google Chrome, Mozilla Firefox, Apple Safari, and Microsoft Edge. Confirm consistent layout and functionality across all four browsers. Note and fix any browser-specific visual differences." },
      { id: "post-9-10", title: "Custom 404 error page is configured and showing", description: "Visit a URL that does not exist on the site (e.g., yoursite.com/this-page-does-not-exist). It should display your custom, branded 404 page — not a blank white page or a generic Apache server error." },
    ],
  },
  {
    id: "post-10",
    title: "10. Security checks",
    color: "#dc2626",
    phase: "post",
    items: [
      { id: "post-10-1", title: "Admin login URL is not a common default path", description: "If using a CMS or custom admin area, the login URL has been changed from common defaults like /admin, /wp-admin, or /login to a less predictable path. This significantly reduces automated bot attack attempts.", devRequired: true, critical: true },
      { id: "post-10-2", title: "All admin, FTP, and database passwords are strong and unique", description: "Every account — website admin panel, Hostinger FTP, and MySQL database user — has a strong password of 12+ characters mixing uppercase, lowercase, numbers, and symbols. No password is reused across any accounts.", critical: true },
      { id: "post-10-3", title: "No default or test accounts exist in the live system", description: "All development-time accounts have been removed: admin/admin, test/test, demo users, and any temporary accounts created during testing. Verify this directly in the database via phpMyAdmin.", critical: true },
      { id: "post-10-4", title: "Config and .env files cannot be downloaded via a browser URL", description: "ACTIVELY TEST THIS: visit yoursite.com/config.php and yoursite.com/.env in a browser. The response must be '403 Forbidden' — never the actual file contents. If accessible, the site is at risk and this must be fixed before launch.", devRequired: true, critical: true },
      { id: "post-10-5", title: "HTTPS is working correctly on all pages — no exceptions", description: "Every single page on the website loads via https://. There are no mixed-content browser warnings (HTTP images or scripts loading on an HTTPS page). The browser shows a padlock on every page.", critical: true },
      { id: "post-10-6", title: "File upload restrictions are enforced on the live server", description: "If users can upload files, only safe file types are accepted (jpg, png, gif, pdf, docx). PHP files, .exe, .sh, and other executable types are rejected with an appropriate error message.", devRequired: true, critical: true },
      { id: "post-10-7", title: "HTTP security response headers configured in .htaccess", description: "Security headers are added: X-Frame-Options (prevents clickjacking), X-Content-Type-Options (prevents MIME sniffing), and Strict-Transport-Security (enforces HTTPS). The developer must implement these.", devRequired: true },
      { id: "post-10-8", title: "No sensitive data visible in the website's page source code", description: "Right-click → View Page Source on the homepage and key pages. Confirm no passwords, API keys, internal server paths, database names, or private email addresses appear in any HTML or JavaScript code visible to visitors.", devRequired: true, critical: true },
    ],
  },
  {
    id: "post-11",
    title: "11. SEO & analytics",
    color: "#2563eb",
    phase: "post",
    items: [
      { id: "post-11-1", title: "robots.txt is uploaded and correctly configured", description: "The file at yoursite.com/robots.txt exists and loads correctly. It allows search engines to crawl all public pages and explicitly blocks private areas (admin, login, test pages, API endpoints) from being indexed.", devRequired: true },
      { id: "post-11-2", title: "sitemap.xml is generated and accessible at the correct URL", description: "An XML sitemap listing all important pages is accessible at yoursite.com/sitemap.xml. This file helps search engines discover and index pages faster. Verify by visiting the URL directly in a browser.", devRequired: true },
      { id: "post-11-3", title: "Web analytics tracking code is installed on all pages", description: "Google Analytics (or another analytics tool) tracking script is present and loading on every page. Verify by checking the real-time report in Google Analytics while browsing the live site from your device." },
      { id: "post-11-4", title: "Meta titles and descriptions set for key pages", description: "The homepage, about page, services pages, and key content pages each have a unique, descriptive title tag and meta description suitable for appearing in Google search results. Check with a browser's View Source or an SEO browser extension." },
      { id: "post-11-5", title: "Staging or dev site is blocked from search engine indexing", description: "If the staging version of the site is publicly accessible, it has either a noindex meta tag, password protection, or a disallow rule in robots.txt — so search engines do not index duplicate content alongside the live site.", devRequired: true },
      { id: "post-11-6", title: "Google Search Console verified and sitemap submitted", description: "The production website is added and verified in Google Search Console (search.google.com/search-console). The sitemap URL (yoursite.com/sitemap.xml) has been submitted under the Sitemaps section.", clientVerify: true },
    ],
  },
  {
    id: "post-12",
    title: "12. Go-live day actions",
    color: "#f97316",
    phase: "post",
    items: [
      { id: "post-12-1", title: "Final backup taken immediately before switching live", description: "Right before pointing the domain to the new server or making any final switch, a complete backup of both website files and database is saved to a secure location. This is the absolute last safety net.", critical: true },
      { id: "post-12-2", title: "DNS or nameservers switched to the production Hostinger server", description: "Domain DNS A record or nameservers are updated at the registrar to point to the live Hostinger server. Note: after this change, DNS propagation can take 15 minutes to 2 hours globally.", critical: true },
      { id: "post-12-3", title: "SSL padlock is visible on the live domain after DNS propagation", description: "After DNS propagation completes, open the live URL in a browser. Confirm: the padlock icon is visible, the URL shows https://, and no security warning is displayed. If the padlock is missing, check the SSL setup.", critical: true },
      { id: "post-12-4", title: "Website tested on a public cellular network (not local WiFi)", description: "On a mobile device using cellular data (4G/5G) — NOT your office or home WiFi — confirm the live website loads correctly. This rules out local DNS cache making the site appear live when it is not yet public.", critical: true },
      { id: "post-12-5", title: "Contact form sends a real email and it is received successfully", description: "Submit the contact form on the live website using a real email address you can check. Confirm the message arrives correctly in the inbox. Also test the password-reset email flow if the site has user accounts." },
      { id: "post-12-6", title: "Admin panel accessible and functional on the live URL", description: "Log into the website's admin or management panel using the live domain URL. Browse through key admin functions — content management, user accounts, settings — to confirm everything is accessible and working.", critical: true },
      { id: "post-12-7", title: "All stakeholders notified that the website is live", description: "Send a confirmation message to the client, project team, and relevant stakeholders with the live URL. Include any login credentials, handover notes, or next steps as agreed upon before launch.", clientVerify: true },
      { id: "post-12-8", title: "Uptime monitoring configured for the live website", description: "A monitoring service is set up to check the website every 5 minutes and send an alert if the site goes down. UptimeRobot is free and easy to configure at uptimerobot.com. Set up email or SMS alerts.", critical: true },
    ],
  },
  {
    id: "post-13",
    title: "13. Post-deployment follow-up",
    color: "#0891b2",
    phase: "post",
    items: [
      { id: "post-13-1", title: "Live website monitored actively for 24–48 hours after launch", description: "Someone is actively checking the website every few hours in the first two days after launch. Any new issues — broken pages, error emails, user complaints — are caught and resolved quickly." },
      { id: "post-13-2", title: "Server error logs reviewed for PHP warnings or errors", description: "In hPanel → Advanced → Error Logs (or via FTP in the logs folder), the PHP error log is checked for any errors or warnings that occurred since the site went live. Even minor warnings should be reviewed.", devRequired: true },
      { id: "post-13-3", title: "Automatic backups scheduled and confirmed in Hostinger", description: "In hPanel → Backups, the automatic backup feature is enabled and configured to run on a regular schedule — daily or weekly is recommended. This provides ongoing protection against future data loss or accidental changes.", critical: true, clientVerify: true },
      { id: "post-13-4", title: "301 redirects configured for old page URLs (if applicable)", description: "If this deployment replaces an existing website, all important old page URLs now have permanent 301 redirects pointing to the corresponding new pages. This preserves SEO rankings and prevents returning users from landing on 404 error pages.", devRequired: true },
      { id: "post-13-5", title: "Deployment documented with date, version, and notes", description: "A written record has been created noting: what was deployed, the exact date and time of go-live, who performed the deployment, any issues encountered during the process, and how they were resolved." },
      { id: "post-13-6", title: "Development and staging environments updated to match live", description: "The local development or staging server is synced with the production state so that any future development or bug fixes start from the current live version — not an outdated copy that could introduce conflicts.", devRequired: true },
    ],
  },
];

function adaptForEHM(sections: ChecklistSection[]): ChecklistSection[] {
  return sections.map((section) => ({
    ...section,
    items: section.items.map((item) => ({
      ...item,
      description: item.description
        .replace(/Hostinger/g, "Hosting provider")
        .replace(/hPanel/g, "Host control panel")
        .replace(/phpMyAdmin/g, "Database admin tool")
        .replace(/public_html/g, "web root directory"),
    })),
  }));
}

export const EHM_SECTIONS: ChecklistSection[] = adaptForEHM(CLIMAGRO_SECTIONS);

export const CHECKLISTS: Record<ProductId, ChecklistSection[]> = {
  climagro: CLIMAGRO_SECTIONS,
  ehm: EHM_SECTIONS,
};

export function getPreSections(product: ProductId): ChecklistSection[] {
  return CHECKLISTS[product].filter((s) => s.phase === "pre");
}

export function getPostSections(product: ProductId): ChecklistSection[] {
  return CHECKLISTS[product].filter((s) => s.phase === "post");
}

export function totalItems(sections: ChecklistSection[]): number {
  return sections.reduce((acc, s) => acc + s.items.length, 0);
}

export function checkedCount(
  sections: ChecklistSection[],
  checked: Record<string, boolean>
): number {
  return sections.reduce(
    (acc, s) => acc + s.items.filter((item) => checked[item.id]).length,
    0
  );
}

export function sectionProgress(
  section: ChecklistSection,
  checked: Record<string, boolean>
): { done: number; total: number; pct: number } {
  const done = section.items.filter((item) => checked[item.id]).length;
  const total = section.items.length;
  return { done, total, pct: total ? Math.round((done / total) * 100) : 0 };
}
