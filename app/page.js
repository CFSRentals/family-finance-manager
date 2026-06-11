import { supabase } from "../lib/supabase";
import { revalidatePath } from "next/cache";

function money(n) {
  return `$${Number(n || 0).toFixed(2)}`;
}

function daysUntil(day) {
  const today = new Date();
  return day - today.getDate();
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
  const { data: expenses } = await supabase.from("expenses").select("*");

  const paidIds = new Set(payments?.map((p) => p.bill_id));
  const balance = Number(accounts?.[0]?.current_balance || 0);
  const totalBills = bills?.reduce((s, b) => s + Number(b.amount), 0) || 0;
  const paidTotal = bills?.filter((b) => paidIds.has(b.id)).reduce((s, b) => s + Number(b.amount), 0) || 0;
  const unpaidTotal = totalBills - paidTotal;
  const expenseTotal = expenses?.reduce((s, e) => s + Number(e.amount), 0) || 0;
  const safeToSpend = balance - unpaidTotal;

  const dueSoon = bills?.filter((b) => !paidIds.has(b.id) && daysUntil(b.due_day) <= 7).slice(0, 4) || [];

  return (
    <main>
      <div className="header">
        <div>
          <h1>PennyPilot</h1>
          <p className="small">Phone-first budget tracker</p>
        </div>
      </div>

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
          <h3>Unpaid</h3>
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
        <h2>Quick Expense</h2>
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
        <h2>Add Paycheck</h2>
        <form action={addPaycheck}>
          <input name="amount" type="number" step="0.01" defaultValue="1039.06" required />
          <input name="notes" defaultValue="Friday paycheck" />
          <button>Add Paycheck</button>
        </form>
      </div>

      <div className="card">
        <h2>Monthly Summary</h2>
        <p>Paid Bills: {money(paidTotal)}</p>
        <p>Unpaid Bills: {money(unpaidTotal)}</p>
        <p>Total Bills: {money(totalBills)}</p>
        <p>Logged Spending: {money(expenseTotal)}</p>
      </div>

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

      <div className="bottomNav">
        <a href="#top">Home</a>
        <a href="#bills">Bills</a>
        <a href="#spend">Spend</a>
      </div>
    </main>
  );
}
