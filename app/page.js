import { supabase } from "../lib/supabase";
import { revalidatePath } from "next/cache";

function money(amount) {
  return `$${Number(amount || 0).toFixed(2)}`;
}

function getStatusColor(isPaid, dueDay) {
  const today = new Date();
  const day = today.getDate();

  if (isPaid) return "#dcfce7"; // green
  if (dueDay <= day) return "#fee2e2"; // red
  if (dueDay - day <= 5) return "#fef9c3"; // yellow
  return "#f8fafc"; // gray
}

export default async function Home() {
  const currentMonth = new Date().toISOString().slice(0, 7);

  async function markPaid(formData) {
    "use server";

    const billId = formData.get("billId");

    await supabase.from("bill_payments").upsert({
      bill_id: billId,
      paid_month: currentMonth,
      paid_date: new Date().toISOString().slice(0, 10),
    });

    revalidatePath("/");
  }

  async function markUnpaid(formData) {
    "use server";

    const billId = formData.get("billId");

    await supabase
      .from("bill_payments")
      .delete()
      .eq("bill_id", billId)
      .eq("paid_month", currentMonth);

    revalidatePath("/");
  }

  const { data: bills } = await supabase
    .from("bills")
    .select("*")
    .order("due_day", { ascending: true });

  const { data: accounts } = await supabase.from("accounts").select("*");

  const { data: payments } = await supabase
    .from("bill_payments")
    .select("*")
    .eq("paid_month", currentMonth);

  const balance = accounts?.[0]?.current_balance || 0;
  const totalBills = bills?.reduce((sum, bill) => sum + Number(bill.amount), 0) || 0;

  const paidBillIds = new Set(payments?.map((p) => p.bill_id));
  const paidTotal =
    bills
      ?.filter((bill) => paidBillIds.has(bill.id))
      .reduce((sum, bill) => sum + Number(bill.amount), 0) || 0;

  const unpaidTotal = totalBills - paidTotal;

  return (
    <main style={{ padding: 24, fontFamily: "Arial, sans-serif", background: "#f1f5f9", minHeight: "100vh" }}>
      <h1>Family Finance Manager</h1>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
        <div style={{ background: "#dbeafe", padding: 20, borderRadius: 14 }}>
          <h3>Checking Balance</h3>
          <h1>{money(balance)}</h1>
        </div>

        <div style={{ background: "#fee2e2", padding: 20, borderRadius: 14 }}>
          <h3>Unpaid Bills</h3>
          <h1>{money(unpaidTotal)}</h1>
        </div>

        <div style={{ background: "#dcfce7", padding: 20, borderRadius: 14 }}>
          <h3>Paid This Month</h3>
          <h1>{money(paidTotal)}</h1>
        </div>

        <div style={{ background: "#fef9c3", padding: 20, borderRadius: 14 }}>
          <h3>Total Monthly Bills</h3>
          <h1>{money(totalBills)}</h1>
        </div>
      </div>

      <section style={{ marginTop: 24, background: "white", padding: 20, borderRadius: 14 }}>
        <h2>Monthly Bills</h2>

        {bills?.map((bill) => {
          const isPaid = paidBillIds.has(bill.id);

          return (
            <div
              key={bill.id}
              style={{
                background: getStatusColor(isPaid, bill.due_day),
                padding: 14,
                borderRadius: 10,
                marginBottom: 10,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 12,
              }}
            >
              <div>
                <strong>{bill.name}</strong>
                <div>Due: {bill.due_label || `${bill.due_day}th`}</div>
              </div>

              <div style={{ textAlign: "right" }}>
                <strong>{money(bill.amount)}</strong>

                <form action={isPaid ? markUnpaid : markPaid}>
                  <input type="hidden" name="billId" value={bill.id} />
                  <button style={{ marginTop: 8, padding: "6px 10px", borderRadius: 8 }}>
                    {isPaid ? "✓ Paid" : "Mark Paid"}
                  </button>
                </form>
              </div>
            </div>
          );
        })}
      </section>
    </main>
  );
}
