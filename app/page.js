async function addExpense(formData) {
  "use server";

  const amount = Number(formData.get("amount"));

  await supabase.from("expenses").insert({
    category: formData.get("category"),
    description: formData.get("description"),
    amount,
  });
<div className="card">
  <h2>Add Paycheck</h2>
  <form action={addPaycheck}>
    <input name="amount" type="number" step="0.01" placeholder="Paycheck Amount" defaultValue="1039.06" required />
    <input name="notes" placeholder="Notes" defaultValue="Friday paycheck" />
    <button>Add Paycheck</button>
  </form>
</div>
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
