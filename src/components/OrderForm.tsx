import { useState, useRef } from "react";
import { Download, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  deliverableNote: string;
  notDeliverableNote: string;
  exportType: string;
  thai: boolean;
  foreign: boolean;
  lawRef: string;
  notes: string;
}

const OrderForm = () => {
  const formRef = useRef<HTMLDivElement>(null);
  const [formData, setFormData] = useState({
    orderType: { phone: false, po: false, other: false },
    poNumber: "",
    otherText: "",
    orderNumber: "",
    customerName: "",
    date: "",
    contactPerson: "",
  });

  const [orderItems, setOrderItems] = useState<OrderItem[]>([
    {
      productType: "",
      size: "",
      details: "",
      quantity: "",
      price: "",
      deliveryDate: "",
      deliverableNote: "",
      notDeliverableNote: "",
      exportType: "",
      thai: false,
      foreign: false,
      lawRef: "",
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
        deliverableNote: "",
        notDeliverableNote: "",
        exportType: "",
        thai: false,
        foreign: false,
        lawRef: "",
        notes: "",
      },
    ]);
  };

  const updateOrderItem = (index: number, field: keyof OrderItem, value: string | boolean) => {
    const newItems = [...orderItems];
    newItems[index] = { ...newItems[index], [field]: value };
    setOrderItems(newItems);
  };

  // A4 Landscape dimensions: 297mm x 210mm
  const a4Width = 297 * 3.78; // mm to px at 96dpi
  const a4Height = 210 * 3.78;

  return (
    <div className="min-h-screen bg-muted p-4">
      <div className="max-w-[1200px] mx-auto">
        <div className="flex justify-end mb-4">
          <Button onClick={handleDownloadPDF} className="gap-2 bg-primary hover:bg-primary/90">
            <Download className="w-4 h-4" />
            ดาวน์โหลด PDF
          </Button>
        </div>

        <div 
          ref={formRef} 
          className="bg-white p-6 shadow-lg mx-auto overflow-auto" 
          style={{ 
            fontFamily: "Sarabun, sans-serif",
            width: `${a4Width}px`,
            minHeight: `${a4Height}px`,
            aspectRatio: "297 / 210"
          }}
        >
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <img src={logo} alt="Logo" className="h-8 w-auto object-contain" />
              <span className="text-sm">บริษัทแวนด้าแพค จำกัด</span>
            </div>
            <div className="text-center flex-1">
              <h1 className="text-lg font-bold text-black">
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
                  className="w-32 h-6 text-sm border-b border-black border-t-0 border-l-0 border-r-0 rounded-none bg-transparent"
                />
              </div>
            </div>
          </div>

          {/* Order Type */}
          <div className="flex items-center gap-6 mb-3 flex-wrap">
            <div className="font-bold underline text-sm">ประเภท</div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.orderType.phone}
                onChange={(e) =>
                  setFormData({ ...formData, orderType: { ...formData.orderType, phone: e.target.checked } })
                }
                className="w-4 h-4 border-2 border-black accent-black"
              />
              <span className="text-sm">โทรศัพท์</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.orderType.po}
                onChange={(e) =>
                  setFormData({ ...formData, orderType: { ...formData.orderType, po: e.target.checked } })
                }
                className="w-4 h-4 border-2 border-black accent-black"
              />
              <span className="text-sm">ใบสั่งซื้อ PO. No.</span>
              <Input
                value={formData.poNumber}
                onChange={(e) => setFormData({ ...formData, poNumber: e.target.value })}
                className="w-32 h-6 text-sm border-b border-black border-t-0 border-l-0 border-r-0 rounded-none bg-transparent"
              />
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.orderType.other}
                onChange={(e) =>
                  setFormData({ ...formData, orderType: { ...formData.orderType, other: e.target.checked } })
                }
                className="w-4 h-4 border-2 border-black accent-black"
              />
              <span className="text-sm">อื่นๆ</span>
              <Input
                value={formData.otherText}
                onChange={(e) => setFormData({ ...formData, otherText: e.target.value })}
                className="w-40 h-6 text-sm border-b border-black border-t-0 border-l-0 border-r-0 rounded-none bg-transparent"
              />
            </label>
          </div>

          {/* Customer Info */}
          <div className="flex items-center gap-4 mb-3 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-sm underline">ชื่อลูกค้า</span>
              <Input
                value={formData.customerName}
                onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                className="w-48 h-6 text-sm border-b border-black border-t-0 border-l-0 border-r-0 rounded-none bg-transparent"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm underline">วันที่</span>
              <Input
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-36 h-6 text-sm border-b border-black border-t-0 border-l-0 border-r-0 rounded-none bg-transparent"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm underline">บุคคลที่ติดต่อ</span>
              <Input
                value={formData.contactPerson}
                onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                className="w-48 h-6 text-sm border-b border-black border-t-0 border-l-0 border-r-0 rounded-none bg-transparent"
              />
            </div>
          </div>

          {/* Main Table */}
          <div className="border border-black overflow-x-auto">
            <table className="w-full text-[10px] border-collapse">
              <thead>
                <tr>
                  <th className="border border-black p-1 text-center align-middle font-normal" colSpan={4}>
                    ชนิดวัตถุดิบ
                  </th>
                  <th className="border border-black p-1 text-center align-middle font-normal" colSpan={7}>
                    คุณลักษณะการใช้งาน
                  </th>
                  <th className="border border-black p-1 text-center align-middle font-normal" rowSpan={2}>ชนิดสินค้า</th>
                  <th className="border border-black p-1 text-center align-middle font-normal" rowSpan={2}>ขนาด</th>
                  <th className="border border-black p-1 text-center align-middle font-normal" rowSpan={2}>รายละเอียด</th>
                  <th className="border border-black p-1 text-center align-middle font-normal" rowSpan={2}>
                    <div>จำนวนการสั่งซื้อ</div>
                    <div>(ใบ/ชุด)</div>
                  </th>
                  <th className="border border-black p-1 text-center align-middle font-normal" rowSpan={2}>
                    <div>ราคา@</div>
                    <div>(บาท)</div>
                  </th>
                  <th className="border border-black p-1 text-center align-middle font-normal" rowSpan={2}>
                    <div>วัน</div>
                    <div>กำหนด</div>
                    <div>ส่ง</div>
                  </th>
                  <th className="border border-black p-1 text-center align-middle font-normal" colSpan={1}>
                    <div>ส่งได้</div>
                    <div>ตามกำหนด</div>
                  </th>
                  <th className="border border-black p-1 text-center align-middle font-normal" colSpan={1}>
                    <div>ส่งไม่ได้</div>
                    <div>ตาม</div>
                    <div>กำหนด</div>
                  </th>
                  <th className="border border-black p-1 text-center align-middle font-normal" rowSpan={2}>
                    <div>ประเ</div>
                    <div>ทศ</div>
                    <div>ที่</div>
                    <div>ส่งอ</div>
                    <div>อก</div>
                  </th>
                  <th className="border border-black p-1 text-center align-middle font-normal" colSpan={2}>
                    <div>กฎหมา</div>
                    <div>ยอ้างอิง</div>
                  </th>
                  <th className="border border-black p-1 text-center align-middle font-normal" rowSpan={2}>หมายเหตุ</th>
                </tr>
                <tr>
                  <th className="border border-black p-1 text-center font-normal">PS</th>
                  <th className="border border-black p-1 text-center font-normal">PP</th>
                  <th className="border border-black p-1 text-center font-normal">PET</th>
                  <th className="border border-black p-1 text-center font-normal">PLA</th>
                  <th className="border border-black p-1 text-center font-normal text-[7px] w-12">
                    <div>(อุณหภูมิสูงสุด</div>
                    <div>-20°C ถึง 80°C)</div>
                    <div>(อุณหภูมิแช่แข็ง</div>
                    <div>-10°C ถึง100°C/120</div>
                  </th>
                  <th className="border border-black p-1 text-center font-normal text-[7px] w-12">
                    <div>(CMI)</div>
                    <div>(อุณหภูมิแช่เย็น</div>
                    <div>-10°C ถึง 70°C)</div>
                  </th>
                  <th className="border border-black p-1 text-center font-normal text-[7px] w-12">
                    <div>(อุณหภูมิแช่เย็น</div>
                    <div>0°C ถึง 50°C)</div>
                  </th>
                  <th className="border border-black p-1 text-center font-normal text-[7px] w-12">
                    <div>ไมโครเวฟ</div>
                    <div>(ที่อุณหภูมิ45-70°C)</div>
                    <div>(ที่อุณหภูมิปกติ)</div>
                  </th>
                  <th className="border border-black p-1 text-center font-normal text-[7px] w-12">
                    <div>(ที่อุณหภูมิแช่เย็น</div>
                    <div>(ที่อุณหภูมิ25°C)</div>
                  </th>
                  <th className="border border-black p-1 text-center font-normal text-[7px] w-12">
                    <div>(ที่อุณหภูมิ0-10°C)</div>
                    <div>(ที่อุณหภูมิแช่แข็ง)</div>
                  </th>
                  <th className="border border-black p-1 text-center font-normal text-[7px] w-12">
                    <div>(ที่อุณหภูมิ-1 ถึง 80°C)</div>
                    <div>อื่นๆ</div>
                  </th>
                  <th className="border border-black p-1 text-center font-normal text-[8px]"></th>
                  <th className="border border-black p-1 text-center font-normal text-[8px]"></th>
                  <th className="border border-black p-1 text-center font-normal text-[8px]">ไทย</th>
                  <th className="border border-black p-1 text-center font-normal text-[7px]">ค่าประเทศ(ระบุ)</th>
                </tr>
              </thead>
              <tbody>
                {orderItems.map((item, index) => (
                  <tr key={index}>
                    <td className="border border-black p-1 h-8 w-8"></td>
                    <td className="border border-black p-1 h-8 w-8"></td>
                    <td className="border border-black p-1 h-8 w-8"></td>
                    <td className="border border-black p-1 h-8 w-8"></td>
                    <td className="border border-black p-1 h-8"></td>
                    <td className="border border-black p-1 h-8"></td>
                    <td className="border border-black p-1 h-8"></td>
                    <td className="border border-black p-1 h-8"></td>
                    <td className="border border-black p-1 h-8"></td>
                    <td className="border border-black p-1 h-8"></td>
                    <td className="border border-black p-1 h-8"></td>
                    <td className="border border-black p-1">
                      <Input
                        value={item.productType}
                        onChange={(e) => updateOrderItem(index, "productType", e.target.value)}
                        className="h-6 text-xs border-0 p-0 focus-visible:ring-0 bg-transparent"
                      />
                    </td>
                    <td className="border border-black p-1">
                      <Input
                        value={item.size}
                        onChange={(e) => updateOrderItem(index, "size", e.target.value)}
                        className="h-6 text-xs border-0 p-0 focus-visible:ring-0 bg-transparent"
                      />
                    </td>
                    <td className="border border-black p-1">
                      <Input
                        value={item.details}
                        onChange={(e) => updateOrderItem(index, "details", e.target.value)}
                        className="h-6 text-xs border-0 p-0 focus-visible:ring-0 bg-transparent"
                      />
                    </td>
                    <td className="border border-black p-1">
                      <Input
                        value={item.quantity}
                        onChange={(e) => updateOrderItem(index, "quantity", e.target.value)}
                        className="h-6 text-xs border-0 p-0 focus-visible:ring-0 text-center bg-transparent"
                      />
                    </td>
                    <td className="border border-black p-1">
                      <Input
                        value={item.price}
                        onChange={(e) => updateOrderItem(index, "price", e.target.value)}
                        className="h-6 text-xs border-0 p-0 focus-visible:ring-0 text-center bg-transparent"
                      />
                    </td>
                    <td className="border border-black p-1">
                      <Input
                        value={item.deliveryDate}
                        onChange={(e) => updateOrderItem(index, "deliveryDate", e.target.value)}
                        className="h-6 text-xs border-0 p-0 focus-visible:ring-0 text-center bg-transparent"
                      />
                    </td>
                    <td className="border border-black p-1">
                      <Input
                        value={item.deliverableNote}
                        onChange={(e) => updateOrderItem(index, "deliverableNote", e.target.value)}
                        className="h-6 text-xs border-0 p-0 focus-visible:ring-0 bg-transparent"
                      />
                    </td>
                    <td className="border border-black p-1">
                      <Input
                        value={item.notDeliverableNote}
                        onChange={(e) => updateOrderItem(index, "notDeliverableNote", e.target.value)}
                        className="h-6 text-xs border-0 p-0 focus-visible:ring-0 bg-transparent"
                      />
                    </td>
                    <td className="border border-black p-1">
                      <Input
                        value={item.exportType}
                        onChange={(e) => updateOrderItem(index, "exportType", e.target.value)}
                        className="h-6 text-xs border-0 p-0 focus-visible:ring-0 bg-transparent"
                      />
                    </td>
                    <td className="border border-black p-1">
                      <Input
                        value={item.lawRef}
                        onChange={(e) => updateOrderItem(index, "lawRef", e.target.value)}
                        className="h-6 text-xs border-0 p-0 focus-visible:ring-0 bg-transparent"
                      />
                    </td>
                    <td className="border border-black p-1">
                      <Input
                        value={item.notes}
                        onChange={(e) => updateOrderItem(index, "notes", e.target.value)}
                        className="h-6 text-xs border-0 p-0 focus-visible:ring-0 bg-transparent"
                      />
                    </td>
                  </tr>
                ))}
                {/* Empty rows for more space */}
                {Array.from({ length: Math.max(0, 8 - orderItems.length) }).map((_, index) => (
                  <tr key={`empty-${index}`}>
                    <td className="border border-black p-1 h-8"></td>
                    <td className="border border-black p-1"></td>
                    <td className="border border-black p-1"></td>
                    <td className="border border-black p-1"></td>
                    <td className="border border-black p-1"></td>
                    <td className="border border-black p-1"></td>
                    <td className="border border-black p-1"></td>
                    <td className="border border-black p-1"></td>
                    <td className="border border-black p-1"></td>
                    <td className="border border-black p-1"></td>
                    <td className="border border-black p-1"></td>
                    <td className="border border-black p-1"></td>
                    <td className="border border-black p-1"></td>
                    <td className="border border-black p-1"></td>
                    <td className="border border-black p-1"></td>
                    <td className="border border-black p-1"></td>
                    <td className="border border-black p-1"></td>
                    <td className="border border-black p-1"></td>
                    <td className="border border-black p-1"></td>
                    <td className="border border-black p-1"></td>
                    <td className="border border-black p-1"></td>
                    <td className="border border-black p-1"></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Signature */}
          <div className="flex justify-end mt-4">
            <div className="text-center text-sm">
              <span>ลงชื่อ ผู้รับใบสั่งซื้อ</span>
              <Input
                value={signature}
                onChange={(e) => setSignature(e.target.value)}
                className="w-48 h-6 text-sm border-b border-black border-t-0 border-l-0 border-r-0 rounded-none mx-2 inline-block bg-transparent"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="text-left mt-3 text-[9px] text-gray-600">
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
