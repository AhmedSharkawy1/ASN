import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { tenant_id, period_month, period_year } = body;

    if (!tenant_id || !period_month || !period_year) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Calculate working days
    const daysInMonth = new Date(period_year, period_month, 0).getDate();
    let workingDays = 0;
    for (let d = 1; d <= daysInMonth; d++) {
      const day = new Date(period_year, period_month - 1, d).getDay();
      if (day !== 5) workingDays++; // Friday off
    }

    // Get all active employees
    const { data: employees } = await supabase
      .from("hr_employees")
      .select("id, full_name, base_salary")
      .eq("tenant_id", tenant_id)
      .eq("is_active", true);

    if (!employees || employees.length === 0) {
      return NextResponse.json({ error: "لا يوجد موظفين — No employees" }, { status: 404 });
    }

    // Get deduction rules
    const { data: rules } = await supabase
      .from("hr_deduction_rules")
      .select("*")
      .eq("tenant_id", tenant_id)
      .eq("is_active", true);

    const startDate = `${period_year}-${String(period_month).padStart(2, "0")}-01`;
    const endDate = `${period_year}-${String(period_month).padStart(2, "0")}-${daysInMonth}`;

    const results = [];

    for (const emp of employees) {
      // Check if payroll already exists
      const { data: existing } = await supabase
        .from("hr_payroll")
        .select("id")
        .eq("employee_id", emp.id)
        .eq("period_month", period_month)
        .eq("period_year", period_year)
        .maybeSingle();

      if (existing) continue;

      // Get attendance
      const { data: attendance } = await supabase
        .from("hr_attendance")
        .select("status, worked_hours")
        .eq("employee_id", emp.id)
        .gte("date", startDate)
        .lte("date", endDate);

      const presentDays = attendance?.filter((a) => a.status === "present").length || 0;
      const lateDays = attendance?.filter((a) => a.status === "late").length || 0;
      const totalHours = attendance?.reduce((s, a) => s + (a.worked_hours || 0), 0) || 0;
      const absentDays = Math.max(0, workingDays - presentDays - lateDays);

      // Apply deduction rules
      let totalDeductions = 0;
      if (rules) {
        for (const rule of rules) {
          let amount = 0;
          if (rule.rule_type === "absence" && absentDays > rule.threshold_days) {
            const extra = absentDays - rule.threshold_days;
            if (rule.deduction_percentage > 0) {
              amount = (emp.base_salary * rule.deduction_percentage / 100) * extra;
            } else {
              amount = rule.per_occurrence ? extra * rule.deduction_amount : rule.deduction_amount;
            }
          } else if (rule.rule_type === "late" && lateDays > rule.threshold_days) {
            const extra = lateDays - rule.threshold_days;
            amount = rule.per_occurrence ? extra * rule.deduction_amount : rule.deduction_amount;
          }

          if (amount > 0) {
            totalDeductions += amount;
            await supabase.from("hr_deductions").insert([{
              tenant_id,
              employee_id: emp.id,
              rule_id: rule.id,
              period_month,
              period_year,
              amount,
              reason: `${rule.name_ar}: ${rule.rule_type === "absence" ? `${absentDays} يوم غياب` : `${lateDays} يوم تأخير`}`,
              applied_automatically: true,
            }]);
          }
        }
      }

      const netSalary = emp.base_salary - totalDeductions;

      const { data: payroll } = await supabase.from("hr_payroll").insert([{
        tenant_id,
        employee_id: emp.id,
        period_month,
        period_year,
        base_salary: emp.base_salary,
        total_bonuses: 0,
        total_deductions: totalDeductions,
        net_salary: netSalary,
        working_days: workingDays,
        attended_days: presentDays,
        absent_days: absentDays,
        late_days: lateDays,
        total_hours: totalHours,
        status: "draft",
      }]).select().single();

      if (payroll) {
        await supabase.from("hr_payroll_items").insert([
          { payroll_id: payroll.id, item_type: "salary", description: "الراتب الأساسي", amount: emp.base_salary },
          ...(totalDeductions > 0 ? [{ payroll_id: payroll.id, item_type: "deduction", description: "خصومات تلقائية", amount: -totalDeductions }] : []),
        ]);
        results.push(payroll);
      }
    }

    return NextResponse.json({ success: true, generated: results.length, data: results });
  } catch (err: any) {
    console.error("Payroll API Error:", err);
    return NextResponse.json({ error: err.message || "Server error" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const tenant_id = searchParams.get("tenant_id");
    const month = searchParams.get("month");
    const year = searchParams.get("year");

    if (!tenant_id) {
      return NextResponse.json({ error: "tenant_id required" }, { status: 400 });
    }

    let query = supabase
      .from("hr_payroll")
      .select("*, hr_employees(full_name, department)")
      .eq("tenant_id", tenant_id)
      .order("created_at", { ascending: false });

    if (month) query = query.eq("period_month", Number(month));
    if (year) query = query.eq("period_year", Number(year));

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
