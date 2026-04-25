#!/usr/bin/env node

import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";
import * as url from "url";

// Load .env.local
const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, "..", ".env.local");
const envContent = fs.readFileSync(envPath, "utf-8");

const env = {};
envContent.split("\n").forEach((line) => {
  const [key, value] = line.split("=");
  if (key && value && !key.startsWith("#")) {
    env[key.trim()] = value.trim();
  }
});

const supabaseUrl = env.VITE_SUPABASE_URL;
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error(
    "❌ SUPABASE_SERVICE_ROLE_KEY not found in .env.local. Please add it first."
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
  db: { schema: "xayma_app" },
});

// Parser: Extract VALUES from INSERT statements
function parseSQLValues(sqlContent) {
  const lines = sqlContent.split("\n").filter((l) => l.trim().startsWith("INSERT"));
  const values = [];

  for (const line of lines) {
    const match = line.match(/VALUES\s*\((.*)\);?$/is);
    if (!match) continue;

    const valueStr = match[1];
    const parts = [];
    let current = "";
    let inQuote = false;
    let quoteChar = null;

    for (let i = 0; i < valueStr.length; i++) {
      const char = valueStr[i];
      const prev = i > 0 ? valueStr[i - 1] : null;

      if (!inQuote && (char === "'" || char === '"')) {
        inQuote = true;
        quoteChar = char;
      } else if (inQuote && char === quoteChar && prev !== "\\") {
        inQuote = false;
        quoteChar = null;
      } else if (!inQuote && char === ",") {
        parts.push(current.trim());
        current = "";
        continue;
      }

      current += char;
    }
    if (current.trim()) parts.push(current.trim());

    values.push(parts);
  }

  return values;
}

// Helper: Convert SQL value to JS value
function parseValue(val) {
  val = val.trim();
  if (val === "NULL") return null;
  if (val.startsWith("'") && val.endsWith("'")) {
    return val.slice(1, -1).replace(/\\'/g, "'").replace(/\\n/g, "\n");
  }
  if (!isNaN(val)) return Number(val);
  return val;
}

// Helper: Parse PHP serialized string to array
function parsePhpSerialized(str) {
  if (!str || typeof str !== "string") return null;

  const match = str.match(/a:(\d+):\{(.*)\}/);
  if (!match) return null;

  const items = [];
  const content = match[2];
  let i = 0;

  while (i < content.length) {
    // Look for i:N; (key index)
    const keyMatch = content.slice(i).match(/^i:(\d+);/);
    if (!keyMatch) break;
    i += keyMatch[0].length;

    // Look for s:N:"value"; (string value)
    const valMatch = content.slice(i).match(/^s:(\d+):"([^"]*)";/);
    if (!valMatch) break;

    items.push(valMatch[2]);
    i += valMatch[0].length;
  }

  return items.length > 0 ? items : null;
}

