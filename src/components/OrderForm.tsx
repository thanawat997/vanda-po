import { useState, useRef } from "react";
import { Download, Plus, CalendarIcon, Check, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { cn } from "@/lib/utils";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import logo from "@/assets/logo.png";

// SVG component for rotated text that works with html2canvas
interface RotatedTextSVGProps {
  lines: string[];
  height?: number;
  width?: number;
  fontSize?: number;
}

const RotatedTextSVG = ({ lines, height = 90, width = 40, fontSize = 7 }: RotatedTextSVGProps) => {
  const lineHeight = fontSize + 2;
  const totalTextHeight = lines.length * lineHeight;
  const startY = (height + totalTextHeight) / 2 - lineHeight / 2;
  
  return (
    <svg 
      width={width} 
      height={height} 
      viewBox={`0 0 ${width} ${height}`}
      style={{ display: 'block' }}
    >
      <g transform={`rotate(-90, ${width / 2}, ${height / 2})`}>
        {lines.map((line, index) => (
          <text
            key={index}
            x={width / 2}
            y={startY - (lines.length - 1 - index) * lineHeight}
            textAnchor="middle"
            fontSize={fontSize}
            fontFamily="'Angsana New', 'TH Sarabun New', serif"
            fill="black"
          >
            {line}
          </text>
        ))}
      </g>
    </svg>
  );
};

// Format number with commas (no decimals) - returns raw number for storage
const formatQuantityDisplay = (value: string): string => {
  const num = value.replace(/[^0-9]/g, '');
  if (!num) return '';
  return parseInt(num, 10).toLocaleString('en-US');
};

// Parse quantity back to raw number for PDF
const getQuantityForPdf = (value: string): string => {
  const num = value.replace(/[^0-9]/g, '');
  if (!num) return '';
  // Use regex to add commas manually instead of toLocaleString
  return num.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};

// Format number with commas and 2 decimal places
const formatPrice = (value: string): string => {
  const cleanValue = value.replace(/[^0-9.]/g, '');
  if (!cleanValue) return '';
  const parts = cleanValue.split('.');
  const intPart = parts[0] ? parseInt(parts[0], 10).toLocaleString('en-US') : '0';
  const decPart = parts[1] !== undefined ? parts[1].slice(0, 2).padEnd(2, '0') : '00';
  return `${intPart}.${decPart}`;
};

// Size options for dropdown
const sizeOptions = [
  "1oz. (BK)", "1.5oz. (BK)", "2oz. D.62 ทรงสูง (BK)", "2oz. D.62 ทรงเตี้ย (BK)", 
  "3oz. D.75 (BK)", "3oz. D.78 (BK)", "4.7oz. D.78 (BK)", "8oz. D.78 (BK)", 
  "10oz. D.90 (BK)", "10oz. D.95 (BK)", "12oz. D.95 (BK)", "450 ml.", "K500 ml.", 
  "V500 ml.", "F500 ml.", "K1000 ml.", "V1000 ml.", "F1000 ml.", "Tub K & Inner", 
  "Bowl (ใส)", "Bowl (ดำ)", "Bowl (ใส) & Inner", "Bowl (ดำ) & Inner", "F750 ml.", 
  "V750 ml.", "F75 OZ.", "F78 OZ.", "F78 OZ. (ไม่เจาะ)", "D78 OZ.", "D78 OZ. (ไม่เจาะ)", 
  "F85 OZ.", "D85 OZ.", "F90 OZ.", "F90 OZ. (ไม่เจาะ)", "D90 OZ.", "D90 OZ. (ไม่เจาะ)", 
  "F92 OZ.", "D92 OZ.", "F95 OZ.", "F95 OZ. (ไม่เจาะ)", "D95 OZ.", "D95 OZ. (ไม่เจาะ)", 
  "F98 OZ.", "D98 OZ.", "H98 OZ.", "CS98 OZ.", "ยกดื่ม 98", "เปิดปิด 98", "D95 ปิด PP", 
  "H95 ปิด PP", "D98 BIO-PET", "2.5oz. D.57", "7oz. D.78", "9oz. D.78", "12oz. D.85", 
  "12oz. D.90", "12oz. D.92", "14oz. D.92", "16oz. D.95", "16oz. D.98", "16oz. D.98 หนา", 
  "18oz. D.95", "20oz. D.98", "22oz. D.95", "22oz. D.98 BCR", "22oz. D.98 ทรงริ้ว", 
  "12oz. D.98 Pet-CS", "16oz. D.98 Pet-CS", "18oz. D.98 Pet-CS", "20oz. D.98 Pet-CS", 
  "22oz. D.98 Pet-CS", "500g.", "12oz. D.95 PP", "16oz. D.95 PP", "20oz. D.95 PP", 
  "22oz. D.95 PP", "16oz. D.98 BIO-PET", "Dish 7\"", "Dish 8\"", "Dish 9\"", "79 OZ.", 
  "12oz. D.95 PP-CS", "16oz. D.95 PP-CS", "18oz. D.95 PP-CS", "20oz. D.95 PP-CS", 
  "22oz. D.95 PP-CS", "ยกดื่ม 92 BIO-PET", "ยกดื่ม 98 BIO-PET", "SIP 98 OZ.", 
  "ยกดื่ม 92 OZ.", "13 OZ. D.118", "0.5 OZ.", "220 CC.", "14oz. D.98", "ชามดำ750 ml.", 
  "ชามแดง750 ml.", "ชามดำ750 & Inner", "ชามแดง750 & Inner"
];

// Product type options for dropdown
const productTypeOptions = ["SD", "LID", "Tub", "Bowl"];

// Product list for dropdown
const productOptions = [
  { name: "ถ้วยเบเกอรี่ PET 2 ออนซ์ ปาก 62 พร้อมฝา ทรงสูง (Pack 2,000 set)", code: "S1103026A005" },
  { name: "ถ้วยเบเกอรี่ PET 2 ออนซ์ ปาก 62 พร้อมฝา ทรงเตี้ย (Pack 2,000 set)", code: "S1103026A006" },
  { name: "ถ้วยเบเกอรี่ PET 3 ออนซ์ ปาก 75 พร้อมฝา (Pack 2,000 set)", code: "S1103037A000" },
  { name: "Lid Tub&Tub V 1000 ml.PP.Microwave(Pack Tube)(N)(Barcode)(Pack 250 set)", code: "S1104100M010" },
  { name: "Lid Tub&Tub F 1000 ml. PP.Microwave(Pack Tube)(N)(Barcode)(Pack Tube)", code: "S1104100M012" },
  { name: "Lid Tub&Tub K 1000 ml.PP.Microwave (Pack Tube)(Barcode)(Pack 250 Set)(New)", code: "S1104100M013" },
  { name: "Lid Tub&Tub Inner& Tub K 1000 ml.PP.Microwave (Pack Tube)(Barcode)(Pack 250 Set)(New)", code: "S1104100M015" },
  { name: "Lid Tub & Tub V 500 ml. PET(Pack Tube)(Bar Code)Pack 250 Set", code: "S1104500A001" },
  { name: "Lid Tub&Tub F 500 ml.PP.Microwave (Pack Tube)(Barcode)(Pack 250 Set)(New)", code: "S1104500M007" },
  { name: "Lid Tub&Tub V 500 ml.PP.Microwave (Pack Tube)(Barcode)(Pack 250 Set)(New)", code: "S1104500M009" },
  { name: "Lid Tub&Tub K 500 ml.PP.Microwave (Pack Tube)(Barcode)(Pack 250 Set)(New)", code: "S1104500M010" },
  { name: "Lid Tub & Tub V 750 ml. PP Microwave (Pack Tube)(Barcode)(Pack 250 set)", code: "S1104750M001" },
  { name: "Lid Tub & Tub F 750 ml. PP.Microwave(Pack Tube)(Barcode)(Pack 250 Set)", code: "S1104750M003" },
  { name: "BOWL 13 OZ. D.118 PP & LID (MICROWAVE) (PACK 500 SETS) (BARCODE)", code: "S1108118M001" },
  { name: "Bowl Outer D165 PET & LID (Bar Code)Pack 250 Set", code: "S1108165A004" },
  { name: "Bowl Inner & Outer D165 PET & LID (Bar Code)Pack 250 Set(New)", code: "S1108165A006" },
  { name: "Bowl Outer D165 PP & LID (microwave)(Pack Tube)(Bar Code)Pack 250 Set", code: "S1108165M004" },
  { name: "Bowl Inner & Outer D165 PP & LID (microwave)(Pack Tube)(Bar Code)(250Set)", code: "S1108165M005" },
  { name: "Bowl Inner & Outer Black D.165 PP & LID (microwave)(Pack Tube)", code: "S1108165M007" },
  { name: "Bowl Outer Black D.165 PP&LID (Microwave)(Pack Tube)(Pack 250 Set)", code: "S1108165M008" },
  { name: "Bowl 450 ml. D.125 PP & LID (microwave) (Bar Code)Pack 500 Set", code: "S1108450M002" },
  { name: "Bowl 450 ml. D.125 PP & LID (microwave) (Nologo)Pack 500 Set", code: "S1108450M003" },
  { name: "ชามกลมใส PP Microwave 450 ml. พร้อมฝา", code: "S1108450M004" },
  { name: "ชามเพชรดำ 750 ml. (NB) & Inner พร้อมฝา (Pack Tube)(Barcode)(250 set)", code: "S1108750M001" },
  { name: "ชามเพชรดำ 750 ml. (NB) พร้อมฝา (Pack Tube)(Barcode)(250 set)", code: "S1108750M003" },
  { name: "ชามเพชรแดง 750 ml. (NB) & Inner พร้อมฝา (Pack Tube)(Barcode)(250 set)", code: "S1108750M005" },
  { name: "ชามเพชรแดง 750 ml. (NB) พร้อมฝา (Pack Tube)(250 set)", code: "S1108750M006" },
  { name: "แก้ว All Select 16OZ.", code: "S1202169A004" },
  { name: 'SD 22 oz. D.98 "Coffee A Day"(BCR) PET+LID Dome 98 (H25)(PET)(Nologo)(Pack Tube)(Pack 500 set)', code: "S1202229A013" },
  { name: "แก้ว All Select 22OZ.", code: "S1202229A022" },
  { name: "SD 2.5 OZ. D.57 PP (PACK TUBE)", code: "F1102025P001" },
  { name: 'SD 7 OZ. "PET" แก้ว (PET) 7 ออนซ์ (แปะป้ายภาษาไทย)(Pack Tube)(Barcode)', code: "F1102070A009" },
  { name: "แก้ว PET 7 ออนซ์ ปาก 78", code: "F1102070A018" },
  { name: "SD 9 OZ. (PET) PACK TUBE", code: "F1102090A000" },
  { name: "แก้ว PET 9 ออนซ์ ปาก 78", code: "F1102090A006" },
  { name: "แก้ว PET 12 ออนซ์ ปาก 85 ทรงจรวด", code: "F1102128A005" },
  { name: "SD 12 OZ. D.90 -A (4Step)(Pack Tube)(Barcode)", code: "F1102129A005" },
  { name: "SD 12 Oz. D92 PET (14 Oz. D92) (Pack Tube)(No Logo)", code: "F1102129A009" },
  { name: "SD 12 oz.D.98 PET- CAPSULE (PACK TUBE)(BARCODE)", code: "F1102129A014" },
  { name: "SD 14 Oz. D92 PLA (Pack Tube)", code: "F1102129H002" },
  { name: "SD 12 Oz. D.92 (SD 14 Oz. D.92) BIO-PET (Pack Tube)", code: "F1102129O001" },
  { name: "แก้ว PP 12 ออนซ์ ปาก95 (New)", code: "F1102129P004" },
  { name: "แก้ว PP 12 ออนซ์ ปาก95 ทรงแคปซูล(AFT)(Pack Tube)(ถุงพิมพ์)", code: "F1102129P011" },
  { name: "แก้ว PET 14 ออนซ์ ปาก 92 (Barcode)", code: "F1102149A006" },
  { name: 'SD 16 Oz. (Emboss recycle mark Japanese & S. Korean language) D.98 PET-A (Pack Tube)', code: "F1102169A029" },
  { name: "แก้ว PET 16 ออนซ์ ปาก98 ทรงแกปเลอร์", code: "F1102169A069" },
  { name: "แก้ว PET 16 ออนซ์ ปาก 98 ทรงแคปซูล", code: "F1102169A070" },
  { name: "แก้ว PET 16 ออนซ์ ปาก 95", code: "F1102169A071" },
  { name: 'SD 16 OZ. D.98 PET-A (Pack Tube)-(TEA)', code: "F1102169A074" },
  { name: "แก้ว PET 16 ออนซ์ ปาก98 ทรงแกปเลอร์ (Pack Tube)(Emboss BIO-ECO)", code: "F1102169A083" },
  { name: 'SD 16 OZ. "PLA" D.98 (Pack Tube)', code: "F1102169H002" },
  { name: "SD 16 Oz. D98 PLA-Cpasule (Pack Tube)", code: "F1102169H014" },
  { name: 'SD 16 OZ. "PLA" D.98 (Pack Tube)(Nologo)', code: "F1102169H022" },
  { name: 'SD 16 OZ. "PLA" D.98 (Pack Tube)(Emboss BIO-ECO)', code: "F1102169H034" },
  { name: "SD 16 Oz. D98 Bio PET (Pack Tube)(Barcode)", code: "F1102169O004" },
  { name: "แก้ว PP 16 ออนซ์ ปาก95", code: "F1102169P010" },
  { name: "แก้ว PP 16 ออนซ์ ปาก95 (New)(AFT)(Pack Tube)(ถุงพิมพ์)", code: "F1102169P015" },
  { name: "แก้ว PP 16 ออนซ์ ปาก 95 ทรงแคปซูล (AFT)(Pack Tube)(ถุงพิมพ์)", code: "F1102169P017" },
  { name: "SD 18 Oz. D98 PET-Capsule (Pack Tube)(No Logo)", code: "F1102189A012" },
  { name: "แก้ว PET 18 ออนซ์ ปาก95", code: "F1102189A016" },
  { name: "แก้ว PET 18 ออนซ์ ปาก 98 ทรงแคปซูล", code: "F1102189A017" },
  { name: "SD 18 Oz. D98 Bio PET-Capsule (Pack Tube)(Barcode)", code: "F1102189O000" },
  { name: "SD 18 Oz. D98 Bio PET-Capsule (Pack Tube)(No Logo)", code: "F1102189O002" },
  { name: "แก้ว PP 18 ออนซ์ ปาก95 ทรงแคปซูล", code: "F1102189P002" },
  { name: "แก้ว PP 18 ออนซ์ ปาก95 ทรงแคปซูล(AFT)(Pack Tube)(ถุงพิมพ์)", code: "F1102189P004" },
  { name: "แก้ว PET 20 ออนซ์ ปาก 98 ทรงแคปซูล", code: "F1102209A013" },
  { name: "แก้ว PET 20 ออนซ์ ปาก 98 (Barcode)", code: "F1102209A016" },
  { name: "SD 20 Oz. D98 PLA (Pack Tube)", code: "F1102209H003" },
  { name: "แก้ว PP 20 ออนซ์ ปาก95 ทรงแคปซูล", code: "F1102209P003" },
  { name: "แก้ว PP 20 ออนซ์ ปาก95 (New)", code: "F1102209P008" },
  { name: "แก้ว PP 20 ออนซ์ ปาก95 ทรงแคปซูล(AFT)(Pack Tube)(ถุงพิมพ์)", code: "F1102209P011" },
  { name: "แก้ว PP 20 ออนซ์ ปาก95 (New)(AFT)(Pack Tube)(ถุงพิมพ์)", code: "F1102209P013" },
  { name: "SD 22 Oz. D98 Pet (BCR) (Pack Tube)(Barcode)", code: "F1102229A014" },
  { name: "SD 22 oz. D98 PET-Capsule (Pack Tube)(Barcode)", code: "F1102229A027" },
  { name: "แก้ว PET 22 ออนซ์ ปาก 98 ทรงBCR", code: "F1102229A040" },
  { name: "SD 22 Oz. D98 Pet (BCR) (Pack Tube)-(TEA)", code: "F1102229A049" },
  { name: "SD 22 oz. D.98 BCR (BIO PET)(Pack Tube)", code: "F1102229O010" },
  { name: "SD 22 oz. D.98 BCR (BIO PET)(Pack Tube)-(CPPC)", code: "F1102229O013" },
  { name: "แก้ว PP 22 ออนซ์ ปาก95 (New)", code: "F1102229P009" },
  { name: "แก้ว PP 22 ออนซ์ ปาก95 ทรงแคปซูล", code: "F1102229P013" },
  { name: "แก้ว PP 22 ออนซ์ ปาก95 ทรงแคปซูล(AFT)(Pack Tube)(ถุงพิมพ์)", code: "F1102229P018" },
  { name: "ถ้วยเบเกอรี่ PET 1 ออนซ์ ฝาติด (Pack 2,000 pcs.)", code: "F1103010A003" },
  { name: "Cup 1.5 oz. PET-Switch (Pack Tube)(Barcode)", code: "F1103015A001" },
  { name: "ถ้วยเบเกอร์ PET 1.5 ออนซ์ ฝาติด (Pack 2,000 pcs.)", code: "F1103015A002" },
  { name: "ถ้วยเบเกอรี่ PET 3 ออนซ์ ปาก 78(Pack Tube)(Barcode)", code: "F1103037A003" },
  { name: "Cup 3 oz. D.75 PET (Pack Tube)(Barcode)", code: "F1103037A006" },
  { name: "BK 3 OZ. D.78 PET (Pack Tube) For CP Ram", code: "F1103037A010" },
  { name: "ถ้วยเบเกอรี่ PET 4.7 ออนซ์ ปาก 78", code: "F1103047A005" },
  { name: "ถ้วยเบเกอรี่ PET 8 ออนซ์ ปาก 78", code: "F1103087A005" },
  { name: "ถ้วยเบเกอรี่ PET 10 ออนซ์ ปาก 95(แปะป้ายภาษาไทย)", code: "F1103109A010" },
  { name: "ถ้วยเบเกอรี่ PET 10 ออนซ์ ปาก 90", code: "F1103109A011" },
  { name: "ถ้วยเบเกอรี่ PET 12 ออนซ์ ปาก 95(แปะป้ายภาษาไทย)", code: "F1103129A004" },
  { name: "Fruit Tub 500 g. PET (Pack Tube)(Barcode)", code: "F1104500A007" },
  { name: "Lid Cup D.75 PET (Pack Tube)(Barcode)", code: "F1105075A001" },
  { name: "ฝาโดม PET ปาก 78 (ไม่เจาะรู)", code: "F1105078A016" },
  { name: "ฝาเรียบ PET ปาก 78 (ไม่เจาะรู)", code: "F1105078A017" },
  { name: "LID COFFEE PS D.79 (Pack Tube)", code: "F1105079W000" },
  { name: "LID COFFEE PS D.79 (Pack Tube)-(KUDSAN)", code: "F1105079W003" },
  { name: "LID SD 12 OZ. DOME D.90 (Pack Tube)(Barcode)", code: "F1105090A006" },
  { name: "LID SD 12 OZ. DOME D.90 (H-25) (Pack Tube)(Barcode)", code: "F1105090A009" },
  { name: "LID FLAT D.90 (PET) ฝาเรียบ (PET) ปาก 90 (ไม่เจาะรู)-(R) (แปะป้ายภาษาไทย)(Pack Tube)(Barcode)", code: "F1105090A013" },
  { name: "LID FLAT D.90 (PET) ฝาเรียบ (PET) ปาก 90 เจาะกากบาท X18-(R) (แปะป้ายภาษาไทย)(Pack Tube)(Barcode)", code: "F1105090A015" },
  { name: "ฝายกดื่ม (1x600)", code: "F1105090A020" },
  { name: "ฝาเรียบ PET ปาก 90 (ไม่เจาะรู)", code: "F1105090A021" },
  { name: "Lid Dome D90 PLA (H25)(Pack Tube)", code: "F1105090H000" },
  { name: "Lid Flat D92 PET (X22)-R (Pack Tube)(Barcode)", code: "F1105092A000" },
  { name: "Lid Dome D92 PET (H25)(Pack Tube)(Barcode)", code: "F1105092A003" },
  { name: "ฝาเรียบ PET ปาก 92 (เจาะรูกากบาท 22 mm.)(New)", code: "F1105092A006" },
  { name: "ฝาไม่ใช้หลอด D.92 (PET)(แบบยกดื่ม)(Pack Tube)(Barcode)", code: "F1105092A008" },
  { name: "ฝายกดื่ม (รูเล็ก)(nana) ปาก92 PET", code: "F1105092A012" },
  { name: "ฝาฮาฟ PET ปาก 92 (เจาะรู 18 mm.)#ใส่ถุงพิมพ์", code: "F1105092A020" },
  { name: "Lid Dome D92 PLA (H25)(Pack Tube)", code: "F1105092H001" },
  { name: "Lid Flat D92 PLA-R (H18)(Pack Tube)", code: "F1105092H002" },
  { name: "Lid Dome D92 PLA (H25)(Pack Tube)", code: "F1105092H003" },
  { name: "Lid Flat D92 PLA-R (H18)(Pack Tube)(Nologo)-(Bio-Eco)", code: "F1105092H008" },
  { name: "Lid Flat D.92 Bio PET (H18) (Pack Tube)", code: "F1105092O000" },
  { name: "LID DOME D.92 BIO PET (H25)(Pack Tube)", code: "F1105092O001" },
  { name: "ฝาไม่ใช้หลอด D.92 (BIO PET)(แบบยกดื่ม)(Pack Tube)(Barcode)", code: "F1105092O003" },
  { name: "ฝายกดื่ม (รูเล็ก)(nana) ปาก92 BIO PET", code: "F1105092O004" },
  { name: "LID FLAT D.95 ฝาเรียบ (PET) ปาก 95 (ไม่เจาะรู)-(R) (แปะป้ายภาษาไทย)(Pack Tube)(Barcode)", code: "F1105095A000" },
  { name: "LID FLAT D.95 ฝาเรียบ (PET) ปาก 95 เจาะกากบาท X25 -(R)(แปะป้ายภาษาไทย)(Pack Tube)(Barcode)", code: "F1105095A001" },
  { name: "Lid Half Dome (C18) D.95 (PET)-P (Pack Tube)(Barcode)", code: "F1105095A004" },
  { name: "Lid Half Dome (C18) D.95 (PET)-P (Pack Tube)(Chesters V.2)", code: "F1105095A006" },
  { name: "ฝาฮาฟ PET ปาก 95 (เจาะรู 18 mm.) ปิดแก้ว PP (Nologo)", code: "F1105095A007" },
  { name: "ฝาฮาฟวิปครีม PET ปาก95", code: "F1105095A008" },
  { name: "Lid Capsule D98 PET (Pack Tube)", code: "F1105098A004" },
  { name: "Lid Capsule D98 PET (Pack Tube)(Barcode)", code: "F1105098A005" },
  { name: "ฝาไม่ใช้หลอด D.98 PET (แบบยกดื่ม)(Pack Tube)", code: "F1105098A008" },
  { name: 'LID SD D.98 DOME (PET)(H25)(Pack Tube)(ARIGATO)', code: "F1105098A013" },
  { name: "LID Flat D.98 (PET) (X-25)-R (Pack Tube) (No Logo)", code: "F1105098A028" },
  { name: "ฝาฮาฟ PET ปาก 98 (เจาะรู 18 mm.)", code: "F1105098A043" },
  { name: "ฝายกดื่ม PET ปาก 98", code: "F1105098A044" },
  { name: "ฝาเรียบ PET ปาก 98 (เจาะรูกากบาท 25 mm.)", code: "F1105098A045" },
  { name: "Sip Lid D.98 PET (Pack Tube)(Barcode)", code: "F1105098A051" },
  { name: "ฝายกดื่ม PET ปาก 98 (Pack tube)-(TEA)", code: "F1105098A056" },
  { name: "ฝายกดื่ม PET ปาก 98 (Nologo)-(Bio-Eco)", code: "F1105098A057" },
  { name: "ฝาฮาฟ PET ปาก 98 (เจาะรู 18 mm.)-( Shiba Hokkaido Milktea)", code: "F1105098A058" },
  { name: "ฝายกดื่ม (รูเล็ก) ปาก 98 PET (ถุงพิมพ์)", code: "F1105098A060" },
  { name: "Lid Capsule D98 PET (Pack Tube) For CP Ram", code: "F1105098A082" },
  { name: "ฝาไม่ใช้หลอด D.98 PLA (แบบเปิดได้)(Pack Tube)(Barcode)", code: "F1105098H000" },
  { name: "ฝาไม่ใช้หลอด D98 PLA (แบบยกดื่ม)(Pack Tube)(Barcode)", code: "F1105098H004" },
  { name: "ฝาไม่ใช้หลอด D98 PLA (แบบยกดื่ม)(Pack Tube)(Nologo)", code: "F1105098H013" },
  { name: "ฝายกดื่ม PLA ปาก 98 (Nologo) (Bio-Eco)", code: "F1105098H015" },
  { name: "Lid Dome D.98 Bio PET (Pack Tube)(H25)(No Logo)", code: "F1105098O000" },
  { name: "Lid Dome D.98 Bio PET (Pack Tube)(H25)(Barcode)", code: "F1105098O002" },
  { name: "ฝาไม่ใช้หลอด D.98 (BIO PET)(แบบยกดื่ม)(Pack Tube)(Barcode)", code: "F1105098O004" },
  { name: "LID FLAT D.98 (BIO PET) ( X-25) (Pack Tube)", code: "F1105098O006" },
  { name: "LID SD D.98 DOME (PET) (PACK TUBE) (H25)(Barcode)", code: "F1105169A019" },
  { name: "LID SD D.98 DOME (PET) (PACK TUBE) (H25)", code: "F1105169A021" },
  { name: "ฝาไม่ใช้หลอด D.98 PET(แบบเปิดได้)(Pack Tube)", code: "F1105169A027" },
  { name: "ฝาเรียบ PET ปาก 95 (ไม่เจาะรู)", code: "F1105169A040" },
  { name: "ฝาโดม PET ปาก 98 (เจาะรู 25 mm.)", code: "F1105169A041" },
  { name: "ฝาโดม PET ปาก 95 (เจาะรู 25 mm.)", code: "F1105169A042" },
  { name: "ฝาเปิดปิด PET ปาก 98", code: "F1105169A043" },
  { name: "ฝาโดม PET ปาก 95 (ไม่เจาะรู)", code: "F1105169A044" },
  { name: "LID DOME D98 PET (X-25)(Pack Tube)", code: "F1105169A045" },
  { name: "ฝาโดม PET ปาก 95 (เจาะรู 25 mm.) (ปิดแก้วPP)", code: "F1105169A046" },
  { name: "Lid Flat D98 PLA-R (H18)(Pack Tube)", code: "F1105169H009" },
  { name: "Lid Flat D98 PLA-R (H18)(Pack Tube)(Nologo)(Bio-Eco)", code: "F1105169H017" },
  { name: "ฝาโดม PLA ปาก 98 (H25) (Nologo) (Bio-Eco)", code: "F1105169H018" },
  { name: 'DISH 8 "', code: "F1107080W000" },
  { name: 'DISH 9 "', code: "F1107090W000" },
  { name: "BOWL 13 OZ. D.118 PP MICROWAVE (PACK TURE)", code: "F1108118M001" },
  { name: "Bowl Outer D165 PET (Pack Tube)", code: "F1108165A006" },
  { name: "Bowl Inner D.165 PP (microwave) (Pack Tube)", code: "F1108165M010" },
  { name: "Bowl Inner D.165 PP (Oishi) (microwave) (Pack Tube)", code: "F1108165M013" },
  { name: "inner ชามเพชร 750 ml. (NB)", code: "F1108165M016" },
  { name: "Bowl 450 ml. D125 PET (Pack Tube)", code: "F1108450A002" },
  { name: "ชามเพชรแดง 750 ml.(NB)", code: "F1108750M004" },
  { name: "ชามเพชรดำ 750 ml. (NB)", code: "F1108750M005" },
  { name: 'SD 12 OZ.D.92 (14 OZ.D.92) "Dean&Deluca -STD"PET (Pack Tube)(Nologo)', code: "F1202129A019" },
  { name: 'SD 12 oz.D.98 PET- CAPSULE "TenTen" (PACK TUBE)', code: "F1202129A034" },
  { name: 'SD 12 OZ.D.92 (14 OZ.) "Bake A Wish"PET (Pack Tube)(Nologo)', code: "F1202129A044" },
  { name: 'SD 12 OZ.D.92 (14 OZ.) "KTB x dean&deluca" PET (Pack Tube)(Nologo)', code: "F1202129A048" },
  { name: 'SD 12 OZ. (14 Oz.) D.92 "qraft" PET (HW)(Pack Tube)', code: "F1202129A049" },
  { name: 'SD 12 OZ. (14 Oz.) D.92 "PEACE" PET (HW)(Pack Tube)', code: "F1202129A050" },
  { name: 'SD 12 OZ.D.92 (14 OZ.) "HARUDOT" PET (Pack Tube)(Nologo)', code: "F1202129A053" },
  { name: 'SD 12 OZ.D.92 (14 OZ.) "smouchee" PET (Pack Tube)(Nologo)', code: "F1202129A071" },
  { name: 'SD 12 OZ.D.92 (14 OZ.) "GATTA" PET (Pack Tube)(Nologo)', code: "F1202129A082" },
  { name: 'SD 12 OZ.D.92 (14 OZ.) "GRAIN" PET (Pack Tube)(Nologo)', code: "F1202129A083" },
  { name: 'SD 12 oz.D.98 PET-Capsule "กระทรวงการคั่ว" (PACK TUBE)', code: "F1202129A086" },
  { name: 'SD 12 OZ.D.92 (14 OZ.) "ตื่นเจริญ" PET (Pack Tube)(Nologo)', code: "F1202129A095" },
  { name: 'SD 12 OZ.D.92 (14 OZ.D.92) "NANA COFFEE ROASTERS "BIO-PET (Pack Tube)', code: "F1202129O011" },
  { name: 'SD 12 OZ.D.92 (14 OZ.D.92) "ลาย1แมวกวัก" BIO-PET (Pack Tube)', code: "F1202129O016" },
  { name: 'SD 12 OZ.D.92 (14 OZ.D.92) "ลาย2แมวแลบลิ้น" BIO-PET (Pack Tube)', code: "F1202129O017" },
  { name: 'SD 12 OZ.D.92 (14 OZ.D.92) "LOFTER V.2"BIO-PET (Pack Tube)', code: "F1202129O018" },
  { name: 'SD 12 oz. D.95 PP ทรงแคปซูล "Heng Pang Pua" (Pack Tube)', code: "F1202129P004" },
  { name: 'SD 16 Oz. "COFFEE TEA" D98 PET-A (Pack Tube)', code: "F1202169A205" },
  { name: 'SD 16 OZ.D.98 "Dean&Deluca-STD" PET (Pack Tube)(A)', code: "F1202169A259" },
  { name: 'SD 16 OZ. D.98 "Cafe\'@chiang Mai V.2" PET-A (Pack Tube)', code: "F1202169A275" },
  { name: 'SD 16 OZ. D.98 "กระทรวงการคั่ว" PET-A (Pack Tube)', code: "F1202169A276" },
  { name: 'SD 16 OZ.D.98 "ADDICT V.2" PET-A (Pack Tube)', code: "F1202169A317" },
  { name: 'SD 16 oz. D.98 "ARIGATO" PET -A (Pack Tube)(Barcode)(Black)', code: "F1202169A342" },
  { name: 'SD 16 oz. D98 PET-A "The Three Little Pigs Farm"(Pack Tube)', code: "F1202169A387" },
  { name: 'SD 16 OZ. D.98 "Bake A Wish" PET-A (Pack Tube)', code: "F1202169A451" },
  { name: 'SD 16 OZ. D.98 PET-A "Shiba"(Pack Tube)-(Shiba)', code: "F1202169A477" },
  { name: 'SD 16 oz.D.98 PET-A (HW)"CASA LAPIN" (Pack Tube)', code: "F1202169A479" },
  { name: 'SD 16 OZ. D.98 PET-A "coco kof" (Pack Tube)', code: "F1202169A489" },
  { name: 'SD 16 Oz. D.98 PET-Capsule "Santan Cafe V.2" (Pack 25 pcs.)', code: "F1202169A493" },
  { name: 'SD 16 OZ. D.98 PET-A "rakun cha" (Pack Tube)', code: "F1202169A494" },
  { name: 'SD 16 OZ. D.98 PET-A "GATTA" (Pack Tube)', code: "F1202169A533" },
  { name: 'SD 16 Oz. D98 PET-A "ลูกเป็ดขี้เหร่"(Pack Tube)', code: "F1202169A541" },
  { name: 'SD 16 oz. D98 PET-A "Pasta Ama" V.2 (Pack Tube)', code: "F1202169A557" },
  { name: 'SD 16 oz.D.98 PET-A (HW)"ส้มตำไทยไข่เค็ม" (Pack Tube)', code: "F1202169A559" },
  { name: 'SD 16 Oz. D98 PET-A "STITCH&HAMMER-สีน้ำเงิน"(PACK TUBE)', code: "F1202169A568" },
  { name: 'SD 16 oz.D.98 PET-A (HW)"ส้มตำไทยไข่เค็ม V.4" (Pack Tube)', code: "F1202169A589" },
  { name: 'SD 16 oz. D98 PET-A "Carousel V.2"(Pack Tube)', code: "F1202169A590" },
  { name: 'SD 16 oz.D.98 PET-A (HW)"ส้มตำไทยไข่เค็ม -โรงงานชลบุรี" (Pack Tube)', code: "F1202169A591" },
  { name: 'SD 16 oz.D.98 PET-A (HW)"ส้มตำไทยไข่เค็ม -โรงงานขอนแก่น" (Pack Tube)', code: "F1202169A592" },
  { name: 'SD 16 oz.D.98 PET-A (HW)"ส้มตำไทยไข่เค็ม -โรงงานลำพูน" (Pack Tube)', code: "F1202169A593" },
  { name: 'SD 16 oz.D.98 PET-A (HW)"ส้มตำไทยไข่เค็ม -โรงงานสุราษฏร์ธานี" (Pack Tube)', code: "F1202169A594" },
  { name: 'SD 16 Oz. D.98 PET-A "Hokkaido V.3"(Pack Tube)', code: "F1202169A600" },
  { name: 'SD 16 oz.D.98 PET-A (HW)"Coffee & Cream V.2" (Pack Tube)', code: "F1202169A601" },
  { name: 'SD 16 OZ. "Star Coffee-New Logo V.3" PLA D.98 (Pack Tube)', code: "F1202169H071" },
  { name: 'SD 16 OZ. D.98 "ME CAFE V.2" BIO PET-A (Pack Tube)', code: "F1202169O033" },
  { name: 'SD 16 Oz. D98 Bio PET-A "Happi Tiny"(Pack Tube)', code: "F1202169O041" },
  { name: 'SD 16 Oz. D98 Bio PET-A "ลาย1แมวกวัก"(Pack Tube)', code: "F1202169O049" },
  { name: 'SD 16 Oz. D98 Bio PET-A "ลาย2แมวแลบลิ้น"(Pack Tube)', code: "F1202169O050" },
  { name: 'SD 16 OZ. D.95 PP "ล้านนม V.2" (NEW)(Pack Tube)', code: "F1202169P018" },
  { name: 'SD 16 Oz. D.95 PP Capsule "momo yogurt"(Pack Tube)', code: "F1202169P024" },
  { name: 'SD 16 Oz. D.95 PP Capsule "โครตปั่น"V.2(Pack Tube)', code: "F1202169P025" },
  { name: 'SD 16 Oz. D.95 PP Capsule "cocowalk V.2"(Pack Tube)(nologo)', code: "F1202169P033" },
  { name: 'SD 16 OZ. D.95 PP "มวลชล cafe V.2" (NEW)(Pack Tube)', code: "F1202169P034" },
  { name: 'SD 18 Oz. D98 PLA Capsule "กาแฟชายทุ่ง" (Pack Tube)', code: "F1202189H000" },
  { name: 'SD 18 OZ. D.95 PP Capsule "COCO MONKEY" (Pack Tube)', code: "F1202189P002" },
  { name: 'SD 20 oz. D.98 "Adam muslim food"PET (Pack Tube)', code: "F1202209A012" },
  { name: 'SD 20 Oz. D.95 PP CAPSULE "โคตรปั่น"(Pack Tube)', code: "F1202209P002" },
  { name: 'SD 22 oz.(BCR) D.98 PET "ARIGATO" (Pack Tube)(Barcode)(Black)', code: "F1202229A063" },
  { name: 'SD 22 oz. D.98 "Dean&Deluca V.2"(BCR)(PET)(Pack tube)', code: "F1202229A099" },
  { name: 'SD 22 oz. D.98 "Dunkin"(BCR)(PET)(Pack tube)(Nologo)(Emboss BIO-ECO)', code: "F1202229A132" },
  { name: 'SD 22 oz. D.98 "ลุงเงินกาแฟหม้อดิน" (PET)(BCR)(Pack Tube)', code: "F1202229A133" },
  { name: 'SD 22 OZ. D.98 "Star Coffee-New Logo V.3" (PLA) (PACK TUBE)(Pack 960 pcs.)', code: "F1202229H026" },
  { name: 'SD 22 oz. D.98 PLA (BCR) "กาแฟชายทุ่ง" (Pack Tube)', code: "F1202229H035" },
  { name: 'SD 22 Oz. D.95 PP CAPSULE "Majime"(Pack Tube)', code: "F1202229P022" },
  { name: 'SD 22 oz. D.95 PP "BOOM BOOM TEA"(NEW) (Pack Tube)', code: "F1202229P023" },
];

interface OrderItem {
  ps: boolean;
  pp: boolean;
  pet: boolean;
  pla: boolean;
  hotFood: boolean;
  normalTemp: boolean;
  coldTemp: boolean;
  freezeTemp: boolean;
  otherUsage: boolean;
  productType: string;
  size: string;
  details: string;
  quantity: string;
  price: string;
  deliveryDate: string;
  deliverableNote: string;
  notDeliverableNote: string;
  exportType: string;
  thai: string;
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
    date: undefined as Date | undefined,
    contactPerson: "",
  });

  const createEmptyOrderItem = (): OrderItem => ({
    ps: false,
    pp: false,
    pet: false,
    pla: false,
    hotFood: false,
    normalTemp: false,
    coldTemp: false,
    freezeTemp: false,
    otherUsage: false,
    productType: "",
    size: "",
    details: "",
    quantity: "",
    price: "",
    deliveryDate: "",
    deliverableNote: "",
    notDeliverableNote: "",
    exportType: "",
    thai: "",
    foreign: false,
    lawRef: "",
    notes: "",
  });

  const [orderItems, setOrderItems] = useState<OrderItem[]>(
    Array.from({ length: 4 }, () => createEmptyOrderItem())
  );

  const [signature, setSignature] = useState("");
  const [openDropdownIndex, setOpenDropdownIndex] = useState<number | null>(null);
  const [openSizeDropdownIndex, setOpenSizeDropdownIndex] = useState<number | null>(null);
  const [openProductTypeDropdownIndex, setOpenProductTypeDropdownIndex] = useState<number | null>(null);

  const [isPdfMode, setIsPdfMode] = useState(false);

  const handleDownloadPDF = async () => {
    if (!formRef.current) return;

    // Set PDF mode to hide checkboxes and dropdown arrows
    setIsPdfMode(true);
    
    // Wait for state to update
    await new Promise(resolve => setTimeout(resolve, 100));

    const canvas = await html2canvas(formRef.current, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff",
    });

    // Reset PDF mode
    setIsPdfMode(false);

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
    setOrderItems([...orderItems, createEmptyOrderItem()]);
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
            fontFamily: "'Angsana New', 'TH Sarabun New', serif",
            fontSize: "12pt",
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
              <h1 className="font-bold text-black" style={{ fontSize: "18pt" }}>
                ใบบันทึกการรับการสั่งซื้อ (ผลิตภัณฑ์บรรจุภัณฑ์)
              </h1>
            </div>
            <div className="text-right" style={{ fontSize: "8pt" }}>
              <div>FM-PPS-02 REV.03</div>
              <div className="flex items-center gap-1 mt-1">
                <span>No.</span>
                {isPdfMode ? (
                  <span className="text-sm border-b border-black min-w-32 inline-block text-left pb-1">{formData.orderNumber}</span>
                ) : (
                  <Input
                    value={formData.orderNumber}
                    onChange={(e) => setFormData({ ...formData, orderNumber: e.target.value })}
                    className="w-32 h-6 text-sm text-left border-b border-black border-t-0 border-l-0 border-r-0 rounded-none bg-transparent"
                  />
                )}
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
              {isPdfMode ? (
                <span className="text-sm border-b border-black min-w-32 inline-block pb-1">{formData.poNumber}</span>
              ) : (
                <Input
                  value={formData.poNumber}
                  onChange={(e) => setFormData({ ...formData, poNumber: e.target.value })}
                  className="w-32 h-6 text-sm border-b border-black border-t-0 border-l-0 border-r-0 rounded-none bg-transparent"
                />
              )}
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
              {isPdfMode ? (
                <span className="text-sm border-b border-black min-w-40 inline-block pb-1">{formData.otherText}</span>
              ) : (
                <Input
                  value={formData.otherText}
                  onChange={(e) => setFormData({ ...formData, otherText: e.target.value })}
                  className="w-40 h-6 text-sm border-b border-black border-t-0 border-l-0 border-r-0 rounded-none bg-transparent"
                />
              )}
            </label>
          </div>

          {/* Customer Info */}
          <div className="flex items-center gap-4 mb-3 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-sm underline">ชื่อลูกค้า</span>
              {isPdfMode ? (
                <span className="text-sm border-b border-black min-w-48 inline-block pb-1">{formData.customerName}</span>
              ) : (
                <Input
                  value={formData.customerName}
                  onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                  className="w-48 h-6 text-sm border-b border-black border-t-0 border-l-0 border-r-0 rounded-none bg-transparent"
                />
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm underline">วันที่</span>
              {isPdfMode ? (
                <span className="text-sm border-b border-black px-2 py-0 min-w-32 inline-block pb-1">
                  {formData.date ? format(formData.date, "dd/MM/yyyy", { locale: th }) : ''}
                </span>
              ) : (
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    className={cn(
                      "w-36 h-6 text-sm border-b border-black border-t-0 border-l-0 border-r-0 rounded-none bg-transparent justify-start text-left font-normal px-0 hover:bg-transparent",
                      !formData.date && "text-muted-foreground"
                    )}
                  >
                    {formData.date ? (
                      format(formData.date, "dd/MM/yyyy", { locale: th })
                    ) : (
                      <span className="flex items-center gap-1">
                        <CalendarIcon className="h-3 w-3" />
                        เลือกวันที่
                      </span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-white z-50" align="start">
                  <Calendar
                    mode="single"
                    selected={formData.date}
                    onSelect={(date) => setFormData({ ...formData, date })}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm underline">บุคคลที่ติดต่อ</span>
              {isPdfMode ? (
                <span className="text-sm border-b border-black min-w-48 inline-block pb-1">{formData.contactPerson}</span>
              ) : (
                <Input
                  value={formData.contactPerson}
                  onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                  className="w-48 h-6 text-sm border-b border-black border-t-0 border-l-0 border-r-0 rounded-none bg-transparent"
                />
              )}
            </div>
          </div>

          {/* Main Table */}
          <div className="border border-black overflow-x-auto">
            <table className="w-full text-[10px] border-collapse">
              <thead>
                {/* Row 1: Main headers */}
                <tr>
                  <th className="border border-black p-1 text-center align-middle font-normal" colSpan={4}>
                    ชนิดวัตถุดิบ
                  </th>
                  <th className="border border-black p-1 text-center align-middle font-normal" colSpan={5}>
                    คุณลักษณะการใช้งาน
                  </th>
                  <th className="border border-black p-1 text-center align-middle font-normal w-12 min-w-12 max-w-12" rowSpan={3}>ชนิดสินค้า</th>
                  <th className="border border-black p-1 text-center align-middle font-normal w-12 min-w-12 max-w-12" rowSpan={3}>ขนาด</th>
                  <th className="border border-black p-1 text-center align-middle font-normal w-60 min-w-60 max-w-60" rowSpan={3}>รายละเอียด</th>
                  <th className="border border-black p-1 text-center align-middle font-normal" rowSpan={3}>
                    <div>จำนวน</div>
                    <div>การสั่งซื้อ</div>
                    <div>(ใบ/ชุด)</div>
                  </th>
                  <th className="border border-black p-1 text-center align-middle font-normal" rowSpan={3}>
                    <div>ราคา@</div>
                    <div>(บาท)</div>
                  </th>
                  <th className="border border-black p-1 text-center align-middle font-normal" rowSpan={3}>
                    <div>วัน</div>
                    <div>กำหนด</div>
                    <div>ส่ง</div>
                  </th>
                  <th className="border border-black p-1 text-center align-middle font-normal" rowSpan={3}>
                    <div>ส่งได้</div>
                    <div>ตาม</div>
                    <div>กำหนด</div>
                  </th>
                  <th className="border border-black p-1 text-center align-middle font-normal" rowSpan={3}>
                    <div>ส่งไม่ได้</div>
                    <div>ตาม</div>
                    <div>กำหนด</div>
                  </th>
                  <th className="border border-black p-1 text-center align-middle font-normal" rowSpan={3}>
                    <div>ประเทศ</div>
                    <div>ที่</div>
                    <div>ส่งออก</div>
                  </th>
                  <th className="border border-black p-1 text-center align-middle font-normal" colSpan={2}>
                    <div>กฎหมาย</div>
                    <div>อ้างอิง</div>
                  </th>
                  <th className="border border-black p-1 text-center align-middle font-normal" rowSpan={3}>หมายเหตุ</th>
                </tr>
                {/* Row 2: Material types and usage categories */}
                <tr>
                  <th className="border border-black p-1 text-center font-normal w-8 min-w-8 max-w-8">PS</th>
                  <th className="border border-black p-1 text-center font-normal w-8 min-w-8 max-w-8">PP</th>
                  <th className="border border-black p-1 text-center font-normal w-8 min-w-8 max-w-8">PET</th>
                  <th className="border border-black p-1 text-center font-normal w-8 min-w-8 max-w-8">PLA</th>
                  <th className="border border-black p-1 text-center font-normal w-8 min-w-8 max-w-8" rowSpan={2}>
                    <div className="h-24 flex items-center justify-center">
                      <RotatedTextSVG lines={["ใส่ของร้อน", "(ที่อุณหภูมิ", "45 - 70 C°)"]} height={90} width={32} />
                    </div>
                  </th>
                  <th className="border border-black p-1 text-center font-normal w-8 min-w-8 max-w-8" rowSpan={2}>
                    <div className="h-24 flex items-center justify-center">
                      <RotatedTextSVG lines={["ที่อุณหภูมิปกติ", "(ที่อุณหภูมิ", "25 C°)"]} height={90} width={32} />
                    </div>
                  </th>
                  <th className="border border-black p-1 text-center font-normal w-8 min-w-8 max-w-8" rowSpan={2}>
                    <div className="h-24 flex items-center justify-center">
                      <RotatedTextSVG lines={["ที่อุณหภูมิแช่เย็น", "(ที่อุณหภูมิ", "0 - 10 C°)"]} height={90} width={32} />
                    </div>
                  </th>
                  <th className="border border-black p-1 text-center font-normal w-8 min-w-8 max-w-8" rowSpan={2}>
                    <div className="h-24 flex items-center justify-center">
                      <RotatedTextSVG lines={["ที่อุณหภูมิแช่แข็ง", "(ที่อุณหภูมิ", "-1 ถึง -80 C°)"]} height={90} width={32} />
                    </div>
                  </th>
                  <th className="border border-black p-1 text-center font-normal w-8 min-w-8 max-w-8" rowSpan={2}>
                    <div className="h-24 flex items-center justify-center">
                      <RotatedTextSVG lines={["อื่นๆ"]} height={90} width={30} />
                    </div>
                  </th>
                  <th className="border border-black p-1 text-center font-normal w-8 min-w-8 max-w-8" rowSpan={2}>
                    <div className="h-16 flex items-center justify-center">
                      <RotatedTextSVG lines={["ไทย"]} height={60} width={30} />
                    </div>
                  </th>
                  <th className="border border-black p-1 text-center font-normal w-8 min-w-8 max-w-8" rowSpan={2}>
                    <div className="h-16 flex items-center justify-center">
                      <RotatedTextSVG lines={["ต่างประเทศ", "(ระบุ)"]} height={60} width={30} />
                    </div>
                  </th>
                </tr>
                {/* Row 3: Temperature descriptions (rotated with line breaks) */}
                <tr>
                  <th className="border border-black p-1 text-center font-normal h-24 w-8 min-w-8 max-w-8">
                    <div className="h-24 flex items-center justify-center">
                      <RotatedTextSVG lines={["(อุณหภูมิสูงสุดที่", "-20 C° ถึง 80 C°)"]} height={90} width={32} />
                    </div>
                  </th>
                  <th className="border border-black p-1 text-center font-normal h-24 w-8 min-w-8 max-w-8">
                    <div className="h-24 flex items-center justify-center">
                      <RotatedTextSVG lines={["(อุณหภูมิสูงสุดที่", "-10 C° ถึง", "100 C°/120 C°(M))"]} height={90} width={32} />
                    </div>
                  </th>
                  <th className="border border-black p-1 text-center font-normal h-24 w-8 min-w-8 max-w-8">
                    <div className="h-24 flex items-center justify-center">
                      <RotatedTextSVG lines={["(อุณหภูมิสูงสุดที่", "-10 C° ถึง 70 C°)"]} height={90} width={32} />
                    </div>
                  </th>
                  <th className="border border-black p-1 text-center font-normal h-24 w-8 min-w-8 max-w-8">
                    <div className="h-24 flex items-center justify-center">
                      <RotatedTextSVG lines={["(อุณหภูมิสูงสุดที่", "0 C° ถึง 50 C°)"]} height={90} width={32} />
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {orderItems.map((item, index) => (
                  <tr key={index} className="h-10" style={{ height: "40px" }}>
                    <td className="border border-black p-1 h-10 w-8 min-w-8 max-w-8 text-center align-middle">
                      {isPdfMode ? (
                        item.ps ? <span className="text-xs">✓</span> : null
                      ) : (
                        <input
                          type="checkbox"
                          checked={item.ps}
                          onChange={(e) => updateOrderItem(index, "ps", e.target.checked)}
                          className="w-3 h-3"
                        />
                      )}
                    </td>
                    <td className="border border-black p-1 h-10 w-8 min-w-8 max-w-8 text-center align-middle">
                      {isPdfMode ? (
                        item.pp ? <span className="text-xs">✓</span> : null
                      ) : (
                        <input
                          type="checkbox"
                          checked={item.pp}
                          onChange={(e) => updateOrderItem(index, "pp", e.target.checked)}
                          className="w-3 h-3"
                        />
                      )}
                    </td>
                    <td className="border border-black p-1 h-10 w-8 min-w-8 max-w-8 text-center align-middle">
                      {isPdfMode ? (
                        item.pet ? <span className="text-xs">✓</span> : null
                      ) : (
                        <input
                          type="checkbox"
                          checked={item.pet}
                          onChange={(e) => updateOrderItem(index, "pet", e.target.checked)}
                          className="w-3 h-3"
                        />
                      )}
                    </td>
                    <td className="border border-black p-1 h-10 w-8 min-w-8 max-w-8 text-center align-middle">
                      {isPdfMode ? (
                        item.pla ? <span className="text-xs">✓</span> : null
                      ) : (
                        <input
                          type="checkbox"
                          checked={item.pla}
                          onChange={(e) => updateOrderItem(index, "pla", e.target.checked)}
                          className="w-3 h-3"
                        />
                      )}
                    </td>
                    <td className="border border-black p-1 h-10 w-8 min-w-8 max-w-8 text-center align-middle">
                      {isPdfMode ? (
                        item.hotFood ? <span className="text-xs">✓</span> : null
                      ) : (
                        <input
                          type="checkbox"
                          checked={item.hotFood}
                          onChange={(e) => updateOrderItem(index, "hotFood", e.target.checked)}
                          className="w-3 h-3"
                        />
                      )}
                    </td>
                    <td className="border border-black p-1 h-10 w-8 min-w-8 max-w-8 text-center align-middle">
                      {isPdfMode ? (
                        item.normalTemp ? <span className="text-xs">✓</span> : null
                      ) : (
                        <input
                          type="checkbox"
                          checked={item.normalTemp}
                          onChange={(e) => updateOrderItem(index, "normalTemp", e.target.checked)}
                          className="w-3 h-3"
                        />
                      )}
                    </td>
                    <td className="border border-black p-1 h-10 w-8 min-w-8 max-w-8 text-center align-middle">
                      {isPdfMode ? (
                        item.coldTemp ? <span className="text-xs">✓</span> : null
                      ) : (
                        <input
                          type="checkbox"
                          checked={item.coldTemp}
                          onChange={(e) => updateOrderItem(index, "coldTemp", e.target.checked)}
                          className="w-3 h-3"
                        />
                      )}
                    </td>
                    <td className="border border-black p-1 h-10 w-8 min-w-8 max-w-8 text-center align-middle">
                      {isPdfMode ? (
                        item.freezeTemp ? <span className="text-xs">✓</span> : null
                      ) : (
                        <input
                          type="checkbox"
                          checked={item.freezeTemp}
                          onChange={(e) => updateOrderItem(index, "freezeTemp", e.target.checked)}
                          className="w-3 h-3"
                        />
                      )}
                    </td>
                    <td className="border border-black p-1 h-10 w-8 min-w-8 max-w-8 text-center align-middle">
                      {isPdfMode ? (
                        item.otherUsage ? <span className="text-xs">✓</span> : null
                      ) : (
                        <input
                          type="checkbox"
                          checked={item.otherUsage}
                          onChange={(e) => updateOrderItem(index, "otherUsage", e.target.checked)}
                          className="w-3 h-3"
                        />
                      )}
                    </td>
                    <td className="border border-black p-1 h-10 w-12 min-w-12 max-w-12 relative group align-middle">
                      <Popover open={openProductTypeDropdownIndex === index} onOpenChange={(open) => setOpenProductTypeDropdownIndex(open ? index : null)}>
                        <PopoverTrigger asChild>
                          <div className="min-h-6 cursor-pointer text-xs break-words whitespace-normal flex items-center justify-between">
                            <span className="flex-1">{item.productType || ''}</span>
                            {!isPdfMode && (
                              <ChevronDown className="h-3 w-3 opacity-50 flex-shrink-0" />
                            )}
                          </div>
                        </PopoverTrigger>
                        <PopoverContent className="w-[120px] p-0 bg-white z-50" align="start">
                          <Command>
                            <CommandInput placeholder="ค้นหา..." className="h-9" />
                            <CommandList>
                              <CommandEmpty>ไม่พบรายการ</CommandEmpty>
                              <CommandGroup className="max-h-[200px] overflow-auto">
                                {productTypeOptions.map((type) => (
                                  <CommandItem
                                    key={type}
                                    value={type}
                                    onSelect={() => {
                                      updateOrderItem(index, "productType", type);
                                      setOpenProductTypeDropdownIndex(null);
                                    }}
                                    className="text-xs"
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-3 w-3",
                                        item.productType === type ? "opacity-100" : "opacity-0"
                                      )}
                                    />
                                    {type}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                      {item.productType && !isPdfMode && (
                        <button
                          onClick={() => updateOrderItem(index, "productType", "")}
                          className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full text-xs leading-none opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          ×
                        </button>
                      )}
                    </td>
                    <td className="border border-black p-1 h-10 w-12 min-w-12 max-w-12 relative group align-middle">
                      <Popover open={openSizeDropdownIndex === index} onOpenChange={(open) => setOpenSizeDropdownIndex(open ? index : null)}>
                        <PopoverTrigger asChild>
                          <div className="min-h-6 cursor-pointer text-xs break-words whitespace-normal flex items-center justify-between">
                            <span className="flex-1">{item.size || ''}</span>
                            {!isPdfMode && (
                              <ChevronDown className="h-3 w-3 opacity-50 flex-shrink-0" />
                            )}
                          </div>
                        </PopoverTrigger>
                        <PopoverContent className="w-[200px] p-0 bg-white z-50" align="start">
                          <Command>
                            <CommandInput placeholder="ค้นหาขนาด..." className="h-9" />
                            <CommandList>
                              <CommandEmpty>ไม่พบรายการ</CommandEmpty>
                              <CommandGroup className="max-h-[300px] overflow-auto">
                                {sizeOptions.map((size) => (
                                  <CommandItem
                                    key={size}
                                    value={size}
                                    onSelect={() => {
                                      updateOrderItem(index, "size", size);
                                      setOpenSizeDropdownIndex(null);
                                    }}
                                    className="text-xs"
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-3 w-3",
                                        item.size === size ? "opacity-100" : "opacity-0"
                                      )}
                                    />
                                    {size}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                      {item.size && !isPdfMode && (
                        <button
                          onClick={() => updateOrderItem(index, "size", "")}
                          className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full text-xs leading-none opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          ×
                        </button>
                      )}
                    </td>
                    <td className="border border-black p-1 h-10 w-60 min-w-60 max-w-60 relative group align-middle">
                      <Popover open={openDropdownIndex === index} onOpenChange={(open) => setOpenDropdownIndex(open ? index : null)}>
                        <PopoverTrigger asChild>
                          <div className="min-h-6 cursor-pointer text-xs break-words whitespace-normal flex items-center justify-between">
                            <span className="flex-1">{item.details || ''}</span>
                            {!isPdfMode && (
                              <ChevronDown className="h-3 w-3 opacity-50 flex-shrink-0" />
                            )}
                          </div>
                        </PopoverTrigger>
                        <PopoverContent className="w-[400px] p-0 bg-white z-50" align="start">
                          <Command>
                            <CommandInput placeholder="ค้นหารายละเอียด..." className="h-9" />
                            <CommandList>
                              <CommandEmpty>ไม่พบรายการ</CommandEmpty>
                              <CommandGroup className="max-h-[300px] overflow-auto">
                                {productOptions.map((product) => (
                                  <CommandItem
                                    key={product.code}
                                    value={`${product.name} ${product.code}`}
                                    onSelect={() => {
                                      updateOrderItem(index, "details", `${product.name} // ${product.code}`);
                                      setOpenDropdownIndex(null);
                                    }}
                                    className="text-xs"
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-3 w-3",
                                        item.details === `${product.name} // ${product.code}` ? "opacity-100" : "opacity-0"
                                      )}
                                    />
                                    <div className="flex flex-col">
                                      <span className="break-words">{product.name}</span>
                                      <span className="text-muted-foreground text-[10px]">{product.code}</span>
                                    </div>
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                      {item.details && !isPdfMode && (
                        <button
                          onClick={() => updateOrderItem(index, "details", "")}
                          className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full text-xs leading-none opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          ×
                        </button>
                      )}
                    </td>
                    <td className="border border-black p-1 h-10 align-middle">
                      {isPdfMode ? (
                        <span className="text-xs text-center block">{getQuantityForPdf(item.quantity)}</span>
                      ) : (
                        <Input
                          value={item.quantity}
                          onChange={(e) => {
                            const formatted = formatQuantityDisplay(e.target.value);
                            updateOrderItem(index, "quantity", formatted);
                          }}
                          className="h-6 text-xs border-0 p-0 focus-visible:ring-0 text-center bg-transparent"
                        />
                      )}
                    </td>
                    <td className="border border-black p-1 h-10 align-middle">
                      {isPdfMode ? (
                        <span className="text-xs text-center block">{item.price}</span>
                      ) : (
                        <Input
                          value={item.price}
                          onChange={(e) => {
                            const rawValue = e.target.value.replace(/[^0-9.]/g, '');
                            updateOrderItem(index, "price", rawValue);
                          }}
                          onBlur={(e) => {
                            const formatted = formatPrice(item.price);
                            updateOrderItem(index, "price", formatted);
                          }}
                          className="h-6 text-xs border-0 p-0 focus-visible:ring-0 text-center bg-transparent"
                        />
                      )}
                    </td>
                    <td className="border border-black p-1 h-10 align-middle">
                      {isPdfMode ? (
                        <span className="text-xs text-center block">{item.deliveryDate}</span>
                      ) : (
                        <Input
                          value={item.deliveryDate}
                          onChange={(e) => updateOrderItem(index, "deliveryDate", e.target.value)}
                          className="h-6 text-xs border-0 p-0 focus-visible:ring-0 text-center bg-transparent"
                        />
                      )}
                    </td>
                    <td className="border border-black p-1 h-10 align-middle">
                      {isPdfMode ? (
                        <span className="text-xs text-left block">{item.deliverableNote}</span>
                      ) : (
                        <Input
                          value={item.deliverableNote}
                          onChange={(e) => updateOrderItem(index, "deliverableNote", e.target.value)}
                          className="h-6 text-xs border-0 p-0 focus-visible:ring-0 bg-transparent text-left"
                        />
                      )}
                    </td>
                    <td className="border border-black p-1 h-10 align-middle">
                      {isPdfMode ? (
                        <span className="text-xs text-left block">{item.notDeliverableNote}</span>
                      ) : (
                        <Input
                          value={item.notDeliverableNote}
                          onChange={(e) => updateOrderItem(index, "notDeliverableNote", e.target.value)}
                          className="h-6 text-xs border-0 p-0 focus-visible:ring-0 bg-transparent text-left"
                        />
                      )}
                    </td>
                    <td className="border border-black p-1 h-10 align-middle">
                      {isPdfMode ? (
                        <span className="text-xs text-left block">{item.exportType}</span>
                      ) : (
                        <Input
                          value={item.exportType}
                          onChange={(e) => updateOrderItem(index, "exportType", e.target.value)}
                          className="h-6 text-xs border-0 p-0 focus-visible:ring-0 bg-transparent text-left"
                        />
                      )}
                    </td>
                    <td className="border border-black p-1 h-10 text-center align-middle">
                      {isPdfMode ? (
                        <span className="text-xs">{item.thai}</span>
                      ) : (
                        <Input
                          value={item.thai}
                          onChange={(e) => updateOrderItem(index, "thai", e.target.value)}
                          className="h-6 text-xs border-0 p-0 focus-visible:ring-0 text-center bg-transparent"
                        />
                      )}
                    </td>
                    <td className="border border-black p-1 h-10 align-middle">
                      {isPdfMode ? (
                        <span className="text-xs">{item.lawRef}</span>
                      ) : (
                        <Input
                          value={item.lawRef}
                          onChange={(e) => updateOrderItem(index, "lawRef", e.target.value)}
                          className="h-6 text-xs border-0 p-0 focus-visible:ring-0 bg-transparent"
                        />
                      )}
                    </td>
                    <td className="border border-black p-1 h-10 align-middle">
                      {isPdfMode ? (
                        <span className="text-xs">{item.notes}</span>
                      ) : (
                        <Input
                          value={item.notes}
                          onChange={(e) => updateOrderItem(index, "notes", e.target.value)}
                          className="h-6 text-xs border-0 p-0 focus-visible:ring-0 bg-transparent"
                        />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Signature */}
          <div className="flex justify-end mt-4">
            <div className="text-center text-sm">
              <span>ลงชื่อ ผู้รับใบสั่งซื้อ</span>
              {isPdfMode ? (
                <span className="text-sm border-b border-black min-w-48 inline-block mx-2 pb-1">{signature}</span>
              ) : (
                <Input
                  value={signature}
                  onChange={(e) => setSignature(e.target.value)}
                  className="w-48 h-6 text-sm border-b border-black border-t-0 border-l-0 border-r-0 rounded-none mx-2 inline-block bg-transparent"
                />
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-between mt-3 text-gray-600" style={{ fontSize: "8pt" }}>
            <div>&quot;Electronic Document Control But UnControlled When Printed Out เอกสารจะไม่ควบคุม เมื่อพิมพ์ออกมาแล้ว&quot;</div>
            <div>ED : 24/4/2024</div>
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
