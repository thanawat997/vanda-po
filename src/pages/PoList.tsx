import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabaseClient";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

type POListRow = {
  id: string;
  created_at: string;
  updated_at: string;
  customer_name: string | null;
  po_number: string | null;
  order_number: string | null;
  order_date: string | null;
};

const safeParseDate = (value: string) => {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

const PoList = () => {
  const navigate = useNavigate();
  const [records, setRecords] = useState<POListRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    if (!supabase) {
      setError("ยังไม่ได้ตั้งค่า VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY");
      setRecords([]);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from("pos")
        .select("id, created_at, updated_at, customer_name, po_number, order_number, order_date")
        .order("updated_at", { ascending: false })
        .limit(300);
      if (error) throw error;
      setRecords((data ?? []) as POListRow[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "โหลดรายการไม่สำเร็จ");
      setRecords([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  return (
    <div className="min-h-screen bg-muted p-3 sm:p-6">
      <div className="max-w-[1200px] mx-auto">
        <div className="flex items-center justify-between gap-2 mb-4">
          <div className="text-xl font-semibold">รายการ PO ที่บันทึกไว้</div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => void load()} disabled={loading}>
              รีเฟรช
            </Button>
            <Button onClick={() => navigate("/")}>กลับไปหน้าแบบฟอร์ม</Button>
          </div>
        </div>

        {error && <div className="bg-white border rounded-md p-4 mb-4 text-sm text-destructive">{error}</div>}

        {records.length === 0 ? (
          <div className="bg-white border rounded-md p-6 text-sm text-muted-foreground">
            {loading ? "กำลังโหลด..." : "ยังไม่มี PO ที่บันทึกไว้"}
          </div>
        ) : (
          <div className="bg-white border rounded-md overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr className="text-left">
                  <th className="p-3 font-medium whitespace-nowrap">ชื่อลูกค้า</th>
                  <th className="p-3 font-medium whitespace-nowrap">เลขที่ PO</th>
                  <th className="p-3 font-medium whitespace-nowrap">เลขที่สั่งซื้อ</th>
                  <th className="p-3 font-medium whitespace-nowrap">วันที่</th>
                  <th className="p-3 font-medium whitespace-nowrap">แก้ไขล่าสุด</th>
                  <th className="p-3 font-medium whitespace-nowrap">การทำงาน</th>
                </tr>
              </thead>
              <tbody>
                {records.map((r) => {
                  const formDate = r.order_date ? safeParseDate(r.order_date) : null;
                  const updatedAt = r.updated_at ? safeParseDate(r.updated_at) : null;

                  return (
                    <tr key={r.id} className="border-t">
                      <td className="p-3 min-w-[220px]">{r.customer_name || "-"}</td>
                      <td className="p-3 whitespace-nowrap">{r.po_number || "-"}</td>
                      <td className="p-3 whitespace-nowrap">{r.order_number || "-"}</td>
                      <td className="p-3 whitespace-nowrap">{formDate ? format(formDate, "dd/MM/yyyy", { locale: th }) : "-"}</td>
                      <td className="p-3 whitespace-nowrap">{updatedAt ? format(updatedAt, "dd/MM/yyyy HH:mm", { locale: th }) : "-"}</td>
                      <td className="p-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm" onClick={() => navigate(`/po/${r.id}`)}>
                            เปิด/แก้ไข
                          </Button>
                          <Button size="sm" onClick={() => navigate(`/po/${r.id}?download=1`)}>
                            โหลด PDF
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default PoList;
