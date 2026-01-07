import { useState, useRef } from "react";
import { Download, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import logo from "@/assets/logo.png";

interface OrderItem {
  productType: string;
  size: string;
  details: string;
  quantity: string;
  price: string;
  deliveryDate: string;
  deliveryStatus: string;
  deliverable: boolean;
  notDeliverable: boolean;
  thai: boolean;
  foreign: boolean;
  notes: string;
}

const OrderForm = () => {
  const formRef = useRef<HTMLDivElement>(null);
  const [formData, setFormData] = useState({
    orderType: { phone: false, po: false, other: false },
    poNumber: "",
    orderNumber: "",
    customerName: "",
    date: "",
    contactPerson: "",
    material: { ps: false, pp: false, pet: false, pla: false },
    tempUsage: {
      frozen120: false,
      frozen80: false,
      cold20: false,
      cold10: false,
      cold0: false,
      cold45: false,
      normal0: false,
      normal10: false,
      hot80: false,
      hot100: false,
      microwave: false,
      other: false,
    },
  });

  const [orderItems, setOrderItems] = useState<OrderItem[]>([
    {
      productType: "",
      size: "",
      details: "",
      quantity: "",
      price: "",
      deliveryDate: "",
      deliveryStatus: "",
      deliverable: false,
      notDeliverable: false,
      thai: false,
      foreign: false,
      notes: "",
    },
  ]);

  const [signature, setSignature] = useState("");

  const handleDownloadPDF = async () => {
    if (!formRef.current) return;

    const canvas = await html2canvas(formRef.current, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff",
    });

    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4",
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = canvas.width;
    const imgHeight = canvas.height;
    const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
    const imgX = (pdfWidth - imgWidth * ratio) / 2;
    const imgY = 5;

    pdf.addImage(imgData, "PNG", imgX, imgY, imgWidth * ratio, imgHeight * ratio);
    pdf.save("ใบบันทึกการรับการสั่งซื้อ.pdf");
  };

  const addOrderItem = () => {
    setOrderItems([
      ...orderItems,
      {
        productType: "",
        size: "",
        details: "",
        quantity: "",
        price: "",
        deliveryDate: "",
        deliveryStatus: "",
        deliverable: false,
        notDeliverable: false,
        thai: false,
        foreign: false,
        notes: "",
      },
    ]);
  };

  const updateOrderItem = (index: number, field: keyof OrderItem, value: string | boolean) => {
    const newItems = [...orderItems];
    newItems[index] = { ...newItems[index], [field]: value };
    setOrderItems(newItems);
  };

  const updateMaterial = (key: string, checked: boolean) => {
    setFormData({
      ...formData,
      material: { ...formData.material, [key]: checked },
    });
  };

  const updateTempUsage = (key: string, checked: boolean) => {
    setFormData({
      ...formData,
      tempUsage: { ...formData.tempUsage, [key]: checked },
    });
  };

  return (
    <div className="min-h-screen bg-muted p-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-end mb-4">
          <Button onClick={handleDownloadPDF} className="gap-2 bg-primary hover:bg-primary/90">
            <Download className="w-4 h-4" />
            ดาวน์โหลด PDF
          </Button>
        </div>

        <div ref={formRef} className="bg-background p-6 shadow-lg" style={{ fontFamily: "Sarabun, sans-serif" }}>
          {/* Header */}
          <div className="flex items-start justify-between mb-4 border-b-2 border-form-border pb-4">
            <div className="flex items-center gap-3">
              <img src={logo} alt="Logo" className="w-12 h-12 object-contain" />
              <span className="text-sm font-medium">บริษัทแวนด้าแพค จำกัด</span>
            </div>
            <div className="text-center flex-1">
              <h1 className="text-xl font-bold text-form-header">
                ใบบันทึกการรับการสั่งซื้อ (ผลิตภัณฑ์บรรจุภัณฑ์)
              </h1>
            </div>
            <div className="text-right text-sm">
              <div>FM-PPS-02 REV.03</div>
              <div className="flex items-center gap-1 mt-1">
                <span>No.</span>
                <Input
                  value={formData.orderNumber}
                  onChange={(e) => setFormData({ ...formData, orderNumber: e.target.value })}
                  className="w-32 h-7 text-sm border-b border-form-border border-t-0 border-l-0 border-r-0 rounded-none"
                />
              </div>
            </div>
          </div>

          {/* Order Type */}
          <div className="flex items-center gap-6 mb-4 flex-wrap">
            <div className="flex items-center gap-2 font-bold underline">ประเภท</div>
            <label className="flex items-center gap-2">
              <Checkbox
                checked={formData.orderType.phone}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, orderType: { ...formData.orderType, phone: Boolean(checked) } })
                }
              />
              <span className="text-sm">โทรศัพท์</span>
            </label>
            <label className="flex items-center gap-2">
              <Checkbox
                checked={formData.orderType.po}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, orderType: { ...formData.orderType, po: Boolean(checked) } })
                }
              />
              <span className="text-sm">ใบสั่งซื้อ PO. No.</span>
              <Input
                value={formData.poNumber}
                onChange={(e) => setFormData({ ...formData, poNumber: e.target.value })}
                className="w-40 h-7 text-sm border-b border-form-border border-t-0 border-l-0 border-r-0 rounded-none"
              />
            </label>
            <label className="flex items-center gap-2">
              <Checkbox
                checked={formData.orderType.other}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, orderType: { ...formData.orderType, other: Boolean(checked) } })
                }
              />
              <span className="text-sm">อื่นๆ</span>
            </label>
          </div>

          {/* Customer Info */}
          <div className="flex items-center gap-4 mb-4 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium underline">ชื่อลูกค้า</span>
              <Input
                value={formData.customerName}
                onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                className="w-52 h-7 text-sm border-b border-form-border border-t-0 border-l-0 border-r-0 rounded-none"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium underline">วันที่</span>
              <Input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-40 h-7 text-sm border-b border-form-border border-t-0 border-l-0 border-r-0 rounded-none"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium underline">บุคคลที่ติดต่อ</span>
              <Input
                value={formData.contactPerson}
                onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                className="w-52 h-7 text-sm border-b border-form-border border-t-0 border-l-0 border-r-0 rounded-none"
              />
            </div>
          </div>

          {/* Main Table */}
          <div className="border border-form-border overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-table-header">
                  <th className="border border-form-border p-1 text-left" rowSpan={2}>
                    <div className="font-medium mb-1">ชนิดวัตถุดิบ</div>
                    <div className="flex gap-2 flex-wrap">
                      <label className="flex items-center gap-1">
                        <Checkbox checked={formData.material.ps} onCheckedChange={(c) => updateMaterial("ps", Boolean(c))} className="w-3 h-3" />
                        <span>PS</span>
                      </label>
                      <label className="flex items-center gap-1">
                        <Checkbox checked={formData.material.pp} onCheckedChange={(c) => updateMaterial("pp", Boolean(c))} className="w-3 h-3" />
                        <span>PP</span>
                      </label>
                      <label className="flex items-center gap-1">
                        <Checkbox checked={formData.material.pet} onCheckedChange={(c) => updateMaterial("pet", Boolean(c))} className="w-3 h-3" />
                        <span>PET</span>
                      </label>
                      <label className="flex items-center gap-1">
                        <Checkbox checked={formData.material.pla} onCheckedChange={(c) => updateMaterial("pla", Boolean(c))} className="w-3 h-3" />
                        <span>PLA</span>
                      </label>
                    </div>
                  </th>
                  <th className="border border-form-border p-1 text-left" rowSpan={2}>
                    <div className="font-medium mb-1">คุณลักษณะการใช้งาน</div>
                    <div className="grid grid-cols-3 gap-1 text-[10px]">
                      <label className="flex items-center gap-1">
                        <Checkbox checked={formData.tempUsage.frozen120} onCheckedChange={(c) => updateTempUsage("frozen120", Boolean(c))} className="w-3 h-3" />
                        <span>(อุณหภูมิ -20°C ถึง 80°C)</span>
                      </label>
                      <label className="flex items-center gap-1">
                        <Checkbox checked={formData.tempUsage.frozen80} onCheckedChange={(c) => updateTempUsage("frozen80", Boolean(c))} className="w-3 h-3" />
                        <span>(อุณหภูมิแช่แข็ง -10°C ถึง 100°C)</span>
                      </label>
                      <label className="flex items-center gap-1">
                        <Checkbox checked={formData.tempUsage.cold20} onCheckedChange={(c) => updateTempUsage("cold20", Boolean(c))} className="w-3 h-3" />
                        <span>(อุณหภูมิแช่เย็น -10°C ถึง 70°C)</span>
                      </label>
                      <label className="flex items-center gap-1">
                        <Checkbox checked={formData.tempUsage.cold10} onCheckedChange={(c) => updateTempUsage("cold10", Boolean(c))} className="w-3 h-3" />
                        <span>(อุณหภูมิแช่เย็น 0°C ถึง 50°C)</span>
                      </label>
                      <label className="flex items-center gap-1">
                        <Checkbox checked={formData.tempUsage.cold45} onCheckedChange={(c) => updateTempUsage("cold45", Boolean(c))} className="w-3 h-3" />
                        <span>(ไมโครเวฟ 45-70°C)</span>
                      </label>
                      <label className="flex items-center gap-1">
                        <Checkbox checked={formData.tempUsage.normal0} onCheckedChange={(c) => updateTempUsage("normal0", Boolean(c))} className="w-3 h-3" />
                        <span>(อุณหภูมิปกติ 25°C)</span>
                      </label>
                      <label className="flex items-center gap-1">
                        <Checkbox checked={formData.tempUsage.normal10} onCheckedChange={(c) => updateTempUsage("normal10", Boolean(c))} className="w-3 h-3" />
                        <span>(อุณหภูมิ 0-10°C)</span>
                      </label>
                      <label className="flex items-center gap-1">
                        <Checkbox checked={formData.tempUsage.hot80} onCheckedChange={(c) => updateTempUsage("hot80", Boolean(c))} className="w-3 h-3" />
                        <span>(อุณหภูมิสูงสุด -1 ถึง 80°C)</span>
                      </label>
                      <label className="flex items-center gap-1">
                        <Checkbox checked={formData.tempUsage.other} onCheckedChange={(c) => updateTempUsage("other", Boolean(c))} className="w-3 h-3" />
                        <span>อื่นๆ</span>
                      </label>
                    </div>
                  </th>
                  <th className="border border-form-border p-1" rowSpan={2}>ชนิดสินค้า</th>
                  <th className="border border-form-border p-1" rowSpan={2}>ขนาด</th>
                  <th className="border border-form-border p-1" rowSpan={2}>รายละเอียด</th>
                  <th className="border border-form-border p-1" rowSpan={2}>
                    <div>จำนวนการสั่งซื้อ</div>
                    <div>(ใบ/ชุด)</div>
                  </th>
                  <th className="border border-form-border p-1" rowSpan={2}>
                    <div>ราคา @</div>
                    <div>(บาท)</div>
                  </th>
                  <th className="border border-form-border p-1" rowSpan={2}>
                    <div>วันกำหนด</div>
                    <div>ส่ง</div>
                  </th>
                  <th className="border border-form-border p-1" colSpan={2}>
                    <div>ส่งได้</div>
                    <div>ตามกำหนด</div>
                  </th>
                  <th className="border border-form-border p-1" colSpan={2}>
                    <div>ส่งไม่ได้</div>
                    <div>ตามกำหนด</div>
                  </th>
                  <th className="border border-form-border p-1" rowSpan={2}>
                    <div>ประเภท</div>
                    <div>ที่ส่งออก</div>
                  </th>
                  <th className="border border-form-border p-1" rowSpan={2}>
                    <div>กฎหมาย</div>
                    <div>อ้างอิง</div>
                  </th>
                  <th className="border border-form-border p-1" rowSpan={2}>หมายเหตุ</th>
                </tr>
                <tr className="bg-table-header">
                  <th className="border border-form-border p-1 text-[10px]">ระบุ</th>
                  <th className="border border-form-border p-1 text-[10px]">ไทย</th>
                  <th className="border border-form-border p-1 text-[10px]">ระบุ</th>
                  <th className="border border-form-border p-1 text-[10px]">ต่างประเทศ</th>
                </tr>
              </thead>
              <tbody>
                {orderItems.map((item, index) => (
                  <tr key={index}>
                    <td className="border border-form-border p-1" colSpan={2}></td>
                    <td className="border border-form-border p-1">
                      <Input
                        value={item.productType}
                        onChange={(e) => updateOrderItem(index, "productType", e.target.value)}
                        className="h-6 text-xs border-0 p-0 focus-visible:ring-0"
                      />
                    </td>
                    <td className="border border-form-border p-1">
                      <Input
                        value={item.size}
                        onChange={(e) => updateOrderItem(index, "size", e.target.value)}
                        className="h-6 text-xs border-0 p-0 focus-visible:ring-0"
                      />
                    </td>
                    <td className="border border-form-border p-1">
                      <Input
                        value={item.details}
                        onChange={(e) => updateOrderItem(index, "details", e.target.value)}
                        className="h-6 text-xs border-0 p-0 focus-visible:ring-0"
                      />
                    </td>
                    <td className="border border-form-border p-1">
                      <Input
                        value={item.quantity}
                        onChange={(e) => updateOrderItem(index, "quantity", e.target.value)}
                        className="h-6 text-xs border-0 p-0 focus-visible:ring-0 text-center"
                      />
                    </td>
                    <td className="border border-form-border p-1">
                      <Input
                        value={item.price}
                        onChange={(e) => updateOrderItem(index, "price", e.target.value)}
                        className="h-6 text-xs border-0 p-0 focus-visible:ring-0 text-center"
                      />
                    </td>
                    <td className="border border-form-border p-1">
                      <Input
                        value={item.deliveryDate}
                        onChange={(e) => updateOrderItem(index, "deliveryDate", e.target.value)}
                        className="h-6 text-xs border-0 p-0 focus-visible:ring-0 text-center"
                      />
                    </td>
                    <td className="border border-form-border p-1 text-center">
                      <Checkbox
                        checked={item.deliverable}
                        onCheckedChange={(c) => updateOrderItem(index, "deliverable", Boolean(c))}
                        className="w-3 h-3"
                      />
                    </td>
                    <td className="border border-form-border p-1 text-center">
                      <Checkbox
                        checked={item.thai}
                        onCheckedChange={(c) => updateOrderItem(index, "thai", Boolean(c))}
                        className="w-3 h-3"
                      />
                    </td>
                    <td className="border border-form-border p-1 text-center">
                      <Checkbox
                        checked={item.notDeliverable}
                        onCheckedChange={(c) => updateOrderItem(index, "notDeliverable", Boolean(c))}
                        className="w-3 h-3"
                      />
                    </td>
                    <td className="border border-form-border p-1 text-center">
                      <Checkbox
                        checked={item.foreign}
                        onCheckedChange={(c) => updateOrderItem(index, "foreign", Boolean(c))}
                        className="w-3 h-3"
                      />
                    </td>
                    <td className="border border-form-border p-1">
                      <Input
                        value={item.deliveryStatus}
                        onChange={(e) => updateOrderItem(index, "deliveryStatus", e.target.value)}
                        className="h-6 text-xs border-0 p-0 focus-visible:ring-0"
                      />
                    </td>
                    <td className="border border-form-border p-1"></td>
                    <td className="border border-form-border p-1">
                      <Input
                        value={item.notes}
                        onChange={(e) => updateOrderItem(index, "notes", e.target.value)}
                        className="h-6 text-xs border-0 p-0 focus-visible:ring-0"
                      />
                    </td>
                  </tr>
                ))}
                {/* Empty rows for more space */}
                {Array.from({ length: Math.max(0, 8 - orderItems.length) }).map((_, index) => (
                  <tr key={`empty-${index}`}>
                    <td className="border border-form-border p-1 h-8" colSpan={2}></td>
                    <td className="border border-form-border p-1"></td>
                    <td className="border border-form-border p-1"></td>
                    <td className="border border-form-border p-1"></td>
                    <td className="border border-form-border p-1"></td>
                    <td className="border border-form-border p-1"></td>
                    <td className="border border-form-border p-1"></td>
                    <td className="border border-form-border p-1"></td>
                    <td className="border border-form-border p-1"></td>
                    <td className="border border-form-border p-1"></td>
                    <td className="border border-form-border p-1"></td>
                    <td className="border border-form-border p-1"></td>
                    <td className="border border-form-border p-1"></td>
                    <td className="border border-form-border p-1"></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Signature */}
          <div className="flex justify-end mt-6">
            <div className="text-center">
              <span className="text-sm">ลงชื่อ</span>
              <Input
                value={signature}
                onChange={(e) => setSignature(e.target.value)}
                className="w-48 h-7 text-sm border-b border-form-border border-t-0 border-l-0 border-r-0 rounded-none mx-2 inline-block"
              />
              <span className="text-sm">ผู้รับใบสั่งซื้อ</span>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center mt-4 text-[10px] text-muted-foreground">
            &quot;Electronic Document Control But UnControlled When Printed Out เอกสารจะไม่ควบคุม เมื่อพิมพ์ออกมาแล้ว&quot;
          </div>
        </div>

        {/* Add Row Button */}
        <div className="mt-4 flex justify-center">
          <Button onClick={addOrderItem} variant="outline" className="gap-2">
            <Plus className="w-4 h-4" />
            เพิ่มแถว
          </Button>
        </div>
      </div>
    </div>
  );
};

export default OrderForm;
