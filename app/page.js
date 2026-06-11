import { supabase } from "../lib/supabase";
import { revalidatePath } from "next/cache";

function money(n) {
  return `$${Number(n || 0).toFixed(2)}`;
}

function daysUntil(day) {
  return Number(day || 0) - new Date().getDate();
}

export default async function Home() {
  const currentMonth = new Date().toISOString().slice(0, 7);
  const nextPaycheck = 1039.06;

  async function addExpense(formData) {
    "use server";
    const amount = Number(formData.get("amount"));

    await supabase.from("expenses").insert({
      category: formData.get("category"),
      description: formData.get("description"),
      amount,
    });

    const { data: accounts } = await supabase.from("accounts").select("*").limit(1);
    const account = accounts?.[0];

    if (account) {
      await supabase
        .from("accounts")
        .update({ current_balance: Number(account.current_balance) - amount })
        .eq("id", account.id);
    }

    revalidatePath("/");
  }

  async function addPaycheck(formData) {
    "use server";
    const amount = Number(formData.get("amount"));

    await supabase.from("paychecks").insert({
      pay_date: new Date().toISOString().slice(0, 10),
      amount,
      notes: formData.get("notes"),
    });

    const { data: accounts } = await supabase.from("accounts").select("*").limit(1);
    const account = accounts?.[0];

    if (account) {
      await supabase
        .from("accounts")
        .update({ current_balance: Number(account.current_balance) + amount })
        .eq("id", account.id);
    }

    revalidatePath("/");
  }

  async function addGoal(formData) {
    "use server";

    await supabase.from("goals").insert({
      name: formData.get("name"),
      target_amount: Number(formData.get("target")),
      current_amount: Number(formData.get("current") || 0),
    });

    revalidatePath("/");
  }

  async function markPaid(formData) {
    "use server";

    await supabase.from("bill_payments").upsert({
      bill_id: formData.get("billId"),
      paid_month: currentMonth,
      paid_date: new Date().toISOString().slice(0, 10),
    });

    revalidatePath("/");
  }

  const { data: bills } = await supabase.from("bills").select("*").order("due_day");
  const { data: accounts } = await supabase.from("accounts").select("*");
  const { data: payments } = await supabase.from("bill_payments").select("*").eq("paid_month", currentMonth);
  const { data: expenses } = await supabase.from("expenses").select("*").order("created_at", { ascending: false });
  const { data: paychecks } = await supabase.from("paychecks").select("*").order("created_at", { ascending: false });
  const { data: goals } = await supabase.from("goals").select("*");

  const paidIds = new Set(payments?.map((p) => p.bill_id));
  const balance = Number(accounts?.[0]?.current_balance || 0);
  const totalBills = bills?.reduce((s, b) => s + Number(b.amount), 0) || 0;
  const paidTotal = bills?.filter((b) => paidIds.has(b.id)).reduce((s, b) => s + Number(b.amount), 0) || 0;
  const unpaidTotal = totalBills - paidTotal;
  const expenseTotal = expenses?.reduce((s, e) => s + Number(e.amount), 0) || 0;
  const paycheckTotal = paychecks?.reduce((s, p) => s + Number(p.amount), 0) || 0;
  const safeToSpend = balance - unpaidTotal;

  const dueSoon =
    bills?.filter((b) => !paidIds.has(b.id) && daysUntil(b.due_day) <= 7).slice(0, 5) || [];

  return (
    <main>
      <h1>PennyPilot</h1>
      <p className="small">Your family cash-flow cockpit</p>

      <section id="dashboard">
        <div className="card blue">
          <h3>Safe To Spend</h3>
          <h1>{money(safeToSpend)}</h1>
          <p className="small">Checking minus unpaid bills</p>
        </div>

        <div className="grid">
          <div className="card">
            <h3>Checking</h3>
            <h1>{money(balance)}</h1>
          </div>

          <div className="card green">
            <h3>Next Paycheck</h3>
            <h1>{money(nextPaycheck)}</h1>
            <p>Friday</p>
          </div>

          <div className="card red">
            <h3>Unpaid Bills</h3>
            <h1>{money(unpaidTotal)}</h1>
          </div>

          <div className="card yellow">
            <h3>Spending</h3>
            <h1>{money(expenseTotal)}</h1>
          </div>
        </div>

        <div className="card">
          <h2>Due Soon</h2>
          {dueSoon.length === 0 ? (
            <p className="small">No unpaid bills due in the next 7 days.</p>
          ) : (
            dueSoon.map((bill) => (
              <p key={bill.id}>
                <strong>{bill.name}</strong> — {money(bill.amount)} — Due {bill.due_label}
              </p>
            ))
          )}
        </div>

        <div className="card">
          <h2>Monthly Summary</h2>
          <p>Income Logged: {money(paycheckTotal)}</p>
          <p>Paid Bills: {money(paidTotal)}</p>
          <p>Remaining Bills: {money(unpaidTotal)}</p>
          <p>Logged Spending: {money(expenseTotal)}</p>
        </div>
      </section>

      <section id="spend">
        <div className="card">
          <h2>Add Expense</h2>
          <form action={addExpense}>
            <select name="category">
              <option>🍔 Eating Out</option>
              <option>⛽ Gas</option>
              <option>👶 Kids</option>
              <option>🏠 Household</option>
              <option>🎉 Fun</option>
              <option>🧾 Misc</option>
            </select>
            <input name="amount" type="number" step="0.01" placeholder="Amount" required />
            <input name="description" placeholder="Description" />
            <button>Add Expense</button>
          </form>
        </div>

        <div className="card">
          <h2>Recent Expenses</h2>
          {expenses?.slice(0, 5).map((e) => (
            <p key={e.id}>
              <strong>{e.category}</strong> — {money(e.amount)} {e.description ? `— ${e.description}` : ""}
            </p>
          ))}
        </div>
      </section>

      <section id="paychecks">
        <div className="card">
          <h2>Add Paycheck</h2>
          <form action={addPaycheck}>
            <input name="amount" type="number" step="0.01" defaultValue="1039.06" required />
            <input name="notes" defaultValue="Friday paycheck" />
            <button>Add Paycheck</button>
          </form>
        </div>

        <div className="card">
          <h2>Recent Paychecks</h2>
          {paychecks?.slice(0, 5).map((p) => (
            <p key={p.id}>
              <strong>{money(p.amount)}</strong> — {p.notes || "Paycheck"}
            </p>
          ))}
        </div>
      </section>

      <section id="bills">
        <h2>Bills</h2>

        {bills?.map((bill) => {
          const paid = paidIds.has(bill.id);
          const soon = daysUntil(bill.due_day) <= 7;

          return (
            <div className={`bill ${paid ? "paid" : soon ? "dueSoon" : ""}`} key={bill.id}>
              <h3>{bill.name}</h3>
              <p>Due: {bill.due_label}</p>
              <h2>{money(bill.amount)}</h2>

              {!paid ? (
                <form action={markPaid}>
                  <input type="hidden" name="billId" value={bill.id} />
                  <button>Mark Paid</button>
                </form>
              ) : (
                <button>✓ Paid</button>
              )}
            </div>
          );
        })}
      </section>

      <section id="goals">
        <div className="card">
          <h2>Savings Goals</h2>

          {goals?.map((goal) => {
            const percent = Math.min(
              100,
              Math.round((Number(goal.current_amount) / Number(goal.target_amount || 1)) * 100)
            );

            return (
              <div key={goal.id} style={{ marginBottom: 18 }}>
                <strong>{goal.name}</strong>
                <p>
                  {money(goal.current_amount)} / {money(goal.target_amount)} — {percent}%
                </p>
                <div style={{ background: "#1e293b", borderRadius: 10, overflow: "hidden" }}>
                  <div
                    style={{
                      width: `${percent}%`,
                      background: "#22c55e",
                      height: 12,
                    }}
                  />
                </div>
              </div>
            );
          })}

          <h3>Add Goal</h3>
          <form action={addGoal}>
            <input name="name" placeholder="Goal name" required />
            <input name="target" type="number" step="0.01" placeholder="Target amount" required />
            <input name="current" type="number" step="0.01" placeholder="Current amount" />
            <button>Add Goal</button>
          </form>
        </div>
      </section>

      <div className="bottomNav">
        <a href="#dashboard">Home</a>
        <a href="#bills">Bills</a>
        <a href="#spend">Spend</a>
      </div>
    </main>
  );
}