// Helper: Slugify
function slugify(str) {
  return str
    .toLowerCase()
    .replace(/[àâä]/g, "a")
    .replace(/[èêë]/g, "e")
    .replace(/[ìîï]/g, "i")
    .replace(/[òôö]/g, "o")
    .replace(/[ùûü]/g, "u")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

console.log("🔄 Starting migration...\n");

// === PHASE 1: CLEAR DATA ===
const tablesToClear = [
  "general_audit",
  "notifications",
  "voucher_redemptions",
  "credit_transactions",
  "vouchers",
  "partner_credit_purchase_options",
  "deployments",
  "serviceplans",
  "services",
  "control_nodes",
  "partners",
  "settings",
];

console.log("📋 Phase 1: Clearing existing data...\n");

// Clear in order - services first, then control_nodes
const tablesToClearFirst = [
  "general_audit",
  "notifications",
  "voucher_redemptions",
  "credit_transactions",
  "vouchers",
  "partner_credit_purchase_options",
  "deployments",
  "serviceplans",
  "services", // Delete services before control_nodes
];

for (const table of tablesToClearFirst) {
  const { error } = await supabase
    .schema("xayma_app")
    .from(table)
    .delete()
    .gte("id", 0);
  if (
    error &&
    !error.message.includes("no rows") &&
    !error.message.includes("does not exist")
  ) {
    console.error(`❌ Failed to clear ${table}:`, error.message);
    process.exit(1);
  }
  console.log(`✓ Cleared ${table}`);
}

// Now delete control_nodes (after services are gone, no FK)
const { error: cnError } = await supabase
  .schema("xayma_app")
  .from("control_nodes")
  .delete()
  .gte("id", 0);
if (cnError && !cnError.message.includes("no rows")) {
  console.error("❌ Failed to clear control_nodes:", cnError.message);
  process.exit(1);
}
console.log(`✓ Cleared control_nodes`);

// Verify deletion
const { data: verifyCount } = await supabase
  .schema("xayma_app")
  .from("control_nodes")
  .select("id");
console.log(`  (Verification: ${verifyCount?.length || 0} rows remaining)`);

// Clear settings (different PK)
const { error: settingsErr } = await supabase
  .schema("xayma_app")
  .from("settings")
  .delete()
  .gte("id", 0);
if (settingsErr && !settingsErr.message.includes("no rows")) {
  console.error("❌ Failed to clear settings:", settingsErr.message);
  process.exit(1);
}
console.log(`✓ Cleared settings`);

// Clear partners — this might fail due to FK, but we'll try
const { error: partnersErr } = await supabase
  .schema("xayma_app")
  .from("partners")
  .delete()
  .gte("id", 0);
if (partnersErr && !partnersErr.message.includes("violates foreign key")) {
  console.error("❌ Failed to clear partners:", partnersErr.message);
  process.exit(1);
}
if (!partnersErr) {
  console.log(`✓ Cleared partners`);
} else {
  console.log(
    `⚠️  Could not clear partners (FK from users table) — will overwrite on insert`
  );
}

// Wait a moment for deletions to propagate
console.log("\n⏳ Waiting for deletions to propagate...\n");
await new Promise((r) => setTimeout(r, 1000));

console.log("📋 Phase 2: Inserting legacy data...\n");

// Verify control_nodes are empty before inserting
const { data: existingCN } = await supabase
  .schema("xayma_app")
  .from("control_nodes")
  .select("id");
if (existingCN && existingCN.length > 0) {
  console.log(`⚠️  Found ${existingCN.length} existing control_nodes, deleting...`);
  for (const cn of existingCN) {
    const { error: delErr } = await supabase
      .schema("xayma_app")
      .from("control_nodes")
      .delete()
      .eq("id", cn.id);
    if (delErr) console.log(`  Error deleting id ${cn.id}:`, delErr.message);
  }
}

// === CONTROL NODES ===
const controlNodeData = [
  {
    id: 1,
    name: "AWX - VISIMAX - Contabo",
    hostname: "http://dumbledore.xayma.net:8052",
    authorizationtoken: "6CvSQPW3Nba0WxcXGXRl8JZ0114AoB",
    status: "active",
  },
  {
    id: 2,
    name: "Serveur de MS & Associates - MSA",
    hostname: "http://dumbledore-msa.xayma.net:8052",
    authorizationtoken: "6CvSQPW3Nba0WxcXGXRl8JZ0114AoB",
    status: "active",
  },
];

let { error } = await supabase
  .schema("xayma_app")
  .from("control_nodes")
  .insert(controlNodeData);
if (error) {
  console.error("❌ Failed to insert control_nodes:", error);
  process.exit(1);
}
console.log(`✓ Inserted ${controlNodeData.length} control_nodes`);

// === SERVICES ===
const serviceData = [
  {
    id: 1,
    name: "Odoo",
    slug: "odoo",
    controlNodeId: 1,
    isPubliclyAvailable: true,
    dockerimage: "9",
  },
  {
    id: 7,
    name: "RapidPro",
    slug: "rapidpro",
    controlNodeId: 1,
    isPubliclyAvailable: false,
    dockerimage: "11",
  },
  {
    id: 8,
    name: "Odoo - MSA",
    slug: "odoo-msa",
    controlNodeId: 2,
    isPubliclyAvailable: false,
    dockerimage: "17",
  },
  {
    id: 9,
    name: "N8N Workflow Automation",
    slug: "n8n-workflow-automation",
    controlNodeId: 1,
    isPubliclyAvailable: false,
    dockerimage: "19",
  },
  {
    id: 10,
    name: "Moodle",
    slug: "moodle",
    controlNodeId: 1,
    isPubliclyAvailable: true,
    dockerimage: "21",
  },
  {
    id: 11,
    name: "Mautic - Marketing Automation",
    slug: "mautic-marketing-automation",
    controlNodeId: 1,
    isPubliclyAvailable: true,
    dockerimage: "23",
  },
  {
    id: 12,
    name: "WordPress",
    slug: "wordpress",
    controlNodeId: 1,
    isPubliclyAvailable: true,
    dockerimage: "25",
  },
];

({ error } = await supabase
  .schema("xayma_app")
  .from("services")
  .insert(serviceData));
if (error) {
  console.error("❌ Failed to insert services:", error);
  process.exit(1);
}
console.log(`✓ Inserted ${serviceData.length} services`);

// === SERVICE PLANS ===
const servicePlans = [];
const planTiers = [
  { label: "Essential", slug: "essential", key: 0 },
  { label: "Business", slug: "business", key: 1 },
  { label: "High Performance", slug: "high-performance", key: 2 },
];

const credits = {
  1: [200, 500, 1500],
  7: [0, 0, 0],
  8: [20, 0, 0],
  9: [1, 1, 1],
  10: [30, 50, 100],
  11: [20, 50, 100],
  12: [25, 40, 60],
};

let planId = 1;
for (const service of serviceData) {
  for (const tier of planTiers) {
    servicePlans.push({
      id: planId++,
      service_id: service.id,
      label: tier.label,
      slug: `${service.slug}-${tier.slug}`,
      monthlyCreditConsumption: credits[service.id][tier.key],
    });
  }
}

({ error } = await supabase
  .schema("xayma_app")
  .from("serviceplans")
  .insert(servicePlans));
if (error) {
  console.error("❌ Failed to insert serviceplans:", error);
  process.exit(1);
}
console.log(`✓ Inserted ${servicePlans.length} serviceplans`);

// === PARTNERS ===
const partnerData = [
  {
    id: 1,
    name: "VISIBILITE SAS",
    slug: "visibilitetech",
    email: "alicouran.bayo@gmail.com",
    phone: "784296777",
    address: "OUEST FOIRE",
    status: "active",
    allowCreditDebt: true,
    partner_type: "customer",
    activity_area: ["IT / Telecoms"],
  },
  {
    id: 2,
    name: "XaymaLabs x Visimax",
    slug: "visimax",
    email: "md@elhadjmalang.com",
    phone: "777207831",
    address: "No1, Cite SONATEL 3, Sud Foire",
    status: "suspended",
    allowCreditDebt: false,
    partner_type: "customer",
    activity_area: ["IT / Telecoms"],
  },
  {
    id: 3,
    name: "DELICE FOOD",
    slug: "delice-food",
    email: "delicefoodsn@gmail.com",
    phone: null,
    address: null,
    status: "active",
    allowCreditDebt: false,
    partner_type: "customer",
    activity_area: ["Food / Catering"],
  },
  {
    id: 4,
    name: "AVENIR MEDICAL",
    slug: "avenir-medical",
    email: "ediedhiou@gmail.com",
    phone: null,
    address: null,
    status: "active",
    allowCreditDebt: false,
    partner_type: "customer",
    activity_area: ["Pharmaceutical industry"],
  },
  {
    id: 5,
    name: "M S ASSOCIATES",
    slug: "m-s-associates",
    email: "delicefoodsn@gmail.com",
    phone: "338651180",
    address: "PGRH+955, VDN, Dakar, Senegal",
    status: "suspended",
    allowCreditDebt: false,
    partner_type: "customer",
    activity_area: ["Bank"],
  },
  {
    id: 6,
    name: "SKOBAR",
    slug: "skobar",
    email: "kobarconculting@gmail.com",
    phone: "+221772143929",
    address: "HLM 5",
    status: "suspended",
    allowCreditDebt: false,
    partner_type: "customer",
    activity_area: ["Publishing / Communication / Multimedia"],
  },
  {
    id: 7,
    name: "Yoodi Cosmetics",
    slug: "yoodi-cosmetics",
    email: "ediedhio.u@gmail.com",
    phone: null,
    address: null,
    status: "suspended",
    allowCreditDebt: false,
    partner_type: "customer",
    activity_area: ["Studies and advice / Pharmaceutical industry"],
  },
  {
    id: 8,
    name: "Pape Assane Coly",
    slug: "pape-assane-coly",
    email: "ediedhiou@gmail.com",
    phone: null,
    address: null,
    status: "suspended",
    allowCreditDebt: false,
    partner_type: "customer",
    activity_area: ["IT / Telecoms"],
  },
  {
    id: 9,
    name: "abibou",
    slug: "abibou",
    email: "abiboudione@gmail.com",
    phone: null,
    address: null,
    status: "suspended",
    allowCreditDebt: false,
    partner_type: "customer",
    activity_area: ["Business services"],
  },
  {
    id: 10,
    name: "RESTAURANT LE SANDIARA",
    slug: "restaurant-le-sandiara",
    email: null,
    phone: null,
    address: null,
    status: "suspended",
    allowCreditDebt: false,
    partner_type: "customer",
    activity_area: ["Food / Catering"],
  },
];

({ error } = await supabase
  .schema("xayma_app")
  .from("partners")
  .upsert(partnerData));
if (error) {
  console.error("❌ Failed to upsert partners:", error);
  process.exit(1);
}
console.log(`✓ Upserted ${partnerData.length} partners`);

// === DEPLOYMENTS ===
const deploymentRawData = [
  [1, 1, 1, "Corpus Senegal", "corpussenegal.xayma.net", "active", "corpussenegal", "18.0", "deployodoo", 1],
  [3, 1, 1, "VISIBILITE CONSULTING", "viscons.xayma.net", "archived", "viscons", "14.0", "deployodoo", 1],
  [4, 1, 1, "ARTEFAKT", "artefakt.xayma.net", "archived", "artefakt", "14.0", "deployodoo", 1],
  [5, 1, 1, "AISATEC", "aisatec.xayma.net", "archived", "aisatec", "14.0", "deployodoo", 1],
  [6, 1, 1, "Gestion Caisse Pharmacie Khadim", "khadim.xayma.net", "archived", "khadim", "14.0", "deployodoo", 1],
  [7, 1, 1, "EFF CONSULTING", "effcons.xayma.net", "archived", "effcons", "14.0", "deployodoo", 1],
  [8, 1, 1, "Pharmalogistique", "pharmalog.xayma.net", "archived", "pharmalog", "14.0", "deployodoo", 1],
  [9, 1, 1, "METIER ODOO", "metier.xayma.net", "archived", "metier", "14.0", "deployodoo", 1],
  [10, 1, 1, "GENIE CONSULTING", "genie.xayma.net", "archived", "genie", "14.0", "deployodoo", 1],
  [11, 1, 1, "SERVICE CLOUD", "servicecloud.xayma.net", "archived", "servicecloud", "14.0", "deployodoo", 1],
  [12, 1, 1, "AUDIT MANAGEMENT SOLUTIONS", "audit.xayma.net", "archived", "audit", "14.0", "deployodoo", 1],
  [13, 1, 1, "CONSULTING VISION", "consulting.xayma.net", "archived", "consulting", "14.0", "deployodoo", 1],
  [14, 1, 1, "sobo1", "sobo1.xayma.net", "active", "sobo1", "18.0", "deployodoo", 1],
  [15, 1, 1, "CYBERPLUS", "cyberplus.xayma.net", "archived", "cyberplus", "14.0", "deployodoo", 1],
  [16, 1, 1, "Xaymalabs", "xaymalabs.xayma.net", "archived", "xaymalabs", "14.0", "deployodoo", 1],
  [17, 1, 1, "LOGIQUE INFORMATIQUE", "logique.xayma.net", "archived", "logique", "14.0", "deployodoo", 1],
  [18, 1, 1, "Etoile Africa", "etoile.xayma.net", "archived", "etoile", "14.0", "deployodoo", 1],
  [19, 1, 1, "SABA INFO SOLUTIONS", "saba.xayma.net", "archived", "saba", "14.0", "deployodoo", 1],
  [20, 1, 1, "ACONSYS", "aconsys.xayma.net", "archived", "aconsys", "14.0", "deployodoo", 1],
  [21, 1, 1, "ALPHA SOLUTIONS", "alpha.xayma.net", "archived", "alpha", "14.0", "deployodoo", 1],
  [22, 1, 1, "BAAMTEC", "baamtec.xayma.net", "archived", "baamtec", "14.0", "deployodoo", 1],
  [23, 1, 1, "Afronomist", "afronomist.xayma.net", "archived", "afronomist", "14.0", "deployodoo", 1],
  [24, 1, 1, "ADEY CONSULTING", "adey.xayma.net", "suspended", "adey", "14.0", "deployodoo", 1],
  [25, 1, 1, "ELITE CONSULTING", "elite.xayma.net", "archived", "elite", "14.0", "deployodoo", 1],
  [26, 1, 1, "GENESIS", "genesis.xayma.net", "archived", "genesis", "14.0", "deployodoo", 1],
  [27, 1, 1, "GENESIS CONSULTING", "genesiscons.xayma.net", "archived", "genesiscons", "14.0", "deployodoo", 1],
  [28, 1, 1, "HIGH TECH", "hightech.xayma.net", "archived", "hightech", "14.0", "deployodoo", 1],
  [29, 1, 1, "IMMOBILIEN AFRICA", "immobilien.xayma.net", "archived", "immobilien", "14.0", "deployodoo", 1],
  [30, 1, 1, "INFOCHART", "infochart.xayma.net", "archived", "infochart", "14.0", "deployodoo", 1],
  [31, 1, 1, "JINEE FINANCE", "jinee.xayma.net", "archived", "jinee", "14.0", "deployodoo", 1],
  [32, 1, 1, "JETPACK", "jetpack.xayma.net", "archived", "jetpack", "14.0", "deployodoo", 1],
  [33, 1, 1, "KORA GLOBAL", "koraglobal.xayma.net", "archived", "koraglobal", "14.0", "deployodoo", 1],
  [34, 1, 1, "KORA PROMOTION", "koraprom.xayma.net", "archived", "koraprom", "14.0", "deployodoo", 1],
  [35, 1, 1, "LOGISOFT", "logisoft.xayma.net", "archived", "logisoft", "14.0", "deployodoo", 1],
  [36, 1, 1, "MAKECADEMY", "makecademy.xayma.net", "archived", "makecademy", "14.0", "deployodoo", 1],
  [37, 1, 1, "MAYA TECH", "mayatech.xayma.net", "archived", "mayatech", "14.0", "deployodoo", 1],
  [38, 1, 1, "MIGASNET", "migasnet.xayma.net", "archived", "migasnet", "14.0", "deployodoo", 1],
  [39, 1, 1, "NATOUR TRAVEL", "natour.xayma.net", "archived", "natour", "14.0", "deployodoo", 1],
  [40, 1, 1, "NICE TRAVEL", "nicetravel.xayma.net", "archived", "nicetravel", "14.0", "deployodoo", 1],
  [41, 1, 1, "ODOO CONSULTING", "odoocons.xayma.net", "archived", "odoocons", "14.0", "deployodoo", 1],
  [42, 1, 1, "Paysdaviews", "paysdaviews.xayma.net", "archived", "paysdaviews", "14.0", "deployodoo", 1],
  [43, 1, 1, "PETROCOM", "petrocom.xayma.net", "archived", "petrocom", "14.0", "deployodoo", 1],
  [44, 3, 1, "GIE Delice Food", "delicefood.xayma.net", "active", "delicefood", "18.0", "deployodoo", 1],
  [45, 1, 1, "PRESTIGE GLOBAL", "prestige.xayma.net", "archived", "prestige", "14.0", "deployodoo", 1],
  [46, 3, 1, "Formation Delice Food", "delicefoodformation.xayma.net", "stopped", "delicefoodformation", "18.0", "deployodoo", 1],
  [47, 1, 1, "QUICK SALE", "quicksale.xayma.net", "archived", "quicksale", "14.0", "deployodoo", 1],
  [48, 1, 1, "RATAH TRADING", "ratah.xayma.net", "archived", "ratah", "14.0", "deployodoo", 1],
  [49, 1, 1, "RIFF TECH", "rifftech.xayma.net", "archived", "rifftech", "14.0", "deployodoo", 1],
  [50, 1, 1, "SCA GENERAL IMPORT", "scageneralimport.xayma.net", "archived", "scageneralimport", "14.0", "deployodoo", 1],
  [51, 1, 1, "SCOBA", "scoba.xayma.net", "archived", "scoba", "14.0", "deployodoo", 1],
  [52, 1, 1, "SENAL", "senal.xayma.net", "archived", "senal", "14.0", "deployodoo", 1],
  [53, 4, 1, "Avenir medical", "avenirumedical.xayma.net", "stopped", "avenirumedical", "18.0", "deployodoo", 1],
  [54, 1, 1, "SIM SOLUTIONS", "simsol.xayma.net", "archived", "simsol", "14.0", "deployodoo", 1],
  [55, 1, 1, "SOCIETE DE TRADING", "soctrad.xayma.net", "archived", "soctrad", "14.0", "deployodoo", 1],
  [56, 1, 1, "SOFA SENEGAL", "sofasenegal.xayma.net", "archived", "sofasenegal", "14.0", "deployodoo", 1],
  [57, 1, 1, "Talentyoga", "talentyoga.xayma.net", "archived", "talentyoga", "14.0", "deployodoo", 1],
  [58, 1, 1, "TEST COPY COPY COPY", "testcopy.xayma.net", "archived", "testcopy", "14.0", "deployodoo", 1],
  [59, 1, 1, "TEXA", "texa.xayma.net", "archived", "texa", "14.0", "deployodoo", 1],
  [60, 1, 1, "TEXA GLOBAL", "texaglobal.xayma.net", "archived", "texaglobal", "14.0", "deployodoo", 1],
  [61, 1, 1, "THIRD EYE", "thirdeye.xayma.net", "archived", "thirdeye", "14.0", "deployodoo", 1],
  [62, 1, 1, "TONGARA", "tongara.xayma.net", "archived", "tongara", "14.0", "deployodoo", 1],
  [63, 1, 1, "TOROHUB", "torohub.xayma.net", "archived", "torohub", "14.0", "deployodoo", 1],
  [64, 1, 1, "TOROHUB CLASSIC", "torohubbclassic.xayma.net", "archived", "torohubbclassic", "14.0", "deployodoo", 1],
  [65, 1, 1, "TORO SOLUTIONS", "torosolutions.xayma.net", "archived", "torosolutions", "14.0", "deployodoo", 1],
  [66, 1, 1, "TORO TECH", "torotech.xayma.net", "archived", "torotech", "14.0", "deployodoo", 1],
  [67, 1, 1, "TRADING PLUS", "tradingplus.xayma.net", "archived", "tradingplus", "14.0", "deployodoo", 1],
  [68, 1, 1, "TRANS AFRICA", "transafrica.xayma.net", "archived", "transafrica", "14.0", "deployodoo", 1],
  [69, 1, 1, "TRANS LOGISTICS", "translogistics.xayma.net", "archived", "translogistics", "14.0", "deployodoo", 1],
  [70, 1, 1, "TRAVEL GESTION", "travelgestion.xayma.net", "archived", "travelgestion", "14.0", "deployodoo", 1],
  [71, 1, 1, "TREFLE PHARMA", "treflepharma.xayma.net", "archived", "treflepharma", "14.0", "deployodoo", 1],
  [72, 1, 1, "TREX IT", "trexit.xayma.net", "archived", "trexit", "14.0", "deployodoo", 1],
  [73, 1, 1, "TRIDGE SENEGAL", "tridge.xayma.net", "archived", "tridge", "14.0", "deployodoo", 1],
  [74, 1, 1, "TRION CONSULTING", "trioncons.xayma.net", "archived", "trioncons", "14.0", "deployodoo", 1],
  [75, 2, 7, "KPI Monitoring RapidPro", "rapidpro.xayma.net", "stopped", "rapidpro", "7.0.4", "deployrapidpro", 7],
  [76, 2, 1, "Visimax Odoo", "visimax-odoo.xayma.net", "stopped", "visimax-odoo", "18.0", "deployodoo", 1],
  [77, 2, 1, "Visimax Odoo 2", "visimax-odoo2.xayma.net", "stopped", "visimax-odoo2", "18.0", "deployodoo", 1],
  [78, 2, 1, "Formation Odoo Visimax", "formation-visimax.xayma.net", "stopped", "formation-visimax", "18.0", "deployodoo", 1],
  [79, 2, 1, "Visimax Odoo PME", "visimax-odoo-pme.xayma.net", "stopped", "visimax-odoo-pme", "18.0", "deployodoo", 1],
  [80, 2, 1, "Visimax Services", "visimax-services.xayma.net", "stopped", "visimax-services", "18.0", "deployodoo", 1],
  [81, 2, 1, "Visimax PME", "visimax-pme.xayma.net", "stopped", "visimax-pme", "18.0", "deployodoo", 1],
  [82, 2, 1, "Visimax Gold", "visimax-gold.xayma.net", "stopped", "visimax-gold", "18.0", "deployodoo", 1],
  [83, 2, 1, "Visimax URPGE", "visimax-urpge.xayma.net", "stopped", "visimax-urpge", "18.0", "deployodoo", 1],
  [84, 2, 9, "Workflow test", "workflow-test.xayma.net", "stopped", "workflow-test", "1.34.2", "deploy", 9],
  [85, 2, 1, "Visimax Copy", "visimax-copy.xayma.net", "stopped", "visimax-copy", "18.0", "deployodoo", 1],
  [86, 2, 12, "WordPress test", "wordpress-test.xayma.net", "stopped", "wordpress-test", "6.7.1", "deploy", 12],
  [87, 2, 10, "Moodle test", "moodle-test.xayma.net", "stopped", "moodle-test", "4.3.4", "deploy", 10],
  [88, 2, 1, "Visimax Fiduciaire", "visimax-fid.xayma.net", "stopped", "visimax-fid", "18.0", "deployodoo", 1],
  [89, 2, 1, "Visimax Finance Comptabilité", "visimax-finance.xayma.net", "stopped", "visimax-finance", "18.0", "deployodoo", 1],
  [90, 2, 1, "Visimax Gestion Loyer", "visimax-loyer.xayma.net", "stopped", "visimax-loyer", "18.0", "deployodoo", 1],
  [91, 1, 1, "TRIO CONSULTING", "triocons.xayma.net", "archived", "triocons", "14.0", "deployodoo", 1],
  [92, 1, 1, "UDATECH", "udatech.xayma.net", "archived", "udatech", "14.0", "deployodoo", 1],
  [93, 1, 1, "ULTIMATE MEDIA", "ultimatemedia.xayma.net", "archived", "ultimatemedia", "14.0", "deployodoo", 1],
  [94, 1, 1, "UNTAP SOLUTIONS", "untapsol.xayma.net", "archived", "untapsol", "14.0", "deployodoo", 1],
  [95, 1, 1, "VALETECH", "valetech.xayma.net", "archived", "valetech", "14.0", "deployodoo", 1],
  [96, 1, 1, "VENTURE CONSULTING", "venturecons.xayma.net", "archived", "venturecons", "14.0", "deployodoo", 1],
  [97, 1, 1, "VERBATIMS", "verbatims.xayma.net", "archived", "verbatims", "14.0", "deployodoo", 1],
  [98, 1, 1, "VERMEIL TRADING", "vermeiltrading.xayma.net", "archived", "vermeiltrading", "14.0", "deployodoo", 1],
  [99, 1, 1, "VINCENT TRADING", "vincenttrading.xayma.net", "archived", "vincenttrading", "14.0", "deployodoo", 1],
  [100, 1, 1, "VISTA IT SOLUTIONS", "vistait.xayma.net", "archived", "vistait", "14.0", "deployodoo", 1],
  [101, 1, 1, "VISION IT", "visionit.xayma.net", "archived", "visionit", "14.0", "deployodoo", 1],
  [102, 1, 1, "VISIONNAIRE TRADING", "visionnairetrading.xayma.net", "archived", "visionnairetrading", "14.0", "deployodoo", 1],
  [103, 1, 1, "VISIONSYS", "visionsys.xayma.net", "archived", "visionsys", "14.0", "deployodoo", 1],
  [104, 6, 1, "Kobar Consulting", "kobar.xayma.net", "suspended", "kobar", "18.0", "deployodoo", 1],
  [105, 1, 1, "VITACORE", "vitacore.xayma.net", "archived", "vitacore", "14.0", "deployodoo", 1],
  [106, 1, 1, "VITADEV", "vitadev.xayma.net", "archived", "vitadev", "14.0", "deployodoo", 1],
  [107, 1, 1, "VITALIFE", "vitalife.xayma.net", "archived", "vitalife", "14.0", "deployodoo", 1],
  [108, 1, 1, "VOLUME TRADING", "volumetrading.xayma.net", "archived", "volumetrading", "14.0", "deployodoo", 1],
  [109, 1, 1, "WAKOFI", "wakofi.xayma.net", "archived", "wakofi", "14.0", "deployodoo", 1],
  [110, 2, 1, "New Deployment", "newdeploy.xayma.net", "pending_deployment", "newdeploy", "18.0", "deployodoo", 1],
  [111, 1, 1, "WebTrading", "webtrading.xayma.net", "archived", "webtrading", "14.0", "deployodoo", 1],
  [112, 1, 1, "WEBTEC SOLUTIONS", "webtecsol.xayma.net", "archived", "webtecsol", "14.0", "deployodoo", 1],
  [113, 7, 1, "Yoodi", "yoodi.xayma.net", "suspended", "yoodi", "18.0", "deployodoo", 1],
  [114, 7, 1, "Formation Yoodi", "formation-yoodi.xayma.net", "stopped", "formation-yoodi", "18.0", "deployodoo", 1],
  [115, 1, 1, "ZENITH SOLUTIONS", "zenithsol.xayma.net", "archived", "zenithsol", "14.0", "deployodoo", 1],
  [116, 1, 1, "ZERAM GROUP", "zeramgroup.xayma.net", "archived", "zeramgroup", "14.0", "deployodoo", 1],
  [117, 1, 1, "ZIMBA", "zimba.xayma.net", "archived", "zimba", "14.0", "deployodoo", 1],
  [118, 1, 1, "ZONETEC", "zonetec.xayma.net", "archived", "zonetec", "14.0", "deployodoo", 1],
  [119, 1, 1, "ZOOMTECH", "zoomtech.xayma.net", "archived", "zoomtech", "14.0", "deployodoo", 1],
  [120, 2, 1, "New Visimax", "new-visimax.xayma.net", "suspended", "new-visimax", "18.0", "deployodoo", 1],
  [122, 2, 1, "Another Test", "anothertest.xayma.net", "suspended", "anothertest", "18.0", "deployodoo", 1],
  [123, 2, 1, "Test Deployment 3", "testdep3.xayma.net", "suspended", "testdep3", "18.0", "deployodoo", 1],
  [127, 1, 1, "sobo2", "sobo2.xayma.net", "active", "sobo2", "18.0", "deployodoo", 1],
  [130, 2, 1, "Yet Another Test", "yetanother.xayma.net", "suspended", "yetanother", "18.0", "deployodoo", 1],
  [132, 8, 1, "assane", "assane.xayma.net", "stopped", "assane", "6.7.1", "deploy", 12],
  [136, 1, 1, "thortongt", "thortongt.xayma.net", "active", "thortongt", "18.0", "deployodoo", 1],
  [139, 9, 1, "abibou", "abibou.xayma.net", "suspended", "abibou", "18.0", "deployodoo", 1],
  [141, 10, 1, "lesandiara", "lesandiara.xayma.net", "active", "lesandiara", "18.0", "deployodoo", 1],
  [142, 2, 1, "Latest Deployment", "latestdeploy.xayma.net", "pending_deployment", "latestdeploy", "18.0", "deployodoo", 1],
];

const deploymentData = deploymentRawData.map((row) => ({
  id: row[0],
  partner_id: row[1],
  service_id: row[2],
  label: row[3],
  domainNames: [row[4]],
  status: row[5] === "admin" ? "active" : row[5],
  slug: row[6],
  serviceVersion: row[7],
  deploymentPlan: row[8],
  serviceplanId:
    servicePlans.find(
      (p) => p.service_id === row[2] && p.slug.endsWith("-essential")
    )?.id || 1,
}));

({ error } = await supabase
  .schema("xayma_app")
  .from("deployments")
  .insert(deploymentData));
if (error) {
  console.error("❌ Failed to insert deployments:", error);
  process.exit(1);
}
console.log(`✓ Inserted ${deploymentData.length} deployments`);

// === SETTINGS ===
const settingsData = [
  { key: "max_days_to_archive_depl", value: "0" },
  { key: "max_days_to_delete_depl", value: "0" },
  { key: "max_days_to_archive_orgs", value: "0" },
  { key: "max_days_to_delete_orgs", value: "1000" },
  { key: "low_credit_threshold", value: "5" },
  { key: "max_credits_debt", value: "15" },
  { key: "credit_price", value: "800" },
  {
    key: "payment_api_key",
    value: "53b284b424607a790dfef817297878089571ccc9fdf1940a19d0866a68f9aa29",
  },
  {
    key: "payment_secret_key",
    value: "b8e2f8d43d82083038d0a552b301ea48eef3f2629cfae9b2b806698bbae7fe2a",
  },
  { key: "payment_success_url", value: "https://my.xayma.net/?cts=completed" },
  { key: "payment_cancel_url", value: "https://my.xayma.net/?cts=failed" },
  { key: "payment_ipn_url", value: "https://my.xayma.net/ipn/{#}" },
];

({ error } = await supabase
  .schema("xayma_app")
  .from("settings")
  .insert(settingsData));
if (error) {
  console.error("❌ Failed to insert settings:", error);
  process.exit(1);
}
console.log(`✓ Inserted ${settingsData.length} settings`);

console.log("\n✅ Migration complete!\n");
console.log("📊 Summary:");
console.log(`  - control_nodes: ${controlNodeData.length}`);
console.log(`  - services: ${serviceData.length}`);
console.log(`  - serviceplans: ${servicePlans.length}`);
console.log(`  - partners: ${partnerData.length}`);
console.log(`  - deployments: ${deploymentData.length}`);
console.log(`  - settings: ${settingsData.length}`);
