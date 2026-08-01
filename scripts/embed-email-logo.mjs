import fs from "fs";
import path from "path";

const dir = path.join("docs", "supabase-email-templates");
const logo = fs.readFileSync(path.join(dir, "logo-data-uri.txt"), "utf8").trim();

for (const file of [
  "recovery.html",
  "password-changed-notification.html",
  "email-changed-notification.html",
]) {
  const filePath = path.join(dir, file);
  let html = fs.readFileSync(filePath, "utf8");
  html = html.replace(
    'src="https://myne.no/icons/icon-192.png"',
    `src="${logo}"`
  );
  fs.writeFileSync(filePath, html);
}

console.log("Updated email templates with embedded logo.");
