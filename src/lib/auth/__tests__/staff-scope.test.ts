import { describe, expect, it } from "vitest";
import {
  hubHrefsForScope,
  parseStaffScope,
  staffCanOpenPath,
  staffCanSeeProject,
  staffHas,
} from "../staff-scope";

describe("parseStaffScope", () => {
  it("defaults unknown values to full so existing admins keep access", () => {
    expect(parseStaffScope(null)).toBe("full");
    expect(parseStaffScope("nope")).toBe("full");
    expect(parseStaffScope("accounting")).toBe("accounting");
  });
});

describe("staffHas", () => {
  it("keeps full admin unrestricted", () => {
    expect(staffHas("full", "users.write")).toBe(true);
    expect(staffHas("full", "money.write")).toBe(true);
  });

  it("lets accounting move money but not change users or field notes", () => {
    expect(staffHas("accounting", "money.write")).toBe(true);
    expect(staffHas("accounting", "all_projects")).toBe(true);
    expect(staffHas("accounting", "field.write")).toBe(false);
    expect(staffHas("accounting", "users.write")).toBe(false);
  });

  it("lets a superintendent write field records but not send invoices", () => {
    expect(staffHas("superintendent", "field.write")).toBe(true);
    expect(staffHas("superintendent", "money.write")).toBe(false);
    expect(staffHas("superintendent", "all_projects")).toBe(false);
  });
});

describe("staffCanOpenPath", () => {
  it("always allows company home and the jobs list", () => {
    expect(staffCanOpenPath("superintendent", "/admin")).toBe(true);
    expect(staffCanOpenPath("accounting", "/admin/projects")).toBe(true);
  });

  it("hides settings and the assistant from scoped staff", () => {
    expect(staffCanOpenPath("project_manager", "/admin/settings")).toBe(false);
    expect(staffCanOpenPath("accounting", "/admin/assistant")).toBe(false);
    expect(staffCanOpenPath("full", "/admin/users")).toBe(true);
  });

  it("lets accounting open cash pages and a PM open a job", () => {
    expect(staffCanOpenPath("accounting", "/admin/accounting/forecast")).toBe(true);
    expect(staffCanOpenPath("project_manager", "/admin/projects/abc")).toBe(true);
    expect(staffCanOpenPath("superintendent", "/admin/projects/new")).toBe(false);
  });
});

describe("staffCanSeeProject", () => {
  const job = {
    project_manager_id: "pm-1",
    superintendent_id: "sup-1",
  };

  it("scopes PM and superintendent to the jobs they own", () => {
    expect(staffCanSeeProject("project_manager", "pm-1", job)).toBe(true);
    expect(staffCanSeeProject("project_manager", "other", job)).toBe(false);
    expect(staffCanSeeProject("superintendent", "sup-1", job)).toBe(true);
    expect(staffCanSeeProject("accounting", "anyone", job)).toBe(true);
  });
});

describe("hubHrefsForScope", () => {
  it("does not filter a full admin or PM", () => {
    expect(hubHrefsForScope("full")).toBeNull();
    expect(hubHrefsForScope("project_manager")).toBeNull();
  });

  it("hides money from a superintendent and field from accounting", () => {
    expect(hubHrefsForScope("superintendent")).not.toContain("/costs");
    expect(hubHrefsForScope("accounting")).not.toContain("/daily-logs");
    expect(hubHrefsForScope("accounting")).toContain("/billing");
  });
});
