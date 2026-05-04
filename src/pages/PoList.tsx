import { Button } from "@/components/ui/button";
import { resolvedSupabaseUrl, supabase } from "@/lib/supabaseClient";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import vdpLogo from "../../vdplogo.png";

type POListRow = {
  id: string;
  created_at: string;
  updated_at: string;
  customer_name: string | null;
  po_number: string | null;
  order_number: string | null;
  order_date: string | null;
};

const getErrorMessage = (err: unknown) => {
  if (err instanceof Error) return err.message;
  if (typeof err === "object" && err && "message" in err && typeof (err as { message?: unknown }).message === "string") {
    return (err as { message: string }).message;
  }
  return "โหลดรายการไม่สำเร็จ";
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
      setError(getErrorMessage(err));
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
        <div className="flex flex-col sm:flex-row sm:items-center items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3 min-w-0">
            <img src={vdpLogo} alt="VDP" className="h-8 w-8 sm:h-9 sm:w-9 object-contain shrink-0" />
            <div className="text-xl font-semibold truncate">Purchase Order</div>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <Button variant="outline" onClick={() => void load()} disabled={loading}>
              รีเฟรช
            </Button>
            <Button onClick={() => navigate("/po/new")} disabled={loading}>
              <Plus className="w-4 h-4" />
              สร้าง PO ใหม่
            </Button>
          </div>
        </div>

        {error && <div className="bg-white border rounded-md p-4 mb-4 text-sm text-destructive">{error}</div>}
        {error && error.toLowerCase().includes("failed to fetch") && resolvedSupabaseUrl && (
          <div className="bg-white border rounded-md p-4 mb-4 text-xs text-muted-foreground">
            <div>ดูเหมือนเชื่อมต่อ Supabase ไม่ได้ (network/CORS/DNS/ถูกบล็อกโดย extension)</div>
            <div>
              ลองเปิดลิงก์นี้ในแท็บใหม่:{" "}
              <a className="underline" href={resolvedSupabaseUrl} target="_blank" rel="noreferrer">
                {resolvedSupabaseUrl}
              </a>
            </div>
          </div>
        )}

        {records.length === 0 ? (
          <div className="bg-white border rounded-md p-6 text-sm text-muted-foreground">
            {loading ? "กำลังโหลด..." : "ยังไม่มี PO ที่บันทึกไว้"}
          </div>
        ) : (
          <>
            <div className="sm:hidden space-y-3">
              {records.map((r) => {
                const orderDate = r.order_date ? safeParseDate(r.order_date) : null;
                const updatedAt = r.updated_at ? safeParseDate(r.updated_at) : null;

                return (
                  <div key={r.id} className="bg-white border rounded-md p-4">
                    <div className="font-medium break-words">{r.customer_name || "-"}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      วันที่สั่งซื้อ: {orderDate ? format(orderDate, "dd/MM/yyyy", { locale: th }) : "-"}
                    </div>
                    <div className="text-xs text-muted-foreground">แก้ไขล่าสุด: {updatedAt ? format(updatedAt, "dd/MM/yyyy HH:mm", { locale: th }) : "-"}</div>
                    <div className="flex items-center gap-2 mt-3">
                      <Button variant="outline" size="sm" className="flex-1" onClick={() => navigate(`/po/${r.id}`)}>
                        เปิด/แก้ไข
                      </Button>
                      <Button size="sm" className="flex-1" onClick={() => navigate(`/po/${r.id}?download=1`)}>
                        โหลด PDF
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="hidden sm:block bg-white border rounded-md overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr className="text-left">
                    <th className="p-3 font-medium whitespace-nowrap">ชื่อลูกค้า</th>
                    <th className="p-3 font-medium whitespace-nowrap">วันที่สั่งซื้อ</th>
                    <th className="p-3 font-medium whitespace-nowrap">แก้ไขล่าสุด</th>
                    <th className="p-3 font-medium whitespace-nowrap">การทำงาน</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((r) => {
                    const orderDate = r.order_date ? safeParseDate(r.order_date) : null;
                    const updatedAt = r.updated_at ? safeParseDate(r.updated_at) : null;

                    return (
                      <tr key={r.id} className="border-t">
                        <td className="p-3 min-w-[260px]">{r.customer_name || "-"}</td>
                        <td className="p-3 whitespace-nowrap">{orderDate ? format(orderDate, "dd/MM/yyyy", { locale: th }) : "-"}</td>
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
          </>
        )}
      </div>
    </div>
  );
};

export default PoList;
