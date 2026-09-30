import { L, P, Dt, Tx, Gd, Cp, zig, capV, diodeH, tvsV, inv, npn, lampSym, Pill, Ref, Flag, ledDown } from '../../lib/schematic-symbols'

export function panelPower(): string {let s='';const y=120;
  s+=Cp('IN',`<circle cx="60" cy="${y}" r="8" class="sym"/>`+Ref(60,y-24,'IN')+`<text x="60" y="${y+34}" text-anchor="middle" class="sm">من سلك</text><text x="60" y="${y+52}" text-anchor="middle" class="sm">لمبة الركن</text>`,28,y-48,64,110);
  s+=L(68,y,110,y,'w nin');
  s+=Cp('F1',L(110,y,190,y,'sym')+`<rect x="126" y="${y-10}" width="48" height="20" rx="4" class="sym" style="fill:#fff"/>`+Ref(150,y-26,'F1')+Pill(150,y+34,'فيوز 1A'),104,y-48,92,96);
  s+=L(190,y,230,y,'w nin');
  s+=Cp('D1',diodeH(230,310,y)+Ref(270,y-26,'D1')+Pill(270,y+34,'1N4007'),224,y-48,92,96);
  s+=L(310,y,800,y,'w n12')+Flag(835,y,'+12V','f12');
  s+=`<text x="835" y="${y+32}" text-anchor="middle" class="sm">← للمبة (جزء ④)</text>`;
  s+=Dt(390,y)+L(390,y,390,155,'w n12')+Cp('D2',tvsV(390,155,200)+Ref(390,268,'D2')+Pill(390,292,'P6KE18A'),345,150,90,155)+L(390,200,390,235,'w')+Gd(390,235);
  s+=Dt(490,y)+L(490,y,490,160,'w n12')+Cp('C1',capV(490,160,196,true)+Ref(490,268,'C1')+Pill(490,292,'100µF 50V'),445,150,90,155)+L(490,196,490,235,'w')+Gd(490,235);
  s+=Dt(590,y)+L(590,y,590,160,'w n12')+Cp('C2',capV(590,160,196,false)+Ref(590,268,'C2')+Pill(590,292,'100nF'),545,150,90,155)+L(590,196,590,235,'w')+Gd(590,235);
  s+=Dt(690,y)+L(690,y,690,165,'w n12');
  s+=Cp('U2',`<rect x="650" y="165" width="120" height="62" rx="8" class="box"/><text x="710" y="202" text-anchor="middle" class="ref">7805</text>`+Tx(658,183,'IN','pin','start')+Tx(763,202,'OUT','pin','end')+Tx(710,222,'GND','pin')+Ref(710,285,'U2'),645,160,130,135);
  s+=L(710,227,710,248,'w')+Gd(710,248);
  s+=L(770,202,1000,202,'w n5')+Flag(1035,202,'+5V','f5');
  s+=`<text x="1035" y="234" text-anchor="middle" class="sm">← للـ IC والخلط</text>`;
  s+=Dt(890,202)+L(890,202,890,222,'w n5')+Cp('C3',capV(890,222,250,false)+Ref(910,236,'C3','start')+Pill(910,266,'100nF','start'),868,214,112,64)+L(890,250,890,262,'w')+Gd(890,262);
  return s;}

export function panelOsc(): string {let s='';const gy=165;
  [{g:'U1A',p:['1','2'],R:'R1',Rv:'1MΩ',C:'C4',f:'A',sp:'بطيء ≈ 1.2 مرة/ث'},{g:'U1B',p:['3','4'],R:'R2',Rv:'390kΩ',C:'C5',f:'B',sp:'متوسط ≈ 3 مرات/ث'},{g:'U1C',p:['5','6'],R:'R3',Rv:'100kΩ',C:'C6',f:'C',sp:'سريع ≈ 12 مرة/ث'}].forEach((r,i)=>{
    const b=40+i*345,xin=b+60,xg=b+105,xout=b+195,fy=gy-62,c=(xin+xout)/2;
    s+=L(xin,gy,xg,gy,'w nosc')+Cp(r.g,inv(xg,gy,r.g),xg-4,gy-24,64,66)+L(xg+55,gy,xout,gy,'w nosc');
    s+=Tx(xin+22,gy-10,'pin '+r.p[0],'pin')+Tx(xg+73,gy-10,'pin '+r.p[1],'pin');
    s+=Tx(xg+25,gy+56,r.sp,'sm');
    s+=L(xin,gy,xin,fy,'w nosc')+L(xin,fy,xin+20,fy,'w nosc');
    s+=Cp(r.R,P(zig(xin+20,fy,xout-20,fy))+Ref(c-4,fy-24,r.R,'end')+Pill(c+4,fy-24,r.Rv,'start'),xin+15,fy-42,xout-xin-30,58);
    s+=L(xout-20,fy,xout,fy,'w nosc')+L(xout,fy,xout,gy,'w nosc');
    s+=Dt(xin,gy)+Dt(xout,gy);
    s+=L(xout,gy,xout+50,gy,'w nosc')+Flag(xout+66,gy,r.f,'fosc')+Tx(xout+66,gy+30,'للخلط','sm');
    s+=L(xin,gy,xin,gy+25,'w nosc')+Cp(r.C,capV(xin,gy+25,gy+57,true)+Ref(xin-20,gy+40,r.C,'end')+Pill(xin-20,gy+68,'1µF','end'),xin-85,gy+18,100,64)+L(xin,gy+57,xin,gy+82,'w')+Gd(xin,gy+82);
  });
  s+=Cp('C7',`<rect x="40" y="272" width="1000" height="28" rx="8" class="note"/><text x="540" y="291" text-anchor="middle" class="notetx">البوابات التلاتة جوه IC واحدة: U1 = CD40106 · pin 14 ← +5V · pin 7 ← GND · pins 9 و11 و13 ← GND · C7 100nF بين pin 14 و pin 7</text>`,40,272,1000,28);
  return s;}

