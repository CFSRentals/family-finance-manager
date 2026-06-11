import { supabase } from "../lib/supabase";

export default async function Home() {
  const { data: bills } = await supabase
    .from("bills")
    .select("*")
    .order("amount", { ascending: false });

  const { data: accounts } = await supabase
    .from("accounts")
    .select("*");

  const balance = accounts?.[0]?.current_balance || 0;

  const totalBills =
    bills?.reduce((sum, bill) => sum + Number(bill.amount), 0) || 0;

  return (
    <main style={{ padding: 24, fontFamily: "Arial, sans-serif" }}>
      <h1>Family Finance Manager</h1>

      <div
        style={{
          border: "1px solid #ccc",
          borderRadius: 10,
          padding: 20,
          marginBottom: 20,
        }}
      >
        <h2>Checking Balance</h2>
        <h1>${balance.toFixed(2)}</h1>
      </div>

      <div
        style={{
          border: "1px solid #ccc",
          borderRadius: 10,
          padding: 20,
          marginBottom: 20,
        }}
      >
        <h2>Total Monthly Bills</h2>
        <h1>${totalBills.toFixed(2)}</h1>
      </div>

      <div
        style={{
          border: "1px solid #ccc",
          borderRadius: 10,
          padding: 20,
        }}
      >
        <h2>Monthly Bills</h2>

        {bills?.map((bill) => (
          <div
            key={bill.id}
            style={{
              display: "flex",
              justifyContent: "space-between",
              padding: "8px 0",
            }}
          >
            <span>{bill.name}</span>
            <strong>${bill.amount}</strong>
          </div>
        ))}
      </div>
    </main>
  );
}
