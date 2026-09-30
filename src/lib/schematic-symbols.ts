export function L(x1: number, y1: number, x2: number, y2: number, c = 'w'): string {return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="${c}"/>`;}
export function P(d: string, c = 'sym'): string {return `<path d="${d}" class="${c}"/>`;}
export function Dt(x: number, y: number): string {return `<circle cx="${x}" cy="${y}" r="3.6" class="dot"/>`;}
export function Tx(x: number, y: number, t: string, c = 'lbl', a = 'middle'): string {return `<text x="${x}" y="${y}" class="${c}" text-anchor="${a}">${t}</text>`;}
export function Gd(x: number, y: number): string {return `<g class="gnd"><line x1="${x-12}" y1="${y}" x2="${x+12}" y2="${y}"/><line x1="${x-8}" y1="${y+5}" x2="${x+8}" y2="${y+5}"/><line x1="${x-4}" y1="${y+10}" x2="${x+4}" y2="${y+10}"/></g>`;}
export function Cp(id: string, inner: string, x: number, y: number, w: number, h: number): string {return `<g class="comp" data-id="${id}"><rect class="hit" x="${x}" y="${y}" width="${w}" height="${h}" rx="6"/>${inner}</g>`;}
export function zig(x1: number, y1: number, x2: number, y2: number): string {
  const n=6;
  if(y1===y2){const a=x1+8,b=x2-8,s=(b-a)/n;let d=`M${x1},${y1} L${a},${y1}`;for(let i=0;i<n;i++)d+=` L${(a+s*(i+.5)).toFixed(1)},${y1+(i%2?7:-7)}`;return d+` L${b},${y1} L${x2},${y1}`;}
  const a=y1+8,b=y2-8,s=(b-a)/n;let d=`M${x1},${y1} L${x1},${a}`;for(let i=0;i<n;i++)d+=` L${x1+(i%2?7:-7)},${(a+s*(i+.5)).toFixed(1)}`;return d+` L${x1},${b} L${x1},${y2}`;
}
export function capV(x: number, y1: number, y2: number, polar: boolean): string {
  const m=(y1+y2)/2;let s=L(x,y1,x,m-4,'sym')+L(x-13,m-4,x+13,m-4,'sym');
  if(polar){s+=P(`M${x-13},${m+8} Q${x},${m} ${x+13},${m+8}`)+L(x,m+4,x,y2,'sym')+Tx(x-19,m-6,'+','pin');}
  else{s+=L(x-13,m+4,x+13,m+4,'sym')+L(x,m+4,x,y2,'sym');}
  return s;
}
export function diodeH(x1: number, x2: number, y: number): string {const a=x1+12,b=x2-12;return L(x1,y,a,y,'sym')+`<path d="M${a},${y-10} L${b},${y} L${a},${y+10} Z" class="symf"/>`+L(b,y-10,b,y+10,'sym')+L(b,y,x2,y,'sym');}
export function tvsV(x: number, y1: number, y2: number): string {const b=y1+8,a=y2-8;return L(x,y1,x,b,'sym')+`<path d="M${x-10},${a} L${x+10},${a} L${x},${b} Z" class="symf"/>`+P(`M${x-14},${b+4} L${x-10},${b} L${x+10},${b} L${x+14},${b-4}`)+L(x,a,x,y2,'sym');}
export function inv(x: number, y: number, id: string): string {return P(`M${x},${y-18} L${x+45},${y} L${x},${y+18} Z`)+`<circle cx="${x+50}" cy="${y}" r="5" class="sym"/>`+P(`M${x+6},${y+5} L${x+20},${y+5} L${x+20},${y-5} M${x+12},${y+5} L${x+12},${y-5} L${x+26},${y-5}`)+Tx(x+22,y+34,id,'sm');}
export function npn(bx: number, by: number): string {
  const ux=30/39.05,uy=25/39.05,px=-uy,py=ux;const tx=bx+41,ty=by+31.7,cx=tx-9*ux,cy=ty-9*uy;
  return `<circle cx="${bx+28}" cy="${by}" r="31" class="sym" style="stroke-width:1.4"/>`+L(bx,by,bx+15,by,'sym')+`<line x1="${bx+15}" y1="${by-22}" x2="${bx+15}" y2="${by+22}" class="sym" style="stroke-width:3.5"/>`+L(bx+15,by-10,bx+45,by-35,'sym')+L(bx+15,by+10,bx+45,by+35,'sym')+`<path d="M${tx},${ty} L${(cx+4.5*px).toFixed(1)},${(cy+4.5*py).toFixed(1)} L${(cx-4.5*px).toFixed(1)},${(cy-4.5*py).toFixed(1)} Z" class="symf"/>`+Tx(bx+8,by-8,'B','pin','end')+Tx(bx+52,by-30,'C','pin','start')+Tx(bx+52,by+36,'E','pin','start');
}
export function lampSym(x: number, cy: number): string {return `<circle cx="${x}" cy="${cy}" r="21" class="sym"/>`+L(x-14,cy-14,x+14,cy+14,'sym')+L(x-14,cy+14,x+14,cy-14,'sym');}
export function Pill(x: number, y: number, t: string, a = 'middle'): string {const w=Math.round(t.length*7.8+18);const x0=a==='middle'?x-w/2:a==='end'?x-w:x;return `<rect x="${x0}" y="${y-12}" width="${w}" height="24" rx="12" class="pill"/><text x="${x0+w/2}" y="${y+5}" text-anchor="middle" class="pilltx">${t}</text>`;}
export function Ref(x: number, y: number, t: string, a = 'middle'): string {return `<text x="${x}" y="${y}" text-anchor="${a}" class="ref">${t}</text>`;}
export function Flag(x: number, y: number, t: string, cls: string): string {const w=Math.round(t.length*9+22);return `<g class="flag ${cls}"><rect x="${x-w/2}" y="${y-12}" width="${w}" height="24" rx="6"/><text x="${x}" y="${y+5}" text-anchor="middle">${t}</text></g>`;}
export function Panel(W: number, H: number, num: string, title: string, sub: string, inner: string): string {return `<rect x="1" y="1" width="${W-2}" height="${H-2}" rx="16" class="pframe"/><rect x="1" y="1" width="${W-2}" height="42" rx="16" class="ptitle"/><rect x="1" y="28" width="${W-2}" height="15" class="ptitle"/><circle cx="${W-30}" cy="22" r="14" class="pnum"/><text x="${W-30}" y="27" text-anchor="middle" class="pnumt">${num}</text><text x="${W-54}" y="28" text-anchor="end" class="ptt">${title}</text><text x="20" y="28" class="pst">${sub}</text>${inner}`;}
export function ledDown(x: number, y1: number, y2: number): string {const a=y1+6,b=y2-6;return L(x,y1,x,a,'sym')+`<path d="M${x-11},${a} L${x+11},${a} L${x},${b} Z" class="symf"/>`+L(x-11,b,x+11,b,'sym')+L(x,b,x,y2,'sym')+P(`M${x+15},${a+4} L${x+27},${a-4} M${x+22},${a-4} L${x+27},${a-4} L${x+25},${a+1} M${x+15},${a+14} L${x+27},${a+6} M${x+22},${a+6} L${x+27},${a+6} L${x+25},${a+11}`);}
