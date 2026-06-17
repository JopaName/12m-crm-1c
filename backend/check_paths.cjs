const fs = require("fs");
const path = require("path");
// Check various upload paths
const paths = [
  "/root/12m-crm-1c/uploads/procurement",
  "/root/12m-crm-1c/backend/uploads/procurement",
  "/root/12m-crm-1c/frontend/public/uploads/procurement",
];
paths.forEach(p => {
  console.log(p + ":");
  console.log("  exists:", fs.existsSync(p));
  if (fs.existsSync(p)) {
    const files = fs.readdirSync(p);
    console.log("  files:", files.length);
    files.slice(0, 5).forEach(f => console.log("    -", f));
  }
});
// Check the upload route to see where it saves
