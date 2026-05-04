import { useCallback, useEffect, useRef, useState } from "react";
import { Download, Plus, CalendarIcon, Check, ChevronDown, Save, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { cn } from "@/lib/utils";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import logo from "@/assets/logo.png";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { toast } from "@/components/ui/sonner";
import { supabase, supabaseConfigError } from "@/lib/supabaseClient";

// Common styles for fonts
const fontSize11Style = { fontFamily: "'Angsana New', 'TH Sarabun New', serif", fontSize: "11pt" };
const fontSize12Style = { fontFamily: "'Angsana New', 'TH Sarabun New', serif", fontSize: "12pt" };
const fontSize9Style = { fontFamily: "'Angsana New', 'TH Sarabun New', serif", fontSize: "9pt" };
const fontSize8Style = { fontFamily: "'Angsana New', 'TH Sarabun New', serif", fontSize: "8pt" };

// SVG component for rotated text
interface RotatedTextSVGProps {
  lines: string[];
  height?: number;
  width?: number;
  fontSize?: number | string;
}

const RotatedTextSVG = ({ lines, height = 90, width = 40, fontSize = 11 }: RotatedTextSVGProps) => {
  const fontSizePx =
    typeof fontSize === "number"
      ? fontSize
      : fontSize.trim().endsWith("pt")
        ? (parseFloat(fontSize) * 4) / 3
        : parseFloat(fontSize);

  const lineHeight = fontSizePx + 2;
  const totalTextHeight = lines.length * lineHeight;
  const baseStartY = (height + totalTextHeight) / 2 - lineHeight / 2;
  const padding = Math.max(2, fontSizePx * 0.9);
  const minStartY = padding + (lines.length - 1) * lineHeight;
  const maxStartY = height - padding;
  const startY = Math.min(maxStartY, Math.max(minStartY, baseStartY));
  
  return (
    <svg 
      width={width} 
      height={height} 
      viewBox={`0 0 ${width} ${height}`}
      style={{ display: "block", overflow: "visible", color: "inherit" }}
    >
      <g transform={`rotate(-90, ${width / 2}, ${height / 2})`}>
        {lines.map((line, index) => (
          <text
            key={index}
            x={width / 2}
            y={startY - (lines.length - 1 - index) * lineHeight}
            textAnchor="middle"
            fontSize={fontSize}
            dominantBaseline="central"
            fontFamily="'Angsana New', 'TH Sarabun New', serif"
            fill="currentColor"
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

// Format number with commas and 2 decimal places
const formatPrice = (value: string): string => {
  const cleanValue = value.replace(/[^0-9.]/g, '');
  if (!cleanValue) return '';
  const parts = cleanValue.split('.');
  const intPart = parts[0] ? parseInt(parts[0], 10).toLocaleString('en-US') : '0';
  const decPart = parts[1] !== undefined ? parts[1].slice(0, 2).padEnd(2, '0') : '00';
  return `${intPart}.${decPart}`;
};

const defaultSizeOptions = [
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

const defaultProductTypeOptions = ["SD", "LID", "Tub", "Bowl"];

type ProductOption = { name: string; code: string };

const defaultProductOptions: ProductOption[] = [
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

const defaultProductDropdownOptions = defaultProductOptions.map((p) => `${p.name} // ${p.code}`);

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
  const navigate = useNavigate();
  const { id: poIdParam } = useParams();
  const [searchParams] = useSearchParams();
  const getInitialFormData = () => ({
    orderType: { phone: false, po: false, other: false },
    poNumber: "",
    otherText: "",
    orderNumber: "",
    customerName: "",
    date: undefined as Date | undefined,
    contactPerson: "",
  });
  const [formData, setFormData] = useState(getInitialFormData);

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
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [dropdownOptions, setDropdownOptions] = useState<{
    productTypeOptions: string[];
    sizeOptions: string[];
    productOptions: string[];
  }>({
    productTypeOptions: defaultProductTypeOptions,
    sizeOptions: defaultSizeOptions,
    productOptions: defaultProductDropdownOptions,
  });
  const [dropdownsError, setDropdownsError] = useState<string | null>(null);
  const [dropdownsLoading, setDropdownsLoading] = useState(false);
  const [isDropdownManagerOpen, setIsDropdownManagerOpen] = useState(false);
  const [newProductTypeValue, setNewProductTypeValue] = useState("");
  const [newSizeValue, setNewSizeValue] = useState("");
  const [newProductValue, setNewProductValue] = useState("");
  const [freeNotes, setFreeNotes] = useState<Array<{ id: string; x: number; y: number; w: number; h: number; text: string }>>([]);
  const noteDragRef = useRef<{ id: string; startX: number; startY: number; originX: number; originY: number } | null>(null);
  const noteResizeRef = useRef<{
    id: string;
    handle: "nw" | "ne" | "sw" | "se" | "e" | "s";
    startX: number;
    startY: number;
    originX: number;
    originY: number;
    originW: number;
    originH: number;
  } | null>(null);

  const [loadedPoId, setLoadedPoId] = useState<string | null>(null);
  const activePoId = poIdParam ?? loadedPoId;
  const [poLoadedOnce, setPoLoadedOnce] = useState(false);
  const autoDownloadRef = useRef(false);
  const shouldAutoDownload = searchParams.get("download") === "1";

  const apiJson = useCallback(async <T,>(url: string, init: RequestInit = {}): Promise<T> => {
    const apiBaseRaw = (import.meta.env as { VITE_API_BASE?: string }).VITE_API_BASE ?? "";
    const apiBase = apiBaseRaw.replace(/\/+$/, "");
    const fullUrl = apiBase ? `${apiBase}${url.startsWith("/") ? url : `/${url}`}` : url;

    const res = await fetch(fullUrl, {
      ...init,
      headers: { "Content-Type": "application/json", ...(init.headers ?? {}) },
    });
    const text = await res.text();
    let data: unknown = null;
    try {
      data = text ? (JSON.parse(text) as unknown) : null;
    } catch {
      data = null;
    }

    if (!res.ok) {
      const message =
        typeof data === "object" && data && "error" in data
          ? String((data as { error: unknown }).error)
          : text || "Request failed";
      throw new Error(message);
    }

    return data as T;
  }, []);

  const loadDropdowns = useCallback(async () => {
    setDropdownsLoading(true);
    setDropdownsError(null);
    try {
      const data = await apiJson<{
        productTypes: string[];
        sizes: string[];
        products: string[];
      }>("/api/dropdowns");

      setDropdownOptions({
        productTypeOptions: Array.isArray(data.productTypes) ? data.productTypes : defaultProductTypeOptions,
        sizeOptions: Array.isArray(data.sizes) ? data.sizes : defaultSizeOptions,
        productOptions: Array.isArray(data.products) ? data.products : defaultProductDropdownOptions,
      });
    } catch (err) {
      setDropdownsError(err instanceof Error ? err.message : "Failed to load dropdowns");
    } finally {
      setDropdownsLoading(false);
    }
  }, [apiJson]);

  useEffect(() => {
    void loadDropdowns();
  }, [loadDropdowns]);

  useEffect(() => {
    if (!isDropdownManagerOpen) return;
    void loadDropdowns();
  }, [isDropdownManagerOpen, loadDropdowns]);

  useEffect(() => {
    if (!poIdParam) {
      setLoadedPoId(null);
      setPoLoadedOnce(false);
      return;
    }
    if (!supabase) {
      toast.error(supabaseConfigError ?? "ยังไม่ได้ตั้งค่า VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY");
      navigate("/", { replace: true });
      return;
    }

    setPoLoadedOnce(false);
    autoDownloadRef.current = false;

    const run = async () => {
      try {
        const { data, error } = await supabase.from("pos").select("id, order_date, data").eq("id", poIdParam).single();
        if (error || !data) {
          toast.error("ไม่พบรายการ PO ที่บันทึกไว้");
          navigate("/", { replace: true });
          return;
        }

        const payload = (data as { data: unknown }).data as {
          formData?: {
            orderType?: { phone: boolean; po: boolean; other: boolean };
            poNumber?: string;
            otherText?: string;
            orderNumber?: string;
            customerName?: string;
            date?: string | null;
            contactPerson?: string;
          };
          orderItems?: OrderItem[];
          signature?: string;
          freeNotes?: Array<{ id: string; x: number; y: number; w: number; h: number; text: string }>;
        };

        const dateFromPayload = payload?.formData?.date ? new Date(payload.formData.date) : undefined;
        const dateFromColumn = (data as { order_date?: string | null }).order_date ? new Date((data as { order_date: string }).order_date) : undefined;
        const date = dateFromPayload ?? dateFromColumn;

        setFormData({
          orderType: payload?.formData?.orderType ?? getInitialFormData().orderType,
          poNumber: payload?.formData?.poNumber ?? "",
          otherText: payload?.formData?.otherText ?? "",
          orderNumber: payload?.formData?.orderNumber ?? "",
          customerName: payload?.formData?.customerName ?? "",
          date,
          contactPerson: payload?.formData?.contactPerson ?? "",
        });
        setOrderItems(Array.isArray(payload?.orderItems) ? payload.orderItems : Array.from({ length: 4 }, () => createEmptyOrderItem()));
        setSignature(typeof payload?.signature === "string" ? payload.signature : "");
        setFreeNotes(Array.isArray(payload?.freeNotes) ? payload.freeNotes : []);
        setLoadedPoId((data as { id: string }).id);
        setPoLoadedOnce(true);
      } catch (err) {
        const message =
          typeof supabaseConfigError === "string" && supabaseConfigError
            ? supabaseConfigError
            : err instanceof TypeError && /fetch/i.test(err.message)
              ? "เชื่อมต่อ Supabase ไม่ได้ (ตรวจสอบ VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY และ Redeploy)"
              : err instanceof Error
                ? err.message
                : "โหลดข้อมูลไม่สำเร็จ";
        toast.error(message);
        navigate("/", { replace: true });
      }
    };

    void run();
  }, [navigate, poIdParam]);

  const addProductType = async () => {
    const value = newProductTypeValue.trim();
    if (!value) return;
    await apiJson("/api/dropdowns", { method: "POST", body: JSON.stringify({ list: "productTypes", action: "add", value }) });
    setNewProductTypeValue("");
    await loadDropdowns();
  };

  const deleteProductType = async (value: string) => {
    await apiJson("/api/dropdowns", { method: "POST", body: JSON.stringify({ list: "productTypes", action: "delete", value }) });
    await loadDropdowns();
  };

  const addSize = async () => {
    const value = newSizeValue.trim();
    if (!value) return;
    await apiJson("/api/dropdowns", { method: "POST", body: JSON.stringify({ list: "sizes", action: "add", value }) });
    setNewSizeValue("");
    await loadDropdowns();
  };

  const deleteSize = async (value: string) => {
    await apiJson("/api/dropdowns", { method: "POST", body: JSON.stringify({ list: "sizes", action: "delete", value }) });
    await loadDropdowns();
  };

  const addProduct = async () => {
    const value = newProductValue.trim();
    if (!value) return;
    await apiJson("/api/dropdowns", { method: "POST", body: JSON.stringify({ list: "products", action: "add", value }) });
    setNewProductValue("");
    await loadDropdowns();
  };

  const deleteProduct = async (value: string) => {
    await apiJson("/api/dropdowns", { method: "POST", body: JSON.stringify({ list: "products", action: "delete", value }) });
    await loadDropdowns();
  };

  const clearAll = () => {
    setFormData(getInitialFormData());
    setOrderItems(Array.from({ length: 4 }, () => createEmptyOrderItem()));
    setSignature("");
    setFreeNotes([]);
    setOpenDropdownIndex(null);
    setOpenSizeDropdownIndex(null);
    setOpenProductTypeDropdownIndex(null);
    setIsDatePickerOpen(false);
    setIsDropdownManagerOpen(false);
  };

  const [isSavingPo, setIsSavingPo] = useState(false);

  const handleSavePO = async () => {
    if (!supabase) {
      toast.error(supabaseConfigError ?? "ยังไม่ได้ตั้งค่า VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY");
      return;
    }

    setIsSavingPo(true);
    try {
      const toDateOnly = (d: Date) => d.toISOString().slice(0, 10);
      const payload = {
        formData: {
          ...formData,
          date: formData.date ? formData.date.toISOString() : null,
        },
        orderItems,
        signature,
        freeNotes,
      };

      const row = {
        customer_name: formData.customerName || null,
        po_number: formData.poNumber || null,
        order_number: formData.orderNumber || null,
        contact_person: formData.contactPerson || null,
        order_date: formData.date ? toDateOnly(formData.date) : null,
        data: payload,
      };

      if (activePoId) {
        const { error } = await supabase.from("pos").update(row).eq("id", activePoId);
        if (error) throw error;
        toast.success("บันทึก PO แล้ว");
        return;
      }

      const { data, error } = await supabase.from("pos").insert(row).select("id").single();
      if (error || !data) throw error;
      setLoadedPoId(data.id);
      navigate(`/po/${data.id}`, { replace: true });
      toast.success("บันทึก PO แล้ว");
    } catch (err) {
      const message =
        typeof supabaseConfigError === "string" && supabaseConfigError
          ? supabaseConfigError
          : err instanceof TypeError && /fetch/i.test(err.message)
            ? "เชื่อมต่อ Supabase ไม่ได้ (ตรวจสอบ VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY และ Redeploy)"
            : err instanceof Error
              ? err.message
              : "บันทึก PO ไม่สำเร็จ";
      toast.error(message);
    } finally {
      setIsSavingPo(false);
    }
  };

  const addFreeNote = () => {
    const id = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
    const offset = freeNotes.length * 16;
    setFreeNotes((prev) => [...prev, { id, x: 24 + offset, y: 24 + offset, w: 260, h: 110, text: "" }]);
  };

  const deleteFreeNote = (id: string) => {
    setFreeNotes((prev) => prev.filter((n) => n.id !== id));
  };

  const updateFreeNoteText = (id: string, text: string) => {
    setFreeNotes((prev) => prev.map((n) => (n.id === id ? { ...n, text } : n)));
  };

  const startDragFreeNote = (id: string, e: React.PointerEvent) => {
    const note = freeNotes.find((n) => n.id === id);
    if (!note) return;
    noteDragRef.current = { id, startX: e.clientX, startY: e.clientY, originX: note.x, originY: note.y };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    e.preventDefault();
  };

  const moveDragFreeNote = (e: React.PointerEvent) => {
    const drag = noteDragRef.current;
    if (!drag) return;
    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;

    const container = formRef.current;
    const note = freeNotes.find((n) => n.id === drag.id);
    if (!container || !note) return;

    const maxX = Math.max(0, container.clientWidth - note.w);
    const maxY = Math.max(0, container.clientHeight - note.h);
    const nextX = Math.min(Math.max(0, drag.originX + dx), maxX);
    const nextY = Math.min(Math.max(0, drag.originY + dy), maxY);
    setFreeNotes((prev) => prev.map((n) => (n.id === drag.id ? { ...n, x: nextX, y: nextY } : n)));
  };

  const endDragFreeNote = () => {
    noteDragRef.current = null;
  };

  const startResizeFreeNote = (id: string, handle: "nw" | "ne" | "sw" | "se" | "e" | "s", e: React.PointerEvent) => {
    const note = freeNotes.find((n) => n.id === id);
    if (!note) return;
    noteResizeRef.current = {
      id,
      handle,
      startX: e.clientX,
      startY: e.clientY,
      originX: note.x,
      originY: note.y,
      originW: note.w,
      originH: note.h,
    };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    e.preventDefault();
  };

  const moveResizeFreeNote = (e: React.PointerEvent) => {
    const resize = noteResizeRef.current;
    if (!resize) return;
    const dx = e.clientX - resize.startX;
    const dy = e.clientY - resize.startY;

    const container = formRef.current;
    const note = freeNotes.find((n) => n.id === resize.id);
    if (!container || !note) return;

    const minW = 120;
    const minH = 60;
    const containerW = container.clientWidth;
    const containerH = container.clientHeight;

    const right = resize.originX + resize.originW;
    const bottom = resize.originY + resize.originH;

    let nextX = resize.originX;
    let nextY = resize.originY;
    let nextW = resize.originW;
    let nextH = resize.originH;

    const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max);

    if (resize.handle === "e") {
      nextW = clamp(resize.originW + dx, minW, Math.max(minW, containerW - resize.originX));
    } else if (resize.handle === "s") {
      nextH = clamp(resize.originH + dy, minH, Math.max(minH, containerH - resize.originY));
    } else
    if (resize.handle === "se") {
      nextW = clamp(resize.originW + dx, minW, Math.max(minW, containerW - resize.originX));
      nextH = clamp(resize.originH + dy, minH, Math.max(minH, containerH - resize.originY));
    } else if (resize.handle === "sw") {
      nextX = clamp(resize.originX + dx, 0, Math.max(0, right - minW));
      nextW = clamp(right - nextX, minW, Math.max(minW, containerW - nextX));
      nextH = clamp(resize.originH + dy, minH, Math.max(minH, containerH - resize.originY));
    } else if (resize.handle === "ne") {
      nextY = clamp(resize.originY + dy, 0, Math.max(0, bottom - minH));
      nextH = clamp(bottom - nextY, minH, Math.max(minH, containerH - nextY));
      nextW = clamp(resize.originW + dx, minW, Math.max(minW, containerW - resize.originX));
    } else {
      nextX = clamp(resize.originX + dx, 0, Math.max(0, right - minW));
      nextY = clamp(resize.originY + dy, 0, Math.max(0, bottom - minH));
      nextW = clamp(right - nextX, minW, Math.max(minW, containerW - nextX));
      nextH = clamp(bottom - nextY, minH, Math.max(minH, containerH - nextY));
    }

    setFreeNotes((prev) =>
      prev.map((n) => (n.id === resize.id ? { ...n, x: nextX, y: nextY, w: nextW, h: nextH } : n))
    );
  };

  const endResizeFreeNote = () => {
    noteResizeRef.current = null;
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

  const dateForPdf = formData.date;
  const customerNameForPdf = formData.customerName;

  const handleDownloadPdf = useCallback(async () => {
    const node = formRef.current;
    if (!node) return;

    try {
      setIsDownloadingPdf(true);
      setIsDropdownManagerOpen(false);
      setOpenDropdownIndex(null);
      setOpenSizeDropdownIndex(null);
      setOpenProductTypeDropdownIndex(null);
      setIsDatePickerOpen(false);

      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      if ("fonts" in document) {
        await (document as Document & { fonts: FontFaceSet }).fonts.ready;
      }

      const canvas = await html2canvas(node, {
        backgroundColor: "#ffffff",
        useCORS: true,
        scale: Math.max(2, window.devicePixelRatio || 1),
        scrollX: -window.scrollX,
        scrollY: -window.scrollY,
        onclone: (clonedDoc) => {
          const clonedNode = clonedDoc.getElementById("order-form-capture");
          if (!clonedNode) return;

          const styleEl = clonedDoc.createElement("style");
          styleEl.textContent = `
            .pdf-hide { display: none !important; }
            .pdf-no-pad-right { padding-right: 0 !important; }
          `;
          clonedDoc.head.appendChild(styleEl);

          const originalFields = node.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
            "input, textarea, select"
          );
          const clonedFields = clonedNode.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
            "input, textarea, select"
          );

          originalFields.forEach((field, index) => {
            const clonedField = clonedFields[index];
            if (!clonedField) return;

            if (field instanceof HTMLInputElement && clonedField instanceof HTMLInputElement) {
              if (field.type === "checkbox" || field.type === "radio") {
                clonedField.checked = field.checked;
              } else {
                clonedField.value = field.value;
              }
              return;
            }

            if (field instanceof HTMLTextAreaElement && clonedField instanceof HTMLTextAreaElement) {
              clonedField.value = field.value;
              return;
            }

            if (field instanceof HTMLSelectElement && clonedField instanceof HTMLSelectElement) {
              clonedField.value = field.value;
            }
          });

          const replaceWithUnderlinedText = (el: HTMLElement, text: string, shiftUpPx: number) => {
            const win = clonedDoc.defaultView;
            if (!win) return;
            const cs = win.getComputedStyle(el);

            const container = clonedDoc.createElement("span");
            container.style.display = cs.display === "block" ? "block" : "inline-block";
            container.style.width = cs.width;
            container.style.height = cs.height;
            container.style.boxSizing = "border-box";
            container.style.verticalAlign = cs.verticalAlign;
            container.style.fontFamily = cs.fontFamily;
            container.style.fontSize = cs.fontSize;
            container.style.fontWeight = cs.fontWeight;
            container.style.color = cs.color;
            container.style.textAlign = cs.textAlign;
            container.style.letterSpacing = cs.letterSpacing;
            container.style.background = "transparent";
            container.style.borderBottom = cs.borderBottom;
            container.style.borderTop = "0";
            container.style.borderLeft = "0";
            container.style.borderRight = "0";
            container.style.paddingLeft = cs.paddingLeft;
            container.style.paddingRight = cs.paddingRight;
            container.style.overflow = "visible";

            const inner = clonedDoc.createElement("span");
            inner.textContent = text;
            inner.style.display = "inline-block";
            inner.style.transform = `translateY(-${shiftUpPx}px)`;
            inner.style.whiteSpace = "pre";
            inner.style.overflow = "visible";
            container.appendChild(inner);

            el.replaceWith(container);
          };

          const dateButton = clonedNode.querySelector<HTMLButtonElement>('[data-pdf-date-trigger="true"]');
          if (dateButton) {
            const dateText = dateForPdf ? format(dateForPdf, "dd/MM/yyyy", { locale: th }) : "";
            replaceWithUnderlinedText(dateButton, dateText, -2);
          }

          const outsideTextInputs = Array.from(clonedNode.querySelectorAll<HTMLInputElement>("input")).filter(
            (el) => el.type !== "checkbox" && el.type !== "radio" && !el.closest("table")
          );
          outsideTextInputs.forEach((el) => {
            const shiftUpPx = el.getAttribute("data-pdf-skip-shift") === "true" ? 1 : -2;
            replaceWithUnderlinedText(el, el.value || "", shiftUpPx);
          });

          const shiftTableValueInputDown = (input: HTMLInputElement, shiftDownPx: number) => {
            const win = clonedDoc.defaultView;
            if (!win) return;
            const cs = win.getComputedStyle(input);

            const wrapper = clonedDoc.createElement("div");
            wrapper.style.display = "block";
            wrapper.style.width = cs.width;
            wrapper.style.height = cs.height;
            wrapper.style.boxSizing = "border-box";
            wrapper.style.fontFamily = cs.fontFamily;
            wrapper.style.fontSize = cs.fontSize;
            wrapper.style.fontWeight = cs.fontWeight;
            wrapper.style.color = cs.color;
            wrapper.style.textAlign = cs.textAlign;
            wrapper.style.background = "transparent";
            wrapper.style.border = "0";
            wrapper.style.padding = cs.padding;
            wrapper.style.overflow = "visible";

            const inner = clonedDoc.createElement("div");
            inner.textContent = input.value || "";
            inner.style.width = "100%";
            inner.style.whiteSpace = "pre";
            inner.style.transform = `translateY(${shiftDownPx}px)`;
            inner.style.textAlign = cs.textAlign;
            wrapper.appendChild(inner);

            input.replaceWith(wrapper);
          };

          const tableQtyPriceInputs = clonedNode.querySelectorAll<HTMLInputElement>(
            'table input:not([type="checkbox"]):not([type="radio"])'
          );
          tableQtyPriceInputs.forEach((input) => {
            shiftTableValueInputDown(input, 25);
          });

          const freeNoteContainers = clonedNode.querySelectorAll<HTMLElement>('[data-free-note-container="true"]');
          freeNoteContainers.forEach((container) => {
            const win = clonedDoc.defaultView;
            if (!win) return;
            const textarea = container.querySelector<HTMLTextAreaElement>('textarea[data-free-note="true"]');
            if (!textarea) {
              container.remove();
              return;
            }

            const csContainer = win.getComputedStyle(container);
            const csTextarea = win.getComputedStyle(textarea);
            const div = clonedDoc.createElement("div");
            div.style.position = "absolute";
            div.style.left = csContainer.left;
            div.style.top = csContainer.top;
            div.style.width = csContainer.width;
            div.style.height = csContainer.height;
            div.style.boxSizing = "border-box";
            div.style.fontFamily = csTextarea.fontFamily;
            div.style.fontSize = csTextarea.fontSize;
            div.style.fontWeight = csTextarea.fontWeight;
            div.style.color = csTextarea.color;
            div.style.background = "transparent";
            div.style.border = "0";
            div.style.padding = csTextarea.padding;
            div.style.whiteSpace = "pre-wrap";
            div.style.wordBreak = "break-word";
            div.style.overflow = "visible";
            div.textContent = textarea.value || "";
            container.replaceWith(div);
          });

          const orderTypePhoneEls = clonedNode.querySelectorAll<HTMLElement>('[data-pdf-shift="order-type-phone"]');
          orderTypePhoneEls.forEach((el) => {
            el.style.transform = "translateY(-6px)";
          });

          const materialHeaders = clonedNode.querySelectorAll<HTMLElement>('[data-pdf-shift="material-header-text"]');
          materialHeaders.forEach((el) => {
            el.style.transform = "translateY(-5px)";
          });

          const outsideCheckboxes = Array.from(clonedNode.querySelectorAll<HTMLInputElement>('input[type="checkbox"]')).filter(
            (el) => !el.closest("table")
          );

          outsideCheckboxes.forEach((checkbox) => {
            const box = clonedDoc.createElement("span");
            box.style.display = "inline-flex";
            box.style.width = "16px";
            box.style.height = "16px";
            box.style.border = "2px solid #000";
            box.style.alignItems = "center";
            box.style.justifyContent = "center";
            box.style.background = "#fff";
            box.style.color = "#000";
            box.style.fontSize = "12px";
            box.style.lineHeight = "1";
            box.style.transform = "translateY(8px)";
            if (checkbox.checked) {
              const tick = clonedDoc.createElement("span");
              tick.textContent = "✓";
              tick.style.display = "block";
              tick.style.transform = "translateY(-7px)";
              box.appendChild(tick);
            }
            checkbox.replaceWith(box);
          });

          const tableCheckboxes = clonedNode.querySelectorAll<HTMLInputElement>('table input[type="checkbox"]');
          tableCheckboxes.forEach((checkbox) => {
            const mark = clonedDoc.createElement("span");
            mark.textContent = checkbox.checked ? "✓" : "";
            mark.style.display = "block";
            mark.style.width = "100%";
            mark.style.textAlign = "center";
            mark.style.fontSize = "12px";
            mark.style.lineHeight = "1";
            mark.style.fontWeight = "700";
            checkbox.replaceWith(mark);
          });
        },
      });

      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4",
        compress: true,
      });

      const pageWidthMm = 297;
      const pageHeightMm = 210;
      const mmPerCanvasPx = pageWidthMm / canvas.width;
      const pageHeightPx = pageHeightMm / mmPerCanvasPx;

      let y = 0;
      let pageIndex = 0;
      while (y < canvas.height) {
        const sliceHeightPx = Math.min(pageHeightPx, canvas.height - y);
        const sliceCanvas = document.createElement("canvas");
        sliceCanvas.width = canvas.width;
        sliceCanvas.height = sliceHeightPx;
        const ctx = sliceCanvas.getContext("2d");
        if (!ctx) break;
        ctx.drawImage(canvas, 0, y, canvas.width, sliceHeightPx, 0, 0, canvas.width, sliceHeightPx);

        const imgData = sliceCanvas.toDataURL("image/png");
        if (pageIndex > 0) pdf.addPage();
        const sliceHeightMm = sliceHeightPx * mmPerCanvasPx;
        pdf.addImage(imgData, "PNG", 0, 0, pageWidthMm, sliceHeightMm);

        y += sliceHeightPx;
        pageIndex += 1;
      }

      const toSafeFileBase = (value: string) => {
        const normalized = value
          .replace(/[\\/:*?"<>|]/g, "-")
          .replace(/\s+/g, " ")
          .trim()
          .replace(/^[.\s-]+|[.\s-]+$/g, "");
        return normalized.slice(0, 80);
      };

      const customerName = toSafeFileBase(customerNameForPdf || "");
      const fileBase = customerName || "ใบบันทึกการรับการสั่งซื้อ";
      pdf.save(`${fileBase}.pdf`);
    } finally {
      setIsDownloadingPdf(false);
    }
  }, [customerNameForPdf, dateForPdf]);

  useEffect(() => {
    if (!poIdParam) return;
    if (!poLoadedOnce) return;
    if (!shouldAutoDownload) return;
    if (autoDownloadRef.current) return;
    autoDownloadRef.current = true;
    void handleDownloadPdf();
  }, [handleDownloadPdf, poIdParam, poLoadedOnce, shouldAutoDownload]);

  return (
    <div className="min-h-screen bg-muted p-2 sm:p-4">
      <div className="max-w-[1200px] mx-auto">
        <div className="sticky top-0 z-10 flex flex-wrap items-center justify-end gap-2 py-2 mb-2 bg-muted/80 backdrop-blur supports-[backdrop-filter]:bg-muted/60">
          <Dialog open={isDropdownManagerOpen} onOpenChange={setIsDropdownManagerOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="sm:h-10">
                จัดการ Dropdown
              </Button>
            </DialogTrigger>
            <DialogContent className="w-[calc(100vw-1rem)] max-w-none max-h-[90vh] overflow-y-auto sm:w-full sm:max-w-3xl sm:max-h-[85vh]">
              <DialogHeader>
                <DialogTitle>จัดการข้อมูล Dropdown (Google Sheet)</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex justify-end">
                  <Button variant="secondary" size="sm" className="sm:h-10" onClick={() => void loadDropdowns()} disabled={dropdownsLoading}>
                    รีเฟรช
                  </Button>
                </div>
                {dropdownsError && (
                  <div className="text-sm text-destructive">
                    {dropdownsError}
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="font-medium">ชนิดสินค้า</div>
                    <div className="flex items-center gap-2">
                      <Input
                        value={newProductTypeValue}
                        onChange={(e) => setNewProductTypeValue(e.target.value)}
                        placeholder="เพิ่มชนิดสินค้า..."
                        className="h-9"
                      />
                      <Button size="sm" className="sm:h-10" onClick={() => void addProductType()} disabled={dropdownsLoading}>
                        เพิ่ม
                      </Button>
                    </div>
                    <div className="border rounded-md p-2 max-h-56 overflow-auto">
                      {dropdownOptions.productTypeOptions.map((value) => (
                        <div key={value} className="flex items-center justify-between gap-2 py-1">
                          <div className="text-sm break-words">{value}</div>
                          <Button variant="ghost" size="sm" className="h-9 sm:h-8" onClick={() => void deleteProductType(value)} disabled={dropdownsLoading}>
                            ลบ
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="font-medium">ขนาด</div>
                    <div className="flex items-center gap-2">
                      <Input
                        value={newSizeValue}
                        onChange={(e) => setNewSizeValue(e.target.value)}
                        placeholder="เพิ่มขนาด..."
                        className="h-9"
                      />
                      <Button size="sm" className="sm:h-10" onClick={() => void addSize()} disabled={dropdownsLoading}>
                        เพิ่ม
                      </Button>
                    </div>
                    <div className="border rounded-md p-2 max-h-56 overflow-auto">
                      {dropdownOptions.sizeOptions.map((value) => (
                        <div key={value} className="flex items-center justify-between gap-2 py-1">
                          <div className="text-sm break-words">{value}</div>
                          <Button variant="ghost" size="sm" className="h-9 sm:h-8" onClick={() => void deleteSize(value)} disabled={dropdownsLoading}>
                            ลบ
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="font-medium">รายละเอียด (สินค้า)</div>
                  <Input
                    value={newProductValue}
                    onChange={(e) => setNewProductValue(e.target.value)}
                    placeholder='เช่น "แก้ว PET 7 ออนซ์ ปาก 78  // F1102070A018"'
                    className="h-9"
                  />
                  <div className="flex justify-end">
                    <Button size="sm" className="sm:h-10" onClick={() => void addProduct()} disabled={dropdownsLoading}>
                      เพิ่มสินค้า
                    </Button>
                  </div>
                  <div className="border rounded-md p-2 max-h-72 overflow-auto">
                    {dropdownOptions.productOptions.map((value) => (
                      <div key={value} className="flex items-start justify-between gap-2 py-2 border-b last:border-b-0">
                        <div className="text-sm break-words min-w-0">{value}</div>
                        <Button variant="ghost" size="sm" className="h-9 sm:h-8" onClick={() => void deleteProduct(value)} disabled={dropdownsLoading}>
                          ลบ
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          <Button variant="outline" size="sm" className="sm:h-10" onClick={() => navigate("/")} disabled={isDownloadingPdf}>
            <List className="w-4 h-4" />
            รายการ PO
          </Button>
          <Button variant="outline" size="sm" className="sm:h-10" onClick={clearAll} disabled={isDownloadingPdf}>
            ล้างข้อมูล
          </Button>
          <Button variant="outline" size="sm" className="sm:h-10" onClick={addFreeNote} disabled={isDownloadingPdf}>
            เพิ่มโน้ต
          </Button>
          <Button variant="outline" size="sm" className="sm:h-10" onClick={handleSavePO} disabled={isDownloadingPdf || isSavingPo}>
            <Save className="w-4 h-4" />
            บันทึก
          </Button>
          <Button onClick={handleDownloadPdf} className="gap-2 bg-primary hover:bg-primary/90" disabled={isDownloadingPdf} size="sm">
            <Download className="w-4 h-4" />
            ดาวน์โหลด PDF
          </Button>
        </div>
        <div className="w-full overflow-x-auto pb-6">
          <div
            ref={formRef}
            id="order-form-capture"
            className="bg-white p-3 sm:p-6 shadow-lg mx-auto relative"
            style={{
              ...fontSize11Style,
              width: `${a4Width}px`,
              minHeight: `${a4Height}px`,
              aspectRatio: "297 / 210",
            }}
          >
          {freeNotes.map((note) => (
            <div
              key={note.id}
              data-free-note-container="true"
              style={{ position: "absolute", left: note.x, top: note.y, width: note.w, height: note.h, zIndex: 30 }}
              className="bg-transparent border border-dashed border-black/30"
            >
              <div
                className="pdf-hide flex items-center justify-between px-3 sm:px-2 h-10 sm:h-7 border-b border-black/70 cursor-move select-none touch-none"
                onPointerDown={(e) => startDragFreeNote(note.id, e)}
                onPointerMove={moveDragFreeNote}
                onPointerUp={endDragFreeNote}
                onPointerCancel={endDragFreeNote}
              >
                <div className="text-[11px] leading-none">โน้ต</div>
                <button type="button" className="text-[16px] leading-none w-8 h-8 sm:w-auto sm:h-auto sm:px-1" onClick={() => deleteFreeNote(note.id)}>
                  ×
                </button>
              </div>
              <textarea
                data-free-note="true"
                value={note.text}
                onChange={(e) => updateFreeNoteText(note.id, e.target.value)}
                className="w-full h-[calc(100%-1.75rem)] resize-none bg-transparent outline-none p-2 text-[11pt] leading-snug"
                style={{ fontFamily: "'Angsana New', 'TH Sarabun New', serif" }}
              />
              <div
                className="pdf-hide absolute left-0 top-0 w-7 h-7 sm:w-4 sm:h-4 cursor-nwse-resize border-l-2 border-t-2 border-black/40 bg-black/5 touch-none"
                onPointerDown={(e) => startResizeFreeNote(note.id, "nw", e)}
                onPointerMove={moveResizeFreeNote}
                onPointerUp={endResizeFreeNote}
                onPointerCancel={endResizeFreeNote}
              />
              <div
                className="pdf-hide absolute right-0 top-0 w-7 h-7 sm:w-4 sm:h-4 cursor-nesw-resize border-r-2 border-t-2 border-black/40 bg-black/5 touch-none"
                onPointerDown={(e) => startResizeFreeNote(note.id, "ne", e)}
                onPointerMove={moveResizeFreeNote}
                onPointerUp={endResizeFreeNote}
                onPointerCancel={endResizeFreeNote}
              />
              <div
                className="pdf-hide absolute left-0 bottom-0 w-7 h-7 sm:w-4 sm:h-4 cursor-nesw-resize border-l-2 border-b-2 border-black/40 bg-black/5 touch-none"
                onPointerDown={(e) => startResizeFreeNote(note.id, "sw", e)}
                onPointerMove={moveResizeFreeNote}
                onPointerUp={endResizeFreeNote}
                onPointerCancel={endResizeFreeNote}
              />
              <div
                className="pdf-hide absolute right-0 bottom-0 w-7 h-7 sm:w-4 sm:h-4 cursor-nwse-resize border-r-2 border-b-2 border-black/40 bg-black/5 touch-none"
                onPointerDown={(e) => startResizeFreeNote(note.id, "se", e)}
                onPointerMove={moveResizeFreeNote}
                onPointerUp={endResizeFreeNote}
                onPointerCancel={endResizeFreeNote}
              />
              <div
                className="pdf-hide absolute right-0 top-7 sm:top-4 bottom-7 sm:bottom-4 w-5 sm:w-2 cursor-ew-resize bg-black/0 touch-none"
                onPointerDown={(e) => startResizeFreeNote(note.id, "e", e)}
                onPointerMove={moveResizeFreeNote}
                onPointerUp={endResizeFreeNote}
                onPointerCancel={endResizeFreeNote}
              />
              <div
                className="pdf-hide absolute left-7 sm:left-4 right-7 sm:right-4 bottom-0 h-5 sm:h-2 cursor-ns-resize bg-black/0 touch-none"
                onPointerDown={(e) => startResizeFreeNote(note.id, "s", e)}
                onPointerMove={moveResizeFreeNote}
                onPointerUp={endResizeFreeNote}
                onPointerCancel={endResizeFreeNote}
              />
            </div>
          ))}
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3" style={fontSize11Style}>
              <img src={logo} alt="Logo" className="h-8 w-auto object-contain" />
              <span style={fontSize11Style}>บริษัทแวนด้าแพค จำกัด</span>
            </div>
            <div className="text-center flex-1">
              <h1 className="font-bold text-black" style={{ fontSize: "20px" }}>
                ใบบันทึกการรับการสั่งซื้อ (ผลิตภัณฑ์บรรจุภัณฑ์)
              </h1>
            </div>
            <div className="text-right" style={fontSize11Style}>
              <div style={{ ...fontSize11Style, fontSize: "11px" }}>FM-PPS-02 REV.03</div>
              <div className="flex items-center gap-1 mt-1" style={fontSize11Style}>
                <span style={fontSize11Style}>No.</span>
                <Input
                  value={formData.orderNumber}
                  onChange={(e) => setFormData({ ...formData, orderNumber: e.target.value })}
                  className="w-32 h-[32px] text-left border-b border-black border-t-0 border-l-0 border-r-0 rounded-none bg-transparent pb-2"
                  style={fontSize11Style}
                />
              </div>
            </div>
          </div>

          {/* Order Type */}
          <div className="flex items-center gap-6 mb-3 flex-wrap" style={fontSize11Style}>
            <div data-pdf-shift="order-type-phone" className="font-bold" style={fontSize11Style}>ประเภท</div>
            <label data-pdf-shift="order-type-phone" className="flex items-baseline gap-2">
              <input
                type="checkbox"
                checked={formData.orderType.phone}
                onChange={(e) =>
                  setFormData({ ...formData, orderType: { ...formData.orderType, phone: e.target.checked } })
                }
                className="w-4 h-4 border-2 border-black accent-black relative top-[2px]"
              />
              <span style={fontSize11Style}>โทรศัพท์</span>
            </label>
            <label className="flex items-baseline gap-2">
              <input
                type="checkbox"
                checked={formData.orderType.po}
                onChange={(e) =>
                  setFormData({ ...formData, orderType: { ...formData.orderType, po: e.target.checked } })
                }
                className="w-4 h-4 border-2 border-black accent-black relative top-[2px]"
              />
              <span style={fontSize11Style}>ใบสั่งซื้อ PO. No.</span>
              <Input
                value={formData.poNumber}
                onChange={(e) => setFormData({ ...formData, poNumber: e.target.value })}
                className="w-32 h-[32px] border-b border-black border-t-0 border-l-0 border-r-0 rounded-none bg-transparent pb-2"
                style={fontSize11Style}
              />
            </label>
            <label className="flex items-baseline gap-2">
              <input
                type="checkbox"
                checked={formData.orderType.other}
                onChange={(e) =>
                  setFormData({ ...formData, orderType: { ...formData.orderType, other: e.target.checked } })
                }
                className="w-4 h-4 border-2 border-black accent-black relative top-[2px]"
              />
              <span style={fontSize11Style}>อื่นๆ</span>
              <Input
                value={formData.otherText}
                onChange={(e) => setFormData({ ...formData, otherText: e.target.value })}
                className="w-40 h-[32px] border-b border-black border-t-0 border-l-0 border-r-0 rounded-none bg-transparent pb-2"
                style={fontSize11Style}
              />
            </label>
          </div>

          {/* Customer Info */}
          <div className="flex items-center gap-4 mb-3 flex-wrap" style={fontSize11Style}>
            <div className="flex items-center gap-2">
              <span style={fontSize11Style}>ชื่อลูกค้า</span>
              <Input
                value={formData.customerName}
                onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                className="w-48 h-[32px] border-b border-black border-t-0 border-l-0 border-r-0 rounded-none bg-transparent pb-2"
                style={fontSize11Style}
              />
            </div>
            <div className="flex items-center gap-2">
              <span style={fontSize11Style}>วันที่</span>
              <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    data-pdf-date-trigger="true"
                    className={cn(
                      "w-36 h-[32px] border-b border-black border-t-0 border-l-0 border-r-0 rounded-none bg-transparent justify-start text-left font-normal px-0 hover:bg-transparent pb-2",
                      !formData.date && "text-muted-foreground"
                    )}
                    style={fontSize11Style}
                  >
                    {formData.date ? (
                      format(formData.date, "dd/MM/yyyy", { locale: th })
                    ) : (
                      <span className="flex items-center gap-1">
                        <CalendarIcon className="h-3 w-3 pdf-hide" />
                        เลือกวันที่
                      </span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-white z-50" align="start">
                  <Calendar
                    mode="single"
                    selected={formData.date}
                    onSelect={(date) => {
                      setFormData({ ...formData, date });
                      setIsDatePickerOpen(false);
                    }}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="flex items-center gap-2">
              <span style={fontSize11Style}>บุคคลที่ติดต่อ</span>
              <Input
                value={formData.contactPerson}
                onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                className="w-48 h-[32px] border-b border-black border-t-0 border-l-0 border-r-0 rounded-none bg-transparent pb-2"
                style={fontSize11Style}
              />
            </div>
          </div>

          {/* Main Table */}
          <div className="overflow-x-auto">
            <table className="w-full table-fixed border-collapse border border-black" style={{ borderSpacing: 0, ...fontSize11Style }}>
              <colgroup>
                <col style={{ width: "32px" }} />
                <col style={{ width: "32px" }} />
                <col style={{ width: "32px" }} />
                <col style={{ width: "32px" }} />
                <col style={{ width: "32px" }} />
                <col style={{ width: "32px" }} />
                <col style={{ width: "32px" }} />
                <col style={{ width: "32px" }} />
                <col style={{ width: "32px" }} />
                <col style={{ width: "60px" }} />
                <col style={{ width: "60px" }} />
                <col style={{ width: "192px" }} />
                <col style={{ width: "85px" }} />
                <col style={{ width: "60px" }} />
                <col style={{ width: "40px" }} />
                <col style={{ width: "40px" }} />
                <col style={{ width: "65px" }} />
                <col style={{ width: "35px" }} />
                <col style={{ width: "25px" }} />
                <col style={{ width: "25px" }} />
                <col style={{ width: "60px" }} />
              </colgroup>
              <thead>
                {/* Row 1: Main headers */}
                <tr>
                  <th className="border border-black p-1 text-center align-top font-normal" colSpan={4} style={fontSize9Style}>
                    ชนิดวัตถุดิบ
                  </th>
                  <th className="border border-black p-1 text-center align-top font-normal" colSpan={5} style={fontSize9Style}>
                    คุณลักษณะการใช้งาน
                  </th>
                  <th className="border border-black p-1 text-center align-middle font-normal w-[60px]" rowSpan={3} style={fontSize9Style}>ชนิดสินค้า</th>
                  <th className="border border-black p-1 text-center align-middle font-normal w-[60px]" rowSpan={3} style={fontSize9Style}>
                    <span className="relative -top-[1px]">ขนาด</span>
                  </th>
                  <th className="border border-black p-1 text-center align-middle font-normal w-[192px]" rowSpan={3} style={fontSize9Style}>
                    <span className="relative -top-[1px]">รายละเอียด</span>
                  </th>
                  <th className="border border-black p-0 text-center align-middle font-normal w-[85px]" rowSpan={3} style={fontSize9Style}>
                    <div className="whitespace-nowrap">จำนวนการสั่งซื้อ</div>
                    <div>(ใบ/ชุด)</div>
                  </th>
                  <th className="border border-black p-1 text-center align-middle font-normal w-[60px]" rowSpan={3} style={fontSize9Style}>
                    <div>ราคา@</div>
                    <div>(บาท)</div>
                  </th>
                  <th className="border border-black p-0 text-center align-middle font-normal w-[40px]" rowSpan={3} style={fontSize9Style}>
                    <div>วัน</div>
                    <div>กำหนด</div>
                    <div>ส่ง</div>
                  </th>
                  <th className="border border-black p-0 text-center align-middle font-normal w-[40px]" rowSpan={3} style={fontSize9Style}>
                    <div>ส่งได้</div>
                    <div>ตาม</div>
                    <div>กำหนด</div>
                  </th>
                  <th className="border border-black p-1 text-center align-middle font-normal w-[65px]" rowSpan={3} style={fontSize9Style}>
                    <div>ส่งไม่ได้</div>
                    <div>ตาม</div>
                    <div>กำหนด</div>
                  </th>
                  <th className="border border-black p-1 text-center align-middle font-normal w-[35px]" rowSpan={3} style={fontSize9Style}>
                    <div>ประเ</div>
                    <div>ทศ</div>
                    <div>ที่</div>
                    <div>ส่งอ</div>
                    <div>อก</div>
                  </th>
                  <th className="border border-black p-1 text-center align-top font-normal" colSpan={2} style={fontSize8Style}>
                    <div className="relative -top-[3px]">
                      <div>กฎหมาย</div>
                      <div>อ้างอิง</div>
                    </div>
                  </th>
                  <th className="border border-black p-1 text-center align-middle font-normal w-[60px]" rowSpan={3} style={fontSize9Style}>หมายเหตุ</th>
                </tr>
                {/* Row 2: Material types and usage categories */}
                <tr>
                  <th className="border border-black p-1 text-center align-middle font-normal w-[32px]" style={{ fontFamily: "'Angsana New', 'TH Sarabun New', serif", fontSize: "10pt" }}><span data-pdf-shift="material-header-text">PS</span></th>
                  <th className="border border-black p-1 text-center align-middle font-normal w-[32px]" style={{ fontFamily: "'Angsana New', 'TH Sarabun New', serif", fontSize: "10pt" }}><span data-pdf-shift="material-header-text">PP</span></th>
                  <th className="border border-black p-1 text-center align-middle font-normal w-[32px]" style={{ fontFamily: "'Angsana New', 'TH Sarabun New', serif", fontSize: "10pt" }}><span data-pdf-shift="material-header-text">PET</span></th>
                  <th className="border border-black p-1 text-center align-middle font-normal w-[32px]" style={{ fontFamily: "'Angsana New', 'TH Sarabun New', serif", fontSize: "10pt" }}><span data-pdf-shift="material-header-text">PLA</span></th>
                  <th className="border border-black p-1 text-center font-normal w-[32px]" rowSpan={2}>
                    <div className="h-24 flex items-center justify-center">
                      <RotatedTextSVG lines={["ใส่ของร้อน", "(ที่อุณหภูมิ 45 - 70 C°)"]} height={112} width={32} />
                    </div>
                  </th>
                  <th className="border border-black p-1 text-center font-normal w-[32px]" rowSpan={2}>
                    <div className="h-24 flex items-center justify-center">
                      <RotatedTextSVG lines={["ที่อุณหภูมิปกติ", "(ที่อุณหภูมิ 25 C°)"]} height={96} width={32} />
                    </div>
                  </th>
                  <th className="border border-black p-1 text-center font-normal w-[32px]" rowSpan={2}>
                    <div className="h-24 flex items-center justify-center">
                      <RotatedTextSVG lines={["ที่อุณหภูมิแช่เย็น", "(ที่อุณหภูมิ 0 -10 C°)"]} height={96} width={32} />
                    </div>
                  </th>
                  <th className="border border-black p-1 text-center font-normal w-[32px]" rowSpan={2}>
                    <div className="h-24 flex items-center justify-center">
                      <RotatedTextSVG lines={["ที่อุณหภูมิแช่แข็ง", "(ที่อุณหภูมิ -1 ถึง -80 C°)"]} height={112} width={32} />
                    </div>
                  </th>
                  <th className="border border-black p-1 text-center font-normal w-[32px]" rowSpan={2}>
                    <div className="h-24 flex items-center justify-center">
                      <RotatedTextSVG lines={["อื่นๆ"]} height={96} width={30} />
                    </div>
                  </th>
                  <th className="border border-black p-1 text-center font-normal w-[25px]" rowSpan={2}>
                    <div className="h-28 flex items-center justify-center">
                      <RotatedTextSVG lines={["ไทย"]} height={112} width={25} fontSize="10pt" />
                    </div>
                  </th>
                  <th className="border border-black p-1 text-center font-normal w-[25px]" rowSpan={2}>
                    <div className="h-28 flex items-center justify-center">
                      <RotatedTextSVG lines={["ต่างประเทศ(ระบุ)"]} height={112} width={25} fontSize="10pt" />
                    </div>
                  </th>
                </tr>
                {/* Row 3: Temperature descriptions (rotated with line breaks) */}
                <tr>
                  <th className="border border-black p-1 text-center font-normal h-24 w-[32px]">
                    <div className="h-24 flex items-center justify-center">
                      <RotatedTextSVG lines={["(อุณหภูมิสูงสุดที่", "-20 C° ถึง 80 C°)"]} height={96} width={32} />
                    </div>
                  </th>
                  <th className="border border-black p-1 text-center font-normal h-24 w-[32px]">
                    <div className="h-24 flex items-center justify-center">
                      <RotatedTextSVG lines={["(อุณหภูมิสูงสุดที่", "-10 C° ถึง 100 C°/120 C°(M))"]} height={96} width={32} fontSize={8} />
                    </div>
                  </th>
                  <th className="border border-black p-1 text-center font-normal h-24 w-[32px]">
                    <div className="h-24 flex items-center justify-center">
                      <RotatedTextSVG lines={["(อุณหภูมิสูงสุดที่", "-10 C° ถึง 70 C°)"]} height={96} width={32} />
                    </div>
                  </th>
                  <th className="border border-black p-1 text-center font-normal h-24 w-[32px]">
                    <div className="h-24 flex items-center justify-center">
                      <RotatedTextSVG lines={["(อุณหภูมิสูงสุดที่", "0 C° ถึง 50 C°)"]} height={96} width={32} />
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {orderItems.map((item, index) => {
                  const isBottomRow = index >= orderItems.length - 4;
                  const bottomRowHeightStyle = { height: "80px", minHeight: "80px", maxHeight: "80px" };
                  const rowHeightStyle = isBottomRow
                    ? { ...bottomRowHeightStyle, fontFamily: "'Angsana New', 'TH Sarabun New', serif", fontSize: "11pt" }
                    : { height: "40px" };
                  const cellHeightStyle = isBottomRow ? bottomRowHeightStyle : undefined;

                  return (
                  <tr key={index} className={isBottomRow ? "h-[80px]" : "h-10"} style={rowHeightStyle}>
                    <td className="border border-black p-[2px] h-10 w-[32px] text-center align-middle" style={cellHeightStyle}>
                      <input
                        type="checkbox"
                        checked={item.ps}
                        onChange={(e) => updateOrderItem(index, "ps", e.target.checked)}
                        className="w-3 h-3"
                      />
                    </td>
                    <td className="border border-black p-[2px] h-10 w-[32px] text-center align-middle" style={cellHeightStyle}>
                      <input
                        type="checkbox"
                        checked={item.pp}
                        onChange={(e) => updateOrderItem(index, "pp", e.target.checked)}
                        className="w-3 h-3"
                      />
                    </td>
                    <td className="border border-black p-[2px] h-10 w-[32px] text-center align-middle" style={cellHeightStyle}>
                      <input
                        type="checkbox"
                        checked={item.pet}
                        onChange={(e) => updateOrderItem(index, "pet", e.target.checked)}
                        className="w-3 h-3"
                      />
                    </td>
                    <td className="border border-black p-[2px] h-10 w-[32px] text-center align-middle" style={cellHeightStyle}>
                      <input
                        type="checkbox"
                        checked={item.pla}
                        onChange={(e) => updateOrderItem(index, "pla", e.target.checked)}
                        className="w-3 h-3"
                      />
                    </td>
                    <td className="border border-black p-[2px] h-10 w-[32px] text-center align-middle" style={cellHeightStyle}>
                      <input
                        type="checkbox"
                        checked={item.hotFood}
                        onChange={(e) => updateOrderItem(index, "hotFood", e.target.checked)}
                        className="w-3 h-3"
                      />
                    </td>
                    <td className="border border-black p-[2px] h-10 w-[32px] text-center align-middle" style={cellHeightStyle}>
                      <input
                        type="checkbox"
                        checked={item.normalTemp}
                        onChange={(e) => updateOrderItem(index, "normalTemp", e.target.checked)}
                        className="w-3 h-3"
                      />
                    </td>
                    <td className="border border-black p-[2px] h-10 w-[32px] text-center align-middle" style={cellHeightStyle}>
                      <input
                        type="checkbox"
                        checked={item.coldTemp}
                        onChange={(e) => updateOrderItem(index, "coldTemp", e.target.checked)}
                        className="w-3 h-3"
                      />
                    </td>
                    <td className="border border-black p-[2px] h-10 w-[32px] text-center align-middle" style={cellHeightStyle}>
                      <input
                        type="checkbox"
                        checked={item.freezeTemp}
                        onChange={(e) => updateOrderItem(index, "freezeTemp", e.target.checked)}
                        className="w-3 h-3"
                      />
                    </td>
                    <td className="border border-black p-[2px] h-10 w-[32px] text-center align-middle" style={cellHeightStyle}>
                      <input
                        type="checkbox"
                        checked={item.otherUsage}
                        onChange={(e) => updateOrderItem(index, "otherUsage", e.target.checked)}
                        className="w-3 h-3"
                      />
                    </td>
                    <td className="border border-black p-[2px] h-10 w-[60px] relative group align-middle" style={cellHeightStyle}>
                      <Popover open={openProductTypeDropdownIndex === index} onOpenChange={(open) => setOpenProductTypeDropdownIndex(open ? index : null)}>
                        <PopoverTrigger asChild>
                          <div className="h-full w-full cursor-pointer text-xs break-words whitespace-normal flex items-center justify-center relative pr-4 pdf-no-pad-right text-center">
                            <span className="w-full">{item.productType || ''}</span>
                            <ChevronDown className="h-3 w-3 opacity-50 absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none pdf-hide" />
                          </div>
                        </PopoverTrigger>
                        <PopoverContent className="w-[120px] p-0 bg-white z-50" align="start">
                          <Command>
                            <CommandInput placeholder="ค้นหา..." className="h-9" />
                            <CommandList>
                              <CommandEmpty>ไม่พบรายการ</CommandEmpty>
                              <CommandGroup className="max-h-[200px] overflow-auto">
                                {dropdownOptions.productTypeOptions.map((type) => (
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
                      {item.productType && (
                        <button
                          onClick={() => updateOrderItem(index, "productType", "")}
                          className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full text-xs leading-none opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          ×
                        </button>
                      )}
                    </td>
                    <td className="border border-black p-[2px] h-10 w-[60px] relative group align-middle" style={cellHeightStyle}>
                      <Popover open={openSizeDropdownIndex === index} onOpenChange={(open) => setOpenSizeDropdownIndex(open ? index : null)}>
                        <PopoverTrigger asChild>
                          <div className="h-full w-full cursor-pointer text-xs break-words whitespace-normal flex items-center relative pr-4 pdf-no-pad-right">
                            <span className="flex-1 min-w-0">{item.size || ''}</span>
                            <ChevronDown className="h-3 w-3 opacity-50 absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none pdf-hide" />
                          </div>
                        </PopoverTrigger>
                        <PopoverContent className="w-[200px] p-0 bg-white z-50" align="start">
                          <Command>
                            <CommandInput placeholder="ค้นหาขนาด..." className="h-9" />
                            <CommandList>
                              <CommandEmpty>ไม่พบรายการ</CommandEmpty>
                              <CommandGroup className="max-h-[300px] overflow-auto">
                                {dropdownOptions.sizeOptions.map((size) => (
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
                      {item.size && (
                        <button
                          onClick={() => updateOrderItem(index, "size", "")}
                          className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full text-xs leading-none opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          ×
                        </button>
                      )}
                    </td>
                    <td className="border border-black p-[2px] h-10 w-[192px] relative group align-middle" style={cellHeightStyle}>
                      <Popover open={openDropdownIndex === index} onOpenChange={(open) => setOpenDropdownIndex(open ? index : null)}>
                        <PopoverTrigger asChild>
                          <div className="h-full w-full cursor-pointer text-xs break-words whitespace-normal flex items-center relative pr-4 pdf-no-pad-right">
                            <span className="flex-1 min-w-0">{item.details || ''}</span>
                            <ChevronDown className="h-3 w-3 opacity-50 absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none pdf-hide" />
                          </div>
                        </PopoverTrigger>
                        <PopoverContent className="w-[400px] p-0 bg-white z-50" align="start">
                          <Command>
                            <CommandInput placeholder="ค้นหารายละเอียด..." className="h-9" />
                            <CommandList>
                              <CommandEmpty>ไม่พบรายการ</CommandEmpty>
                              <CommandGroup className="max-h-[300px] overflow-auto">
                                {dropdownOptions.productOptions.map((product) => (
                                  <CommandItem
                                    key={product}
                                    value={product}
                                    onSelect={() => {
                                      updateOrderItem(index, "details", product);
                                      setOpenDropdownIndex(null);
                                    }}
                                    className="text-xs"
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-3 w-3",
                                        item.details === product ? "opacity-100" : "opacity-0"
                                      )}
                                    />
                                    <span className="break-words">{product}</span>
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                      {item.details && (
                        <button
                          onClick={() => updateOrderItem(index, "details", "")}
                          className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full text-xs leading-none opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          ×
                        </button>
                      )}
                    </td>
                    <td className="border border-black p-[2px] h-10 align-middle w-[85px]" style={cellHeightStyle}>
                      <Input
                        data-pdf-shift="table-qty"
                        value={item.quantity}
                        onChange={(e) => {
                          const formatted = formatQuantityDisplay(e.target.value);
                          updateOrderItem(index, "quantity", formatted);
                        }}
                        className="h-full w-full text-xs border-0 p-0 focus-visible:ring-0 text-center bg-transparent rounded-none"
                      />
                    </td>
                    <td className="border border-black p-[2px] h-10 align-middle w-[60px]" style={cellHeightStyle}>
                      <Input
                        data-pdf-shift="table-price"
                        value={item.price}
                        onChange={(e) => {
                          const rawValue = e.target.value.replace(/[^0-9.]/g, "");
                          updateOrderItem(index, "price", rawValue);
                        }}
                        onBlur={() => {
                          const formatted = formatPrice(item.price);
                          updateOrderItem(index, "price", formatted);
                        }}
                        className="h-full w-full text-xs border-0 p-0 focus-visible:ring-0 text-center bg-transparent rounded-none"
                      />
                    </td>
                    <td className="border border-black p-[2px] h-10 align-middle w-[40px]" style={cellHeightStyle}>
                      <Input
                        value={item.deliveryDate}
                        onChange={(e) => updateOrderItem(index, "deliveryDate", e.target.value)}
                        className="h-full w-full text-xs border-0 p-0 focus-visible:ring-0 text-center bg-transparent rounded-none"
                      />
                    </td>
                    <td className="border border-black p-[2px] h-10 align-middle w-[40px]" style={cellHeightStyle}>
                      <Input
                        value={item.deliverableNote}
                        onChange={(e) => updateOrderItem(index, "deliverableNote", e.target.value)}
                        className="h-full w-full text-xs border-0 p-0 focus-visible:ring-0 bg-transparent text-left rounded-none"
                      />
                    </td>
                    <td className="border border-black p-[2px] h-10 align-middle w-[65px]" style={cellHeightStyle}>
                      <Input
                        value={item.notDeliverableNote}
                        onChange={(e) => updateOrderItem(index, "notDeliverableNote", e.target.value)}
                        className="h-full w-full text-xs border-0 p-0 focus-visible:ring-0 bg-transparent text-left rounded-none"
                      />
                    </td>
                    <td className="border border-black p-[2px] h-10 align-middle w-[35px]" style={cellHeightStyle}>
                      <Input
                        value={item.exportType}
                        onChange={(e) => updateOrderItem(index, "exportType", e.target.value)}
                        className="h-full w-full text-xs border-0 p-0 focus-visible:ring-0 bg-transparent text-left rounded-none"
                      />
                    </td>
                    <td className="border border-black p-[2px] h-10 text-center align-middle w-[25px]" style={cellHeightStyle}>
                      <Input
                        value={item.thai}
                        onChange={(e) => updateOrderItem(index, "thai", e.target.value)}
                        className="h-full w-full text-xs border-0 p-0 focus-visible:ring-0 text-center bg-transparent rounded-none"
                      />
                    </td>
                    <td className="border border-black p-[2px] h-10 align-middle w-[25px]" style={cellHeightStyle}>
                      <Input
                        value={item.lawRef}
                        onChange={(e) => updateOrderItem(index, "lawRef", e.target.value)}
                        className="h-full w-full text-xs border-0 p-0 focus-visible:ring-0 bg-transparent rounded-none"
                      />
                    </td>
                    <td className="border border-black p-[2px] h-10 align-middle w-[60px]" style={cellHeightStyle}>
                      <Input
                        value={item.notes}
                        onChange={(e) => updateOrderItem(index, "notes", e.target.value)}
                        className="h-full w-full text-xs border-0 p-0 focus-visible:ring-0 bg-transparent rounded-none"
                      />
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Signature */}
          <div className="flex justify-end mt-4">
            <div className="text-center" style={fontSize11Style}>
              <span style={fontSize11Style}>ลงชื่อ ผู้รับใบสั่งซื้อ</span>
              <Input
                value={signature}
                onChange={(e) => setSignature(e.target.value)}
                data-pdf-skip-shift="true"
                className="w-48 h-[32px] border-b border-black border-t-0 border-l-0 border-r-0 rounded-none mx-2 inline-block bg-transparent pb-2"
                style={fontSize11Style}
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-between mt-3 text-gray-600" style={fontSize11Style}>
            <div style={{ ...fontSize11Style, fontSize: "9px" }}>&quot;Electronic Document Control But UnControlled When Printed Out เอกสารจะไม่ควบคุม เมื่อพิมพ์ออกมาแล้ว&quot;</div>
            <div style={{ ...fontSize11Style, fontSize: "9px" }}>ED : 24/4/2024</div>
          </div>
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
