// Run:  node scripts/testCloudinary.js
import "dotenv/config";
import PDFDocument from "pdfkit";
import { v2 as cloudinary } from "cloudinary";
import { ensureCloudinary } from "../utils/cloudinaryResume.js";

const show = (label, v) => console.log(label.padEnd(26), v);
ensureCloudinary();
show("cloud_name:", cloudinary.config().cloud_name);

try { show("ping:", JSON.stringify(await cloudinary.api.ping())); }
catch (e) { show("ping FAILED:", e.message); }

const pdf = await new Promise((res) => {
  const d = new PDFDocument(); const c = [];
  d.on("data", (x) => c.push(x)); d.on("end", () => res(Buffer.concat(c)));
  d.text("TechBoard Cloudinary test"); d.end();
});

const up = (options, buf) => new Promise((res, rej) =>
  cloudinary.uploader.upload_stream(options, (e, r) => (e ? rej(e) : res(r))).end(buf));

const tests = [
  ["A raw + folder + .pdf", { resource_type: "raw", folder: "techboard/test", public_id: `a-${Date.now()}.pdf` }],
  ["B raw, no folder", { resource_type: "raw", public_id: `b-${Date.now()}.pdf` }],
  ["C raw, no extension", { resource_type: "raw", public_id: `c-${Date.now()}` }],
  ["D image/pdf + folder", { resource_type: "image", folder: "techboard/test", public_id: `d-${Date.now()}`, format: "pdf" }],
];

for (const [name, options] of tests) {
  try {
    const r = await up(options, pdf);
    show(name, "OK  " + r.secure_url);
    await cloudinary.uploader.destroy(r.public_id, { resource_type: options.resource_type }).catch(() => {});
  } catch (e) {
    show(name, "FAILED " + (e.http_code || "") + " " + (e.message || ""));
  }
}
