const fs = require("fs");
const path = require("path");
// Check if there are multiple upload directories
const dirs = [
  "/root/12m-crm-1c",
  "/root/12m-crm-1c/backend",
  "/root/12m-crm-1c/backend/uploads",
  "/root/12m-crm-1c/backend/uploads/procurement",
];
dirs.forEach(p => {
  console.log(p + ":", fs.existsSync(p));
});
