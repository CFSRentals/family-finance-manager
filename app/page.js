import { supabase } from "../lib/supabase";
import { revalidatePath } from "next/cache";

function money(amount) {
  return `$${Number(amount || 0).toFixed(2)}`;
}

export default async function Home() {
  const currentMonth = new Date().toISOString().slice(0, 7);

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
  const { data: payments } = await supabase
    .from("bill_payments")
    .select("*")
    .eq("paid_month", currentMonth);
  const { data: expenses } = await supabase.from("expenses").select("*");

  const paidIds = new Set(payments?.map((p) => p.bill_id));
  const balance = Number(accounts?.[0]?.current_balance || 0);
  const totalBills = bills?.reduce((s, b) => s + Number(b.amount), 0) || 0;
  const paidTotal = bills?.filter((b) => paidIds.has(b.id)).reduce((s, b) => s + Number(b.amount), 0) || 0;
  const unpaidTotal = totalBills - paidTotal;
  const expenseTotal = expenses?.reduce((s, e) => s + Number(e.amount), 0) || 0;
  const safeToSpend = balance - unpaidTotal;

  return (
    <main>
      <h1>Family Finance</h1>

      <div className="card blue">
        <h3>Safe To Spend</h3>
        <h1>{money(safeToSpend)}</h1>
      </div>

      <div className="card">
        <h3>Checking Balance</h3>
        <h1>{money(balance)}</h1>
      </div>

      <div className="card red">
        <h3>Unpaid Bills</h3>
        <h1>{money(unpaidTotal)}</h1>
      </div>

      <div className="card green">
        <h3>Paid This Month</h3>
        <h1>{money(paidTotal)}</h1>
      </div>

      <div className="card yellow">
        <h3>Logged Spending</h3>
        <h1>{money(expenseTotal)}</h1>
      </div>

      <div className="card">
        <h2>Add Expense</h2>
        <form action={addExpense}>
          <select name="category">
            <option>Eating Out</option>
            <option>Gas</option>
            <option>Kids</option>
            <option>Household</option>
            <option>Misc</option>
          </select>
          <input name="amount" type="number" step="0.01" placeholder="Amount" required />
          <input name="description" placeholder="Description" />
          <button>Add Expense</button>
        </form>
      </div>

      <div className="card">
        <h2>Add Paycheck</h2>
        <form action={addPaycheck}>
          <input name="amount" type="number" step="0.01" placeholder="Paycheck Amount" defaultValue="1039.06" required />
          <input name="notes" placeholder="Notes" defaultValue="Friday paycheck" />
          <button>Add Paycheck</button>
        </form>
      </div>

      <h2>Bills</h2>

      {bills?.map((bill) => {
        const paid = paidIds.has(bill.id);

        return (
          <div className={`bill ${paid ? "paid" : ""}`} key={bill.id}>
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
    </main>
  );
}
