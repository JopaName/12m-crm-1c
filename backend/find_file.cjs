const { PrismaClient } = require("@prisma/client");
const path = require("path");
const fs = require("fs");
const p = new PrismaClient();
p.purchaseRequest.findMany({ where: { fileName: { contains: "xlsx" } } }).then(rows => {
  console.log("Found", rows.length, "xlsx files");
  rows.forEach(r => {
    console.log("ID:", r.id);
    console.log("  productName:", r.productName);
    console.log("  fileName:", r.fileName);
    console.log("  fileUrl:", r.fileUrl);
    const filePath = path.join(__dirname, "..", r.fileUrl);
    console.log("  absolutePath:", filePath);
    console.log("  exists:", fs.existsSync(filePath));
  });
  // Also search for all files with a fileUrl set
  return p.purchaseRequest.findMany({ where: { fileUrl: { not: null } }, take: 20 });
}).then(rows => {
  console.log("\nAll files (up to 20):");
  rows.forEach(r => {
    console.log("ID:", r.id);
    console.log("  productName:", r.productName);
    console.log("  fileName:", r.fileName);
    console.log("  fileUrl:", r.fileUrl);
    const filePath = path.join(__dirname, "..", r.fileUrl);
    console.log("  absolutePath:", filePath);
    console.log("  exists:", fs.existsSync(filePath));
    console.log("  isDirectory:", fs.existsSync(filePath) ? fs.statSync(filePath).isDirectory() : "N/A");
  });
  p.$disconnect();
}).catch(e => { console.error("ERROR:", e.message); p.$disconnect(); });
