import express from "express";
import path from "path";
import dotenv from "dotenv";
import { google } from "googleapis";
import crypto from "crypto";
dotenv.config();
const app = express();
const PORT = 3e3;
const sessions = /* @__PURE__ */ new Map();
function generateToken() {
  return crypto.randomBytes(32).toString("hex");
}
function cleanPrivateKey(key) {
  if (!key) return "";
  let cleaned = key.trim();
  while (cleaned.startsWith('"') && cleaned.endsWith('"') || cleaned.startsWith("'") && cleaned.endsWith("'") || cleaned.startsWith("`") && cleaned.endsWith("`")) {
    cleaned = cleaned.slice(1, -1).trim();
  }
  cleaned = cleaned.replace(/\\"/g, '"').replace(/\\'/g, "'");
  cleaned = cleaned.replace(/\\n/g, "\n").replace(/\\r/g, "\r");
  const headerMatch = cleaned.match(/-----BEGIN [A-Z ]+-----/);
  const footerMatch = cleaned.match(/-----END [A-Z ]+-----/);
  if (headerMatch && footerMatch) {
    const header = headerMatch[0];
    const footer = footerMatch[0];
    const bodyStart = cleaned.indexOf(header) + header.length;
    const bodyEnd = cleaned.indexOf(footer);
    if (bodyEnd > bodyStart) {
      const body = cleaned.substring(bodyStart, bodyEnd).trim();
      const lines = body.split(/[\s\r\n]+/).filter((line) => line.length > 0);
      cleaned = `${header}
${lines.join("\n")}
${footer}`;
    }
  }
  return cleaned;
}
function getSheetsClient() {
  const privateKeyRaw = process.env.GOOGLE_PRIVATE_KEY;
  const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
  const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID;
  if (!privateKeyRaw || !clientEmail || !spreadsheetId) {
    throw new Error("Google Sheets server credentials (GOOGLE_PRIVATE_KEY, GOOGLE_CLIENT_EMAIL, GOOGLE_SPREADSHEET_ID) are not configured.");
  }
  const privateKey = cleanPrivateKey(privateKeyRaw);
  const auth = new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"]
  });
  return { sheets: google.sheets({ version: "v4", auth }), spreadsheetId };
}
function requireAuth(req, res, next) {
  const token = req.headers.authorization?.replace("Bearer ", "").trim();
  if (!token) {
    res.status(401).json({ success: false, error: "Unauthorized" });
    return;
  }
  const session = sessions.get(token);
  if (!session || session.expiresAt < Date.now()) {
    if (token) sessions.delete(token);
    res.status(401).json({ success: false, error: "Session expired. Please log in again." });
    return;
  }
  req.user = session;
  next();
}
async function readAuthUsers() {
  const { sheets, spreadsheetId } = getSheetsClient();
  const resp = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: "Authentication!A:C"
  });
  const rows = resp.data.values || [];
  if (rows.length < 2) return [];
  const headers = rows[0].map((h) => h?.toString().toLowerCase().trim() || "");
  const userIdx = headers.findIndex((h) => h.includes("user") || h.includes("team") || h.includes("name"));
  const passIdx = headers.findIndex((h) => h.includes("pass") || h.includes("pwd") || h.includes("secret"));
  const roleIdx = headers.findIndex((h) => h.includes("role") || h.includes("type") || h.includes("access"));
  const ui = userIdx >= 0 ? userIdx : 0;
  const pi = passIdx >= 0 ? passIdx : 1;
  const ri = roleIdx >= 0 ? roleIdx : 2;
  return rows.slice(1).filter((row) => row[ui]?.toString().trim()).map((row) => ({
    username: row[ui]?.toString().trim() || "",
    password: row[pi]?.toString().trim() || "",
    role: row[ri]?.toString().trim().toLowerCase() || "user"
  }));
}
function filterByTeam(username) {
  const norm = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, " ").replace(/\boperations?\b/g, "ops").replace(/\s+/g, "");
  const userNorm = norm(username);
  const userHasShared = userNorm.includes("shared");
  return (dataTeam) => {
    const dataNorm = norm(dataTeam);
    if (dataNorm === userNorm) return true;
    if (dataNorm.includes("shared") !== userHasShared) return false;
    const minLen = Math.min(dataNorm.length, userNorm.length);
    if (minLen >= 5 && (dataNorm.startsWith(userNorm) || userNorm.startsWith(dataNorm))) return true;
    return false;
  };
}
app.use(express.json());
app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    env: {
      GOOGLE_CLIENT_EMAIL: !!process.env.GOOGLE_CLIENT_EMAIL,
      GOOGLE_PRIVATE_KEY: !!process.env.GOOGLE_PRIVATE_KEY,
      GOOGLE_SPREADSHEET_ID: !!process.env.GOOGLE_SPREADSHEET_ID
    }
  });
});
let teamsCache = null;
app.get("/api/teams", async (req, res) => {
  try {
    if (teamsCache && Date.now() - teamsCache.cachedAt < 5 * 60 * 1e3) {
      return res.json({ success: true, teams: teamsCache.teams });
    }
    const { sheets, spreadsheetId } = getSheetsClient();
    const meta = await sheets.spreadsheets.get({ spreadsheetId });
    const titles = (meta.data.sheets || []).map((s) => s.properties?.title || "");
    const ltdQ2Title = titles.find((t) => t.toLowerCase().includes("ltd budget tracking")) || "";
    const ltdQ3Title = titles.find((t) => t.toLowerCase().includes("q3 budget") && t.toLowerCase().includes("10ms limited")) || "";
    const lcQ2Title = titles.find((t) => t.toLowerCase().includes("lc budget tracking")) || "";
    const lcQ3Title = titles.find((t) => t.toLowerCase().includes("q3 10ms lc")) || "";
    const batch = await sheets.spreadsheets.values.batchGet({
      spreadsheetId,
      ranges: [
        `'${ltdQ2Title}'!A1:C350`,
        `'${ltdQ3Title}'!A1:D350`,
        `'${lcQ2Title}'!A1:C350`,
        `'${lcQ3Title}'!A1:D350`
      ]
    });
    const vr = batch.data.valueRanges || [];
    const parsed = {
      ltdQ2: parseQ2Sheet(vr[0]?.values || [], "LTD"),
      ltdQ3: parseQ3Sheet(vr[1]?.values || [], "LTD"),
      lcQ2: parseQ2Sheet(vr[2]?.values || [], "LC"),
      lcQ3: parseLcQ3Sheet(vr[3]?.values || [], "LC")
    };
    const teamSet = /* @__PURE__ */ new Set();
    const skip = /* @__PURE__ */ new Set(["other", "general", "department", "unrecognized", "unrecohnized", "team", "branch / group", "branch", "sub-team", "cost type", "source", "purpose / details"]);
    [...parsed.ltdQ2, ...parsed.lcQ2].forEach((i) => {
      const v = (i.department || "").trim();
      if (v.length >= 2 && !skip.has(v.toLowerCase())) teamSet.add(v);
    });
    [...parsed.ltdQ3, ...parsed.lcQ3].forEach((i) => {
      const v = (i.team || "").trim();
      if (v.length >= 2 && !skip.has(v.toLowerCase())) teamSet.add(v);
    });
    const authUsers = await readAuthUsers();
    authUsers.filter((u) => u.role === "admin").forEach((u) => teamSet.add(u.username));
    const teams = [...teamSet].sort((a, b) => a.localeCompare(b));
    teamsCache = { teams, cachedAt: Date.now() };
    res.json({ success: true, teams });
  } catch (error) {
    console.error("Teams fetch error:", error);
    res.status(500).json({ success: false, error: error?.message || "Unable to fetch teams." });
  }
});
app.post("/api/login", async (req, res) => {
  try {
    const { teams, password } = req.body;
    if (!teams || !Array.isArray(teams) || teams.length === 0) {
      res.status(400).json({ success: false, error: "Please select at least one team." });
      return;
    }
    if (!password) {
      res.status(400).json({ success: false, error: "Password is required." });
      return;
    }
    const allUsers = await readAuthUsers();
    const matched = teams.map(
      (t) => allUsers.find((u) => u.username.toLowerCase() === t.toLowerCase())
    );
    if (matched.some((u) => !u)) {
      res.status(401).json({ success: false, error: "One or more selected teams were not found." });
      return;
    }
    const passwords = [...new Set(matched.map((u) => u.password))];
    if (passwords.length > 1) {
      res.status(401).json({
        success: false,
        error: "Selected teams have different passwords. Only teams sharing the same password can be combined."
      });
      return;
    }
    if (passwords[0] !== password) {
      res.status(401).json({ success: false, error: "Invalid password." });
      return;
    }
    const role = matched.some((u) => u.role === "admin") ? "admin" : "team";
    const token = generateToken();
    sessions.set(token, {
      teams,
      role,
      expiresAt: Date.now() + 8 * 60 * 60 * 1e3
    });
    res.json({ success: true, token, teams, role });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ success: false, error: "Authentication service unavailable." });
  }
});
app.post("/api/logout", (req, res) => {
  const token = req.headers.authorization?.replace("Bearer ", "").trim();
  if (token) sessions.delete(token);
  res.json({ success: true });
});
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", time: /* @__PURE__ */ new Date() });
});
async function ensureRequisitionsSheet(sheets, spreadsheetId) {
  const meta = await sheets.spreadsheets.get({ spreadsheetId });
  const exists = (meta.data.sheets || []).some(
    (s) => s.properties?.title === "Requisitions"
  );
  if (exists) return;
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [{ addSheet: { properties: { title: "Requisitions" } } }]
    }
  });
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: "Requisitions!A1:S1",
    valueInputOption: "RAW",
    requestBody: {
      values: [[
        "Timestamp",
        "ID",
        "Team",
        "Submitted By",
        "Designation",
        "Contact",
        "Email",
        "Date of Submission",
        "Department",
        "Month",
        "Budget Line",
        "Cost Heading",
        "Amount (\u09F3)",
        "Project Name",
        "Vendor Name",
        "Purpose",
        "Description",
        "Invoice Link",
        "Status"
      ]]
    }
  });
}
app.get("/api/requisitions", requireAuth, async (req, res) => {
  const user = req.user;
  const { sheets, spreadsheetId } = getSheetsClient();
  try {
    const resp = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: "Requisitions!A:S"
    });
    const rows = resp.data.values || [];
    if (rows.length < 2) return res.json({ success: true, requisitions: [] });
    const data = rows.slice(1).filter((row) => row[1]).map((row) => ({
      id: row[1] || "",
      timestamp: row[0] || "",
      team: row[2] || "",
      submittedBy: row[3] || "",
      designation: row[4] || "",
      contact: row[5] || "",
      email: row[6] || "",
      dateOfSubmission: row[7] || "",
      department: row[8] || "",
      month: row[9] || "",
      budgetLine: row[10] || "",
      costHeading: row[11] || "",
      amount: parseFloat(row[12] || "0") || 0,
      projectName: row[13] || "",
      vendorName: row[14] || "",
      purpose: row[15] || "",
      description: row[16] || "",
      invoiceLink: row[17] || "",
      status: row[18] || "Pending"
    }));
    const userTeamSet = new Set(user.teams.map((t) => t.toLowerCase()));
    const filtered = user.role === "admin" ? data : data.filter(
      (r) => r.team.split(",").map((s) => s.trim().toLowerCase()).some((t) => userTeamSet.has(t))
    );
    return res.json({ success: true, requisitions: filtered });
  } catch (error) {
    if (error.message?.includes("Unable to parse range") || error.message?.includes("not found")) {
      return res.json({ success: true, requisitions: [] });
    }
    console.error("Requisitions fetch error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});
app.post("/api/requisitions", requireAuth, async (req, res) => {
  const user = req.user;
  const { sheets, spreadsheetId } = getSheetsClient();
  const b = req.body;
  const requiredFields = [
    "submittedBy",
    "designation",
    "contact",
    "email",
    "dateOfSubmission",
    "department",
    "month",
    "budgetLine",
    "costHeading",
    "vendorName",
    "purpose",
    "description",
    "invoiceLink"
  ];
  for (const field of requiredFields) {
    if (!b[field]?.toString().trim()) {
      return res.status(400).json({ success: false, error: `Missing required field: ${field}` });
    }
  }
  try {
    await ensureRequisitionsSheet(sheets, spreadsheetId);
    const timestamp = (/* @__PURE__ */ new Date()).toISOString();
    const id = `REQ-${Date.now()}`;
    const teamStr = user.teams.join(", ");
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: "Requisitions!A:S",
      valueInputOption: "RAW",
      insertDataOption: "INSERT_ROWS",
      requestBody: {
        values: [[
          timestamp,
          id,
          teamStr,
          b.submittedBy,
          b.designation,
          b.contact,
          b.email,
          b.dateOfSubmission,
          b.department,
          b.month,
          b.budgetLine,
          b.costHeading,
          parseFloat(b.amount) || 0,
          b.projectName || "",
          b.vendorName,
          b.purpose,
          b.description,
          b.invoiceLink,
          "Pending"
        ]]
      }
    });
    res.json({ success: true, id });
  } catch (error) {
    console.error("Requisition submit error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});
app.patch("/api/requisitions/:id", requireAuth, async (req, res) => {
  const user = req.user;
  if (user.role !== "admin") {
    res.status(403).json({ success: false, error: "Only admins can update status." });
    return;
  }
  const { id } = req.params;
  const { status } = req.body;
  if (!["Pending", "Approved", "Rejected"].includes(status)) {
    res.status(400).json({ success: false, error: "Invalid status value." });
    return;
  }
  try {
    const { sheets, spreadsheetId } = getSheetsClient();
    const colB = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: "Requisitions!B:B"
    });
    const rows = colB.data.values || [];
    const rowIndex = rows.findIndex((r) => r[0] === id);
    if (rowIndex === -1) {
      res.status(404).json({ success: false, error: "Requisition not found." });
      return;
    }
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `Requisitions!S${rowIndex + 1}`,
      valueInputOption: "RAW",
      requestBody: { values: [[status]] }
    });
    res.json({ success: true });
  } catch (error) {
    console.error("Status update error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});
app.get("/api/sheets-data", requireAuth, async (req, res) => {
  try {
    const user = req.user;
    const { sheets, spreadsheetId } = getSheetsClient();
    const meta = await sheets.spreadsheets.get({ spreadsheetId });
    const sheetsList = meta.data.sheets || [];
    const titles = sheetsList.map((s) => s.properties?.title || "");
    const ltdQ2Title = titles.find((t) => t.toLowerCase().includes("ltd budget tracking")) || "2026 (Q2)- LTD Budget Tracking";
    const ltdQ3Title = titles.find((t) => t.toLowerCase().includes("q3 budget") && t.toLowerCase().includes("10ms limited")) || "Summary: Q3 Budget \u2014 10MS Limited";
    const lcQ2Title = titles.find((t) => t.toLowerCase().includes("lc budget tracking")) || "2026 (Q2)- LC Budget Tracking";
    const lcQ3Title = titles.find((t) => t.toLowerCase().includes("q3 10ms lc budget") || t.toLowerCase().includes("q3 10ms lc")) || "Summary: Q3 10MS LC Budget";
    const ltdQ4Title = titles.find((t) => t.toLowerCase().includes("q4") && t.toLowerCase().includes("10ms limited"));
    const lcQ4Title = titles.find((t) => t.toLowerCase().includes("q4") && t.toLowerCase().includes("10ms lc"));
    const baseRanges = [
      `'${ltdQ2Title}'!A1:Z350`,
      `'${ltdQ3Title}'!A1:Z350`,
      `'${lcQ2Title}'!A1:Z350`,
      `'${lcQ3Title}'!A1:Z350`
    ];
    if (ltdQ4Title) baseRanges.push(`'${ltdQ4Title}'!A1:Z350`);
    if (lcQ4Title) baseRanges.push(`'${lcQ4Title}'!A1:Z350`);
    const batchResponse = await sheets.spreadsheets.values.batchGet({
      spreadsheetId,
      ranges: baseRanges
    });
    const valueRanges = batchResponse.data.valueRanges || [];
    const ltdQ2Raw = valueRanges[0]?.values || [];
    const ltdQ3Raw = valueRanges[1]?.values || [];
    const lcQ2Raw = valueRanges[2]?.values || [];
    const lcQ3Raw = valueRanges[3]?.values || [];
    let ltdQ4RawIdx = 4;
    let lcQ4RawIdx = ltdQ4Title ? 5 : 4;
    const ltdQ4Raw = ltdQ4Title ? valueRanges[ltdQ4RawIdx]?.values || [] : [];
    const lcQ4Raw = lcQ4Title ? valueRanges[lcQ4RawIdx]?.values || [] : [];
    let parsedLtdQ2 = parseQ2Sheet(ltdQ2Raw, "LTD");
    let parsedLtdQ3 = parseQ3Sheet(ltdQ3Raw, "LTD");
    let parsedLcQ2 = parseQ2Sheet(lcQ2Raw, "LC");
    let parsedLcQ3 = parseLcQ3Sheet(lcQ3Raw, "LC");
    let parsedLtdQ4 = ltdQ4Title ? parseQ3Sheet(ltdQ4Raw, "LTD") : null;
    let parsedLcQ4 = lcQ4Title ? parseQ3Sheet(lcQ4Raw, "LC") : null;
    if (user.role !== "admin") {
      const matchers = user.teams.map((t) => filterByTeam(t));
      const anyMatch = (dataTeam) => matchers.some((m) => m(dataTeam));
      parsedLtdQ2 = parsedLtdQ2.filter((i) => anyMatch(i.department));
      parsedLtdQ3 = parsedLtdQ3.filter((i) => anyMatch(i.team));
      parsedLcQ2 = parsedLcQ2.filter((i) => anyMatch(i.department));
      parsedLcQ3 = parsedLcQ3.filter((i) => anyMatch(i.team));
      if (parsedLtdQ4) parsedLtdQ4 = parsedLtdQ4.filter((i) => anyMatch(i.team));
      if (parsedLcQ4) parsedLcQ4 = parsedLcQ4.filter((i) => anyMatch(i.team));
    }
    const responseData = {
      ltdQ2: parsedLtdQ2,
      ltdQ3: parsedLtdQ3,
      lcQ2: parsedLcQ2,
      lcQ3: parsedLcQ3
    };
    if (parsedLtdQ4 !== null) responseData.ltdQ4 = parsedLtdQ4;
    if (parsedLcQ4 !== null) responseData.lcQ4 = parsedLcQ4;
    res.json({
      success: true,
      title: "Budget Tracker",
      sheetsMeta: titles,
      spreadsheetId,
      currentUser: { teams: user.teams, role: user.role },
      data: responseData
    });
  } catch (error) {
    console.error("Error fetching sheets:", error);
    res.status(500).json({
      success: false,
      error: error.message || "An error occurred while fetching spreadsheet data."
    });
  }
});
function parseQ2Sheet(rows, entity) {
  if (rows.length < 2) return [];
  const headers = rows[0] || [];
  const deptIdx = 0;
  const nameIdx = 1;
  const descIdx = 2;
  let aprIdx = 4, mayBudgetIdx = 5, mayActualIdx = 6, mayVarianceIdx = 7, mayRemainingIdx = 8;
  let junBudgetIdx = 9, junActualIdx = 10, junVarianceIdx = 11, junRemainingIdx = 12;
  headers.forEach((h, i) => {
    const text = h?.toString().toLowerCase().trim();
    if (text.includes("apr")) aprIdx = i;
    else if (text === "may") mayBudgetIdx = i;
    else if (text.includes("may actual") || text === "may actual") mayActualIdx = i;
    else if (text.includes("may var") || text.includes("may variance")) mayVarianceIdx = i;
    else if (text.includes("may rem") || text.includes("may remaining")) mayRemainingIdx = i;
    else if (text === "june" || text === "jun") junBudgetIdx = i;
    else if (text.includes("june actual") || text.includes("jun actual") || text === "june actual") junActualIdx = i;
    else if (text.includes("june var") || text.includes("june variance")) junVarianceIdx = i;
    else if (text.includes("june rem") || text.includes("june remaining")) junRemainingIdx = i;
  });
  const cleanedData = [];
  let currentGroup = "General";
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;
    const rawDept = row[deptIdx]?.toString().trim() || "";
    const rawHeading = row[nameIdx]?.toString().trim() || "";
    const rawDesc = row[descIdx]?.toString().trim() || "";
    if (!rawHeading && !rawDept && !rawDesc) continue;
    if (rawDept && !rawHeading && !rawDesc) {
      currentGroup = rawDept;
      continue;
    }
    const headingLower = rawHeading.toLowerCase();
    const isSubtotalFlag = headingLower.includes("subtotal") || headingLower.includes("total") && !headingLower.includes("bonus");
    if (rawHeading.toLowerCase().startsWith("department") || rawHeading === "Cost Heading") continue;
    const aprBudget = parseNumeric(row[aprIdx]);
    const mayBudget = parseNumeric(row[mayBudgetIdx]);
    const mayActual = parseNumeric(row[mayActualIdx]);
    const mayVariance = parseNumeric(row[mayVarianceIdx]);
    const mayRemaining = parseNumeric(row[mayRemainingIdx]);
    const junBudget = parseNumeric(row[junBudgetIdx]);
    const junActual = parseNumeric(row[junActualIdx]);
    const junVariance = parseNumeric(row[junVarianceIdx]);
    const junRemaining = parseNumeric(row[junRemainingIdx]);
    cleanedData.push({
      id: `${entity}-Q2-${i}`,
      entity,
      department: rawDept || currentGroup || "Other",
      costHeading: rawHeading,
      description: rawDesc,
      isSubtotal: isSubtotalFlag,
      isHeader: false,
      aprBudget,
      mayBudget,
      mayActual,
      mayVariance,
      mayRemaining,
      junBudget,
      junActual,
      junVariance,
      junRemaining,
      totalBudget: aprBudget + mayBudget + junBudget,
      totalActual: aprBudget + mayActual + junActual,
      totalRemaining: aprBudget - aprBudget + mayRemaining + junRemaining
    });
  }
  return cleanedData;
}
function parseQ3Sheet(rows, entity) {
  if (rows.length < 3) return [];
  const cleanedData = [];
  let currentTeam = "Marketing";
  let headerRowIndex = 3;
  let headers = [];
  for (let r = 0; r < Math.min(rows.length, 10); r++) {
    const row = rows[r];
    if (row && row.length > 5) {
      const hasTeamOrBranch = row.some((val) => {
        const s = val?.toString().toLowerCase().trim() || "";
        return s === "team" || s === "branch / group" || s === "cost type" || s === "description";
      });
      if (hasTeamOrBranch) {
        headerRowIndex = r;
        headers = row;
        break;
      }
    }
  }
  if (headers.length === 0) {
    headers = rows[2] || [];
    headerRowIndex = 2;
  }
  let teamIdx = 0, subTeamIdx = 1, costTypeIdx = 2, purposeIdx = 3;
  let julBudgetIdx = 4, julActualIdx = 5, julVarIdx = 6, julRemIdx = 7;
  let augBudgetIdx = 8, augActualIdx = 9, augVarIdx = 10, augRemIdx = 11;
  let sepBudgetIdx = 12, sepActualIdx = 13, sepVarIdx = 14, sepRemIdx = 15;
  let q3TotalIdx = 16;
  headers.forEach((h, idx) => {
    const text = h?.toString().toLowerCase().trim() || "";
    if (!text) return;
    if (text === "team" || text === "branch" || text.includes("branch / group")) teamIdx = idx;
    else if (text.includes("sub-team") || text === "source") subTeamIdx = idx;
    else if (text === "cost type" || text === "description") costTypeIdx = idx;
    else if (text.includes("purpose") || text.includes("details")) purposeIdx = idx;
    else if ((text.includes("jul") || text.includes("july") || text.includes("oct") || text.includes("october")) && !text.includes("actual") && !text.includes("var") && !text.includes("rem")) julBudgetIdx = idx;
    else if ((text.includes("jul") || text.includes("july") || text.includes("oct") || text.includes("october")) && text.includes("actual")) julActualIdx = idx;
    else if ((text.includes("jul") || text.includes("july") || text.includes("oct") || text.includes("october")) && (text.includes("var") || text.includes("variance"))) julVarIdx = idx;
    else if ((text.includes("jul") || text.includes("july") || text.includes("oct") || text.includes("october")) && text.includes("rem")) julRemIdx = idx;
    else if ((text.includes("aug") || text.includes("august") || text.includes("nov") || text.includes("november")) && !text.includes("actual") && !text.includes("var") && !text.includes("rem")) augBudgetIdx = idx;
    else if ((text.includes("aug") || text.includes("august") || text.includes("nov") || text.includes("november")) && text.includes("actual")) augActualIdx = idx;
    else if ((text.includes("aug") || text.includes("august") || text.includes("nov") || text.includes("november")) && (text.includes("var") || text.includes("variance"))) augVarIdx = idx;
    else if ((text.includes("aug") || text.includes("august") || text.includes("nov") || text.includes("november")) && text.includes("rem")) augRemIdx = idx;
    else if ((text.includes("sep") || text.includes("september") || text.includes("dec") || text.includes("december")) && !text.includes("actual") && !text.includes("var") && !text.includes("rem")) sepBudgetIdx = idx;
    else if ((text.includes("sep") || text.includes("september") || text.includes("dec") || text.includes("december")) && text.includes("actual")) sepActualIdx = idx;
    else if ((text.includes("sep") || text.includes("september") || text.includes("dec") || text.includes("december")) && (text.includes("var") || text.includes("variance"))) sepVarIdx = idx;
    else if ((text.includes("sep") || text.includes("september") || text.includes("dec") || text.includes("december")) && text.includes("rem")) sepRemIdx = idx;
    else if ((text.includes("q3") || text.includes("q4")) && text.includes("total")) q3TotalIdx = idx;
  });
  for (let i = headerRowIndex + 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;
    const rawTeam = row[teamIdx]?.toString().trim() || "";
    const rawSubTeam = row[subTeamIdx]?.toString().trim() || "";
    const rawCostType = row[costTypeIdx]?.toString().trim() || "";
    const rawPurpose = row[purposeIdx]?.toString().trim() || "";
    if (!rawTeam && !rawSubTeam && !rawCostType && !rawPurpose) continue;
    if (rawTeam && !rawSubTeam && !rawCostType && !rawPurpose) {
      currentTeam = rawTeam;
      continue;
    }
    if (rawTeam) currentTeam = rawTeam;
    const isSubtotalFlag = rawCostType.toLowerCase().includes("subtotal") || rawCostType.toLowerCase().includes("total") || rawSubTeam.toLowerCase().includes("subtotal") || rawSubTeam.toLowerCase().includes("total") || rawTeam.toLowerCase().includes("subtotal") || rawTeam.toLowerCase().includes("total");
    if (rawTeam.toLowerCase().includes("note") || rawSubTeam.toLowerCase().includes("note") || rawTeam.toLowerCase().includes("consolidated")) continue;
    const julBudget = parseNumeric(row[julBudgetIdx]);
    const julActual = parseNumeric(row[julActualIdx]);
    const julVar = parseNumeric(row[julVarIdx]);
    const julRem = parseNumeric(row[julRemIdx]);
    const augBudget = parseNumeric(row[augBudgetIdx]);
    const augActual = parseNumeric(row[augActualIdx]);
    const augVar = parseNumeric(row[augVarIdx]);
    const augRem = parseNumeric(row[augRemIdx]);
    const sepBudget = parseNumeric(row[sepBudgetIdx]);
    const sepActual = parseNumeric(row[sepActualIdx]);
    const sepVar = parseNumeric(row[sepVarIdx]);
    const sepRem = parseNumeric(row[sepRemIdx]);
    const q3Total = parseNumeric(row[q3TotalIdx]);
    cleanedData.push({
      id: `${entity}-Q3-${i}`,
      entity,
      team: currentTeam,
      subTeam: rawSubTeam,
      costType: rawCostType || "Other Cost",
      purpose: rawPurpose,
      isSubtotal: isSubtotalFlag,
      julBudget,
      julActual,
      julVar,
      julRem,
      augBudget,
      augActual,
      augVar,
      augRem,
      sepBudget,
      sepActual,
      sepVar,
      sepRem,
      q3Total: q3Total || julBudget + augBudget + sepBudget
    });
  }
  return cleanedData;
}
function parseLcQ3Sheet(rows, entity) {
  if (rows.length === 0) return [];
  const firstRowStr = JSON.stringify(rows.slice(0, 5)).toLowerCase();
  if (firstRowStr.includes("jul") || firstRowStr.includes("july") || firstRowStr.includes("sep")) {
    return parseQ3Sheet(rows, entity);
  }
  return parseQ2Sheet(rows, entity);
}
function parseNumeric(val) {
  if (val === void 0 || val === null) return 0;
  const str = val.toString().trim();
  if (str === "" || str === "-" || str === "#DIV/0!" || str.includes("DIV")) return 0;
  const cleanStr = str.replace(/\s/g, "");
  const isParenthesesNegative = cleanStr.startsWith("(") && cleanStr.endsWith(")");
  let parsed = parseFloat(str.replace(/[^0-9.-]/g, ""));
  if (isNaN(parsed)) return 0;
  return isParenthesesNegative ? -Math.abs(parsed) : parsed;
}
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server is running at http://0.0.0.0:${PORT}`);
  });
}
if (!process.env.VERCEL) {
  startServer();
}
var server_default = app;
export {
  server_default as default
};