export function panelMix(): string {let s='';const busX=390,ny=165;
  [{f:'A',y:100,R:'R4',v:'10kΩ',p:'2'},{f:'B',y:165,R:'R5',v:'22kΩ',p:'4'},{f:'C',y:230,R:'R6',v:'47kΩ',p:'6'}].forEach(r=>{
    s+=Flag(70,r.y,r.f,'fosc')+Tx(70,r.y+28,'من pin '+r.p,'sm');
    s+=L(86,r.y,150,r.y,'w nosc')+Cp(r.R,P(zig(150,r.y,270,r.y))+Ref(206,r.y-20,r.R,'end')+Pill(214,r.y-20,r.v,'start'),145,r.y-36,140,52)+L(270,r.y,busX,r.y,'w nN')+Dt(busX,r.y);
  });
  s+=L(busX,100,busX,230,'w nN');
  s+=L(busX,ny,900,ny,'w nN')+Flag(930,ny,'N','fN')+Tx(930,ny+30,'← لقاعدة Q1 (جزء ④)','sm');
  s+=Flag(560,62,'+5V','f5')+L(560,74,560,86,'w n5');
  s+=Cp('R7',P(zig(560,86,560,140))+Ref(580,108,'R7','start')+Pill(580,132,'10kΩ','start'),545,82,95,62)+L(560,140,560,ny,'w nN')+Dt(560,ny);
  s+=Dt(720,ny)+L(720,ny,720,192,'w nN')+Cp('C8',capV(720,192,224,true)+Ref(742,202,'C8','start')+Pill(742,230,'22µF','start'),700,186,100,60)+L(720,224,720,245,'w')+Gd(720,245);
  s+=Tx(busX,275,'النقطة N: هنا الموجات التلاتة بتتجمع','sm')+Tx(210,275,'المقاومة الأصغر = تأثير أكبر','sm');
  return s;}

export function panelDrive(): string {let s='';const bx=300,by=175,lx=345;
  s+=Flag(70,by,'N','fN')+Tx(70,by+30,'من الخلط','sm')+L(86,by,bx,by,'w nN');
  s+=Cp('Q1',npn(bx,by)+Ref(bx+88,by-6,'Q1','start')+Pill(bx+88,by+22,'TIP122','start'),bx-5,by-42,190,84);
  s+=Flag(lx,58,'+12V','f12')+L(lx,70,lx,74,'w n12');
  s+=Cp('LAMP',lampSym(lx,95)+Tx(322,82,'+','pin','end')+Tx(322,118,'−','pin','end')+Ref(lx+38,92,'لمبة T10','start')+Pill(lx+38,118,'LED 12V','start'),lx-40,72,170,52);
  s+=L(lx,116,lx,140,'w nlamp');
  s+=L(lx,210,lx,225,'w')+Dt(lx,225)+L(lx-30,225,lx+30,225,'w');
  s+=Cp('R89',P(zig(lx-30,225,lx-30,285))+P(zig(lx+30,225,lx+30,285))+Ref(lx+50,252,'R8 ∥ R9','start')+Pill(lx+50,280,'68Ω + 68Ω','start'),lx-45,220,210,70);
  s+=L(lx-30,285,lx+30,285,'w')+Dt(lx,285)+L(lx,285,lx,297,'w')+Gd(lx,297);
  s+=Tx(30,236,'Q1 = TIP122 (الكتابة قدامك):','lbl','start')+Tx(30,258,'pin 1 = B ← النقطة N','sm','start')+Tx(30,278,'pin 2 = C ← سالب اللمبة','sm','start')+Tx(30,298,'pin 3 = E ← R8 ∥ R9','sm','start')+`<text x="30" y="318" class="pin">⚠ الطبق المعدن = C (ماتلمسوش بالشاسيه)</text>`;
  s+=`<rect x="600" y="58" width="455" height="258" rx="12" class="inset"/><text x="1040" y="86" text-anchor="end" class="ref">🧪 في التجربة على المكتب</text>`;
  const tx=680;
  s+=Flag(tx,118,'+12V','f12')+L(tx,130,tx,142,'w n12')+P(zig(tx,142,tx,196))+`<text x="${tx+16}" y="174" class="ref">470Ω</text>`+L(tx,196,tx,210,'w')+ledDown(tx,210,246)+`<text x="${tx+34}" y="232" class="sm">LED</text>`+L(tx,246,tx,268,'w nlamp')+`<text x="${tx}" y="290" text-anchor="middle" class="sm">↓ إلى C بتاع Q1</text>`;
  s+=`<text x="1040" y="130" text-anchor="end" class="lbl">بدل لمبة T10 استخدم:</text><text x="1040" y="154" text-anchor="end" class="sm">LED 5mm + مقاومة 470Ω على التوالي</text><text x="1040" y="186" text-anchor="end" class="lbl" style="fill:#dc2626">من غير الـ 470Ω الـ LED هيتحرق فوراً</text><text x="1040" y="208" text-anchor="end" class="sm">لأن الدايرة بتعدّي لحد ~100mA</text><text x="1040" y="240" text-anchor="end" class="sm">الرجل الطويلة للـ LED ناحية الـ 470Ω</text><text x="1040" y="262" text-anchor="end" class="sm">والقصيرة ناحية C بتاع Q1</text>`;
  return s;}

